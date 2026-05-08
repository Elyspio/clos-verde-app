using System.ComponentModel.DataAnnotations;

namespace ClosVerdeApp.Api.Abstractions.Models.Transports;

public class LeaderboardEntry
{
	[Required] public required int Rank { get; init; }
	[Required] public required Guid UserId { get; init; }
	[Required] public required string DisplayName { get; init; }
	[Required] public required int TotalDays { get; init; }
	[Required] public required int ReservationCount { get; init; }
}
