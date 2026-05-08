using ClosVerdeApp.Api.Abstractions.Common.Extensions;
using ClosVerdeApp.Api.Abstractions.Common.Helpers;
using ClosVerdeApp.Api.Abstractions.Common.Technical.Tracing;
using ClosVerdeApp.Api.Abstractions.Exceptions;
using ClosVerdeApp.Api.Abstractions.Interfaces.Repositories;
using ClosVerdeApp.Api.Abstractions.Interfaces.Services;
using ClosVerdeApp.Api.Abstractions.Models.Entities;
using ClosVerdeApp.Api.Abstractions.Models.Transports;
using Microsoft.Extensions.Logging;

namespace ClosVerdeApp.Api.Core.Services;

public class ReservationService(
	IReservationRepository reservationRepository,
	IReservationRealtimePublisher reservationRealtimePublisher,
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

		var grouped = entities
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

		var entity = await reservationRepository.Create(userId, displayName, request.StartDate, request.EndDate, request.Note);
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

		ValidatePeriod(request);

		var overlapping = await reservationRepository.GetOverlapping(request.StartDate, request.EndDate, id);
		if (overlapping.Count > 0)
			ThrowConflict(overlapping[0]);

		var updated = await reservationRepository.Update(id, request.StartDate, request.EndDate, request.Note);
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

		var reservation = ToTransport(entity);
		await reservationRepository.Delete(id);
		await reservationRealtimePublisher.PublishDeleted(reservation);
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
		CreatedAt = e.CreatedAt
	};
}
