using System.ComponentModel.DataAnnotations;

namespace ClosVerdeApp.Api.Abstractions.Models.Transports;

/// <summary>Body for <c>POST /api/topics</c>. Always creates a Custom topic.</summary>
public class CreateTopicRequest
{
	[Required]
	[StringLength(80, MinimumLength = 1)]
	public required string Name { get; init; }
}
