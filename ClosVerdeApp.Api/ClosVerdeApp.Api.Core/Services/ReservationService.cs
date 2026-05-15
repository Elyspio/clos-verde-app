using ClosVerdeApp.Api.Abstractions.Common.Extensions;
using ClosVerdeApp.Api.Abstractions.Common.Helpers;
using ClosVerdeApp.Api.Abstractions.Exceptions;
using ClosVerdeApp.Api.Abstractions.Interfaces.Repositories;
using ClosVerdeApp.Api.Abstractions.Interfaces.Services;
using ClosVerdeApp.Api.Abstractions.Models.Configuration;
using ClosVerdeApp.Api.Abstractions.Models.Entities;
using ClosVerdeApp.Api.Abstractions.Models.Entities.Enums;
using ClosVerdeApp.Api.Abstractions.Models.Transports;
using Elyspio.Utils.Telemetry.Tracing.Elements;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ClosVerdeApp.Api.Core.Services;

/// <summary>
/// Implements <see cref="IReservationService"/>. Reservations are created in <see cref="ReservationStatus.Pending"/>
/// with a deadline = <c>min(ValidationDelay, StartDate − Now)</c>; deletes cascade-clean the linked discussion topic.
/// </summary>
public class ReservationService : TracingService, IReservationService
{
	private readonly IReservationRepository _reservationRepository;
	private readonly ITopicRepository _topicRepository;
	private readonly IMessageRepository _messageRepository;
	private readonly IMessageService _messageService;
	private readonly IReservationRealtimePublisher _reservationRealtimePublisher;
	private readonly IMessageRealtimePublisher _messageRealtimePublisher;
	private readonly IPushNotificationService _pushNotificationService;
	private readonly IOptionsMonitor<ReservationOptions> _options;

	/// <summary>
	/// Implements <see cref="IReservationService"/>. Reservations are created in <see cref="ReservationStatus.Pending"/>
	/// with a deadline = <c>min(ValidationDelay, StartDate − Now)</c>; deletes cascade-clean the linked discussion topic.
	/// </summary>
	public ReservationService(IReservationRepository reservationRepository,
		ITopicRepository topicRepository,
		IMessageRepository messageRepository,
		IMessageService messageService,
		IReservationRealtimePublisher reservationRealtimePublisher,
		IMessageRealtimePublisher messageRealtimePublisher,
		IPushNotificationService pushNotificationService,
		IOptionsMonitor<ReservationOptions> options,
		ILogger<ReservationService> logger) : base(logger)
	{
		_reservationRepository = reservationRepository;
		_topicRepository = topicRepository;
		_messageRepository = messageRepository;
		_messageService = messageService;
		_reservationRealtimePublisher = reservationRealtimePublisher;
		_messageRealtimePublisher = messageRealtimePublisher;
		_pushNotificationService = pushNotificationService;
		_options = options;
	}

	public async Task<List<Reservation>> GetRange(DateTime from, DateTime to)
	{
		using var logger = LogService($"{Log.F(from)} {Log.F(to)}");

		var fromUtc = from.AsUtc();
		var toUtc = to.AsUtc();

		if (fromUtc >= toUtc) throw new HttpException.BadRequest("L'intervalle est invalide.");

		var entities = await _reservationRepository.GetInRange(fromUtc, toUtc);
		return entities.Select(ToTransport).OrderBy(r => r.StartDate).ToList();
	}

	public async Task<List<Reservation>> GetAll()
	{
		using var logger = LogService();
		var entities = await _reservationRepository.GetAll();
		return entities.Select(ToTransport).ToList();
	}

