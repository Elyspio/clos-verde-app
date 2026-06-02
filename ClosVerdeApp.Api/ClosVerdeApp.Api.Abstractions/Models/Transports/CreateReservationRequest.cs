using System.ComponentModel.DataAnnotations;

namespace ClosVerdeApp.Api.Abstractions.Models.Transports;

public class CreateReservationRequest
{
	[Required] public required DateTime StartDate { get; init; }
	[Required] public required DateTime EndDate { get; init; }
	[StringLength(280)] public string? Note { get; init; }

	/// <summary>
	/// When set by an admin, the reservation is created on behalf of this directory user instead of
	/// the caller. Ignored (and rejected) for non-admin callers.
	/// </summary>
	public Guid? OnBehalfOfUserId { get; init; }
}
