using ClosVerdeApp.Api.Abstractions.Interfaces.Business;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace ClosVerdeApp.Api.Abstractions.Models.Entities;

public class ReservationEntity : IEntity
{
	[BsonId]
	[BsonRepresentation(BsonType.ObjectId)]
	public ObjectId Id { get; set; }

	[BsonGuidRepresentation(GuidRepresentation.Standard)]
	public required Guid UserId { get; set; }

	public required string UserDisplayName { get; set; }

	public required DateTime StartDate { get; set; }

	public required DateTime EndDate { get; set; }

	public string? Note { get; set; }

	public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
