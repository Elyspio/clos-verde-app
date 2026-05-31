using System.ComponentModel.DataAnnotations;

namespace ClosVerdeApp.Api.Abstractions.Models.Transports;

/// <summary>Body for <c>POST /api/feedback/{id}/replies</c>. Admin-only.</summary>
public class CreateFeedbackReplyRequest
{
	[Required]
	[StringLength(4000, MinimumLength = 1)]
	public required string Body { get; init; }
}
