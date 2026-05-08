using ClosVerdeApp.Api.Abstractions.Interfaces.Adapters;
using ClosVerdeApp.Api.Abstractions.Interfaces.Injections;
using ClosVerdeApp.Api.Adapters.Rest.Clients;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace ClosVerdeApp.Api.Adapters.Rest.Injections;

public class RestAdapterModule : IDotnetModule
{
	public void Load(IServiceCollection services, IConfiguration configuration)
	{
		// Named HttpClient shared by every Keycloak admin call (token + admin REST). A single
		// SocketsHttpHandler is reused across requests via IHttpClientFactory.
		services.AddHttpClient(KeycloakAdminClient.HttpClientName);
		services.AddSingleton<IKeycloakAdminClient, KeycloakAdminClient>();
	}
}
