using Elyspio.Utils.Telemetry;
using ClosVerdeApp.Api.Abstractions.Common.Helpers;
using ClosVerdeApp.Api.Abstractions.Interfaces.Business;
using ClosVerdeApp.Api.Abstractions.Interfaces.Repositories;
using Mapster;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MongoDB.Bson;
using MongoDB.Driver;
using MongoDB.Driver.Linq;

namespace ClosVerdeApp.Api.Adapters.Mongo.Repositories.Base;

/// <inheritdoc cref="ICrudRepository{TEntity,TBase}" />
internal abstract class CrudRepository<TEntity, TBase>(IConfiguration configuration, ILogger<BaseRepository<TEntity>> logger) : BaseRepository<TEntity>(configuration, logger),
	ICrudRepository<TEntity, TBase> where TEntity : IEntity
{
	protected FilterDefinitionBuilder<TEntity> Filter = Builders<TEntity>.Filter;
	protected UpdateDefinitionBuilder<TEntity> Update = Builders<TEntity>.Update;

	public async Task<TEntity> Add(TBase @base)
	{
		using var trace = Logger.Trace($"{Log.F(@base)}");

		var entity = @base!.Adapt<TEntity>();

		await EntityCollection.InsertOneAsync(entity);

		trace.Exit($"{entity.Id}");

		return entity;
	}

	public async Task<TEntity> Replace(ObjectId id, TBase @base)
	{
		using var trace = Logger.Trace($"{Log.F(id)} {Log.F(@base)}");

		var entity = @base!.Adapt<TEntity>();

		entity.Id = id;

		var filter = Filter.Eq(e => e.Id, id);

		await EntityCollection.ReplaceOneAsync(filter, entity);

		return entity;
	}

	public async Task<List<TEntity>> GetAll()
	{
		using var trace = Logger.Trace();

		var entities = await EntityCollection.AsQueryable().ToListAsync();

		trace.Exit($"{Log.F(entities.Count)}");

		return entities;
	}

	public async Task Delete(ObjectId id)
	{
		using var trace = Logger.Trace();

		var filter = Filter.Eq(e => e.Id, id);

		var result = await EntityCollection.DeleteOneAsync(filter);

		trace.Exit($"{Log.F(result.DeletedCount)}");
	}

	public async Task<TEntity?> GetById(ObjectId id)
	{
		using var trace = Logger.Trace();

		var filter = Filter.Eq(e => e.Id, id);

		var found = await EntityCollection.Find(filter).FirstOrDefaultAsync();

		trace.Exit($"{Log.F(found is not null)}");

		return found;
	}
}