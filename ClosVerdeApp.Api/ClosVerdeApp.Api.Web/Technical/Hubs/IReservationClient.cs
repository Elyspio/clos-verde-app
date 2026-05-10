using ClosVerdeApp.Api.Abstractions.Models.Transports;

namespace ClosVerdeApp.Api.Web.Technical.Hubs;

public interface IReservationClient
{
	Task ReservationChanged(ReservationChangedEvent change);
}
