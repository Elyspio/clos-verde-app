using ClosVerdeApp.Api.Abstractions.Models.Entities;
using ClosVerdeApp.Api.Abstractions.Models.Entities.Enums;

namespace ClosVerdeApp.Api.Abstractions.Interfaces.Repositories;

/// <summary>Persistence for discussion topics. <c>BumpStatistics</c> updates the denormalised counters.</summary>
public interface ITopicRepository
{
	Task<List<TopicEntity>> GetAll();
	Task<TopicEntity?> GetById(Guid id);
	Task<TopicEntity?> GetGlobal();
	Task<TopicEntity?> GetByReservation(Guid reservationId);

	Task<TopicEntity> Create(
		TopicKind kind,
		string name,
		Guid? createdByUserId,
		string? createdByDisplayName,
		Guid? reservationId);

	Task<TopicEntity?> Rename(Guid id, string newName);
	Task Delete(Guid id);

	Task BumpStatistics(Guid id, DateTime lastMessageAt, int delta);

	/// <summary>Decrements the visible MessageCount without touching LastMessageAt. Used on soft-delete.</summary>
	Task DecrementMessageCount(Guid id);
}
