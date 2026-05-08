using ClosVerdeApp.Api.Abstractions.Models.Transports;

namespace ClosVerdeApp.Api.Abstractions.Interfaces.Services;

/// <summary>Pushes messaging-domain SignalR events. <c>PublishReadReceiptUpdated</c> targets a single user.</summary>
public interface IMessageRealtimePublisher
{
	Task PublishTopicCreated(Topic topic);
	Task PublishTopicUpdated(Topic topic);
	Task PublishTopicDeleted(Guid topicId);

	Task PublishMessageCreated(Message message);
	Task PublishMessageUpdated(Message message);
	Task PublishMessageDeleted(Guid topicId, Guid messageId);

	/// <summary>Targeted to a specific user.</summary>
	Task PublishReadReceiptUpdated(Guid userId, Guid topicId, DateTime lastReadAt);
}
