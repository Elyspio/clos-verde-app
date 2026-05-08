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

internal class ReservationRepository : BaseRepository<ReservationEntity>, IReservationRepository
{
	public ReservationRepository(IConfiguration configuration, ILogger<BaseRepository<ReservationEntity>> logger) : base(configuration, logger)
	{
		CreateIndexIfMissing(new[] { nameof(ReservationEntity.StartDate), nameof(ReservationEntity.EndDate) });
		CreateIndexIfMissing(new[] { nameof(ReservationEntity.UserId) });
		CreateIndexIfMissing(new[] { nameof(ReservationEntity.Status) });
		CreateIndexIfMissing(new[] { nameof(ReservationEntity.Status), nameof(ReservationEntity.ValidationDeadline) });
	}

	public async Task<List<ReservationEntity>> GetInRange(DateTime from, DateTime to)
	{
		using var _ = LogAdapter($"{Log.F(from)} {Log.F(to)}");

		return await EntityCollection.AsQueryable()
			.Where(r => r.EndDate > from && r.StartDate < to && r.Status != ReservationStatus.Cancelled)
			.ToListAsync();
	}

	public async Task<List<ReservationEntity>> GetAll()
	{
		using var _ = LogAdapter();
		return await EntityCollection.AsQueryable()
			.Where(r => r.Status != ReservationStatus.Cancelled)
			.ToListAsync();
	}

	public async Task<List<ReservationEntity>> GetOverlapping(DateTime start, DateTime end, Guid? excludeId = null)
	{
		using var _ = LogAdapter($"{Log.F(start)} {Log.F(end)}");

		var excludedOid = excludeId?.AsObjectId();

		return await EntityCollection.AsQueryable()
			.Where(r => r.StartDate < end
						&& r.EndDate > start
						&& r.Status != ReservationStatus.Cancelled
						&& (excludedOid == null || r.Id != excludedOid))
			.ToListAsync();
	}

	public async Task<bool> ExistsConflictingValidatedOrPending(DateTime start, DateTime end, Guid? excludeId)
	{
		var overlapping = await GetOverlapping(start, end, excludeId);
		return overlapping.Count > 0;
	}

	public async Task<ReservationEntity?> GetById(Guid id)
	{
		using var _ = LogAdapter($"{Log.F(id)}");

		var oid = id.AsObjectId();
		return await EntityCollection.AsQueryable().FirstOrDefaultAsync(r => r.Id == oid);
	}

	public async Task<ReservationEntity> Create(
		Guid userId,
		string userDisplayName,
		DateTime start,
		DateTime end,
		string? note,
		ReservationStatus status,
		DateTime validationDeadline)
	{
		using var _ = LogAdapter($"{Log.F(userId)} {Log.F(start)} {Log.F(end)}");

		var entity = new ReservationEntity
		{
			UserId = userId,
			UserDisplayName = userDisplayName,
			StartDate = start,
			EndDate = end,
			Note = string.IsNullOrWhiteSpace(note) ? null : note.Trim(),
			CreatedAt = DateTime.UtcNow,
			Status = status,
			ValidationDeadline = validationDeadline,
			ObjectionCount = 0,
			ValidatedAt = status == ReservationStatus.Validated ? DateTime.UtcNow : null
		};

		await EntityCollection.InsertOneAsync(entity);
		return entity;
	}

	public async Task<ReservationEntity> Update(Guid id, DateTime start, DateTime end, string? note, DateTime newDeadline)
	{
		using var _ = LogAdapter($"{Log.F(id)} {Log.F(start)} {Log.F(end)}");

		var oid = id.AsObjectId();
		var update = Builders<ReservationEntity>.Update
			.Set(r => r.StartDate, start)
			.Set(r => r.EndDate, end)
			.Set(r => r.Note, string.IsNullOrWhiteSpace(note) ? null : note.Trim())
			.Set(r => r.ValidationDeadline, newDeadline);

		await EntityCollection.UpdateOneAsync(r => r.Id == oid, update);
		return await EntityCollection.AsQueryable().FirstAsync(r => r.Id == oid);
	}

	public async Task Delete(Guid id)
	{
		using var _ = LogAdapter($"{Log.F(id)}");

		var oid = id.AsObjectId();
		await EntityCollection.DeleteOneAsync(r => r.Id == oid);
	}

	public async Task<List<ReservationEntity>> GetPendingDue(DateTime nowUtc)
	{
		using var _ = LogAdapter($"{Log.F(nowUtc)}");
		return await EntityCollection.AsQueryable()
			.Where(r => r.Status == ReservationStatus.Pending
						&& r.ObjectionCount == 0
						&& r.ValidationDeadline <= nowUtc)
			.ToListAsync();
	}

