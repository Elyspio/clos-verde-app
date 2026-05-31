using System.ComponentModel.DataAnnotations;
using ClosVerdeApp.Api.Abstractions.Models.Entities.Enums;

namespace ClosVerdeApp.Api.Abstractions.Models.Transports;

/// <summary>Body for <c>PATCH /api/feedback/{id}/status</c>. Admin-only.</summary>
public class UpdateFeedbackStatusRequest
{
	[Required] public required FeedbackStatus Status { get; init; }

	[StringLength(2000)]
	public string? AdminNote { get; init; }
}
