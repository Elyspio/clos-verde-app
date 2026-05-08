using System.Globalization;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using ClosVerdeApp.Api.Abstractions.Interfaces.Adapters;
using ClosVerdeApp.Api.Abstractions.Models.Configuration;
using ClosVerdeApp.Api.Abstractions.Models.Transports;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ClosVerdeApp.Api.Adapters.Rest.Clients;

/// <summary>
/// Implements <see cref="IKeycloakAdminClient"/> against Keycloak's Admin REST API using a
/// <c>client_credentials</c> grant. The bearer token is cached in <see cref="IMemoryCache"/>
/// for slightly less than its <c>expires_in</c> so callers don't pay a token round-trip every time.
/// </summary>
public sealed class KeycloakAdminClient(
	IHttpClientFactory httpClientFactory,
	IMemoryCache memoryCache,
	IOptionsMonitor<KeycloakAdminOptions> options,
	ILogger<KeycloakAdminClient> logger
) : IKeycloakAdminClient
{
	internal const string HttpClientName = "keycloak-admin";
	private const string TokenCacheKey = "keycloak-admin-token";

	public async Task<List<DirectoryUser>> ListUsersAsync(CancellationToken cancellationToken = default)
	{
		var token = await GetAccessTokenAsync(forceRefresh: false, cancellationToken);
		var users = await CallListUsersAsync(token, cancellationToken);
		return users;
	}

	private async Task<List<DirectoryUser>> CallListUsersAsync(string accessToken, CancellationToken cancellationToken)
	{
		var opts = options.CurrentValue;
		var client = httpClientFactory.CreateClient(HttpClientName);
		using var request = new HttpRequestMessage(HttpMethod.Get, BuildListUsersUrl(opts.UsersEndpoint));
		request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

		using var response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cancellationToken);

		// One retry path: a 401 here means the cached token went stale despite our TTL margin.
		// Drop it, fetch a new one, and try once more.
		if (response.StatusCode == HttpStatusCode.Unauthorized)
		{
			logger.LogWarning("Keycloak Admin returned 401 with a cached token; refreshing and retrying once");
			memoryCache.Remove(TokenCacheKey);
			var fresh = await GetAccessTokenAsync(forceRefresh: true, cancellationToken);
			using var retryRequest = new HttpRequestMessage(HttpMethod.Get, BuildListUsersUrl(opts.UsersEndpoint));
			retryRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", fresh);
			using var retryResponse = await client.SendAsync(retryRequest, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
			retryResponse.EnsureSuccessStatusCode();
			return await ParseUsersAsync(retryResponse, cancellationToken);
		}

		response.EnsureSuccessStatusCode();
		return await ParseUsersAsync(response, cancellationToken);
	}

	private static string BuildListUsersUrl(string usersEndpoint)
	{
		// `briefRepresentation=true` skips heavy attributes; `max=200` lifts Keycloak's default page size of 100.
		// Both matter for a small realm — pagination is unnecessary at this scale.
		var separator = usersEndpoint.Contains('?') ? '&' : '?';
		return $"{usersEndpoint}{separator}briefRepresentation=true&max=200";
	}

	private static async Task<List<DirectoryUser>> ParseUsersAsync(HttpResponseMessage response, CancellationToken cancellationToken)
	{
		var raw = await response.Content.ReadFromJsonAsync<List<KeycloakUserDto>>(cancellationToken: cancellationToken)
			?? new List<KeycloakUserDto>();

		var directory = new List<DirectoryUser>(raw.Count);
		foreach (var u in raw)
		{
			if (!u.Enabled || string.IsNullOrWhiteSpace(u.Id) || !Guid.TryParse(u.Id, out var id)) continue;
			var displayName = ComposeDisplayName(u);
			if (string.IsNullOrWhiteSpace(displayName)) continue;
			directory.Add(new DirectoryUser
			{
				Id = id,
				DisplayName = displayName,
				Email = string.IsNullOrWhiteSpace(u.Email) ? null : u.Email
			});
		}

		// Sort by display name for stable client-side rendering and search.
		directory.Sort((a, b) => string.Compare(a.DisplayName, b.DisplayName, StringComparison.CurrentCultureIgnoreCase));
		return directory;
	}

	private static string ComposeDisplayName(KeycloakUserDto u)
	{
		var fullName = string.Join(' ', new[] { u.FirstName, u.LastName }.Where(p => !string.IsNullOrWhiteSpace(p)));
		return !string.IsNullOrWhiteSpace(fullName) ? fullName : (u.Username ?? string.Empty);
	}

	private async Task<string> GetAccessTokenAsync(bool forceRefresh, CancellationToken cancellationToken)
	{
		if (!forceRefresh && memoryCache.TryGetValue<string>(TokenCacheKey, out var cached) && !string.IsNullOrEmpty(cached))
			return cached;

		var opts = options.CurrentValue;
		if (string.IsNullOrWhiteSpace(opts.ClientId) || string.IsNullOrWhiteSpace(opts.ClientSecret))
			throw new InvalidOperationException("Keycloak admin credentials are not configured (Keycloak:Admin:ClientId / ClientSecret).");
		if (string.IsNullOrWhiteSpace(opts.TokenEndpoint))
			throw new InvalidOperationException("Keycloak:Admin:TokenEndpoint is not configured.");

		var client = httpClientFactory.CreateClient(HttpClientName);
		using var request = new HttpRequestMessage(HttpMethod.Post, opts.TokenEndpoint)
		{
			Content = new FormUrlEncodedContent(new[]
			{
				new KeyValuePair<string, string>("grant_type", "client_credentials"),
				new KeyValuePair<string, string>("client_id", opts.ClientId),
				new KeyValuePair<string, string>("client_secret", opts.ClientSecret)
			})
		};

		using var response = await client.SendAsync(request, cancellationToken);
		response.EnsureSuccessStatusCode();

		var payload = await response.Content.ReadFromJsonAsync<TokenResponse>(cancellationToken: cancellationToken)
			?? throw new InvalidOperationException("Empty response from Keycloak token endpoint.");
		if (string.IsNullOrEmpty(payload.AccessToken))
			throw new InvalidOperationException("Keycloak token endpoint returned no access_token.");

		// Cache 30 s shy of the actual expiry to avoid mid-request expiration races.
		var ttl = TimeSpan.FromSeconds(Math.Max(30, payload.ExpiresIn - 30));
		memoryCache.Set(TokenCacheKey, payload.AccessToken, ttl);
		logger.LogDebug("Cached new Keycloak admin token (ttl={Ttl})", ttl.ToString("c", CultureInfo.InvariantCulture));
		return payload.AccessToken;
	}

	private sealed record TokenResponse(
		[property: System.Text.Json.Serialization.JsonPropertyName("access_token")] string AccessToken,
		[property: System.Text.Json.Serialization.JsonPropertyName("expires_in")] int ExpiresIn,
		[property: System.Text.Json.Serialization.JsonPropertyName("token_type")] string? TokenType);

	private sealed record KeycloakUserDto(
		[property: System.Text.Json.Serialization.JsonPropertyName("id")] string? Id,
		[property: System.Text.Json.Serialization.JsonPropertyName("username")] string? Username,
		[property: System.Text.Json.Serialization.JsonPropertyName("firstName")] string? FirstName,
		[property: System.Text.Json.Serialization.JsonPropertyName("lastName")] string? LastName,
		[property: System.Text.Json.Serialization.JsonPropertyName("email")] string? Email,
		[property: System.Text.Json.Serialization.JsonPropertyName("enabled")] bool Enabled);
}
