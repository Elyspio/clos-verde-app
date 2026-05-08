using ClosVerdeApp.Api.Abstractions.Models.Transports;

namespace ClosVerdeApp.Api.Abstractions.Interfaces.Services;

public interface IReservationRealtimePublisher
{
	Task PublishCreated(Reservation reservation);
	Task PublishUpdated(Reservation reservation);
	Task PublishDeleted(Reservation reservation);
}
