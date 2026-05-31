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

internal class FeedbackRepository : BaseRepository<FeedbackEntity>, IFeedbackRepository
{
	public FeedbackRepository(IConfiguration configuration, ILogger<BaseRepository<FeedbackEntity>> logger) : base(configuration, logger)
	{
		CreateIndexIfMissing([nameof(FeedbackEntity.Status), nameof(FeedbackEntity.Category)]);
		CreateIndexIfMissing(["Author.Id"]);
	}

	public async Task<FeedbackEntity> Create(
		FeedbackCategory category,
		string title,
		string body,
		FeedbackAuthor author,
		List<MessageAttachmentEntity> attachments,
		FeedbackContext? context)
	{
		using var logger = LogAdapter($"{Log.F(category)} {Log.F(author.Id)}");

		var entity = new FeedbackEntity
		{
			Category = category,
			Title = title,
			Body = body,
			Author = author,
			Attachments = attachments ?? [],
			Context = context
		};

		await EntityCollection.InsertOneAsync(entity);
		return entity;
	}

	public async Task<FeedbackEntity?> GetById(Guid id)
	{
		using var logger = LogAdapter($"{Log.F(id)}");
		var oid = id.AsObjectId();
		return await EntityCollection.AsQueryable().FirstOrDefaultAsync(f => f.Id == oid);
	}

	public async Task<List<FeedbackEntity>> List(FeedbackCategory? category, FeedbackStatus? status, int skip, int take)
	{
		using var logger = LogAdapter($"{Log.F(category)} {Log.F(status)} {Log.F(skip)} {Log.F(take)}");

		var filter = BuildFilter(category, status);
		return await EntityCollection
			.Find(filter)
			.SortByDescending(f => f.Id)
			.Skip(skip)
			.Limit(take)
			.ToListAsync();
	}

	public async Task<long> Count(FeedbackCategory? category, FeedbackStatus? status)
	{
		using var logger = LogAdapter($"{Log.F(category)} {Log.F(status)}");
		var filter = BuildFilter(category, status);
		return await EntityCollection.CountDocumentsAsync(filter);
	}

	public async Task<List<FeedbackEntity>> ListByAuthor(Guid authorId, IReadOnlyCollection<FeedbackStatus>? statuses, int skip, int take)
	{
		using var logger = LogAdapter($"{Log.F(authorId)} statuses={statuses?.Count ?? 0} {Log.F(skip)} {Log.F(take)}");

		var filter = BuildAuthorFilter(authorId, statuses);
		return await EntityCollection
			.Find(filter)
			.SortByDescending(f => f.Id)
			.Skip(skip)
			.Limit(take)
			.ToListAsync();
	}

	public async Task<long> CountByAuthor(Guid authorId, IReadOnlyCollection<FeedbackStatus>? statuses)
	{
		using var logger = LogAdapter($"{Log.F(authorId)} statuses={statuses?.Count ?? 0}");
		var filter = BuildAuthorFilter(authorId, statuses);
		return await EntityCollection.CountDocumentsAsync(filter);
	}

	public async Task<FeedbackEntity?> UpdateStatus(Guid id, FeedbackStatus status, string? adminNote, DateTime? resolvedAt)
	{
		using var logger = LogAdapter($"{Log.F(id)} {Log.F(status)}");
		var oid = id.AsObjectId();

		var update = Builders<FeedbackEntity>.Update
			.Set(f => f.Status, status)
			.Set(f => f.AdminNote, adminNote)
			.Set(f => f.ResolvedAt, resolvedAt);

		return await EntityCollection.FindOneAndUpdateAsync(
			Builders<FeedbackEntity>.Filter.Eq(f => f.Id, oid),
			update,
			new FindOneAndUpdateOptions<FeedbackEntity> { ReturnDocument = ReturnDocument.After });
	}

	private static FilterDefinition<FeedbackEntity> BuildFilter(FeedbackCategory? category, FeedbackStatus? status)
	{
		var filters = new List<FilterDefinition<FeedbackEntity>>();
		if (category.HasValue) filters.Add(Builders<FeedbackEntity>.Filter.Eq(f => f.Category, category.Value));
		if (status.HasValue) filters.Add(Builders<FeedbackEntity>.Filter.Eq(f => f.Status, status.Value));
		return filters.Count == 0 ? Builders<FeedbackEntity>.Filter.Empty : Builders<FeedbackEntity>.Filter.And(filters);
	}

	private static FilterDefinition<FeedbackEntity> BuildAuthorFilter(Guid authorId, IReadOnlyCollection<FeedbackStatus>? statuses)
	{
		var filters = new List<FilterDefinition<FeedbackEntity>>
		{
			Builders<FeedbackEntity>.Filter.Eq(f => f.Author.Id, authorId)
		};
		if (statuses is { Count: > 0 }) filters.Add(Builders<FeedbackEntity>.Filter.In(f => f.Status, statuses));
		return Builders<FeedbackEntity>.Filter.And(filters);
	}
}
