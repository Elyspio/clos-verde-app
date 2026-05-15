
using ClosVerdeApp.Api.Abstractions.Interfaces.Adapters;
using ClosVerdeApp.Api.Abstractions.Interfaces.Services;
using ClosVerdeApp.Api.Abstractions.Models.Configuration;
using ClosVerdeApp.Api.Abstractions.Models.Transports;
using Elyspio.Utils.Telemetry.Tracing.Elements;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ClosVerdeApp.Api.Core.Services;

/// <summary>
/// Implements <see cref="IUserDirectoryService"/>. Wraps <see cref="IKeycloakAdminClient"/>
/// with a short in-memory cache (TTL = <see cref="KeycloakAdminOptions.CacheTtl"/>) so a burst
/// of session-start requests collapses into a single Keycloak round-trip.
/// </summary>
public class UserDirectoryService(
	IKeycloakAdminClient keycloakAdminClient,
	IMemoryCache memoryCache,
	IOptionsMonitor<KeycloakAdminOptions> options,
	ILogger<UserDirectoryService> logger
) : TracingService(logger), IUserDirectoryService
{
	private const string CacheKey = "directory.users";

	public async Task<List<DirectoryUser>> ListAsync(CancellationToken cancellationToken = default)
	{
		using var logger = LogService();

		if (memoryCache.TryGetValue<List<DirectoryUser>>(CacheKey, out var cached) && cached is not null)
			return cached;

		var users = await keycloakAdminClient.ListUsersAsync(cancellationToken);
		memoryCache.Set(CacheKey, users, options.CurrentValue.CacheTtl);
		return users;
	}
}
