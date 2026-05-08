namespace ClosVerdeApp.Api.Abstractions.Models.Configuration;

/// <summary>
/// Configuration for the Keycloak Admin REST API client used to populate the user directory
/// (mention candidates). The client secret is bound from <c>dotnet user-secrets</c> in dev and
/// from environment variables / vault in prod — never from <c>appsettings.json</c>.
/// </summary>
public sealed class KeycloakAdminOptions
{
	public const string SectionName = "Keycloak:Admin";

	/// <summary>Service-account client id (e.g. <c>cv_dev-api</c>). Public — safe to commit.</summary>
	public string ClientId { get; set; } = string.Empty;

	/// <summary>Service-account secret. Loaded from user-secrets / env vars; never persisted in appsettings.</summary>
	public string ClientSecret { get; set; } = string.Empty;

	/// <summary>OIDC token endpoint of the realm.</summary>
	public string TokenEndpoint { get; set; } = string.Empty;

	/// <summary>Admin REST endpoint listing the realm's users.</summary>
	public string UsersEndpoint { get; set; } = string.Empty;

	/// <summary>How long the in-memory directory cache stays valid before a refresh fires.</summary>
	public TimeSpan CacheTtl { get; set; } = TimeSpan.FromMinutes(5);
}
