using ClosVerdeApp.Api.Abstractions.Models.Entities;

namespace ClosVerdeApp.Api.Abstractions.Interfaces.Repositories;

public interface IReservationRepository
{
	Task<List<ReservationEntity>> GetInRange(DateTime from, DateTime to);
	Task<List<ReservationEntity>> GetAll();
	Task<List<ReservationEntity>> GetOverlapping(DateTime start, DateTime end, Guid? excludeId = null);
	Task<ReservationEntity?> GetById(Guid id);
	Task<ReservationEntity> Create(Guid userId, string userDisplayName, DateTime start, DateTime end, string? note);
	Task<ReservationEntity> Update(Guid id, DateTime start, DateTime end, string? note);
	Task Delete(Guid id);
}
