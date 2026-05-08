using ClosVerdeApp.Api.Abstractions.Interfaces.Repositories;
using ClosVerdeApp.Api.Abstractions.Models.Entities.Enums;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace ClosVerdeApp.Api.Core.Background;

/// <summary>
/// One-shot startup migration that promotes legacy reservations (created before the Status field
/// existed) to <see cref="ReservationStatus.Validated"/>. Safe to leave registered; idempotent.
/// </summary>
public sealed class ReservationStatusBackfill(
	IReservationRepository reservationRepository,
	ILogger<ReservationStatusBackfill> logger
) : IHostedService
{
	public async Task StartAsync(CancellationToken cancellationToken)
	{
		try
		{
			var migrated = await reservationRepository.BackfillLegacyAsValidated();
			if (migrated > 0)
				logger.LogInformation("Backfilled {Count} legacy reservation(s) as Validated", migrated);
		}
		catch (Exception ex)
		{
			logger.LogError(ex, "Reservation backfill failed");
		}
	}

	public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
