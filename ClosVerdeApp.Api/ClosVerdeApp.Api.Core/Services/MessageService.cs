using ClosVerdeApp.Api.Abstractions.Common.Extensions;
using ClosVerdeApp.Api.Abstractions.Common.Helpers;
using ClosVerdeApp.Api.Abstractions.Exceptions;
using ClosVerdeApp.Api.Abstractions.Interfaces.Repositories;
using ClosVerdeApp.Api.Abstractions.Interfaces.Services;
using ClosVerdeApp.Api.Abstractions.Models.Entities;
using ClosVerdeApp.Api.Abstractions.Models.Transports;
using ClosVerdeApp.Api.Core.Helpers;
using Elyspio.Utils.Telemetry.Tracing.Elements;
using Microsoft.Extensions.Logging;

namespace ClosVerdeApp.Api.Core.Services;

/// <summary>
/// Implements <see cref="IMessageService"/>. Sanitises HTML through <see cref="Helpers.HtmlContentHelper"/>,
/// extracts <c>@mention</c> ids, keeps topic statistics in sync, and emits SignalR events.
/// </summary>
public class MessageService(
	IMessageRepository messageRepository,
	ITopicRepository topicRepository,
	IMessageRealtimePublisher messageRealtimePublisher,
	IPushNotificationService pushNotificationService,
	ILogger<MessageService> logger
) : TracingService(logger), IMessageService
{
	public async Task<List<Message>> List(Guid topicId, DateTime? before, int limit)
	{
		using var logger = LogService($"{Log.F(topicId)} {Log.F(before)} {Log.F(limit)}");

		var topic = await topicRepository.GetById(topicId)
			?? throw new HttpException.NotFound<TopicEntity>(topicId);

		var clamped = Math.Clamp(limit, 1, 200);
		var messages = await messageRepository.GetByTopic(topic.Id.AsGuid(), before, clamped);
		return messages.Select(ToTransport).ToList();
	}

	public async Task<Message> Post(Guid topicId, Guid authorUserId, string authorDisplayName, string contentHtml)
	{
		using var logger = LogService($"{Log.F(topicId)} {Log.F(authorUserId)}");

		if (string.IsNullOrWhiteSpace(contentHtml))
			throw new HttpException.BadRequest("Le message est vide.");

		var topic = await topicRepository.GetById(topicId)
			?? throw new HttpException.NotFound<TopicEntity>(topicId);

		var sanitized = HtmlContentHelper.Sanitize(contentHtml);
		if (string.IsNullOrWhiteSpace(sanitized) || string.IsNullOrWhiteSpace(StripTags(sanitized)))
			throw new HttpException.BadRequest("Le message est vide.");

		var mentions = HtmlContentHelper.ExtractMentions(sanitized);

		var entity = await messageRepository.Create(topic.Id.AsGuid(), authorUserId, authorDisplayName, sanitized, mentions, isSystem: false);

		await topicRepository.BumpStatistics(topic.Id.AsGuid(), entity.CreatedAt, +1);
		await topicRepository.MarkRead(topic.Id.AsGuid(), authorUserId, entity.CreatedAt);

		var message = ToTransport(entity);
		await messageRealtimePublisher.PublishMessageCreated(message);
		await pushNotificationService.NotifyMessageMention(message, topic);

		// Push the updated topic so consumers can refresh LastMessageAt/MessageCount.
		var refreshedTopic = await topicRepository.GetById(topic.Id.AsGuid());
		if (refreshedTopic is not null)
			await messageRealtimePublisher.PublishTopicUpdated(TopicService.ToTransport(refreshedTopic));

		return message;
	}

	public async Task<Message> PostSystem(Guid topicId, Guid actorUserId, string actorDisplayName, string contentHtml)
	{
		using var logger = LogService($"{Log.F(topicId)} {Log.F(actorUserId)}");

		var topic = await topicRepository.GetById(topicId)
			?? throw new HttpException.NotFound<TopicEntity>(topicId);

		var sanitized = HtmlContentHelper.Sanitize(contentHtml);
		var entity = await messageRepository.Create(topic.Id.AsGuid(), actorUserId, actorDisplayName, sanitized, [], isSystem: true);

		await topicRepository.BumpStatistics(topic.Id.AsGuid(), entity.CreatedAt, +1);

		var message = ToTransport(entity);
		await messageRealtimePublisher.PublishMessageCreated(message);

		var refreshedTopic = await topicRepository.GetById(topic.Id.AsGuid());
		if (refreshedTopic is not null)
			await messageRealtimePublisher.PublishTopicUpdated(TopicService.ToTransport(refreshedTopic));

		return message;
	}

	public async Task<Message> Edit(Guid messageId, Guid currentUserId, string contentHtml)
	{
		using var logger = LogService($"{Log.F(messageId)} {Log.F(currentUserId)}");

		var existing = await messageRepository.GetById(messageId)
			?? throw new HttpException.NotFound<MessageEntity>(messageId);
		if (existing.AuthorUserId != currentUserId)
			throw new HttpException.Forbidden("Vous ne pouvez modifier que vos propres messages.");
		if (existing.IsDeleted)
			throw new HttpException.Conflict("Ce message a été supprimé.");
		if (existing.IsSystem)
			throw new HttpException.Forbidden("Les messages système ne sont pas modifiables.");

		var sanitized = HtmlContentHelper.Sanitize(contentHtml);
		if (string.IsNullOrWhiteSpace(sanitized) || string.IsNullOrWhiteSpace(StripTags(sanitized)))
			throw new HttpException.BadRequest("Le message ne peut pas être vide.");

		var mentions = HtmlContentHelper.ExtractMentions(sanitized);
		var updated = await messageRepository.Update(messageId, sanitized, mentions)
			?? throw new HttpException.NotFound<MessageEntity>(messageId);

		var message = ToTransport(updated);
		await messageRealtimePublisher.PublishMessageUpdated(message);
		return message;
	}

	public async Task<Message> SoftDelete(Guid messageId, Guid currentUserId)
	{
		using var logger = LogService($"{Log.F(messageId)} {Log.F(currentUserId)}");

		var existing = await messageRepository.GetById(messageId)
			?? throw new HttpException.NotFound<MessageEntity>(messageId);
		if (existing.AuthorUserId != currentUserId)
			throw new HttpException.Forbidden("Vous ne pouvez supprimer que vos propres messages.");
		if (existing.IsSystem)
			throw new HttpException.Forbidden("Les messages système ne sont pas supprimables.");

		var updated = await messageRepository.SoftDelete(messageId)
			?? throw new HttpException.NotFound<MessageEntity>(messageId);

		// Keep the denormalised visible-message count in sync; clients show this on the topic row.
		await topicRepository.DecrementMessageCount(updated.TopicId);
		var refreshedTopic = await topicRepository.GetById(updated.TopicId);
		if (refreshedTopic is not null)
			await messageRealtimePublisher.PublishTopicUpdated(TopicService.ToTransport(refreshedTopic));

		var message = ToTransport(updated);
		await messageRealtimePublisher.PublishMessageUpdated(message);
		return message;
	}

	public async Task<DateTime> MarkRead(Guid topicId, Guid currentUserId, DateTime? at)
	{
		using var logger = LogService($"{Log.F(topicId)} {Log.F(currentUserId)} {Log.F(at)}");

		var topic = await topicRepository.GetById(topicId)
			?? throw new HttpException.NotFound<TopicEntity>(topicId);

		var stamp = at ?? DateTime.UtcNow;
		await topicRepository.MarkRead(topic.Id.AsGuid(), currentUserId, stamp);
		await messageRealtimePublisher.PublishReadReceiptUpdated(currentUserId, topic.Id.AsGuid(), stamp);
		return stamp;
	}

	private static string StripTags(string html)
	{
		// Cheap visible-content check, only used to reject empty <p></p>.
		return System.Text.RegularExpressions.Regex.Replace(html, "<[^>]+>", string.Empty).Trim();
	}

	internal static Message ToTransport(MessageEntity e) => new()
	{
		Id = e.Id.AsGuid(),
		TopicId = e.TopicId,
		AuthorUserId = e.AuthorUserId,
		AuthorDisplayName = e.AuthorDisplayName,
		ContentHtml = e.ContentHtml,
		Mentions = e.Mentions,
		CreatedAt = e.CreatedAt,
		EditedAt = e.EditedAt,
		IsDeleted = e.IsDeleted,
		IsSystem = e.IsSystem
	};
}
