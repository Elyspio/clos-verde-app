namespace ClosVerdeApp.Api.Abstractions.Models.Transports;

public class TopicChangedEvent
{
	public required RealtimeChangeAction Action { get; init; }
	public Guid? TopicId { get; init; }
	public Topic? Topic { get; init; }
}
