using System.ComponentModel.DataAnnotations;

namespace ClosVerdeApp.Api.Abstractions.Models.Transports;

/// <summary>Body for <c>PUT /api/topics/{id}</c>. Only the topic creator may rename.</summary>
public class RenameTopicRequest
{
	[Required]
	[StringLength(80, MinimumLength = 1)]
	public required string Name { get; init; }
}
