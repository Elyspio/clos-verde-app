using ClosVerdeApp.Api.Abstractions.Models.Entities;

namespace ClosVerdeApp.Api.Abstractions.Interfaces.Repositories;

/// <summary>Persistence for chat messages. Soft-delete only; cursor pagination is by <c>CreatedAt</c>.</summary>
public interface IMessageRepository
{
	Task<List<MessageEntity>> GetByTopic(Guid topicId, DateTime? before, int limit);
	Task<MessageEntity?> GetById(Guid id);

	Task<MessageEntity> Create(
		Guid topicId,
		Guid authorUserId,
		string authorDisplayName,
		string contentHtml,
		List<Guid> mentions,
		bool isSystem);

	Task<MessageEntity?> Update(Guid id, string contentHtml, List<Guid> mentions);
	Task<MessageEntity?> SoftDelete(Guid id);
	Task DeleteByTopic(Guid topicId);

	Task<int> CountAfter(Guid topicId, DateTime after, Guid excludeAuthorId);
}
