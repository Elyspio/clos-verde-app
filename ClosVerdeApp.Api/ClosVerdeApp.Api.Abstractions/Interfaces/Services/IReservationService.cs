using ClosVerdeApp.Api.Abstractions.Models.Transports;

namespace ClosVerdeApp.Api.Abstractions.Interfaces.Services;

public interface IReservationService
{
	Task<List<Reservation>> GetMonth(int year, int month);
	Task<List<Reservation>> GetAll();
	Task<List<LeaderboardEntry>> GetLeaderboard();
	Task<Reservation> Create(CreateReservationRequest request, Guid userId, string displayName);
	Task<Reservation> Update(Guid id, CreateReservationRequest request, Guid currentUserId);
	Task Delete(Guid id, Guid currentUserId);
}
