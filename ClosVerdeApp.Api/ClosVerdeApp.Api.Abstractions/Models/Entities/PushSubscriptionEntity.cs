using ClosVerdeApp.Api.Abstractions.Common.Extensions;
using ClosVerdeApp.Api.Abstractions.Interfaces.Business;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace ClosVerdeApp.Api.Abstractions.Models.Entities;

/// <summary>Browser Web Push subscription owned by one authenticated user.</summary>
public class PushSubscriptionEntity : IEntity
{
	[BsonId]
	[BsonRepresentation(BsonType.ObjectId)]
	public ObjectId Id { get; set; }

	[BsonGuidRepresentation(GuidRepresentation.Standard)]
	public required Guid UserId { get; set; }

	public required string Endpoint { get; set; }
	public required string P256dh { get; set; }
	public required string Auth { get; set; }
	public string? UserAgent { get; set; }

	[BsonIgnore]
	public DateTime CreatedAt => Id.GetCreatedAt();

	public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
	public DateTime? LastFailureAt { get; set; }
}
