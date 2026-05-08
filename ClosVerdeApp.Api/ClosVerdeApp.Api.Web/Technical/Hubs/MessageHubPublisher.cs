using ClosVerdeApp.Api.Abstractions.Interfaces.Services;
using ClosVerdeApp.Api.Abstractions.Models.Transports;
using Microsoft.AspNetCore.SignalR;

namespace ClosVerdeApp.Api.Web.Technical.Hubs;

/// <summary>SignalR-backed implementation of <see cref="IMessageRealtimePublisher"/>.</summary>
public sealed class MessageHubPublisher(IHubContext<MessageHub, IMessageClient> hubContext) : IMessageRealtimePublisher
{
	public Task PublishTopicCreated(Topic topic) => hubContext.Clients.All.TopicCreated(topic);
	public Task PublishTopicUpdated(Topic topic) => hubContext.Clients.All.TopicUpdated(topic);
	public Task PublishTopicDeleted(Guid topicId) => hubContext.Clients.All.TopicDeleted(topicId);

	public Task PublishMessageCreated(Message message) => hubContext.Clients.All.MessageCreated(message);
	public Task PublishMessageUpdated(Message message) => hubContext.Clients.All.MessageUpdated(message);
	public Task PublishMessageDeleted(Guid topicId, Guid messageId) => hubContext.Clients.All.MessageDeleted(topicId, messageId);

	public Task PublishReadReceiptUpdated(Guid userId, Guid topicId, DateTime lastReadAt) =>
		hubContext.Clients.User(userId.ToString()).ReadReceiptUpdated(topicId, lastReadAt);
}
