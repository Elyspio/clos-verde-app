using System.ComponentModel.DataAnnotations;

namespace ClosVerdeApp.Api.Abstractions.Models.Transports;

/// <summary>Body for posting or editing a message. The HTML is sanitised server-side.</summary>
public class PostMessageRequest
{
	[Required]
	[StringLength(20000, MinimumLength = 1)]
	public required string ContentHtml { get; init; }
}
