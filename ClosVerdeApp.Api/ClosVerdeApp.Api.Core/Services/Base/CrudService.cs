using ClosVerdeApp.Api.Abstractions.Common.Assemblers;
using ClosVerdeApp.Api.Abstractions.Common.Extensions;
using ClosVerdeApp.Api.Abstractions.Common.Helpers;
using ClosVerdeApp.Api.Abstractions.Common.Technical.Tracing;
using ClosVerdeApp.Api.Abstractions.Exceptions;
using ClosVerdeApp.Api.Abstractions.Interfaces.Business;
using ClosVerdeApp.Api.Abstractions.Interfaces.Repositories;
using ClosVerdeApp.Api.Abstractions.Interfaces.Services.Base;
using Microsoft.Extensions.Logging;

namespace ClosVerdeApp.Api.Core.Services.Base;

internal abstract class CrudService<TData, TBase, TEntity>(ILogger logger, ICrudRepository<TEntity, TBase> repository, IBaseAssembler<TData, TEntity> baseAssembler)
	: TracingService(logger), ICrudService<TData, TBase>
	where TData : ITransport
	where TEntity : IEntity
{
	public async Task<TData> Add(TBase @base)
	{
		using var _ = LogService($"{Log.F(@base)}");

		var entity = await repository.Add(@base);

		return baseAssembler.Convert(entity);
	}

	public async Task<TData> Replace(Guid id, TBase @base)
	{
		using var _ = LogService($"{Log.F(id)} {Log.F(@base)}");

		var entity = await repository.Replace(id.AsObjectId(), @base);

		return baseAssembler.Convert(entity);
	}

	public async Task<List<TData>> GetAll()
	{
		using var _ = LogService();

		var entities = await repository.GetAll();

		return baseAssembler.Convert(entities);
	}

	public async Task Delete(Guid id)
	{
		using var _ = LogService($"{Log.F(id)}");

		await repository.Delete(id.AsObjectId());
	}

	public async Task<TData> GetById(Guid id)
	{
		using var _ = LogService();

		var entity = await repository.GetById(id.AsObjectId());

		if (entity is null) throw new HttpException.NotFound<TEntity>(id);

		return baseAssembler.Convert(entity);
	}
}