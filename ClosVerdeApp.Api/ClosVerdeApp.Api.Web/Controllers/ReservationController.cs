using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using ClosVerdeApp.Api.Abstractions.Common.Helpers;
using ClosVerdeApp.Api.Abstractions.Exceptions;
using ClosVerdeApp.Api.Abstractions.Interfaces.Services;
using ClosVerdeApp.Api.Abstractions.Models.Transports;
using Elyspio.Utils.Telemetry.Tracing.Elements;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClosVerdeApp.Api.Web.Controllers;

/// <summary>HTTP surface for reservations: list, CRUD, force-validate, and reservation objection.</summary>
[Authorize]
[Route("api/reservations")]
[ApiController]
public class ReservationController(
	IReservationService reservationService,
	IObjectionService objectionService,
	ILogger<ReservationController> logger)
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

	private string CurrentDisplayName
		=> User.FindFirstValue(JwtRegisteredClaimNames.Name) ?? User.FindFirstValue(ClaimTypes.Name) ?? "Anonyme";

	[HttpGet]
	[ProducesResponseType(typeof(List<Reservation>), StatusCodes.Status200OK)]
	public async Task<IActionResult> GetRange([FromQuery] DateTime? from, [FromQuery] DateTime? to)
	{
		using var logger = LogController($"{Log.F(from)} {Log.F(to)}");

		if (from is null || to is null)
			return Ok(await reservationService.GetAll());

		return Ok(await reservationService.GetRange(from.Value, to.Value));
	}

	[HttpGet("leaderboard")]
	[ProducesResponseType(typeof(List<LeaderboardEntry>), StatusCodes.Status200OK)]
	public async Task<IActionResult> GetLeaderboard()
	{
		using var logger = LogController();
		return Ok(await reservationService.GetLeaderboard());
	}

	[HttpPost]
	[ProducesResponseType(typeof(Reservation), StatusCodes.Status201Created)]
	[ProducesResponseType(StatusCodes.Status409Conflict)]
	public async Task<IActionResult> Create([FromBody] CreateReservationRequest request)
	{
		using var logger = LogController($"{Log.F(request.StartDate)} {Log.F(request.EndDate)}");

		var reservation = await reservationService.Create(request, CurrentUserId, CurrentDisplayName, User.IsInRole("admin"));
		return Created($"/api/reservations/{reservation.Id}", reservation);
	}

	[HttpPut("{id:guid}")]
	[ProducesResponseType(typeof(Reservation), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status403Forbidden)]
	[ProducesResponseType(StatusCodes.Status409Conflict)]
	public async Task<IActionResult> Update(Guid id, [FromBody] CreateReservationRequest request)
	{
		using var logger = LogController($"{Log.F(id)} {Log.F(request.StartDate)} {Log.F(request.EndDate)}");

		return Ok(await reservationService.Update(id, request, CurrentUserId, User.IsInRole("admin")));
	}

	[HttpDelete("{id:guid}")]
	[ProducesResponseType(StatusCodes.Status204NoContent)]
	[ProducesResponseType(StatusCodes.Status403Forbidden)]
	public async Task<IActionResult> Delete(Guid id)
	{
		using var logger = LogController(Log.F(id));

		await reservationService.Delete(id, CurrentUserId, User.IsInRole("admin"));
		return NoContent();
	}

	[HttpPost("{id:guid}/validate")]
	[ProducesResponseType(typeof(Reservation), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status403Forbidden)]
	[ProducesResponseType(StatusCodes.Status409Conflict)]
	public async Task<IActionResult> ForceValidate(Guid id)
	{
		using var logger = LogController(Log.F(id));
		return Ok(await reservationService.ForceValidate(id, CurrentUserId, User.IsInRole("admin")));
	}

	[HttpPost("{id:guid}/objections")]
	[ProducesResponseType(typeof(Objection), StatusCodes.Status201Created)]
	[ProducesResponseType(StatusCodes.Status403Forbidden)]
	[ProducesResponseType(StatusCodes.Status409Conflict)]
	public async Task<IActionResult> CreateObjection(Guid id, [FromBody] CreateObjectionRequest request)
	{
		using var logger = LogController(Log.F(id));
		var created = await objectionService.Object(id, CurrentUserId, CurrentDisplayName, request.Reason);
		return Created($"/api/reservations/{id}/objections/{created.Id}", created);
	}
}
