using ClosVerdeApp.Api.Abstractions.Interfaces.Business;
using ClosVerdeApp.Api.Abstractions.Models.Entities.Enums;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace ClosVerdeApp.Api.Abstractions.Models.Entities;

/// <summary>
/// Discussion thread. <c>LastMessageAt</c> and <c>MessageCount</c> are denormalised so the
/// topic list can sort and display previews without scanning the messages collection.
/// </summary>
public class TopicEntity : IEntity
{
	[BsonId]
	[BsonRepresentation(BsonType.ObjectId)]
	public ObjectId Id { get; set; }

	public required TopicKind Kind { get; set; }

	public required string Name { get; set; }

	[BsonGuidRepresentation(GuidRepresentation.Standard)]
	public Guid? CreatedByUserId { get; set; }

	public string? CreatedByDisplayName { get; set; }

	[BsonGuidRepresentation(GuidRepresentation.Standard)]
	public Guid? ReservationId { get; set; }

	public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

	public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

	public DateTime? LastMessageAt { get; set; }

	public int MessageCount { get; set; }
}
