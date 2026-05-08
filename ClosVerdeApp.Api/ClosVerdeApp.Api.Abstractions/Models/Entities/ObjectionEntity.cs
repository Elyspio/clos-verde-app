using ClosVerdeApp.Api.Abstractions.Interfaces.Business;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace ClosVerdeApp.Api.Abstractions.Models.Entities;

/// <summary>
/// A user's objection raised against a Pending reservation. A unique index on
/// (ReservationId, UserId) enforces "one objection per user per reservation".
/// </summary>
public class ObjectionEntity : IEntity
{
	[BsonId]
	[BsonRepresentation(BsonType.ObjectId)]
	public ObjectId Id { get; set; }

	[BsonGuidRepresentation(GuidRepresentation.Standard)]
	public required Guid ReservationId { get; set; }

	[BsonGuidRepresentation(GuidRepresentation.Standard)]
	public required Guid UserId { get; set; }

	public required string UserDisplayName { get; set; }

	public string? Reason { get; set; }

	public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