	public async Task<List<ReservationEntity>> GetPendingExpired(DateTime nowUtc)
	{
		using var _ = LogAdapter($"{Log.F(nowUtc)}");
		return await EntityCollection.AsQueryable()
			.Where(r => r.Status == ReservationStatus.Pending
						&& r.ObjectionCount > 0
						&& r.StartDate <= nowUtc)
			.ToListAsync();
	}

	public async Task<bool> TryAutoValidate(Guid id, DateTime atUtc)
	{
		var oid = id.AsObjectId();
		var filter = Builders<ReservationEntity>.Filter.And(
			Builders<ReservationEntity>.Filter.Eq(r => r.Id, oid),
			Builders<ReservationEntity>.Filter.Eq(r => r.Status, ReservationStatus.Pending),
			Builders<ReservationEntity>.Filter.Eq(r => r.ObjectionCount, 0),
			Builders<ReservationEntity>.Filter.Lte(r => r.ValidationDeadline, atUtc));

		var update = Builders<ReservationEntity>.Update
			.Set(r => r.Status, ReservationStatus.Validated)
			.Set(r => r.ValidatedAt, atUtc);

		var res = await EntityCollection.UpdateOneAsync(filter, update);
		return res.ModifiedCount == 1;
	}

	public async Task<bool> TryForceValidate(Guid id, DateTime atUtc)
	{
		var oid = id.AsObjectId();
		var filter = Builders<ReservationEntity>.Filter.And(
			Builders<ReservationEntity>.Filter.Eq(r => r.Id, oid),
			Builders<ReservationEntity>.Filter.Eq(r => r.Status, ReservationStatus.Pending));

		var update = Builders<ReservationEntity>.Update
			.Set(r => r.Status, ReservationStatus.Validated)
			.Set(r => r.ValidatedAt, atUtc);

		var res = await EntityCollection.UpdateOneAsync(filter, update);
		return res.ModifiedCount == 1;
	}

	public async Task<bool> TryAutoCancel(Guid id, DateTime atUtc)
	{
		var oid = id.AsObjectId();
		var filter = Builders<ReservationEntity>.Filter.And(
			Builders<ReservationEntity>.Filter.Eq(r => r.Id, oid),
			Builders<ReservationEntity>.Filter.Eq(r => r.Status, ReservationStatus.Pending));

		var update = Builders<ReservationEntity>.Update
			.Set(r => r.Status, ReservationStatus.Cancelled)
			.Set(r => r.CancelledAt, atUtc);

		var res = await EntityCollection.UpdateOneAsync(filter, update);
		return res.ModifiedCount == 1;
	}

	public async Task<bool> TryIncrementObjectionCount(Guid id)
	{
		var oid = id.AsObjectId();
		var filter = Builders<ReservationEntity>.Filter.And(
			Builders<ReservationEntity>.Filter.Eq(r => r.Id, oid),
			Builders<ReservationEntity>.Filter.Eq(r => r.Status, ReservationStatus.Pending));

		var update = Builders<ReservationEntity>.Update.Inc(r => r.ObjectionCount, 1);

		var res = await EntityCollection.UpdateOneAsync(filter, update);
		return res.ModifiedCount == 1;
	}

	public async Task ResetObjectionCount(Guid id)
	{
		var oid = id.AsObjectId();
		var update = Builders<ReservationEntity>.Update.Set(r => r.ObjectionCount, 0);
		await EntityCollection.UpdateOneAsync(r => r.Id == oid, update);
	}

	public async Task<bool> TrySetTopicId(Guid id, Guid topicId)
	{
		var oid = id.AsObjectId();
		var filter = Builders<ReservationEntity>.Filter.And(
			Builders<ReservationEntity>.Filter.Eq(r => r.Id, oid),
			Builders<ReservationEntity>.Filter.Eq(r => r.TopicId, (Guid?)null));

		var update = Builders<ReservationEntity>.Update.Set(r => r.TopicId, topicId);
		var res = await EntityCollection.UpdateOneAsync(filter, update);
		return res.ModifiedCount == 1;
	}

	public async Task<long> BackfillLegacyAsValidated()
	{
		using var _ = LogAdapter();

		// Legacy rows lack the Status field entirely.
		var filter = Builders<ReservationEntity>.Filter.Exists("Status", false);

		var now = DateTime.UtcNow;
		var update = Builders<ReservationEntity>.Update
			.Set(r => r.Status, ReservationStatus.Validated)
			.Set(r => r.ObjectionCount, 0)
			.Set(r => r.ValidationDeadline, now)
			.Set(r => r.ValidatedAt, now);

		var res = await EntityCollection.UpdateManyAsync(filter, update);
		return res.ModifiedCount;
	}
}
