using System.ComponentModel.DataAnnotations;
using ClosVerdeApp.Api.Abstractions.Models.Entities.Enums;

namespace ClosVerdeApp.Api.Abstractions.Models.Transports;

/// <summary>
/// Body for <c>POST /api/feedback</c>. <see cref="AttachmentIds"/> reference files previously
/// uploaded by the same user via <c>POST /api/attachments</c>.
/// </summary>
public class CreateFeedbackRequest
{
	[Required] public required FeedbackCategory Category { get; init; }

	[Required]
	[StringLength(120, MinimumLength = 1)]
	public required string Title { get; init; }

	[Required]
	[StringLength(4000, MinimumLength = 1)]
	public required string Body { get; init; }

	public List<Guid> AttachmentIds { get; init; } = [];

	public FeedbackContextDto? Context { get; init; }
}
