using ClosVerdeApp.Api.Abstractions.Models.Transports;

namespace ClosVerdeApp.Api.Abstractions.Interfaces.Services;

/// <summary>
/// Returns the realm's user directory for the messaging composer (`@mention` candidates).
/// Wraps the Keycloak Admin client with a short-TTL in-memory cache so a burst of logins
/// doesn't fan out to N requests against Keycloak.
/// </summary>
public interface IUserDirectoryService
{
	Task<List<DirectoryUser>> ListAsync(CancellationToken cancellationToken = default);
}
