using ClosVerdeApp.Api.Abstractions.Interfaces.Business;
using ClosVerdeApp.Api.Abstractions.Common.Extensions;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace ClosVerdeApp.Api.Abstractions.Models.Entities;

/// <summary>
/// A single chat message. <c>ContentHtml</c> is server-sanitised; soft-deleted messages
/// keep their row so timestamps stay stable but their content is wiped.
/// </summary>
public class MessageEntity : IEntity
{
	[BsonId]
	[BsonRepresentation(BsonType.ObjectId)]
	public ObjectId Id { get; set; }

	[BsonGuidRepresentation(GuidRepresentation.Standard)]
	public required Guid TopicId { get; set; }

	[BsonGuidRepresentation(GuidRepresentation.Standard)]
	public required Guid AuthorUserId { get; set; }

	public required string AuthorDisplayName { get; set; }

	public string ContentHtml { get; set; } = string.Empty;

	[BsonGuidRepresentation(GuidRepresentation.Standard)]
	public List<Guid> Mentions { get; set; } = [];

	[BsonIgnore]
	public DateTime CreatedAt => Id.GetCreatedAt();

	public DateTime? EditedAt { get; set; }

	public bool IsDeleted { get; set; }

	public bool IsSystem { get; set; }
}
