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

/// <summary>HTTP surface for topics, their messages, and per-topic read receipts.</summary>
[Authorize]
[Route("api/topics")]
[ApiController]
public class TopicsController(
	ITopicService topicService,
	IMessageService messageService,
	ILogger<TopicsController> logger)
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
	[ProducesResponseType(typeof(List<TopicListItem>), StatusCodes.Status200OK)]
	public async Task<IActionResult> List()
	{
		using var logger = LogController();
		return Ok(await topicService.ListForUser(CurrentUserId));
	}

	[HttpGet("{id:guid}")]
	[ProducesResponseType(typeof(Topic), StatusCodes.Status200OK)]
	public async Task<IActionResult> Get(Guid id)
	{
		using var logger = LogController(Log.F(id));
		return Ok(await topicService.GetById(id));
	}

	[HttpPost]
	[ProducesResponseType(typeof(Topic), StatusCodes.Status201Created)]
	public async Task<IActionResult> Create([FromBody] CreateTopicRequest request)
	{
		using var logger = LogController(Log.F(request.Name));
		var topic = await topicService.CreateCustom(request.Name, CurrentUserId, CurrentDisplayName);
		return Created($"/api/topics/{topic.Id}", topic);
	}

	[HttpPut("{id:guid}")]
	[ProducesResponseType(typeof(Topic), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status403Forbidden)]
	public async Task<IActionResult> Rename(Guid id, [FromBody] RenameTopicRequest request)
	{
		using var logger = LogController($"{Log.F(id)} {Log.F(request.Name)}");
		return Ok(await topicService.Rename(id, request.Name, CurrentUserId, User.IsInRole("admin")));
	}

	[HttpDelete("{id:guid}")]
	[ProducesResponseType(StatusCodes.Status204NoContent)]
	[ProducesResponseType(StatusCodes.Status403Forbidden)]
	public async Task<IActionResult> Delete(Guid id)
	{
		using var logger = LogController(Log.F(id));
		await topicService.Delete(id, CurrentUserId, User.IsInRole("admin"));
		return NoContent();
	}

	[HttpPost("{id:guid}/read")]
	[ProducesResponseType(StatusCodes.Status204NoContent)]
	public async Task<IActionResult> MarkRead(Guid id, [FromBody] MarkReadRequest? request)
	{
		using var logger = LogController(Log.F(id));
		await messageService.MarkRead(id, CurrentUserId, request?.At);
		return NoContent();
	}

	[HttpGet("{id:guid}/messages")]
	[ProducesResponseType(typeof(List<Message>), StatusCodes.Status200OK)]
	public async Task<IActionResult> ListMessages(Guid id, [FromQuery] DateTime? before, [FromQuery] int? limit)
	{
		using var logger = LogController($"{Log.F(id)} {Log.F(before)} {Log.F(limit)}");
		return Ok(await messageService.List(id, before, limit ?? 50));
	}

	[HttpPost("{id:guid}/messages")]
	[ProducesResponseType(typeof(Message), StatusCodes.Status201Created)]
	public async Task<IActionResult> PostMessage(Guid id, [FromBody] PostMessageRequest request)
	{
		using var logger = LogController(Log.F(id));
		var msg = await messageService.Post(id, CurrentUserId, CurrentDisplayName, request.ContentHtml, request.AttachmentIds);
		return Created($"/api/messages/{msg.Id}", msg);
	}

	[HttpGet("me/engaged")]
	[ProducesResponseType(typeof(List<Guid>), StatusCodes.Status200OK)]
	public async Task<IActionResult> ListEngaged()
	{
		using var logger = LogController();
		return Ok(await topicService.ListEngagedTopicIds(CurrentUserId));
	}

	[HttpPut("{id:guid}/mute")]
	[ProducesResponseType(StatusCodes.Status204NoContent)]
	[ProducesResponseType(StatusCodes.Status404NotFound)]
	public async Task<IActionResult> Mute(Guid id)
	{
		using var logger = LogController(Log.F(id));
		await topicService.Mute(id, CurrentUserId);
		return NoContent();
	}

	[HttpDelete("{id:guid}/mute")]
	[ProducesResponseType(StatusCodes.Status204NoContent)]
	public async Task<IActionResult> Unmute(Guid id)
	{
		using var logger = LogController(Log.F(id));
		await topicService.Unmute(id, CurrentUserId);
		return NoContent();
	}
}
