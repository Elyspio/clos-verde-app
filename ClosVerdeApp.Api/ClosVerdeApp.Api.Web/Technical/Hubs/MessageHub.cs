using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace ClosVerdeApp.Api.Web.Technical.Hubs;

/// <summary>SignalR hub mapped at <c>/hubs/messages</c>. Pure broadcast hub, no inbound methods.</summary>
[Authorize]
public sealed class MessageHub : Hub<IMessageClient>
{
}
