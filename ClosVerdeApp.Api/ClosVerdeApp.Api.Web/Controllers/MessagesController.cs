using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using ClosVerdeApp.Api.Abstractions.Common.Helpers;
using ClosVerdeApp.Api.Abstractions.Common.Technical.Tracing;
using ClosVerdeApp.Api.Abstractions.Exceptions;
using ClosVerdeApp.Api.Abstractions.Interfaces.Services;
using ClosVerdeApp.Api.Abstractions.Models.Transports;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClosVerdeApp.Api.Web.Controllers;

/// <summary>HTTP surface for editing or soft-deleting an individual message (author only).</summary>
[Authorize]
[Route("api/messages")]
[ApiController]
public class MessagesController(
	IMessageService messageService,
	ILogger<MessagesController> logger)
	: TracingController(logger)
{
	private Guid CurrentUserId
	{
		get
		{
			var idClaim = User.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
			if (!Guid.TryParse(idClaim, out var userId))
				throw new HttpException.Unauthorized("Jeton invalide.");
			return userId;
		}
	}

	[HttpPut("{id:guid}")]
	[ProducesResponseType(typeof(Message), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status403Forbidden)]
	public async Task<IActionResult> Edit(Guid id, [FromBody] PostMessageRequest request)
	{
		using var _ = LogController(Log.F(id));
		return Ok(await messageService.Edit(id, CurrentUserId, request.ContentHtml));
	}

	[HttpDelete("{id:guid}")]
	[ProducesResponseType(typeof(Message), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status403Forbidden)]
	public async Task<IActionResult> Delete(Guid id)
	{
		using var _ = LogController(Log.F(id));
		return Ok(await messageService.SoftDelete(id, CurrentUserId));
	}
}
