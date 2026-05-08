using ClosVerdeApp.Api.Abstractions.Common.Extensions;
using ClosVerdeApp.Api.Abstractions.Common.Helpers;
using ClosVerdeApp.Api.Abstractions.Interfaces.Repositories;
using ClosVerdeApp.Api.Abstractions.Models.Entities;
using ClosVerdeApp.Api.Abstractions.Models.Entities.Enums;
using ClosVerdeApp.Api.Adapters.Mongo.Repositories.Base;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using MongoDB.Driver.Linq;

namespace ClosVerdeApp.Api.Adapters.Mongo.Repositories;

internal class TopicRepository : BaseRepository<TopicEntity>, ITopicRepository
{
	public TopicRepository(IConfiguration configuration, ILogger<BaseRepository<TopicEntity>> logger) : base(configuration, logger)
	{
		CreateIndexIfMissing(new[] { nameof(TopicEntity.Kind) });
		CreateIndexIfMissing(new[] { nameof(TopicEntity.ReservationId) });
		CreateIndexIfMissing(new[] { nameof(TopicEntity.LastMessageAt) });
	}

	public async Task<List<TopicEntity>> GetAll()
	{
		using var _ = LogAdapter();
		return await EntityCollection.AsQueryable()
			.OrderByDescending(t => t.LastMessageAt ?? t.CreatedAt)
			.ToListAsync();
	}

	public async Task<TopicEntity?> GetById(Guid id)
	{
		using var _ = LogAdapter($"{Log.F(id)}");
		var oid = id.AsObjectId();
		return await EntityCollection.AsQueryable().FirstOrDefaultAsync(t => t.Id == oid);
	}

	public async Task<TopicEntity?> GetGlobal()
	{
		using var _ = LogAdapter();
		return await EntityCollection.AsQueryable().FirstOrDefaultAsync(t => t.Kind == TopicKind.Global);
	}

	public async Task<TopicEntity?> GetByReservation(Guid reservationId)
	{
		using var _ = LogAdapter($"{Log.F(reservationId)}");
		return await EntityCollection.AsQueryable()
			.FirstOrDefaultAsync(t => t.Kind == TopicKind.Reservation && t.ReservationId == reservationId);
	}

	public async Task<TopicEntity> Create(
		TopicKind kind,
		string name,
		Guid? createdByUserId,
		string? createdByDisplayName,
		Guid? reservationId)
	{
		using var _ = LogAdapter($"{Log.F(kind)} {Log.F(name)}");

		var now = DateTime.UtcNow;
		var entity = new TopicEntity
		{
			Kind = kind,
			Name = name.Trim(),
			CreatedByUserId = createdByUserId,
			CreatedByDisplayName = createdByDisplayName,
			ReservationId = reservationId,
			CreatedAt = now,
			UpdatedAt = now,
			LastMessageAt = null,
			MessageCount = 0
		};

		await EntityCollection.InsertOneAsync(entity);
		return entity;
	}

	public async Task<TopicEntity?> Rename(Guid id, string newName)
	{
		using var _ = LogAdapter($"{Log.F(id)} {Log.F(newName)}");
		var oid = id.AsObjectId();
		var update = Builders<TopicEntity>.Update
			.Set(t => t.Name, newName.Trim())
			.Set(t => t.UpdatedAt, DateTime.UtcNow);

		var entity = await EntityCollection.FindOneAndUpdateAsync(
			Builders<TopicEntity>.Filter.Eq(t => t.Id, oid),
			update,
			new FindOneAndUpdateOptions<TopicEntity> { ReturnDocument = ReturnDocument.After });

		return entity;
	}

	public async Task Delete(Guid id)
	{
		using var _ = LogAdapter($"{Log.F(id)}");
		var oid = id.AsObjectId();
		await EntityCollection.DeleteOneAsync(t => t.Id == oid);
	}

	public async Task BumpStatistics(Guid id, DateTime lastMessageAt, int delta)
	{
		using var _ = LogAdapter($"{Log.F(id)} {Log.F(delta)}");
		var oid = id.AsObjectId();
		var update = Builders<TopicEntity>.Update
			.Set(t => t.LastMessageAt, lastMessageAt)
			.Set(t => t.UpdatedAt, DateTime.UtcNow)
			.Inc(t => t.MessageCount, delta);
		await EntityCollection.UpdateOneAsync(t => t.Id == oid, update);
	}

	public async Task DecrementMessageCount(Guid id)
	{
		using var _ = LogAdapter($"{Log.F(id)}");
		var oid = id.AsObjectId();
		// Conditional decrement so we never go negative if a delete race fires twice for the same row.
		var filter = Builders<TopicEntity>.Filter.And(
			Builders<TopicEntity>.Filter.Eq(t => t.Id, oid),
			Builders<TopicEntity>.Filter.Gt(t => t.MessageCount, 0));
		var update = Builders<TopicEntity>.Update
			.Set(t => t.UpdatedAt, DateTime.UtcNow)
			.Inc(t => t.MessageCount, -1);
		await EntityCollection.UpdateOneAsync(filter, update);
	}
}
