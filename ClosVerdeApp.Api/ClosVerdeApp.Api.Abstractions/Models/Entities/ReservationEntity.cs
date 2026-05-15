using ClosVerdeApp.Api.Abstractions.Interfaces.Business;
using ClosVerdeApp.Api.Abstractions.Common.Extensions;
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

	public required ReservationUserRef User { get; set; }

	public required DateTime StartDate { get; set; }

	public required DateTime EndDate { get; set; }

	public string? Note { get; set; }

	[BsonIgnore]
	public DateTime CreatedAt => Id.GetCreatedAt();

	public required ReservationValidation Validation { get; set; }

	[BsonGuidRepresentation(GuidRepresentation.Standard)]
	public Guid? TopicId { get; set; }

	public ReservationObjectionEntity? Objection { get; set; }
}

public class ReservationUserRef
{
	[BsonGuidRepresentation(GuidRepresentation.Standard)]
	public required Guid Id { get; set; }

	public required string DisplayName { get; set; }
}

public class ReservationValidation
{
	public ReservationStatus Status { get; set; } = ReservationStatus.Pending;

	public DateTime Deadline { get; set; }

	public DateTime? ValidatedAt { get; set; }

	public DateTime? CancelledAt { get; set; }
}

public class ReservationObjectionEntity
{
	[BsonRepresentation(BsonType.ObjectId)]
	public ObjectId Id { get; set; } = ObjectId.GenerateNewId();

	public required ReservationUserRef User { get; set; }

	public string? Reason { get; set; }

	[BsonIgnore]
	public DateTime CreatedAt => Id.GetCreatedAt();
}
