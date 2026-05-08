using System.ComponentModel.DataAnnotations;
using ClosVerdeApp.Api.Abstractions.Interfaces.Business;

namespace ClosVerdeApp.Api.Abstractions.Models.Transports;

public class Reservation : ITransport
{
	[Required] public required Guid Id { get; init; }
	[Required] public required Guid UserId { get; init; }
	[Required] public required string UserDisplayName { get; init; }
	[Required] public required DateTime StartDate { get; init; }
	[Required] public required DateTime EndDate { get; init; }
	public string? Note { get; init; }
	[Required] public required DateTime CreatedAt { get; init; }
}
