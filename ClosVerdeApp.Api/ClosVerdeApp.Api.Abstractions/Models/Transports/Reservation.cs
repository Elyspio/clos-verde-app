using System.ComponentModel.DataAnnotations;
using ClosVerdeApp.Api.Abstractions.Interfaces.Business;
using ClosVerdeApp.Api.Abstractions.Models.Entities.Enums;

namespace ClosVerdeApp.Api.Abstractions.Models.Transports;

/// <summary>Wire shape of <see cref="Models.Entities.ReservationEntity"/> sent to the frontend.</summary>
public class Reservation : ITransport
{
	[Required] public required Guid Id { get; init; }
	[Required] public required Guid UserId { get; init; }
	[Required] public required string UserDisplayName { get; init; }
	[Required] public required DateTime StartDate { get; init; }
	[Required] public required DateTime EndDate { get; init; }
	public string? Note { get; init; }
	[Required] public required DateTime CreatedAt { get; init; }
	[Required] public required ReservationStatus Status { get; init; }
	[Required] public required DateTime ValidationDeadline { get; init; }
	public Guid? TopicId { get; init; }
	[Required] public required int ObjectionCount { get; init; }
	public DateTime? ValidatedAt { get; init; }
	public DateTime? CancelledAt { get; init; }
}
