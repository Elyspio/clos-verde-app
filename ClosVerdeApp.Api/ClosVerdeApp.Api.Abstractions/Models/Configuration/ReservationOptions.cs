namespace ClosVerdeApp.Api.Abstractions.Models.Configuration;

/// <summary>
/// Tunables for the collaborative-validation flow. Bound from the <c>"Reservation"</c>
/// section of <c>appsettings.json</c>.
/// </summary>
public sealed class ReservationOptions
{
	public const string SectionName = "Reservation";

	public TimeSpan ValidationDelay { get; set; } = TimeSpan.FromHours(1);
	public TimeSpan ScannerInterval { get; set; } = TimeSpan.FromMinutes(1);
}
