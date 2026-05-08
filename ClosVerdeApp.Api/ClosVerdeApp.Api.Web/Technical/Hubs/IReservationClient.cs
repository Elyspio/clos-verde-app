using ClosVerdeApp.Api.Abstractions.Models.Transports;

namespace ClosVerdeApp.Api.Web.Technical.Hubs;

public interface IReservationClient
{
	Task ReservationCreated(Reservation reservation);
	Task ReservationUpdated(Reservation reservation);
	Task ReservationDeleted(Reservation reservation);
}
