using ClosVerdeApp.Api.Abstractions.Interfaces.Services;
using ClosVerdeApp.Api.Abstractions.Models.Transports;
using Microsoft.AspNetCore.SignalR;

namespace ClosVerdeApp.Api.Web.Technical.Hubs;

public sealed class ReservationHubPublisher(IHubContext<ReservationHub, IReservationClient> hubContext) : IReservationRealtimePublisher
{
	public Task PublishCreated(Reservation reservation) =>
		hubContext.Clients.All.ReservationCreated(reservation);

	public Task PublishUpdated(Reservation reservation) =>
		hubContext.Clients.All.ReservationUpdated(reservation);

	public Task PublishDeleted(Reservation reservation) =>
		hubContext.Clients.All.ReservationDeleted(reservation);
}
