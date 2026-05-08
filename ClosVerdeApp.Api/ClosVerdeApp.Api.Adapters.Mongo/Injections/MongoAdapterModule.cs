using ClosVerdeApp.Api.Abstractions.Interfaces.Injections;
using ClosVerdeApp.Api.Adapters.Mongo.Repositories;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace ClosVerdeApp.Api.Adapters.Mongo.Injections;

public class MongoAdapterModule : IDotnetModule
{
	public void Load(IServiceCollection services, IConfiguration configuration)
	{
		services.Scan(scan => scan
			.FromAssemblyOf<MongoAdapterModule>()
			.AddClasses(classes => classes.InNamespaceOf<ReservationRepository>(), false)
			.AsImplementedInterfaces()
			.WithSingletonLifetime()
		);
	}
}
