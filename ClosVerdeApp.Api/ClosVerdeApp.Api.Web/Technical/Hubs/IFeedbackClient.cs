using ClosVerdeApp.Api.Abstractions.Models.Transports;

namespace ClosVerdeApp.Api.Web.Technical.Hubs;

/// <summary>Strongly-typed SignalR client contract for the admin-only feedback hub.</summary>
public interface IFeedbackClient
{
	Task FeedbackChanged(FeedbackChangedEvent change);
}
