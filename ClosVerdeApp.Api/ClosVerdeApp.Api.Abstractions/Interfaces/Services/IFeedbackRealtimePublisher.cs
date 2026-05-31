using ClosVerdeApp.Api.Abstractions.Models.Transports;

namespace ClosVerdeApp.Api.Abstractions.Interfaces.Services;

/// <summary>Pushes feedback-domain SignalR events to the admin hub.</summary>
public interface IFeedbackRealtimePublisher
{
	Task PublishFeedbackCreated(Feedback feedback);
	Task PublishFeedbackUpdated(Feedback feedback);
}
