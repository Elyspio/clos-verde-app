using ClosVerdeApp.Api.Abstractions.Common.Extensions;
using ClosVerdeApp.Api.Abstractions.Common.Helpers;
using ClosVerdeApp.Api.Abstractions.Exceptions;
using ClosVerdeApp.Api.Abstractions.Interfaces.Repositories;
using ClosVerdeApp.Api.Abstractions.Interfaces.Services;
using ClosVerdeApp.Api.Abstractions.Models.Entities;
using ClosVerdeApp.Api.Abstractions.Models.Entities.Enums;
using ClosVerdeApp.Api.Abstractions.Models.Transports;
using Elyspio.Utils.Telemetry.Tracing.Elements;
using Microsoft.Extensions.Logging;

namespace ClosVerdeApp.Api.Core.Services;

/// <summary>
/// Implements <see cref="ITopicService"/>. The Global topic is read-only and undeletable;
/// Reservation topics are managed by the reservation cascade; only Custom topics are user-managed.
/// </summary>
public class TopicService(
	ITopicRepository topicRepository,
	IMessageRepository messageRepository,
	IMessageRealtimePublisher messageRealtimePublisher,
	ILogger<TopicService> logger
) : TracingService(logger), ITopicService
{
	private const string GlobalTopicName = "Général";

	public async Task<List<TopicListItem>> ListForUser(Guid currentUserId)
	{
		using var logger = LogService($"{Log.F(currentUserId)}");

		await EnsureGlobalSeeded();

		var topics = await topicRepository.GetAll();
		var userKey = UserKey(currentUserId);

		var result = new List<TopicListItem>(topics.Count);
		foreach (var t in topics)
		{
			var topicId = t.Id.AsGuid();
			DateTime? lastReadAt = t.ReadReceipts.TryGetValue(userKey, out var at) ? at : null;

			// Count visible messages from other users — use the same query whether or not a receipt
			// exists; this excludes the current user's own messages and soft-deleted messages in both
			// branches. `DateTime.MinValue` is a safe sentinel because all CreatedAt values are after it.
			var unread = await messageRepository.CountAfter(topicId, lastReadAt ?? DateTime.MinValue, currentUserId);

			result.Add(new TopicListItem
			{
				Topic = ToTransport(t),
				UnreadCount = unread,
				IsMuted = t.Muted.TryGetValue(userKey, out var muted) && muted,
				LastReadAt = lastReadAt
			});
		}

		return result;
	}

	public async Task<List<Guid>> ListEngagedTopicIds(Guid currentUserId)
	{
		using var logger = LogService($"{Log.F(currentUserId)}");
		return await messageRepository.GetEngagedTopicIds(currentUserId);
	}

	public async Task Mute(Guid topicId, Guid currentUserId)
	{
		using var logger = LogService($"{Log.F(topicId)} {Log.F(currentUserId)}");
		_ = await topicRepository.GetById(topicId) ?? throw new HttpException.NotFound<TopicEntity>(topicId);
		await topicRepository.Mute(topicId, currentUserId);
	}

	public async Task Unmute(Guid topicId, Guid currentUserId)
	{
		using var logger = LogService($"{Log.F(topicId)} {Log.F(currentUserId)}");
		await topicRepository.Unmute(topicId, currentUserId);
	}

	public async Task<Topic> GetById(Guid id)
	{
		using var logger = LogService($"{Log.F(id)}");
		var t = await topicRepository.GetById(id) ?? throw new HttpException.NotFound<TopicEntity>(id);
		return ToTransport(t);
	}

	public async Task<Topic> CreateCustom(string name, Guid currentUserId, string currentDisplayName)
	{
		using var logger = LogService($"{Log.F(currentUserId)} {Log.F(name)}");

		if (string.IsNullOrWhiteSpace(name))
			throw new HttpException.BadRequest("Le nom du salon est requis.");

		var entity = await topicRepository.Create(TopicKind.Custom, name, currentUserId, currentDisplayName, null);
		var topic = ToTransport(entity);
		await messageRealtimePublisher.PublishTopicCreated(topic);
		return topic;
	}

	public async Task<Topic> Rename(Guid topicId, string newName, Guid currentUserId)
	{
		using var logger = LogService($"{Log.F(topicId)} {Log.F(currentUserId)}");

		if (string.IsNullOrWhiteSpace(newName))
			throw new HttpException.BadRequest("Le nom du salon est requis.");

		var t = await topicRepository.GetById(topicId) ?? throw new HttpException.NotFound<TopicEntity>(topicId);
		if (t.Kind != TopicKind.Custom)
			throw new HttpException.Forbidden("Seuls les salons personnalisés peuvent être renommés.");
		if (t.CreatedByUserId != currentUserId)
			throw new HttpException.Forbidden("Seul le créateur peut renommer ce salon.");

		var updated = await topicRepository.Rename(topicId, newName) ?? throw new HttpException.NotFound<TopicEntity>(topicId);
		var topic = ToTransport(updated);
		await messageRealtimePublisher.PublishTopicUpdated(topic);
		return topic;
	}

	public async Task Delete(Guid topicId, Guid currentUserId)
	{
		using var logger = LogService($"{Log.F(topicId)} {Log.F(currentUserId)}");

		var t = await topicRepository.GetById(topicId) ?? throw new HttpException.NotFound<TopicEntity>(topicId);
		if (t.Kind != TopicKind.Custom)
			throw new HttpException.Forbidden("Seuls les salons personnalisés peuvent être supprimés.");
		if (t.CreatedByUserId != currentUserId)
			throw new HttpException.Forbidden("Seul le créateur peut supprimer ce salon.");

		await messageRepository.DeleteByTopic(topicId);
		await topicRepository.Delete(topicId);
		await messageRealtimePublisher.PublishTopicDeleted(topicId);
	}

	public async Task EnsureGlobalSeeded()
	{
		var existing = await topicRepository.GetGlobal();
		if (existing is not null) return;

		try
		{
			await topicRepository.Create(TopicKind.Global, GlobalTopicName, null, null, null);
		}
		catch (Exception ex)
		{
			logger.LogDebug(ex, "Global topic seed skipped after concurrent create");
		}
	}

	internal static Topic ToTransport(TopicEntity e) => new()
	{
		Id = e.Id.AsGuid(),
		Kind = e.Kind,
		Name = e.Name,
		CreatedByUserId = e.CreatedByUserId,
		CreatedByDisplayName = e.CreatedByDisplayName,
		ReservationId = e.ReservationId,
		CreatedAt = e.CreatedAt,
		UpdatedAt = e.UpdatedAt,
		LastMessageAt = e.LastMessageAt,
		MessageCount = e.MessageCount
	};

	private static string UserKey(Guid userId) => userId.ToString("D");
}
