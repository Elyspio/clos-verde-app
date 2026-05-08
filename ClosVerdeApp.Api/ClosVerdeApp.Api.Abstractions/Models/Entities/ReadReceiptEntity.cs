using ClosVerdeApp.Api.Abstractions.Interfaces.Business;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace ClosVerdeApp.Api.Abstractions.Models.Entities;

/// <summary>
/// Tracks the last time a user opened a topic, so unread counts can be derived.
/// One row per (UserId, TopicId).
/// </summary>
public class ReadReceiptEntity : IEntity
{
	[BsonId]
	[BsonRepresentation(BsonType.ObjectId)]
	public ObjectId Id { get; set; }

	[BsonGuidRepresentation(GuidRepresentation.Standard)]
	public required Guid UserId { get; set; }

	[BsonGuidRepresentation(GuidRepresentation.Standard)]
	public required Guid TopicId { get; set; }

	public DateTime LastReadAt { get; set; } = DateTime.UtcNow;
}
