using ClosVerdeApp.Api.Abstractions.Common.Extensions;
using ClosVerdeApp.Api.Abstractions.Common.Helpers;
using ClosVerdeApp.Api.Abstractions.Common.Technical.Tracing;
using ClosVerdeApp.Api.Abstractions.Exceptions;
using ClosVerdeApp.Api.Abstractions.Interfaces.Repositories;
using ClosVerdeApp.Api.Abstractions.Interfaces.Services;
using ClosVerdeApp.Api.Abstractions.Models.Entities;
using ClosVerdeApp.Api.Abstractions.Models.Entities.Enums;
using ClosVerdeApp.Api.Abstractions.Models.Transports;
using Microsoft.Extensions.Logging;

namespace ClosVerdeApp.Api.Core.Services;

/// <summary>
/// Implements <see cref="IObjectionService"/>. Inserts the objection (unique per user/reservation),
/// bumps the counter atomically, lazy-creates the linked discussion topic, and posts a system message
/// summarising who objected and why.
/// </summary>
public class ObjectionService(
	IReservationRepository reservationRepository,
	IObjectionRepository objectionRepository,
	ITopicRepository topicRepository,
	IMessageService messageService,
	IReservationRealtimePublisher reservationRealtimePublisher,
	IMessageRealtimePublisher messageRealtimePublisher,
	ILogger<ObjectionService> logger
) : TracingService(logger), IObjectionService
{
	public async Task<Objection> Object(Guid reservationId, Guid currentUserId, string currentDisplayName, string? reason)
	{
		using var _ = LogService($"{Log.F(reservationId)} {Log.F(currentUserId)}");

		var reservation = await reservationRepository.GetById(reservationId)
			?? throw new HttpException.NotFound<ReservationEntity>(reservationId);

		if (reservation.UserId == currentUserId)
			throw new HttpException.Forbidden("Vous ne pouvez pas vous opposer à votre propre réservation.");

		if (reservation.Status != ReservationStatus.Pending)
			throw new HttpException.Conflict("Cette réservation n'est plus en attente de validation.");

		if (DateTime.UtcNow >= reservation.ValidationDeadline)
			throw new HttpException.Conflict("Le délai pour s'opposer est dépassé.");

		var inserted = await objectionRepository.TryAdd(reservationId, currentUserId, currentDisplayName, reason);
		if (inserted is null)
			throw new HttpException.Conflict("Vous avez déjà soulevé une objection sur cette réservation.");

		var bumped = await reservationRepository.TryIncrementObjectionCount(reservationId);
		if (!bumped)
		{
			// Reservation moved away from Pending in a race — remove only the row we just inserted,
			// not every objection on the reservation.
			await objectionRepository.RemoveByReservationAndUser(reservationId, currentUserId);
			throw new HttpException.Conflict("La réservation a changé d'état entre-temps.");
		}

		// Lazy-create topic for the discussion.
		var topicId = await EnsureReservationTopic(reservation, currentDisplayName);

		// Auto-post a system message describing the objection.
		var contentHtml = BuildObjectionMessageHtml(currentDisplayName, reason);
		await messageService.PostSystem(topicId, currentUserId, currentDisplayName, contentHtml);

		// Refresh and publish reservation update.
		var refreshed = await reservationRepository.GetById(reservationId);
		if (refreshed is not null)
		{
			var transport = ToReservationTransport(refreshed);
			await reservationRealtimePublisher.PublishUpdated(transport);
		}

		return ToObjectionTransport(inserted);
	}

	private async Task<Guid> EnsureReservationTopic(ReservationEntity reservation, string displayName)
	{
		if (reservation.TopicId.HasValue)
			return reservation.TopicId.Value;

		// Check if a topic was already created by a concurrent objection.
		var existing = await topicRepository.GetByReservation(reservation.Id.AsGuid());
		Guid topicId;

		if (existing is not null)
		{
			topicId = existing.Id.AsGuid();
		}
		else
		{
			var name = BuildTopicName(reservation);
			var created = await topicRepository.Create(TopicKind.Reservation, name, null, null, reservation.Id.AsGuid());
			topicId = created.Id.AsGuid();
			await messageRealtimePublisher.PublishTopicCreated(TopicService.ToTransport(created));
		}

		var ok = await reservationRepository.TrySetTopicId(reservation.Id.AsGuid(), topicId);
		if (!ok)
		{
			// Lost the race — reload to get the winner's topic id, and delete ours if we created one.
			var fresh = await reservationRepository.GetById(reservation.Id.AsGuid());
			if (fresh?.TopicId.HasValue == true && fresh.TopicId.Value != topicId)
			{
				if (existing is null)
				{
					// We created topicId speculatively, drop it.
					await topicRepository.Delete(topicId);
					await messageRealtimePublisher.PublishTopicDeleted(topicId);
				}
				topicId = fresh.TopicId.Value;
			}
		}

		return topicId;
	}

	private static string BuildTopicName(ReservationEntity reservation)
	{
		var localStart = reservation.StartDate.ToLocalTime();
		return $"Réservation du {localStart:dd/MM} par {reservation.UserDisplayName}";
	}

	private static string BuildObjectionMessageHtml(string author, string? reason)
	{
		var safeAuthor = System.Net.WebUtility.HtmlEncode(author);
		if (string.IsNullOrWhiteSpace(reason))
			return $"<p><em>{safeAuthor} a soulevé une objection.</em></p>";

		var safeReason = System.Net.WebUtility.HtmlEncode(reason.Trim());
		return $"<p><em>{safeAuthor} a soulevé une objection&nbsp;:</em></p><blockquote><p>{safeReason}</p></blockquote>";
	}

	private static Reservation ToReservationTransport(ReservationEntity e) => new()
	{
		Id = e.Id.AsGuid(),
		UserId = e.UserId,
		UserDisplayName = e.UserDisplayName,
		StartDate = e.StartDate,
		EndDate = e.EndDate,
		Note = e.Note,
		CreatedAt = e.CreatedAt,
		Status = e.Status,
		ValidationDeadline = e.ValidationDeadline,
		TopicId = e.TopicId,
		ObjectionCount = e.ObjectionCount,
		ValidatedAt = e.ValidatedAt,
		CancelledAt = e.CancelledAt
	};

	private static Objection ToObjectionTransport(ObjectionEntity e) => new()
	{
		Id = e.Id.AsGuid(),
		ReservationId = e.ReservationId,
		UserId = e.UserId,
		UserDisplayName = e.UserDisplayName,
		Reason = e.Reason,
		CreatedAt = e.CreatedAt
	};
}
