using ClosVerdeApp.Api.Abstractions.Models.Transports;
using Microsoft.AspNetCore.Mvc;

namespace ClosVerdeApp.Api.Web.Controllers;

/// <summary>Swagger-only surface used to expose SignalR event payload schemas to the generated frontend client.</summary>
[Route("api/swagger/realtime-events")]
[ApiController]
[ApiExplorerSettings(GroupName = "v1")]
public class RealtimeEventsSchemaController : ControllerBase
{
	[HttpGet("reservation-changed")]
	[ProducesResponseType(typeof(ReservationChangedEvent), StatusCodes.Status200OK)]
	public IActionResult ReservationChanged()
	{
		return Ok();
	}

	[HttpGet("topic-changed")]
	[ProducesResponseType(typeof(TopicChangedEvent), StatusCodes.Status200OK)]
	public IActionResult TopicChanged()
	{
		return Ok();
	}

	[HttpGet("message-changed")]
	[ProducesResponseType(typeof(MessageChangedEvent), StatusCodes.Status200OK)]
	public IActionResult MessageChanged()
	{
		return Ok();
	}

	[HttpGet("feedback-changed")]
	[ProducesResponseType(typeof(FeedbackChangedEvent), StatusCodes.Status200OK)]
	public IActionResult FeedbackChanged()
	{
		return Ok();
	}
}
