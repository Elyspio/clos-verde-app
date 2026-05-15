using ClosVerdeApp.Api.Abstractions.Interfaces.Repositories;
using ClosVerdeApp.Api.Abstractions.Models.Entities;
using ClosVerdeApp.Api.Adapters.Mongo.Repositories.Base;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;

namespace ClosVerdeApp.Api.Adapters.Mongo.Repositories;

internal class PushSubscriptionRepository : BaseRepository<PushSubscriptionEntity>, IPushSubscriptionRepository
{
	public PushSubscriptionRepository(IConfiguration configuration, ILogger<BaseRepository<PushSubscriptionEntity>> logger) : base(configuration, logger)
	{
		CreateIndexIfMissing([nameof(PushSubscriptionEntity.Endpoint)], unique: true);
		CreateIndexIfMissing([nameof(PushSubscriptionEntity.UserId)]);
	}

	public async Task<PushSubscriptionEntity> Upsert(Guid userId, string endpoint, string p256dh, string auth, string? userAgent)
	{
		using var logger = LogAdapter();

		var update = Builders<PushSubscriptionEntity>.Update
			.Set(s => s.UserId, userId)
			.Set(s => s.Endpoint, endpoint)
			.Set(s => s.P256dh, p256dh)
			.Set(s => s.Auth, auth)
			.Set(s => s.UserAgent, userAgent)
			.Set(s => s.UpdatedAt, DateTime.UtcNow)
			.Unset(s => s.LastFailureAt);

		return await EntityCollection.FindOneAndUpdateAsync(
			Builders<PushSubscriptionEntity>.Filter.Eq(s => s.Endpoint, endpoint),
			update,
			new FindOneAndUpdateOptions<PushSubscriptionEntity>
			{
				IsUpsert = true,
				ReturnDocument = ReturnDocument.After
			});
	}

	public async Task Delete(Guid userId, string endpoint)
	{
		using var logger = LogAdapter();
		var filter = Builders<PushSubscriptionEntity>.Filter.And(
			Builders<PushSubscriptionEntity>.Filter.Eq(s => s.UserId, userId),
			Builders<PushSubscriptionEntity>.Filter.Eq(s => s.Endpoint, endpoint));
		await EntityCollection.DeleteOneAsync(filter);
	}

	public async Task DeleteByEndpoint(string endpoint)
	{
		using var logger = LogAdapter();
		await EntityCollection.DeleteOneAsync(s => s.Endpoint == endpoint);
	}

	public async Task<List<PushSubscriptionEntity>> GetByUserIds(IReadOnlyCollection<Guid> userIds)
	{
		using var logger = LogAdapter();
		if (userIds.Count == 0) return [];

		var filter = Builders<PushSubscriptionEntity>.Filter.In(s => s.UserId, userIds);
		return await EntityCollection.Find(filter).ToListAsync();
	}

	public async Task MarkFailure(string endpoint, DateTime failureAt)
	{
		using var logger = LogAdapter();
		var update = Builders<PushSubscriptionEntity>.Update.Set(s => s.LastFailureAt, failureAt);
		await EntityCollection.UpdateOneAsync(s => s.Endpoint == endpoint, update);
	}
}
