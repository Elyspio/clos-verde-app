using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using ClosVerdeApp.Api.Abstractions.Common.Helpers;
using ClosVerdeApp.Api.Abstractions.Exceptions;
using ClosVerdeApp.Api.Abstractions.Interfaces.Services;
using ClosVerdeApp.Api.Abstractions.Models.Entities.Enums;
using ClosVerdeApp.Api.Abstractions.Models.Transports;
using Elyspio.Utils.Telemetry.Tracing.Elements;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClosVerdeApp.Api.Web.Controllers;

/// <summary>
/// HTTP surface for the feedback feature. Authenticated users can submit feedback and
/// list their own; admins (Keycloak realm role <c>admin</c>) can list everything and
/// update statuses.
/// </summary>
[Authorize]
[Route("api/feedback")]
[ApiController]
public class FeedbackController(
	IFeedbackService feedbackService,
	ILogger<FeedbackController> logger)
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

	private string? CurrentEmail
		=> User.FindFirstValue(JwtRegisteredClaimNames.Email) ?? User.FindFirstValue(ClaimTypes.Email);

	[HttpPost]
	[ProducesResponseType(typeof(Feedback), StatusCodes.Status201Created)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	public async Task<IActionResult> Create([FromBody] CreateFeedbackRequest request)
	{
		using var logger = LogController($"{Log.F(request.Category)}");

		var feedback = await feedbackService.Create(request, CurrentUserId, CurrentDisplayName, CurrentEmail);
		return Created($"/api/feedback/{feedback.Id}", feedback);
	}

	[HttpGet]
	[Authorize(Roles = "admin")]
	[ProducesResponseType(typeof(FeedbackListResult), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status403Forbidden)]
	public async Task<IActionResult> List(
		[FromQuery] FeedbackCategory? category,
		[FromQuery] FeedbackStatus? status,
		[FromQuery] int page = 1,
		[FromQuery] int pageSize = 20)
	{
		using var logger = LogController($"{Log.F(category)} {Log.F(status)} {Log.F(page)} {Log.F(pageSize)}");
		return Ok(await feedbackService.List(category, status, page, pageSize));
	}

	[HttpGet("me")]
	[ProducesResponseType(typeof(FeedbackListResult), StatusCodes.Status200OK)]
	public async Task<IActionResult> ListMine(
		[FromQuery] List<FeedbackStatus>? status,
		[FromQuery] int page = 1,
		[FromQuery] int pageSize = 20)
	{
		using var logger = LogController($"statuses={status?.Count ?? 0} {Log.F(page)} {Log.F(pageSize)}");
		return Ok(await feedbackService.ListMine(CurrentUserId, status, page, pageSize));
	}

	[HttpPatch("me/{id:guid}/close")]
	[ProducesResponseType(typeof(Feedback), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status403Forbidden)]
	[ProducesResponseType(StatusCodes.Status404NotFound)]
	public async Task<IActionResult> CloseMine(Guid id)
	{
		using var logger = LogController(Log.F(id));
		return Ok(await feedbackService.CloseMine(id, CurrentUserId));
	}

	[HttpGet("{id:guid}")]
	[Authorize(Roles = "admin")]
	[ProducesResponseType(typeof(Feedback), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status404NotFound)]
	[ProducesResponseType(StatusCodes.Status403Forbidden)]
	public async Task<IActionResult> GetById(Guid id)
	{
		using var logger = LogController(Log.F(id));
		var feedback = await feedbackService.GetById(id);
		return feedback is null ? NotFound() : Ok(feedback);
	}

	[HttpPatch("{id:guid}/status")]
	[Authorize(Roles = "admin")]
	[ProducesResponseType(typeof(Feedback), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status404NotFound)]
	[ProducesResponseType(StatusCodes.Status403Forbidden)]
	public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateFeedbackStatusRequest request)
	{
		using var logger = LogController($"{Log.F(id)} {Log.F(request.Status)}");
		return Ok(await feedbackService.UpdateStatus(id, request.Status, request.AdminNote));
	}
}
