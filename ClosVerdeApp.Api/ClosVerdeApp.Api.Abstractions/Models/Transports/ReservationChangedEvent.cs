namespace ClosVerdeApp.Api.Abstractions.Models.Transports;

public class ReservationChangedEvent
{
	public required RealtimeChangeAction Action { get; init; }
	public required Reservation Reservation { get; init; }
}
