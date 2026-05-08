using System.ComponentModel.DataAnnotations;

namespace ClosVerdeApp.Api.Abstractions.Models.Transports;

public class CreateReservationRequest
{
	[Required] public required DateTime StartDate { get; init; }
	[Required] public required DateTime EndDate { get; init; }
	[StringLength(280)] public string? Note { get; init; }
}
