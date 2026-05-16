using System.IdentityModel.Tokens.Jwt;
using System.Net.Mime;
using System.Security.Claims;
using ClosVerdeApp.Api.Abstractions.Common.Helpers;
using ClosVerdeApp.Api.Abstractions.Exceptions;
using ClosVerdeApp.Api.Abstractions.Interfaces.Services;
using ClosVerdeApp.Api.Abstractions.Models.Transports;
using ClosVerdeApp.Api.Web.Technical.Streaming;
using Elyspio.Utils.Telemetry.Tracing.Elements;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Net.Http.Headers;

namespace ClosVerdeApp.Api.Web.Controllers;

/// <summary>
/// HTTP surface for message attachments. Upload returns a transport object whose <c>id</c>
/// the client passes to <c>POST /api/topics/{id}/messages</c> via <c>attachmentIds</c>.
/// The upload endpoint streams the multipart section directly into GridFS — no buffering of
/// the request body — so files much larger than memory or the BodyReader buffer never get
/// materialised. The size cap is enforced inside the streaming wrapper so an over-limit
/// payload aborts as soon as it crosses the threshold.
/// </summary>
[Authorize]
[Route("api/attachments")]
[ApiController]
public class AttachmentsController(
	IAttachmentService attachmentService,
	ILogger<AttachmentsController> logger)
	: TracingController(logger)
{
	private const long RequestSizeBudgetBytes = 30L * 1024 * 1024;
	private const int BoundaryLengthLimit = 128;

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

	[HttpPost]
	[DisableFormValueModelBinding]
	[RequestSizeLimit(RequestSizeBudgetBytes)]
	[ProducesResponseType(typeof(Attachment), StatusCodes.Status201Created)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	public async Task<IActionResult> Upload(CancellationToken cancellationToken)
	{
		using var logger = LogController($"contentType={Request.ContentType}");

		if (!MultipartRequestHelper.IsMultipartContentType(Request.ContentType))
			throw new HttpException.BadRequest("La requête doit être un multipart/form-data.");

		var boundary = MultipartRequestHelper.GetBoundary(
			MediaTypeHeaderValue.Parse(Request.ContentType ?? string.Empty),
			BoundaryLengthLimit);

		var reader = new MultipartReader(boundary, Request.Body);
		var section = await reader.ReadNextSectionAsync(cancellationToken);

		while (section != null)
		{
			if (ContentDispositionHeaderValue.TryParse(section.ContentDisposition, out var disposition)
				&& MultipartRequestHelper.HasFileContentDisposition(disposition))
			{
				var fileName = HeaderUtilities.RemoveQuotes(disposition.FileNameStar.HasValue ? disposition.FileNameStar : disposition.FileName).Value
					?? throw new HttpException.BadRequest("Le nom de fichier est requis.");

				var contentType = section.ContentType ?? "application/octet-stream";

				// The service wraps this in its own LimitedReadStream sized to MaxFileSizeBytes,
				// but we add an outer guard equal to the request budget too: defence in depth
				// against an inflated content-length header that bypassed [RequestSizeLimit].
				await using var limited = new LimitedReadStream(section.Body, attachmentService.MaxFileSizeBytes);

				try
				{
					var attachment = await attachmentService.Upload(CurrentUserId, fileName, contentType, limited);
					return Created(attachment.DownloadUrl, attachment);
				}
				catch (InvalidDataException ex)
				{
					throw new HttpException.BadRequest(ex.Message);
				}
			}

			section = await reader.ReadNextSectionAsync(cancellationToken);
		}

		throw new HttpException.BadRequest("Aucun fichier reçu dans la requête multipart.");
	}

	[HttpGet("{id:guid}")]
	[ProducesResponseType(typeof(FileResult), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status404NotFound)]
	public async Task<IActionResult> Download(Guid id)
	{
		using var logger = LogController(Log.F(id));
		var (metadata, content) = await attachmentService.Download(id);

		var disposition = new ContentDisposition
		{
			FileName = metadata.FileName,
			Inline = metadata.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase),
		};
		Response.Headers.ContentDisposition = disposition.ToString();
		// GridFS files are immutable; allow short-term private caching.
		Response.Headers.CacheControl = "private, max-age=300";
		Response.Headers.ContentLength = metadata.SizeBytes;
		// File(...) streams from the GridFS download stream directly into the response body
		// using ASP.NET's StreamResultExecutor — no full buffering on the server side.
		return File(content, metadata.ContentType, enableRangeProcessing: true);
	}

	[HttpGet("{id:guid}/metadata")]
	[ProducesResponseType(typeof(Attachment), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status404NotFound)]
	public async Task<IActionResult> GetMetadata(Guid id)
	{
		using var logger = LogController(Log.F(id));
		var (metadata, content) = await attachmentService.Download(id);
		await content.DisposeAsync();
		return Ok(attachmentService.ToTransport(metadata));
	}
}
