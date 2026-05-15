
using ClosVerdeApp.Api.Abstractions.Interfaces.Services;
using ClosVerdeApp.Api.Abstractions.Models.Transports;
using Elyspio.Utils.Telemetry.Tracing.Elements;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClosVerdeApp.Api.Web.Controllers;

/// <summary>HTTP surface for the realm user directory. Powers the messaging composer's <c>@mention</c> suggestions.</summary>
[Authorize]
[Route("api/users")]
[ApiController]
public class UsersController(IUserDirectoryService userDirectoryService, ILogger<UsersController> logger) : TracingController(logger)
{
	[HttpGet]
	[ProducesResponseType(typeof(List<DirectoryUser>), StatusCodes.Status200OK)]
	public async Task<IActionResult> List(CancellationToken cancellationToken)
	{
		using var logger = LogController();
		return Ok(await userDirectoryService.ListAsync(cancellationToken));
	}
}
