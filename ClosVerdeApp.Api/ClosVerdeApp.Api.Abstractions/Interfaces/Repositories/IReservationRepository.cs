using ClosVerdeApp.Api.Abstractions.Models.Entities;
using ClosVerdeApp.Api.Abstractions.Models.Entities.Enums;

namespace ClosVerdeApp.Api.Abstractions.Interfaces.Repositories;

/// <summary>Persistence for reservations, including conditional updates used by the validation scanner.</summary>
public interface IReservationRepository
{
	Task<List<ReservationEntity>> GetInRange(DateTime from, DateTime to);
	Task<List<ReservationEntity>> GetAll();
	Task<List<ReservationEntity>> GetOverlapping(DateTime start, DateTime end, Guid? excludeId = null);
	Task<ReservationEntity?> GetById(Guid id);

	Task<ReservationEntity> Create(
		Guid userId,
		string userDisplayName,
		DateTime start,
		DateTime end,
		string? note,
		ReservationStatus status,
		DateTime validationDeadline);

	Task<ReservationEntity> Update(Guid id, DateTime start, DateTime end, string? note, DateTime newDeadline);
	Task Delete(Guid id);

	Task<List<ReservationEntity>> GetPendingDue(DateTime nowUtc);
	Task<List<ReservationEntity>> GetPendingExpired(DateTime nowUtc);

	/// <summary>Conditionally validates a Pending reservation with no objections whose deadline has passed. Returns true if the update applied.</summary>
	Task<bool> TryAutoValidate(Guid id, DateTime atUtc);

	/// <summary>Force-validate (creator decision). Conditional on Status == Pending. Returns true if applied.</summary>
	Task<bool> TryForceValidate(Guid id, DateTime atUtc);

	/// <summary>Auto-cancel a Pending reservation whose start date has passed (creator never decided). Returns true if applied.</summary>
	Task<bool> TryAutoCancel(Guid id, DateTime atUtc);

	/// <summary>Increment objection count, only if status is still Pending.</summary>
	Task<bool> TryIncrementObjectionCount(Guid id);

	/// <summary>Reset objection count to zero. Used when the creator edits the reservation to clear stale objections.</summary>
	Task ResetObjectionCount(Guid id);

	/// <summary>Set TopicId only if currently null. Returns true on success.</summary>
	Task<bool> TrySetTopicId(Guid id, Guid topicId);

	/// <summary>Mass-migrate reservations created before the status field existed. Idempotent.</summary>
	Task<long> BackfillLegacyAsValidated();

	Task<bool> ExistsConflictingValidatedOrPending(DateTime start, DateTime end, Guid? excludeId);
}
