using ClosVerdeApp.Api.Abstractions.Common.Helpers;
using ClosVerdeApp.Api.Abstractions.Interfaces.Repositories;
using ClosVerdeApp.Api.Abstractions.Models.Entities;
using ClosVerdeApp.Api.Adapters.Mongo.Repositories.Base;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using MongoDB.Driver.Linq;

namespace ClosVerdeApp.Api.Adapters.Mongo.Repositories;

internal class ReadReceiptRepository : BaseRepository<ReadReceiptEntity>, IReadReceiptRepository
{
	public ReadReceiptRepository(IConfiguration configuration, ILogger<BaseRepository<ReadReceiptEntity>> logger) : base(configuration, logger)
	{
		CreateIndexIfMissing(new[] { nameof(ReadReceiptEntity.UserId), nameof(ReadReceiptEntity.TopicId) }, unique: true);
		CreateIndexIfMissing(new[] { nameof(ReadReceiptEntity.TopicId) });
	}

	public async Task<List<ReadReceiptEntity>> GetByUser(Guid userId)
	{
		using var _ = LogAdapter($"{Log.F(userId)}");
		return await EntityCollection.AsQueryable().Where(r => r.UserId == userId).ToListAsync();
	}

	public async Task<ReadReceiptEntity?> Get(Guid userId, Guid topicId)
	{
		using var _ = LogAdapter($"{Log.F(userId)} {Log.F(topicId)}");
		return await EntityCollection.AsQueryable().FirstOrDefaultAsync(r => r.UserId == userId && r.TopicId == topicId);
	}

	public async Task<ReadReceiptEntity> Upsert(Guid userId, Guid topicId, DateTime at)
	{
		using var _ = LogAdapter($"{Log.F(userId)} {Log.F(topicId)} {Log.F(at)}");

		var filter = Builders<ReadReceiptEntity>.Filter.And(
			Builders<ReadReceiptEntity>.Filter.Eq(r => r.UserId, userId),
			Builders<ReadReceiptEntity>.Filter.Eq(r => r.TopicId, topicId));

		var update = Builders<ReadReceiptEntity>.Update
			.SetOnInsert(r => r.UserId, userId)
			.SetOnInsert(r => r.TopicId, topicId)
			.Set(r => r.LastReadAt, at);

		return await EntityCollection.FindOneAndUpdateAsync(
			filter,
			update,
			new FindOneAndUpdateOptions<ReadReceiptEntity> { IsUpsert = true, ReturnDocument = ReturnDocument.After });
	}

	public async Task DeleteByTopic(Guid topicId)
	{
		using var _ = LogAdapter($"{Log.F(topicId)}");
		await EntityCollection.DeleteManyAsync(r => r.TopicId == topicId);
	}
}
