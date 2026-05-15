using ClosVerdeApp.Api.Abstractions.Models.Transports;

namespace ClosVerdeApp.Api.Abstractions.Interfaces.Services;

/// <summary>Reservation lifecycle: create (Pending), update, delete (with cascade), and force-validate.</summary>
public interface IReservationService
{
	Task<List<Reservation>> GetRange(DateTime from, DateTime to);
	Task<List<Reservation>> GetAll();
	Task<List<LeaderboardEntry>> GetLeaderboard();
	Task<Reservation> Create(CreateReservationRequest request, Guid userId, string displayName);
	Task<Reservation> Update(Guid id, CreateReservationRequest request, Guid currentUserId);
	Task Delete(Guid id, Guid currentUserId);
	Task<Reservation> ForceValidate(Guid id, Guid currentUserId);
}
