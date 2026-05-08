using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace ClosVerdeApp.Api.Web.Technical.Hubs;

[Authorize]
public sealed class ReservationHub : Hub<IReservationClient>
{
}
