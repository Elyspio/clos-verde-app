using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace ClosVerdeApp.Api.Web.Technical.Hubs;

/// <summary>
/// SignalR hub mapped at <c>/hubs/feedback</c>. Pure broadcast hub, no inbound methods.
/// Restricted to the realm role <c>admin</c> — only admins can connect and receive events.
/// </summary>
[Authorize(Roles = "admin")]
public sealed class FeedbackHub : Hub<IFeedbackClient>
{
}
