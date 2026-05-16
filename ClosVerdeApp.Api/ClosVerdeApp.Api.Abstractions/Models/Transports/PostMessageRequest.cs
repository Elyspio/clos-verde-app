using System.ComponentModel.DataAnnotations;

namespace ClosVerdeApp.Api.Abstractions.Models.Transports;

/// <summary>
/// Body for posting or editing a message. The HTML is sanitised server-side.
/// On post, at least one of <see cref="ContentHtml"/> or <see cref="AttachmentIds"/> must be non-empty.
/// On edit, attachments are ignored (only text is editable).
/// </summary>
public class PostMessageRequest
{
	[StringLength(20000)]
	public string ContentHtml { get; init; } = string.Empty;

	/// <summary>
	/// Ids of files previously uploaded via <c>POST /api/attachments</c> by the same user.
	/// Files are bound to the message on post and become read-only afterwards.
	/// </summary>
	public List<Guid> AttachmentIds { get; init; } = [];
}
