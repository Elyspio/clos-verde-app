namespace ClosVerdeApp.Api.Abstractions.Models.Entities.Enums;

/// <summary>
/// Lifecycle of a reservation: <c>Pending</c> awaits collaborative validation,
/// <c>Validated</c> is active, <c>Cancelled</c> is hidden from the calendar.
/// </summary>
public enum ReservationStatus
{
	Pending = 0,
	Validated = 1,
	Cancelled = 2
}
