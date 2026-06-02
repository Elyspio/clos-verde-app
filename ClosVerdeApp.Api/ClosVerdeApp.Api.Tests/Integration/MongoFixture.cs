using System.Threading.Tasks;
using DotNet.Testcontainers.Builders;
using DotNet.Testcontainers.Containers;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace ClosVerdeApp.Api.Tests.Integration;

/// <summary>
/// Spins up a throwaway MongoDB container once for the whole test class and exposes an
/// <see cref="IConfiguration"/> wired with its connection string (key <c>ConnectionStrings:MongoDB</c>),
/// matching what <c>MongoContext</c> expects.
/// </summary>
public sealed class MongoFixture : IAsyncLifetime
{
	private readonly IContainer _container = new ContainerBuilder()
		.WithImage("mongo:7")
		.WithPortBinding(27017, true)
		.WithWaitStrategy(Wait.ForUnixContainer().UntilMessageIsLogged("Waiting for connections"))
		.Build();

	public IConfiguration Configuration { get; private set; } = null!;

	public async ValueTask InitializeAsync()
	{
		await _container.StartAsync();

		var host = _container.Hostname;
		var port = _container.GetMappedPublicPort(27017);
		var connectionString = $"mongodb://{host}:{port}/clos_verde_tests";

		Configuration = new ConfigurationBuilder()
			.AddInMemoryCollection(new Dictionary<string, string?>
			{
				["ConnectionStrings:MongoDB"] = connectionString,
			})
			.Build();
	}

	public async ValueTask DisposeAsync()
	{
		await _container.DisposeAsync();
	}
}
