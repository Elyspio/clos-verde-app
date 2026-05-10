using ClosVerdeApp.Api.Abstractions.Interfaces.Services;
using ClosVerdeApp.Api.Abstractions.Models.Transports;
using Microsoft.AspNetCore.SignalR;

namespace ClosVerdeApp.Api.Web.Technical.Hubs;

/// <summary>SignalR-backed implementation of <see cref="IMessageRealtimePublisher"/>.</summary>
public sealed class MessageHubPublisher(IHubContext<MessageHub, IMessageClient> hubContext) : IMessageRealtimePublisher
{
	public Task PublishTopicCreated(Topic topic) =>
		hubContext.Clients.All.TopicChanged(new TopicChangedEvent { Action = RealtimeChangeAction.Created, TopicId = topic.Id, Topic = topic });

	public Task PublishTopicUpdated(Topic topic) =>
		hubContext.Clients.All.TopicChanged(new TopicChangedEvent { Action = RealtimeChangeAction.Updated, TopicId = topic.Id, Topic = topic });

	public Task PublishTopicDeleted(Guid topicId) =>
		hubContext.Clients.All.TopicChanged(new TopicChangedEvent { Action = RealtimeChangeAction.Deleted, TopicId = topicId });

	public Task PublishMessageCreated(Message message) =>
		hubContext.Clients.All.MessageChanged(new MessageChangedEvent { Action = RealtimeChangeAction.Created, TopicId = message.TopicId, MessageId = message.Id, Message = message });

	public Task PublishMessageUpdated(Message message) =>
		hubContext.Clients.All.MessageChanged(new MessageChangedEvent { Action = RealtimeChangeAction.Updated, TopicId = message.TopicId, MessageId = message.Id, Message = message });

	public Task PublishMessageDeleted(Guid topicId, Guid messageId) =>
		hubContext.Clients.All.MessageChanged(new MessageChangedEvent { Action = RealtimeChangeAction.Deleted, TopicId = topicId, MessageId = messageId });

	public Task PublishReadReceiptUpdated(Guid userId, Guid topicId, DateTime lastReadAt) =>
		hubContext.Clients.User(userId.ToString()).ReadReceiptUpdated(topicId, lastReadAt);
}
