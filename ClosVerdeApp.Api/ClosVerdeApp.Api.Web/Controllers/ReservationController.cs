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

/// <summary>HTTP surface for reservations: list, CRUD, force-validate, and per-reservation objections.</summary>
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
	public async Task<IActionResult> GetMonth([FromQuery] int? year, [FromQuery] int? month)
	{
		using var _ = LogController($"{Log.F(year)} {Log.F(month)}");

		if (year is null || month is null)
			return Ok(await reservationService.GetAll());

		return Ok(await reservationService.GetMonth(year.Value, month.Value));
	}

	[HttpGet("leaderboard")]
	[ProducesResponseType(typeof(List<LeaderboardEntry>), StatusCodes.Status200OK)]
	public async Task<IActionResult> GetLeaderboard()
	{
		using var _ = LogController();
		return Ok(await reservationService.GetLeaderboard());
	}

	[HttpPost]
	[ProducesResponseType(typeof(Reservation), StatusCodes.Status201Created)]
	[ProducesResponseType(StatusCodes.Status409Conflict)]
	public async Task<IActionResult> Create([FromBody] CreateReservationRequest request)
	{
		using var _ = LogController($"{Log.F(request.StartDate)} {Log.F(request.EndDate)}");

		var reservation = await reservationService.Create(request, CurrentUserId, CurrentDisplayName);
		return Created($"/api/reservations/{reservation.Id}", reservation);
	}

	[HttpPut("{id:guid}")]
	[ProducesResponseType(typeof(Reservation), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status403Forbidden)]
	[ProducesResponseType(StatusCodes.Status409Conflict)]
	public async Task<IActionResult> Update(Guid id, [FromBody] CreateReservationRequest request)
	{
		using var _ = LogController($"{Log.F(id)} {Log.F(request.StartDate)} {Log.F(request.EndDate)}");

		return Ok(await reservationService.Update(id, request, CurrentUserId));
	}

	[HttpDelete("{id:guid}")]
	[ProducesResponseType(StatusCodes.Status204NoContent)]
	[ProducesResponseType(StatusCodes.Status403Forbidden)]
	public async Task<IActionResult> Delete(Guid id)
	{
		using var _ = LogController(Log.F(id));

		await reservationService.Delete(id, CurrentUserId);
		return NoContent();
	}

	[HttpPost("{id:guid}/validate")]
	[ProducesResponseType(typeof(Reservation), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status403Forbidden)]
	[ProducesResponseType(StatusCodes.Status409Conflict)]
	public async Task<IActionResult> ForceValidate(Guid id)
	{
		using var _ = LogController(Log.F(id));
		return Ok(await reservationService.ForceValidate(id, CurrentUserId));
	}

	[HttpGet("{id:guid}/objections")]
	[ProducesResponseType(typeof(List<Objection>), StatusCodes.Status200OK)]
	public async Task<IActionResult> ListObjections(Guid id)
	{
		using var _ = LogController(Log.F(id));
		return Ok(await reservationService.GetObjections(id));
	}

	[HttpPost("{id:guid}/objections")]
	[ProducesResponseType(typeof(Objection), StatusCodes.Status201Created)]
	[ProducesResponseType(StatusCodes.Status403Forbidden)]
	[ProducesResponseType(StatusCodes.Status409Conflict)]
	public async Task<IActionResult> CreateObjection(Guid id, [FromBody] CreateObjectionRequest request)
	{
		using var _ = LogController(Log.F(id));
		var created = await objectionService.Object(id, CurrentUserId, CurrentDisplayName, request.Reason);
		return Created($"/api/reservations/{id}/objections/{created.Id}", created);
	}
}
