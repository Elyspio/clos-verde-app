namespace ClosVerdeApp.Api.Abstractions.Models.Transports;

public class MessageChangedEvent
{
	public required RealtimeChangeAction Action { get; init; }
	public Guid? TopicId { get; init; }
	public Guid? MessageId { get; init; }
	public Message? Message { get; init; }
}
