using System.ComponentModel.DataAnnotations;
using ClosVerdeApp.Api.Abstractions.Interfaces.Business;

namespace ClosVerdeApp.Api.Abstractions.Models.Transports;

/// <summary>
/// A user from the Keycloak realm directory. Source of truth for <c>@mention</c> suggestions
/// in the messaging composer.
/// </summary>
public class DirectoryUser : ITransport
{
	[Required] public required Guid Id { get; init; }
	[Required] public required string DisplayName { get; init; }
	public string? Email { get; init; }
}
