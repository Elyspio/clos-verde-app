using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using ClosVerdeApp.Api.Abstractions.Exceptions;
using ClosVerdeApp.Api.Abstractions.Interfaces.Services;
using ClosVerdeApp.Api.Abstractions.Models.Transports;
using Elyspio.Utils.Telemetry.Tracing.Elements;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClosVerdeApp.Api.Web.Controllers;

[Authorize]
[Route("api/notifications")]
[ApiController]
public class NotificationsController(
	IPushSubscriptionService pushSubscriptionService,
	ILogger<NotificationsController> logger)
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

	[HttpGet("vapid-public-key")]
	[ProducesResponseType(typeof(VapidPublicKeyResponse), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status404NotFound)]
	public async Task<IActionResult> GetVapidPublicKey()
	{
		using var logger = LogController();
		var response = await pushSubscriptionService.GetPublicKey();
		return response is null ? NotFound() : Ok(response);
	}

	[HttpPut("push-subscription")]
	[ProducesResponseType(StatusCodes.Status204NoContent)]
	public async Task<IActionResult> SavePushSubscription([FromBody] PushSubscriptionRequest request)
	{
		using var logger = LogController();
		await pushSubscriptionService.Save(CurrentUserId, request);
		return NoContent();
	}

	[HttpDelete("push-subscription")]
	[ProducesResponseType(StatusCodes.Status204NoContent)]
	public async Task<IActionResult> DeletePushSubscription([FromBody] DeletePushSubscriptionRequest request)
	{
		using var logger = LogController();
		await pushSubscriptionService.Delete(CurrentUserId, request);
		return NoContent();
	}
}
