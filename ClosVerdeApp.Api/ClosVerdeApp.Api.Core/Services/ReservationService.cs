using ClosVerdeApp.Api.Abstractions.Common.Extensions;
using ClosVerdeApp.Api.Abstractions.Common.Helpers;
using ClosVerdeApp.Api.Abstractions.Common.Technical.Tracing;
using ClosVerdeApp.Api.Abstractions.Exceptions;
using ClosVerdeApp.Api.Abstractions.Interfaces.Repositories;
using ClosVerdeApp.Api.Abstractions.Interfaces.Services;
using ClosVerdeApp.Api.Abstractions.Models.Configuration;
using ClosVerdeApp.Api.Abstractions.Models.Entities;
using ClosVerdeApp.Api.Abstractions.Models.Entities.Enums;
using ClosVerdeApp.Api.Abstractions.Models.Transports;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ClosVerdeApp.Api.Core.Services;

/// <summary>
/// Implements <see cref="IReservationService"/>. Reservations are created in <see cref="ReservationStatus.Pending"/>
/// with a deadline = <c>min(ValidationDelay, StartDate − Now)</c>; deletes cascade-clean the linked discussion topic.
/// </summary>
public class ReservationService(
	IReservationRepository reservationRepository,
	IObjectionRepository objectionRepository,
	ITopicRepository topicRepository,
	IMessageRepository messageRepository,
	IReadReceiptRepository readReceiptRepository,
	IMessageService messageService,
	IReservationRealtimePublisher reservationRealtimePublisher,
	IMessageRealtimePublisher messageRealtimePublisher,
	IOptionsMonitor<ReservationOptions> options,
	ILogger<ReservationService> logger
) : TracingService(logger), IReservationService
{
	public async Task<List<Reservation>> GetMonth(int year, int month)
	{
		using var _ = LogService($"{Log.F(year)} {Log.F(month)}");

		if (month is < 1 or > 12) throw new HttpException.BadRequest("Mois invalide.");

		var first = new DateTime(year, month, 1, 0, 0, 0);
		var last = first.AddMonths(1);

		var entities = await reservationRepository.GetInRange(first, last);
		return entities.Select(ToTransport).OrderBy(r => r.StartDate).ToList();
	}

	public async Task<List<Reservation>> GetAll()
	{
		using var _ = LogService();
		var entities = await reservationRepository.GetAll();
		return entities.Select(ToTransport).ToList();
	}

	public async Task<List<LeaderboardEntry>> GetLeaderboard()
	{
		using var _ = LogService();

		var entities = await reservationRepository.GetAll();

		// Only Validated count toward the leaderboard.
		var grouped = entities
			.Where(r => r.Status == ReservationStatus.Validated)
			.GroupBy(r => r.UserId)
			.Select(g => new
			{
				UserId = g.Key,
				DisplayName = g.OrderByDescending(r => r.CreatedAt).First().UserDisplayName,
				TotalDays = g.Sum(r => (int)Math.Ceiling(Math.Max(0, (r.EndDate - r.StartDate).TotalDays))),
				ReservationCount = g.Count()
			})
			.OrderByDescending(x => x.TotalDays)
			.ThenByDescending(x => x.ReservationCount)
			.ToList();

		return grouped.Select((x, idx) => new LeaderboardEntry
		{
			Rank = idx + 1,
			UserId = x.UserId,
			DisplayName = x.DisplayName,
			TotalDays = x.TotalDays,
			ReservationCount = x.ReservationCount
		}).ToList();
	}

	public async Task<Reservation> Create(CreateReservationRequest request, Guid userId, string displayName)
	{
		using var _ = LogService($"{Log.F(userId)} {Log.F(request.StartDate)} {Log.F(request.EndDate)}");

		ValidatePeriod(request);

		var overlapping = await reservationRepository.GetOverlapping(request.StartDate, request.EndDate);
		if (overlapping.Count > 0)
			ThrowConflict(overlapping[0]);

		var opts = options.CurrentValue;
		var now = DateTime.UtcNow;
		var startUtc = request.StartDate.ToUniversalTime();

		// Already-started periods (e.g. an all-day booking created mid-day) skip collaborative validation.
		var status = startUtc <= now ? ReservationStatus.Validated : ReservationStatus.Pending;
		var deadline = status == ReservationStatus.Validated
			? now
			: now + TimeSpan.FromTicks(Math.Min(opts.ValidationDelay.Ticks, (startUtc - now).Ticks));

		var entity = await reservationRepository.Create(
			userId,
			displayName,
			request.StartDate,
			request.EndDate,
			request.Note,
			status,
			deadline);

		var reservation = ToTransport(entity);
		await reservationRealtimePublisher.PublishCreated(reservation);
		return reservation;
	}

	public async Task<Reservation> Update(Guid id, CreateReservationRequest request, Guid currentUserId)
	{
		using var _ = LogService($"{Log.F(id)} {Log.F(currentUserId)} {Log.F(request.StartDate)} {Log.F(request.EndDate)}");

		var entity = await reservationRepository.GetById(id);
		if (entity is null) throw new HttpException.NotFound<ReservationEntity>(id);
		if (entity.UserId != currentUserId)
			throw new HttpException.Forbidden("Vous ne pouvez modifier que vos propres réservations.");
		if (entity.Status != ReservationStatus.Pending)
			throw new HttpException.Conflict("Seules les réservations en attente peuvent être modifiées.");

		ValidatePeriod(request);

		var overlapping = await reservationRepository.GetOverlapping(request.StartDate, request.EndDate, id);
		if (overlapping.Count > 0)
			ThrowConflict(overlapping[0]);

		var opts = options.CurrentValue;
		var now = DateTime.UtcNow;
		var startUtc = request.StartDate.ToUniversalTime();
		var newDeadline = startUtc <= now
			? now
			: now + TimeSpan.FromTicks(Math.Min(opts.ValidationDelay.Ticks, (startUtc - now).Ticks));

		var updated = await reservationRepository.Update(id, request.StartDate, request.EndDate, request.Note, newDeadline);

		// Editing a reservation invalidates objections that referred to the old period.
		// Drop them, reset the counter, and post a system message in the linked topic if any.
		if (entity.ObjectionCount > 0)
		{
			await objectionRepository.RemoveByReservation(id);
			await reservationRepository.ResetObjectionCount(id);

			if (updated.TopicId.HasValue)
			{
				try
				{
					var safeAuthor = System.Net.WebUtility.HtmlEncode(entity.UserDisplayName);
					await messageService.PostSystem(
						updated.TopicId.Value,
						currentUserId,
						entity.UserDisplayName,
						$"<p><em>{safeAuthor} a modifié la réservation. Les objections précédentes ont été retirées&nbsp;: la nouvelle période doit être réévaluée.</em></p>");
				}
				catch (Exception ex)
				{
					logger.LogWarning(ex, "Could not post objection-cleared system message");
				}
			}

			updated = await reservationRepository.GetById(id) ?? updated;
		}

		// If the new period has already started, force-validate so the calendar reflects it immediately.
		if (startUtc <= now && updated.Status == ReservationStatus.Pending)
		{
			await reservationRepository.TryForceValidate(id, now);
			updated = await reservationRepository.GetById(id) ?? updated;
		}

		var reservation = ToTransport(updated);
		await reservationRealtimePublisher.PublishUpdated(reservation);
		return reservation;
	}

	public async Task Delete(Guid id, Guid currentUserId)
	{
		using var _ = LogService($"{Log.F(id)} {Log.F(currentUserId)}");

		var entity = await reservationRepository.GetById(id);
		if (entity is null) throw new HttpException.NotFound<ReservationEntity>(id);
		if (entity.UserId != currentUserId)
			throw new HttpException.Forbidden("Vous ne pouvez supprimer que vos propres réservations.");

		// Cascade: remove the discussion topic, its messages and read receipts (if any) before the reservation row.
		if (entity.TopicId.HasValue)
		{
			var topicId = entity.TopicId.Value;
			await messageRepository.DeleteByTopic(topicId);
			await readReceiptRepository.DeleteByTopic(topicId);
			await topicRepository.Delete(topicId);
			await messageRealtimePublisher.PublishTopicDeleted(topicId);
		}

		await objectionRepository.RemoveByReservation(id);

		var reservation = ToTransport(entity);
		await reservationRepository.Delete(id);
		await reservationRealtimePublisher.PublishDeleted(reservation);
	}

	public async Task<Reservation> ForceValidate(Guid id, Guid currentUserId)
	{
		using var _ = LogService($"{Log.F(id)} {Log.F(currentUserId)}");

		var entity = await reservationRepository.GetById(id);
		if (entity is null) throw new HttpException.NotFound<ReservationEntity>(id);
		if (entity.UserId != currentUserId)
			throw new HttpException.Forbidden("Seul le créateur peut valider sa réservation.");
		if (entity.Status != ReservationStatus.Pending)
			throw new HttpException.Conflict("Cette réservation n'est plus en attente.");

		var ok = await reservationRepository.TryForceValidate(id, DateTime.UtcNow);
		if (!ok)
			throw new HttpException.Conflict("La réservation a changé d'état entre-temps.");

		var refreshed = await reservationRepository.GetById(id);
		var reservation = ToTransport(refreshed!);
		await reservationRealtimePublisher.PublishUpdated(reservation);
		return reservation;
	}

	public async Task<List<Objection>> GetObjections(Guid reservationId)
	{
		using var _ = LogService($"{Log.F(reservationId)}");
		var entities = await objectionRepository.GetByReservation(reservationId);
		return entities.Select(ToObjectionTransport).ToList();
	}

	private static void ValidatePeriod(CreateReservationRequest request)
	{
		if (request.StartDate >= request.EndDate)
			throw new HttpException.BadRequest("La date de fin doit être postérieure à la date de début.");

		if (request.EndDate < DateTime.Now)
			throw new HttpException.BadRequest("La période doit être dans le présent ou le futur.");
	}

	private static void ThrowConflict(ReservationEntity conflict) =>
		throw new HttpException.Conflict(
			$"La place est déjà réservée {FormatPeriod(conflict.StartDate, conflict.EndDate).ToLowerInvariant()} par {conflict.UserDisplayName}.");

	private static string FormatPeriod(DateTime start, DateTime end)
	{

		start = start.ToLocalTime();
		end = end.ToLocalTime();

		var startLabel = IsStartOfDay(start) ? $"{start:dd/MM}" : $"{start:dd/MM 'à' HH'h'mm}";

		if (start.Date == end.Date && IsEndOfDay(end))
			return $"du {startLabel} jusqu'à la fin de la journée";

		if (IsEndOfDay(end))
			return $"du {startLabel} au {end:dd/MM}";

		var endLabel = IsStartOfDay(end) ? $"{end:dd/MM}" : $"{end:dd/MM 'à' HH'h'mm}";
		return $"du {startLabel} au {endLabel}";
	}

	private static bool IsStartOfDay(DateTime date) => date.Hour == 0 && date.Minute == 0;

	private static bool IsEndOfDay(DateTime date) => date.Hour == 23 && date.Minute == 59;

	private static Reservation ToTransport(ReservationEntity e) => new()
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
