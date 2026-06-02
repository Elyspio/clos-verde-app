using ClosVerdeApp.Api.Abstractions.Common.Extensions;
using ClosVerdeApp.Api.Abstractions.Common.Helpers;
using ClosVerdeApp.Api.Abstractions.Interfaces.Repositories;
using ClosVerdeApp.Api.Abstractions.Models.Entities;
using ClosVerdeApp.Api.Adapters.Mongo.Repositories.Base;
using ClosVerdeApp.Api.Adapters.Mongo.Technical;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MongoDB.Bson;
using MongoDB.Driver;
using MongoDB.Driver.Linq;

namespace ClosVerdeApp.Api.Adapters.Mongo.Repositories;

internal class MessageRepository : BaseRepository<MessageEntity>, IMessageRepository
{
	public MessageRepository(IConfiguration configuration, ILogger<BaseRepository<MessageEntity>> logger) : base(configuration, logger)
	{
		CreateIndexIfMissing([nameof(MessageEntity.TopicId), "_id"]);
		CreateIndexIfMissing([nameof(MessageEntity.AuthorUserId)]);
	}

	public async Task<List<MessageEntity>> GetByTopic(Guid topicId, Guid? before, int limit)
	{
		using var logger = LogAdapter($"{Log.F(topicId)} {Log.F(before)} {Log.F(limit)}");
		var q = EntityCollection.AsQueryable().Where(m => m.TopicId == topicId);
		if (before.HasValue)
		{
			// Exact, opaque cursor: `before` is the id of the oldest message already loaded.
			// Comparing against its real ObjectId (not a timestamp-derived bound) keeps paging
			// stable even when several messages share the same one-second ObjectId timestamp —
			// no duplicates, no skipped messages at page boundaries.
			var beforeId = before.Value.AsObjectId();
			q = q.Where(m => m.Id < beforeId);
		}

		// Take last `limit`, but ordered ascending for display.
		var page = await q.OrderByDescending(m => m.Id).Take(limit).ToListAsync();
		page.Reverse();
		return page;
	}

	public async Task<MessageEntity?> GetById(Guid id)
	{
		using var logger = LogAdapter($"{Log.F(id)}");
		var oid = id.AsObjectId();
		return await EntityCollection.AsQueryable().FirstOrDefaultAsync(m => m.Id == oid);
	}

	public async Task<MessageEntity> Create(
		Guid topicId,
		Guid authorUserId,
		string authorDisplayName,
		string contentHtml,
		List<Guid> mentions,
		List<MessageAttachmentEntity> attachments,
		bool isSystem)
	{
		using var logger = LogAdapter($"{Log.F(topicId)} {Log.F(authorUserId)}");

		var entity = new MessageEntity
		{
			TopicId = topicId,
			AuthorUserId = authorUserId,
			AuthorDisplayName = authorDisplayName,
			ContentHtml = contentHtml,
			Mentions = mentions ?? [],
			Attachments = attachments ?? [],
			IsSystem = isSystem
		};

		await EntityCollection.InsertOneAsync(entity);
		return entity;
	}

	public async Task<MessageEntity?> Update(Guid id, string contentHtml, List<Guid> mentions)
	{
		using var logger = LogAdapter($"{Log.F(id)}");
		var oid = id.AsObjectId();
		var update = Builders<MessageEntity>.Update
			.Set(m => m.ContentHtml, contentHtml)
			.Set(m => m.Mentions, mentions ?? [])
			.Set(m => m.EditedAt, DateTime.UtcNow);

		return await EntityCollection.FindOneAndUpdateAsync(
			Builders<MessageEntity>.Filter.Eq(m => m.Id, oid),
			update,
			new FindOneAndUpdateOptions<MessageEntity> { ReturnDocument = ReturnDocument.After });
	}

	public async Task<MessageEntity?> SoftDelete(Guid id)
	{
		using var logger = LogAdapter($"{Log.F(id)}");
		var oid = id.AsObjectId();
		var update = Builders<MessageEntity>.Update
			.Set(m => m.IsDeleted, true)
			.Set(m => m.ContentHtml, string.Empty)
			.Set(m => m.Mentions, [])
			.Set(m => m.EditedAt, DateTime.UtcNow);

		return await EntityCollection.FindOneAndUpdateAsync(
			Builders<MessageEntity>.Filter.Eq(m => m.Id, oid),
			update,
			new FindOneAndUpdateOptions<MessageEntity> { ReturnDocument = ReturnDocument.After });
	}

	public async Task DeleteByTopic(Guid topicId)
	{
		using var logger = LogAdapter($"{Log.F(topicId)}");
		await EntityCollection.DeleteManyAsync(m => m.TopicId == topicId);
	}

	public async Task<int> CountAfter(Guid topicId, DateTime after, Guid excludeAuthorId)
	{
		using var logger = LogAdapter($"{Log.F(topicId)} {Log.F(after)}");
		// `after` is the read-receipt timestamp (1-second resolution, like ObjectId timestamps).
		// Using the *maximum* ObjectId of that second as the exclusive lower bound treats every
		// message created within the read second as already read — so a freshly-read topic does
		// not keep a phantom unread count, regardless of the process that generated the ids.
		var afterId = ObjectIdBounds.Max(after);
		var count = await EntityCollection.AsQueryable()
			.Where(m => m.TopicId == topicId && m.Id > afterId && m.AuthorUserId != excludeAuthorId && !m.IsDeleted)
			.CountAsync();
		return (int)count;
	}

	public async Task<List<Guid>> GetEngagedTopicIds(Guid userId)
	{
		using var logger = LogAdapter($"{Log.F(userId)}");
		var filter = Builders<MessageEntity>.Filter.And(
			Builders<MessageEntity>.Filter.Eq(m => m.IsDeleted, false),
			Builders<MessageEntity>.Filter.Or(
				Builders<MessageEntity>.Filter.Eq(m => m.AuthorUserId, userId),
				Builders<MessageEntity>.Filter.AnyEq(m => m.Mentions, userId)));

		return await EntityCollection.Distinct(m => m.TopicId, filter).ToListAsync();
	}
}
