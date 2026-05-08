using ClosVerdeApp.Api.Abstractions.Models.Entities;

namespace ClosVerdeApp.Api.Abstractions.Interfaces.Repositories;

/// <summary>Persistence for per-user "last seen" timestamps used to compute unread counts.</summary>
public interface IReadReceiptRepository
{
	Task<List<ReadReceiptEntity>> GetByUser(Guid userId);
	Task<ReadReceiptEntity?> Get(Guid userId, Guid topicId);
	Task<ReadReceiptEntity> Upsert(Guid userId, Guid topicId, DateTime at);
	Task DeleteByTopic(Guid topicId);
}
