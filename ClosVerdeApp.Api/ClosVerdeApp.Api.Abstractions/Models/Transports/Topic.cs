using System.ComponentModel.DataAnnotations;
using ClosVerdeApp.Api.Abstractions.Interfaces.Business;
using ClosVerdeApp.Api.Abstractions.Models.Entities.Enums;

namespace ClosVerdeApp.Api.Abstractions.Models.Transports;

/// <summary>Wire shape of <see cref="Models.Entities.TopicEntity"/>.</summary>
public class Topic : ITransport
{
	[Required] public required Guid Id { get; init; }
	[Required] public required TopicKind Kind { get; init; }
	[Required] public required string Name { get; init; }
	public Guid? CreatedByUserId { get; init; }
	public string? CreatedByDisplayName { get; init; }
	public Guid? ReservationId { get; init; }
	[Required] public required DateTime CreatedAt { get; init; }
	[Required] public required DateTime UpdatedAt { get; init; }
	public DateTime? LastMessageAt { get; init; }
	[Required] public required int MessageCount { get; init; }
}