	public async Task<List<LeaderboardEntry>> GetLeaderboard()
	{
		using var logger = LogService();

		var entities = await _reservationRepository.GetAll();

		// Only Validated count toward the leaderboard.
		var grouped = entities
			.Where(r => r.Validation.Status == ReservationStatus.Validated)
			.GroupBy(r => r.User.Id)
			.Select(g => new
			{
				UserId = g.Key,
				DisplayName = g.OrderByDescending(r => r.CreatedAt).First().User.DisplayName,
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
		using var logger = LogService($"{Log.F(userId)} {Log.F(request.StartDate)} {Log.F(request.EndDate)}");

		var startUtc = request.StartDate.AsUtc();
		var endUtc = request.EndDate.AsUtc();

		ValidatePeriod(startUtc, endUtc);

		var overlapping = await _reservationRepository.GetOverlapping(startUtc, endUtc);
		if (overlapping.Count > 0)
			ThrowConflict(overlapping[0]);

		var opts = _options.CurrentValue;
		var now = DateTime.UtcNow;

		// Already-started periods (e.g. an all-day booking created mid-day) skip collaborative validation.
		var status = startUtc <= now ? ReservationStatus.Validated : ReservationStatus.Pending;
		var deadline = status == ReservationStatus.Validated
			? now
			: now + TimeSpan.FromTicks(Math.Min(opts.ValidationDelay.Ticks, (startUtc - now).Ticks));

		var entity = await _reservationRepository.Create(
			new ReservationUserRef { Id = userId, DisplayName = displayName },
			startUtc,
			endUtc,
			request.Note,
			status,
			deadline);

		var reservation = ToTransport(entity);
		await _reservationRealtimePublisher.PublishCreated(reservation);
		await _pushNotificationService.NotifyReservationCreated(reservation);
		return reservation;
	}

	public async Task<Reservation> Update(Guid id, CreateReservationRequest request, Guid currentUserId)
	{
		using var logger = LogService($"{Log.F(id)} {Log.F(currentUserId)} {Log.F(request.StartDate)} {Log.F(request.EndDate)}");

		var entity = await _reservationRepository.GetById(id);
		if (entity is null) throw new HttpException.NotFound<ReservationEntity>(id);
		if (entity.User.Id != currentUserId)
			throw new HttpException.Forbidden("Vous ne pouvez modifier que vos propres réservations.");
		if (entity.Validation.Status != ReservationStatus.Pending)
			throw new HttpException.Conflict("Seules les réservations en attente peuvent être modifiées.");

		var startUtc = request.StartDate.AsUtc();
		var endUtc = request.EndDate.AsUtc();

		ValidatePeriod(startUtc, endUtc);

		var overlapping = await _reservationRepository.GetOverlapping(startUtc, endUtc, id);
		if (overlapping.Count > 0)
			ThrowConflict(overlapping[0]);

		var opts = _options.CurrentValue;
		var now = DateTime.UtcNow;
		var newDeadline = startUtc <= now
			? now
			: now + TimeSpan.FromTicks(Math.Min(opts.ValidationDelay.Ticks, (startUtc - now).Ticks));

		var updated = await _reservationRepository.Update(id, startUtc, endUtc, request.Note, newDeadline);

		// Editing a reservation invalidates objections that referred to the old period.
		// Drop them, reset the counter, and post a system message in the linked topic if any.
		if (entity.Objection is not null)
		{
			await _reservationRepository.ClearObjection(id);

			if (updated.TopicId.HasValue)
			{
				try
				{
					var safeAuthor = System.Net.WebUtility.HtmlEncode(entity.User.DisplayName);
					await _messageService.PostSystem(
						updated.TopicId.Value,
						currentUserId,
						entity.User.DisplayName,
						$"<p><em>{safeAuthor} a modifié la réservation. Les objections précédentes ont été retirées&nbsp;: la nouvelle période doit être réévaluée.</em></p>");
				}
				catch (Exception ex)
				{
					logger.Error(ex, "Could not post objection-cleared system message");
				}
			}

			updated = await _reservationRepository.GetById(id) ?? updated;
		}

		// If the new period has already started, force-validate so the calendar reflects it immediately.
		if (startUtc <= now && updated.Validation.Status == ReservationStatus.Pending)
		{
			await _reservationRepository.TryForceValidate(id, now);
			updated = await _reservationRepository.GetById(id) ?? updated;
		}

		var reservation = ToTransport(updated);
		await _reservationRealtimePublisher.PublishUpdated(reservation);
		return reservation;
	}

	public async Task Delete(Guid id, Guid currentUserId)
	{
		using var logger = LogService($"{Log.F(id)} {Log.F(currentUserId)}");

		var entity = await _reservationRepository.GetById(id);
		if (entity is null) throw new HttpException.NotFound<ReservationEntity>(id);
		if (entity.User.Id != currentUserId)
			throw new HttpException.Forbidden("Vous ne pouvez supprimer que vos propres réservations.");

		// Cascade: remove the discussion topic, its messages and read receipts (if any) before the reservation row.
		if (entity.TopicId.HasValue)
		{
			var topicId = entity.TopicId.Value;
			await _messageRepository.DeleteByTopic(topicId);
			await _topicRepository.Delete(topicId);
			await _messageRealtimePublisher.PublishTopicDeleted(topicId);
		}

		var reservation = ToTransport(entity);
		await _reservationRepository.Delete(id);
		await _reservationRealtimePublisher.PublishDeleted(reservation);
	}

	public async Task<Reservation> ForceValidate(Guid id, Guid currentUserId)
	{
		using var logger = LogService($"{Log.F(id)} {Log.F(currentUserId)}");

		var entity = await _reservationRepository.GetById(id);
		if (entity is null) throw new HttpException.NotFound<ReservationEntity>(id);
		if (entity.User.Id != currentUserId)
			throw new HttpException.Forbidden("Seul le créateur peut valider sa réservation.");
		if (entity.Validation.Status != ReservationStatus.Pending)
			throw new HttpException.Conflict("Cette réservation n'est plus en attente.");

		var ok = await _reservationRepository.TryForceValidate(id, DateTime.UtcNow);
		if (!ok)
			throw new HttpException.Conflict("La réservation a changé d'état entre-temps.");

		var refreshed = await _reservationRepository.GetById(id);
		var reservation = ToTransport(refreshed!);
		await _reservationRealtimePublisher.PublishUpdated(reservation);
		return reservation;
	}

	private static void ValidatePeriod(DateTime startUtc, DateTime endUtc)
	{
		if (startUtc >= endUtc)
			throw new HttpException.BadRequest("La date de fin doit être postérieure à la date de début.");

		if (endUtc < DateTime.UtcNow)
			throw new HttpException.BadRequest("La période doit être dans le présent ou le futur.");
	}

	private static void ThrowConflict(ReservationEntity conflict) =>
		throw new HttpException.Conflict(
			$"La place est déjà réservée {FormatPeriod(conflict.StartDate, conflict.EndDate).ToLowerInvariant()} par {conflict.User.DisplayName}.");

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
		User = new UserRef { Id = e.User.Id, DisplayName = e.User.DisplayName },
		StartDate = e.StartDate,
		EndDate = e.EndDate,
		Note = e.Note,
		CreatedAt = e.CreatedAt,
		Validation = new ReservationValidationDto
		{
			Status = e.Validation.Status,
			Deadline = e.Validation.Deadline,
			ValidatedAt = e.Validation.ValidatedAt,
			CancelledAt = e.Validation.CancelledAt,
		},
		TopicId = e.TopicId,
		Objection = ToObjectionTransport(e),
	};

	private static Objection? ToObjectionTransport(ReservationEntity e) =>
		e.Objection is null
			? null
			: new Objection
			{
				Id = e.Objection.Id.AsGuid(),
				ReservationId = e.Id.AsGuid(),
				User = new UserRef { Id = e.Objection.User.Id, DisplayName = e.Objection.User.DisplayName },
				Reason = e.Objection.Reason,
				CreatedAt = e.Objection.CreatedAt,
			};
}
