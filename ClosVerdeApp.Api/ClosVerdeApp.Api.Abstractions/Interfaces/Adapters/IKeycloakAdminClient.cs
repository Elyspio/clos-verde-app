using ClosVerdeApp.Api.Abstractions.Models.Transports;

namespace ClosVerdeApp.Api.Abstractions.Interfaces.Adapters;

/// <summary>
/// Thin wrapper around the Keycloak Admin REST API. Owns its own access-token lifecycle
/// (client_credentials grant + token caching) so callers in the Core layer don't have to.
/// </summary>
public interface IKeycloakAdminClient
{
	/// <summary>Lists the realm's users. Filters out disabled accounts. May throw on transport failures.</summary>
	Task<List<DirectoryUser>> ListUsersAsync(CancellationToken cancellationToken = default);
}
