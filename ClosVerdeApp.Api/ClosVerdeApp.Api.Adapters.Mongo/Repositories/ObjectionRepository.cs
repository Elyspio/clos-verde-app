using ClosVerdeApp.Api.Abstractions.Common.Helpers;
using ClosVerdeApp.Api.Abstractions.Interfaces.Repositories;
using ClosVerdeApp.Api.Abstractions.Models.Entities;
using ClosVerdeApp.Api.Adapters.Mongo.Repositories.Base;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using MongoDB.Driver.Linq;

namespace ClosVerdeApp.Api.Adapters.Mongo.Repositories;

internal class ObjectionRepository : BaseRepository<ObjectionEntity>, IObjectionRepository
{
	public ObjectionRepository(IConfiguration configuration, ILogger<BaseRepository<ObjectionEntity>> logger) : base(configuration, logger)
	{
		CreateIndexIfMissing(new[] { nameof(ObjectionEntity.ReservationId) });
		CreateIndexIfMissing(new[] { nameof(ObjectionEntity.ReservationId), nameof(ObjectionEntity.UserId) }, unique: true);
	}

	public async Task<List<ObjectionEntity>> GetByReservation(Guid reservationId)
	{
		using var _ = LogAdapter($"{Log.F(reservationId)}");
		return await EntityCollection.AsQueryable()
			.Where(o => o.ReservationId == reservationId)
			.OrderBy(o => o.CreatedAt)
			.ToListAsync();
	}

	public async Task<bool> ExistsForUser(Guid reservationId, Guid userId)
	{
		using var _ = LogAdapter($"{Log.F(reservationId)} {Log.F(userId)}");
		return await EntityCollection.AsQueryable().AnyAsync(o => o.ReservationId == reservationId && o.UserId == userId);
	}

	public async Task<ObjectionEntity?> TryAdd(Guid reservationId, Guid userId, string userDisplayName, string? reason)
	{
		using var _ = LogAdapter($"{Log.F(reservationId)} {Log.F(userId)}");

		var entity = new ObjectionEntity
		{
			ReservationId = reservationId,
			UserId = userId,
			UserDisplayName = userDisplayName,
			Reason = string.IsNullOrWhiteSpace(reason) ? null : reason.Trim(),
			CreatedAt = DateTime.UtcNow
		};

		try
		{
			await EntityCollection.InsertOneAsync(entity);
			return entity;
		}
		catch (MongoWriteException ex) when (ex.WriteError?.Category == ServerErrorCategory.DuplicateKey)
		{
			return null;
		}
	}

	public async Task RemoveByReservation(Guid reservationId)
	{
		using var _ = LogAdapter($"{Log.F(reservationId)}");
		await EntityCollection.DeleteManyAsync(o => o.ReservationId == reservationId);
	}

	public async Task RemoveByReservationAndUser(Guid reservationId, Guid userId)
	{
		using var _ = LogAdapter($"{Log.F(reservationId)} {Log.F(userId)}");
		await EntityCollection.DeleteOneAsync(o => o.ReservationId == reservationId && o.UserId == userId);
	}
}
