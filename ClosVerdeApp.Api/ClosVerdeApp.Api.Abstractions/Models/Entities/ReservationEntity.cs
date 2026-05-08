using ClosVerdeApp.Api.Abstractions.Interfaces.Business;
using ClosVerdeApp.Api.Abstractions.Models.Entities.Enums;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace ClosVerdeApp.Api.Abstractions.Models.Entities;

/// <summary>
/// Persisted reservation. Created in <see cref="ReservationStatus.Pending"/> and either
/// auto-validated by <c>ReservationValidationScanner</c> after the deadline, force-validated
/// by the creator, or cancelled.
/// </summary>
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

	public ReservationStatus Status { get; set; } = ReservationStatus.Pending;

	public DateTime ValidationDeadline { get; set; }

	[BsonGuidRepresentation(GuidRepresentation.Standard)]
	public Guid? TopicId { get; set; }

	public int ObjectionCount { get; set; }

	public DateTime? ValidatedAt { get; set; }

	public DateTime? CancelledAt { get; set; }
}
