using ClosVerdeApp.Api.Abstractions.Models.Transports;

namespace ClosVerdeApp.Api.Web.Technical.Hubs;

/// <summary>Strongly-typed SignalR client contract for the messaging hub.</summary>
public interface IMessageClient
{
	Task TopicChanged(TopicChangedEvent change);

	Task MessageChanged(MessageChangedEvent change);

	Task ReadReceiptUpdated(Guid topicId, DateTime lastReadAt);
}
