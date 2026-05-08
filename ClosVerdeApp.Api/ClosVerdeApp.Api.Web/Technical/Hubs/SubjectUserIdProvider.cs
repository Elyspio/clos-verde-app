using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.SignalR;

namespace ClosVerdeApp.Api.Web.Technical.Hubs;

/// <summary>
/// Returns the JWT 'sub' claim (= user GUID) so that <c>Clients.User(userId.ToString())</c> targets the correct connection.
/// </summary>
public sealed class SubjectUserIdProvider : IUserIdProvider
{
	public string? GetUserId(HubConnectionContext connection)
	{
		var user = connection.User;
		return user?.FindFirstValue(JwtRegisteredClaimNames.Sub)
			?? user?.FindFirstValue(ClaimTypes.NameIdentifier);
	}
}
