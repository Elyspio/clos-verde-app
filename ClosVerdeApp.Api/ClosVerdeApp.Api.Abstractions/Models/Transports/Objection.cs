using System.ComponentModel.DataAnnotations;
using ClosVerdeApp.Api.Abstractions.Interfaces.Business;

namespace ClosVerdeApp.Api.Abstractions.Models.Transports;

/// <summary>Wire shape of <see cref="Models.Entities.ObjectionEntity"/>.</summary>
public class Objection : ITransport
{
	[Required] public required Guid Id { get; init; }
	[Required] public required Guid ReservationId { get; init; }
	[Required] public required Guid UserId { get; init; }
	[Required] public required string UserDisplayName { get; init; }
	public string? Reason { get; init; }
	[Required] public required DateTime CreatedAt { get; init; }
}
