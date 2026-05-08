using ClosVerdeApp.Api.Abstractions.Models.Transports;

namespace ClosVerdeApp.Api.Abstractions.Interfaces.Services;

/// <summary>Records an objection, lazy-creates the discussion topic, and posts a system message.</summary>
public interface IObjectionService
{
	Task<Objection> Object(Guid reservationId, Guid currentUserId, string currentDisplayName, string? reason);
}
