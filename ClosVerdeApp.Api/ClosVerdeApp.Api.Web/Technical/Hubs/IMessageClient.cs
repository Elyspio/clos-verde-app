using ClosVerdeApp.Api.Abstractions.Models.Transports;

namespace ClosVerdeApp.Api.Web.Technical.Hubs;

/// <summary>Strongly-typed SignalR client contract for the messaging hub.</summary>
public interface IMessageClient
{
	Task TopicCreated(Topic topic);
	Task TopicUpdated(Topic topic);
	Task TopicDeleted(Guid topicId);

	Task MessageCreated(Message message);
	Task MessageUpdated(Message message);
	Task MessageDeleted(Guid topicId, Guid messageId);

	Task ReadReceiptUpdated(Guid topicId, DateTime lastReadAt);
}
