using System.ComponentModel.DataAnnotations;

namespace ClosVerdeApp.Api.Abstractions.Models.Transports;

/// <summary>Body for <c>POST /api/reservations/{id}/objections</c>.</summary>
public class CreateObjectionRequest
{
	[StringLength(1000)] public string? Reason { get; init; }
}
