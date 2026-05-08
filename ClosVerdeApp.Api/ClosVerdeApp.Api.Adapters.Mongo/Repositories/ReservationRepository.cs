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

internal class ReservationRepository : BaseRepository<ReservationEntity>, IReservationRepository
{
	public ReservationRepository(IConfiguration configuration, ILogger<BaseRepository<ReservationEntity>> logger) : base(configuration, logger)
	{
		CreateIndexIfMissing(new[] { nameof(ReservationEntity.StartDate), nameof(ReservationEntity.EndDate) });
		CreateIndexIfMissing(new[] { nameof(ReservationEntity.UserId) });
	}

	public async Task<List<ReservationEntity>> GetInRange(DateTime from, DateTime to)
	{
		using var _ = LogAdapter($"{Log.F(from)} {Log.F(to)}");

		return await EntityCollection.AsQueryable()
			.Where(r => r.EndDate > from && r.StartDate < to)
			.ToListAsync();
	}

	public async Task<List<ReservationEntity>> GetAll()
	{
		using var _ = LogAdapter();
		return await EntityCollection.AsQueryable().ToListAsync();
	}

	public async Task<List<ReservationEntity>> GetOverlapping(DateTime start, DateTime end, Guid? excludeId = null)
	{
		using var _ = LogAdapter($"{Log.F(start)} {Log.F(end)}");

		var excludedOid = excludeId?.AsObjectId();

		return await EntityCollection.AsQueryable()
			.Where(r => r.StartDate < end && r.EndDate > start && (excludedOid == null || r.Id != excludedOid))
			.ToListAsync();
	}

	public async Task<ReservationEntity?> GetById(Guid id)
	{
		using var _ = LogAdapter($"{Log.F(id)}");

		var oid = id.AsObjectId();
		return await EntityCollection.AsQueryable().FirstOrDefaultAsync(r => r.Id == oid);
	}

	public async Task<ReservationEntity> Create(Guid userId, string userDisplayName, DateTime start, DateTime end, string? note)
	{
		using var _ = LogAdapter($"{Log.F(userId)} {Log.F(start)} {Log.F(end)}");

		var entity = new ReservationEntity
		{
			UserId = userId,
			UserDisplayName = userDisplayName,
			StartDate = start,
			EndDate = end,
			Note = string.IsNullOrWhiteSpace(note) ? null : note.Trim(),
			CreatedAt = DateTime.UtcNow
		};

		await EntityCollection.InsertOneAsync(entity);
		return entity;
	}

	public async Task<ReservationEntity> Update(Guid id, DateTime start, DateTime end, string? note)
	{
		using var _ = LogAdapter($"{Log.F(id)} {Log.F(start)} {Log.F(end)}");

		var oid = id.AsObjectId();
		var update = Builders<ReservationEntity>.Update
			.Set(r => r.StartDate, start)
			.Set(r => r.EndDate, end)
			.Set(r => r.Note, string.IsNullOrWhiteSpace(note) ? null : note.Trim());

		await EntityCollection.UpdateOneAsync(r => r.Id == oid, update);
		return await EntityCollection.AsQueryable().FirstAsync(r => r.Id == oid);
	}

	public async Task Delete(Guid id)
	{
		using var _ = LogAdapter($"{Log.F(id)}");

		var oid = id.AsObjectId();
		await EntityCollection.DeleteOneAsync(r => r.Id == oid);
	}
}
