using ClosVerdeApp.Api.Abstractions.Interfaces.Services;
using ClosVerdeApp.Api.Abstractions.Models.Transports;
using Microsoft.AspNetCore.SignalR;

namespace ClosVerdeApp.Api.Web.Technical.Hubs;

/// <summary>
/// SignalR-backed implementation of <see cref="IFeedbackRealtimePublisher"/>. The hub is
/// admin-only, so broadcasting to <c>Clients.All</c> targets exactly the admin connections.
/// </summary>
public sealed class FeedbackHubPublisher(IHubContext<FeedbackHub, IFeedbackClient> hubContext) : IFeedbackRealtimePublisher
{
	public Task PublishFeedbackCreated(Feedback feedback) =>
		hubContext.Clients.All.FeedbackChanged(new FeedbackChangedEvent
		{
			Action = RealtimeChangeAction.Created,
			FeedbackId = feedback.Id,
			Feedback = feedback,
		});

	public Task PublishFeedbackUpdated(Feedback feedback) =>
		hubContext.Clients.All.FeedbackChanged(new FeedbackChangedEvent
		{
			Action = RealtimeChangeAction.Updated,
			FeedbackId = feedback.Id,
			Feedback = feedback,
		});
}
