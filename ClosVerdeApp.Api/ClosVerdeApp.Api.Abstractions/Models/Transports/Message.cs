using System.ComponentModel.DataAnnotations;
using ClosVerdeApp.Api.Abstractions.Interfaces.Business;

namespace ClosVerdeApp.Api.Abstractions.Models.Transports;

/// <summary>Wire shape of <see cref="Models.Entities.MessageEntity"/>. Content is sanitised HTML.</summary>
public class Message : ITransport
{
	[Required] public required Guid Id { get; init; }
	[Required] public required Guid TopicId { get; init; }
	[Required] public required Guid AuthorUserId { get; init; }
	[Required] public required string AuthorDisplayName { get; init; }
	[Required] public required string ContentHtml { get; init; }
	[Required] public required List<Guid> Mentions { get; init; }
	[Required] public required DateTime CreatedAt { get; init; }
	public DateTime? EditedAt { get; init; }
	[Required] public required bool IsDeleted { get; init; }
	[Required] public required bool IsSystem { get; init; }
}
