using ClosVerdeApp.Api.Abstractions.Common.Extensions;
using ClosVerdeApp.Api.Abstractions.Interfaces.Business;
using ClosVerdeApp.Api.Abstractions.Models.Entities.Enums;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace ClosVerdeApp.Api.Abstractions.Models.Entities;

/// <summary>
/// Persisted feedback submitted by an end-user (bug, suggestion, question, other).
/// Visible only to users carrying the Keycloak realm role <c>admin</c>. Attachments
/// reuse the messaging GridFS bucket via <see cref="MessageAttachmentEntity"/>.
/// </summary>
public class FeedbackEntity : IEntity
{
	[BsonId]
	[BsonRepresentation(BsonType.ObjectId)]
	public ObjectId Id { get; set; }

	public required FeedbackCategory Category { get; set; }

	public FeedbackStatus Status { get; set; } = FeedbackStatus.Open;

	public required string Title { get; set; }

	public required string Body { get; set; }

	public required FeedbackAuthor Author { get; set; }

	public List<MessageAttachmentEntity> Attachments { get; set; } = [];

	public FeedbackContext? Context { get; set; }

	/// <summary>Conversation thread between the admin and the author. Ordered oldest-first.</summary>
	public List<FeedbackReply> Replies { get; set; } = [];

	[BsonIgnore]
	public DateTime CreatedAt => Id.GetCreatedAt();

	public DateTime? ResolvedAt { get; set; }

	public string? AdminNote { get; set; }
}

public class FeedbackReply
{
	[BsonRepresentation(BsonType.ObjectId)]
	public ObjectId Id { get; set; }

	[BsonGuidRepresentation(GuidRepresentation.Standard)]
	public required Guid AuthorId { get; set; }

	public required string AuthorDisplayName { get; set; }

	/// <summary>True when written by an admin (vs. the feedback author).</summary>
	public required bool IsAdmin { get; set; }

	public required string Body { get; set; }

	[BsonIgnore]
	public DateTime CreatedAt => Id.GetCreatedAt();
}

public class FeedbackAuthor
{
	[BsonGuidRepresentation(GuidRepresentation.Standard)]
	public required Guid Id { get; set; }

	public required string DisplayName { get; set; }

	public string? Email { get; set; }
}

public class FeedbackContext
{
	public string? Url { get; set; }
	public string? UserAgent { get; set; }
	public string? AppVersion { get; set; }
}
