using ClosVerdeApp.Api.Abstractions.Models.Entities;

namespace ClosVerdeApp.Api.Abstractions.Interfaces.Repositories;

/// <summary>Persistence for objections raised against Pending reservations.</summary>
public interface IObjectionRepository
{
	Task<List<ObjectionEntity>> GetByReservation(Guid reservationId);
	Task<bool> ExistsForUser(Guid reservationId, Guid userId);

	/// <summary>Returns the inserted entity, or null if a duplicate (same user already objected).</summary>
	Task<ObjectionEntity?> TryAdd(Guid reservationId, Guid userId, string userDisplayName, string? reason);

	Task RemoveByReservation(Guid reservationId);

	/// <summary>Removes the single (reservationId, userId) row. Used as a safe rollback for race-loss inserts.</summary>
	Task RemoveByReservationAndUser(Guid reservationId, Guid userId);
}
