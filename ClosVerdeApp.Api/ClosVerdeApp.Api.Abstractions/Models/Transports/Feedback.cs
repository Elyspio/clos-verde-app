using System.ComponentModel.DataAnnotations;
using ClosVerdeApp.Api.Abstractions.Interfaces.Business;
using ClosVerdeApp.Api.Abstractions.Models.Entities.Enums;

namespace ClosVerdeApp.Api.Abstractions.Models.Transports;

/// <summary>Wire shape of <see cref="Models.Entities.FeedbackEntity"/>.</summary>
public class Feedback : ITransport
{
	[Required] public required Guid Id { get; init; }
	[Required] public required FeedbackCategory Category { get; init; }
	[Required] public required FeedbackStatus Status { get; init; }
	[Required] public required string Title { get; init; }
	[Required] public required string Body { get; init; }
	[Required] public required FeedbackAuthorDto Author { get; init; }
	[Required] public required List<Attachment> Attachments { get; init; }
	public FeedbackContextDto? Context { get; init; }
	[Required] public required List<FeedbackReplyDto> Replies { get; init; }
	[Required] public required DateTime CreatedAt { get; init; }
	public DateTime? ResolvedAt { get; init; }
	public string? AdminNote { get; init; }
}

public class FeedbackReplyDto
{
	[Required] public required Guid Id { get; init; }
	[Required] public required string AuthorDisplayName { get; init; }
	[Required] public required bool IsAdmin { get; init; }
	[Required] public required string Body { get; init; }
	[Required] public required DateTime CreatedAt { get; init; }
}

public class FeedbackAuthorDto
{
	[Required] public required Guid Id { get; init; }
	[Required] public required string DisplayName { get; init; }
	public string? Email { get; init; }
}

public class FeedbackContextDto
{
	public string? Url { get; init; }
	public string? UserAgent { get; init; }
	public string? AppVersion { get; init; }
}
