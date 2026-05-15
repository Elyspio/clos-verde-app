using ClosVerdeApp.Api.Abstractions.Common.Extensions;
using ClosVerdeApp.Api.Abstractions.Interfaces.Repositories;
using ClosVerdeApp.Api.Abstractions.Interfaces.Services;
using ClosVerdeApp.Api.Abstractions.Models.Configuration;
using ClosVerdeApp.Api.Abstractions.Models.Entities;
using ClosVerdeApp.Api.Abstractions.Models.Entities.Enums;
using ClosVerdeApp.Api.Abstractions.Models.Transports;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ClosVerdeApp.Api.Core.Background;

/// <summary>
/// Periodic scanner (default every 60 s) that drives Pending reservations forward:
/// auto-validates those whose deadline has passed without objections, and auto-cancels those
/// still Pending whose start date is now in the past.
/// </summary>
public sealed class ReservationValidationScanner(
	IReservationRepository reservationRepository,
	IReservationRealtimePublisher reservationRealtimePublisher,
	IMessageService messageService,
	IOptionsMonitor<ReservationOptions> options,
	ILogger<ReservationValidationScanner> logger
) : BackgroundService
{
	protected override async Task ExecuteAsync(CancellationToken stoppingToken)
	{
		logger.LogInformation("ReservationValidationScanner starting");

		while (!stoppingToken.IsCancellationRequested)
		{
			var interval = options.CurrentValue.ScannerInterval;
			if (interval < TimeSpan.FromSeconds(5)) interval = TimeSpan.FromSeconds(5);

			try
			{
				await ScanOnce();
			}
			catch (Exception ex)
			{
				logger.LogError(ex, "ReservationValidationScanner iteration failed");
			}

			try
			{
				await Task.Delay(interval, stoppingToken);
			}
			catch (TaskCanceledException) when (stoppingToken.IsCancellationRequested)
			{
				break;
			}
		}
	}

	private async Task ScanOnce()
	{
		var now = DateTime.UtcNow;

		// Branch 1: auto-validate Pending reservations whose deadline has passed and that have no objections.
		var due = await reservationRepository.GetPendingDue(now);
		foreach (var r in due)
		{
			var ok = await reservationRepository.TryAutoValidate(r.Id.AsGuid(), now);
			if (!ok) continue;

			var refreshed = await reservationRepository.GetById(r.Id.AsGuid());
			if (refreshed is null) continue;
			await reservationRealtimePublisher.PublishUpdated(ToTransport(refreshed));
		}

		// Branch 2: auto-cancel Pending reservations with objections whose start has passed.
		var expired = await reservationRepository.GetPendingExpired(now);
		foreach (var r in expired)
		{
			var ok = await reservationRepository.TryAutoCancel(r.Id.AsGuid(), now);
			if (!ok) continue;

			var refreshed = await reservationRepository.GetById(r.Id.AsGuid());
			if (refreshed is null) continue;
			await reservationRealtimePublisher.PublishUpdated(ToTransport(refreshed));

			if (refreshed.TopicId.HasValue)
			{
				try
				{
					await messageService.PostSystem(
						refreshed.TopicId.Value,
						refreshed.User.Id,
						refreshed.User.DisplayName,
						"<p><em>Réservation annulée automatiquement&nbsp;: la date de début est dépassée.</em></p>");
				}
				catch (Exception ex)
				{
					logger.LogWarning(ex, "Could not post auto-cancel system message");
				}
			}
		}
	}

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
				CreatedAt = e.Objection.CreatedAt
			};
}
