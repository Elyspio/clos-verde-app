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
		CreateIndexIfMissing(["startDate", "endDate"]);
		CreateIndexIfMissing(["user.id"]);
		CreateIndexIfMissing(["validation.status"]);
		CreateIndexIfMissing(["validation.status", "validation.deadline"]);
	}

	public async Task<List<ReservationEntity>> GetInRange(DateTime from, DateTime to)
	{
		using var logger = LogAdapter($"{Log.F(from)} {Log.F(to)}");

		return await EntityCollection.AsQueryable()
			.Where(r => r.EndDate > from && r.StartDate < to && r.Validation.Status != ReservationStatus.Cancelled)
			.ToListAsync();
	}

	public async Task<List<ReservationEntity>> GetAll()
	{
		using var logger = LogAdapter();
		return await EntityCollection.AsQueryable()
			.Where(r => r.Validation.Status != ReservationStatus.Cancelled)
			.ToListAsync();
	}

	public async Task<List<ReservationEntity>> GetOverlapping(DateTime start, DateTime end, Guid? excludeId = null)
	{
		using var logger = LogAdapter($"{Log.F(start)} {Log.F(end)}");

		var excludedOid = excludeId?.AsObjectId();

		return await EntityCollection.AsQueryable()
			.Where(r => r.StartDate < end
						&& r.EndDate > start
						&& r.Validation.Status != ReservationStatus.Cancelled
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
		using var logger = LogAdapter($"{Log.F(id)}");

		var oid = id.AsObjectId();
		return await EntityCollection.AsQueryable().FirstOrDefaultAsync(r => r.Id == oid);
	}

	public async Task<ReservationEntity> Create(
		ReservationUserRef user,
		DateTime start,
		DateTime end,
		string? note,
		ReservationStatus status,
		DateTime validationDeadline)
	{
		using var logger = LogAdapter($"{Log.F(user.Id)} {Log.F(start)} {Log.F(end)}");

		var nowUtc = DateTime.UtcNow;
		var entity = new ReservationEntity
		{
			User = user,
			StartDate = start,
			EndDate = end,
			Note = string.IsNullOrWhiteSpace(note) ? null : note.Trim(),
			Validation = new ReservationValidation
			{
				Status = status,
				Deadline = validationDeadline,
				ValidatedAt = status == ReservationStatus.Validated ? nowUtc : null,
			},
			Objection = null,
		};

		await EntityCollection.InsertOneAsync(entity);
		return entity;
	}

	public async Task<ReservationEntity> Update(Guid id, DateTime start, DateTime end, string? note, DateTime newDeadline)
	{
		using var logger = LogAdapter($"{Log.F(id)} {Log.F(start)} {Log.F(end)}");

		var oid = id.AsObjectId();
		var update = Builders<ReservationEntity>.Update
			.Set(r => r.StartDate, start)
			.Set(r => r.EndDate, end)
			.Set(r => r.Note, string.IsNullOrWhiteSpace(note) ? null : note.Trim())
			.Set(r => r.Validation.Deadline, newDeadline);

		await EntityCollection.UpdateOneAsync(r => r.Id == oid, update);
		return await EntityCollection.AsQueryable().FirstAsync(r => r.Id == oid);
	}

	public async Task Delete(Guid id)
	{
		using var logger = LogAdapter($"{Log.F(id)}");

		var oid = id.AsObjectId();
		await EntityCollection.DeleteOneAsync(r => r.Id == oid);
	}

	public async Task<List<ReservationEntity>> GetPendingDue(DateTime nowUtc)
	{
		using var logger = LogAdapter($"{Log.F(nowUtc)}");
		return await EntityCollection.AsQueryable()
			.Where(r => r.Validation.Status == ReservationStatus.Pending
						&& r.Objection == null
						&& r.Validation.Deadline <= nowUtc)
			.ToListAsync();
	}

	public async Task<List<ReservationEntity>> GetPendingExpired(DateTime nowUtc)
	{
		using var logger = LogAdapter($"{Log.F(nowUtc)}");
		return await EntityCollection.AsQueryable()
			.Where(r => r.Validation.Status == ReservationStatus.Pending
						&& r.Objection != null
						&& r.StartDate <= nowUtc)
			.ToListAsync();
	}

	public async Task<bool> TryAutoValidate(Guid id, DateTime atUtc)
	{
		var oid = id.AsObjectId();
		var filter = Builders<ReservationEntity>.Filter.And(
			Builders<ReservationEntity>.Filter.Eq(r => r.Id, oid),
			Builders<ReservationEntity>.Filter.Eq(r => r.Validation.Status, ReservationStatus.Pending),
			Builders<ReservationEntity>.Filter.Eq(r => r.Objection, null),
			Builders<ReservationEntity>.Filter.Lte(r => r.Validation.Deadline, atUtc));

		var update = Builders<ReservationEntity>.Update
			.Set(r => r.Validation.Status, ReservationStatus.Validated)
			.Set(r => r.Validation.ValidatedAt, atUtc);

		var res = await EntityCollection.UpdateOneAsync(filter, update);
		return res.ModifiedCount == 1;
	}

	public async Task<bool> TryForceValidate(Guid id, DateTime atUtc)
	{
		var oid = id.AsObjectId();
		var filter = Builders<ReservationEntity>.Filter.And(
			Builders<ReservationEntity>.Filter.Eq(r => r.Id, oid),
			Builders<ReservationEntity>.Filter.Eq(r => r.Validation.Status, ReservationStatus.Pending));

		var update = Builders<ReservationEntity>.Update
			.Set(r => r.Validation.Status, ReservationStatus.Validated)
			.Set(r => r.Validation.ValidatedAt, atUtc);

		var res = await EntityCollection.UpdateOneAsync(filter, update);
		return res.ModifiedCount == 1;
	}

	public async Task<bool> TryAutoCancel(Guid id, DateTime atUtc)
	{
		var oid = id.AsObjectId();
		var filter = Builders<ReservationEntity>.Filter.And(
			Builders<ReservationEntity>.Filter.Eq(r => r.Id, oid),
			Builders<ReservationEntity>.Filter.Eq(r => r.Validation.Status, ReservationStatus.Pending));

		var update = Builders<ReservationEntity>.Update
			.Set(r => r.Validation.Status, ReservationStatus.Cancelled)
			.Set(r => r.Validation.CancelledAt, atUtc);

		var res = await EntityCollection.UpdateOneAsync(filter, update);
		return res.ModifiedCount == 1;
	}

	public async Task<bool> TrySetObjection(Guid id, ReservationObjectionEntity objection)
	{
		var oid = id.AsObjectId();
		var filter = Builders<ReservationEntity>.Filter.And(
			Builders<ReservationEntity>.Filter.Eq(r => r.Id, oid),
			Builders<ReservationEntity>.Filter.Eq(r => r.Validation.Status, ReservationStatus.Pending),
			Builders<ReservationEntity>.Filter.Eq(r => r.Objection, null));

		var update = Builders<ReservationEntity>.Update.Set(r => r.Objection, objection);

		var res = await EntityCollection.UpdateOneAsync(filter, update);
		return res.ModifiedCount == 1;
	}

	public async Task ClearObjection(Guid id)
	{
		var oid = id.AsObjectId();
		var update = Builders<ReservationEntity>.Update.Set(r => r.Objection, null);
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
}
