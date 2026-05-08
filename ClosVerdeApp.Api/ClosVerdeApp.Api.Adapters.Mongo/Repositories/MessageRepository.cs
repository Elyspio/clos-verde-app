using ClosVerdeApp.Api.Abstractions.Common.Extensions;
using ClosVerdeApp.Api.Abstractions.Common.Helpers;
using ClosVerdeApp.Api.Abstractions.Interfaces.Repositories;
using ClosVerdeApp.Api.Abstractions.Models.Entities;
using ClosVerdeApp.Api.Adapters.Mongo.Repositories.Base;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using MongoDB.Driver.Linq;

namespace ClosVerdeApp.Api.Adapters.Mongo.Repositories;

internal class MessageRepository : BaseRepository<MessageEntity>, IMessageRepository
{
	public MessageRepository(IConfiguration configuration, ILogger<BaseRepository<MessageEntity>> logger) : base(configuration, logger)
	{
		CreateIndexIfMissing(new[] { nameof(MessageEntity.TopicId), nameof(MessageEntity.CreatedAt) });
		CreateIndexIfMissing(new[] { nameof(MessageEntity.AuthorUserId) });
	}

	public async Task<List<MessageEntity>> GetByTopic(Guid topicId, DateTime? before, int limit)
	{
		using var _ = LogAdapter($"{Log.F(topicId)} {Log.F(before)} {Log.F(limit)}");
		var q = EntityCollection.AsQueryable().Where(m => m.TopicId == topicId);
		if (before.HasValue)
			q = q.Where(m => m.CreatedAt < before.Value);

		// Take last `limit`, but ordered ascending for display.
		var page = await q.OrderByDescending(m => m.CreatedAt).Take(limit).ToListAsync();
		page.Reverse();
		return page;
	}

	public async Task<MessageEntity?> GetById(Guid id)
	{
		using var _ = LogAdapter($"{Log.F(id)}");
		var oid = id.AsObjectId();
		return await EntityCollection.AsQueryable().FirstOrDefaultAsync(m => m.Id == oid);
	}

	public async Task<MessageEntity> Create(
		Guid topicId,
		Guid authorUserId,
		string authorDisplayName,
		string contentHtml,
		List<Guid> mentions,
		bool isSystem)
	{
		using var _ = LogAdapter($"{Log.F(topicId)} {Log.F(authorUserId)}");

		var entity = new MessageEntity
		{
			TopicId = topicId,
			AuthorUserId = authorUserId,
			AuthorDisplayName = authorDisplayName,
			ContentHtml = contentHtml,
			Mentions = mentions ?? new List<Guid>(),
			CreatedAt = DateTime.UtcNow,
			IsSystem = isSystem
		};

		await EntityCollection.InsertOneAsync(entity);
		return entity;
	}

	public async Task<MessageEntity?> Update(Guid id, string contentHtml, List<Guid> mentions)
	{
		using var _ = LogAdapter($"{Log.F(id)}");
		var oid = id.AsObjectId();
		var update = Builders<MessageEntity>.Update
			.Set(m => m.ContentHtml, contentHtml)
			.Set(m => m.Mentions, mentions ?? new List<Guid>())
			.Set(m => m.EditedAt, DateTime.UtcNow);

		return await EntityCollection.FindOneAndUpdateAsync(
			Builders<MessageEntity>.Filter.Eq(m => m.Id, oid),
			update,
			new FindOneAndUpdateOptions<MessageEntity> { ReturnDocument = ReturnDocument.After });
	}

	public async Task<MessageEntity?> SoftDelete(Guid id)
	{
		using var _ = LogAdapter($"{Log.F(id)}");
		var oid = id.AsObjectId();
		var update = Builders<MessageEntity>.Update
			.Set(m => m.IsDeleted, true)
			.Set(m => m.ContentHtml, string.Empty)
			.Set(m => m.Mentions, new List<Guid>())
			.Set(m => m.EditedAt, DateTime.UtcNow);

		return await EntityCollection.FindOneAndUpdateAsync(
			Builders<MessageEntity>.Filter.Eq(m => m.Id, oid),
			update,
			new FindOneAndUpdateOptions<MessageEntity> { ReturnDocument = ReturnDocument.After });
	}

	public async Task DeleteByTopic(Guid topicId)
	{
		using var _ = LogAdapter($"{Log.F(topicId)}");
		await EntityCollection.DeleteManyAsync(m => m.TopicId == topicId);
	}

	public async Task<int> CountAfter(Guid topicId, DateTime after, Guid excludeAuthorId)
	{
		using var _ = LogAdapter($"{Log.F(topicId)} {Log.F(after)}");
		var count = await EntityCollection.AsQueryable()
			.Where(m => m.TopicId == topicId && m.CreatedAt > after && m.AuthorUserId != excludeAuthorId && !m.IsDeleted)
			.CountAsync();
		return (int)count;
	}
}
