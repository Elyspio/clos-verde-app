namespace ClosVerdeApp.Api.Abstractions.Models.Transports;

/// <summary>
/// SignalR event pushed to the admin <c>FeedbackHub</c> when a feedback is created or
/// has its status updated.
/// </summary>
public class FeedbackChangedEvent
{
	public required RealtimeChangeAction Action { get; init; }
	public Guid? FeedbackId { get; init; }
	public Feedback? Feedback { get; init; }
}
