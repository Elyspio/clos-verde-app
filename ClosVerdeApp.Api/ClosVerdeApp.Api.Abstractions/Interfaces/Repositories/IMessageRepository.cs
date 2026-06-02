using ClosVerdeApp.Api.Abstractions.Models.Entities;

namespace ClosVerdeApp.Api.Abstractions.Interfaces.Repositories;

/// <summary>Persistence for chat messages. Soft-delete only; cursor pagination is by message id.</summary>
public interface IMessageRepository
{
	/// <summary>
	/// Returns up to <paramref name="limit"/> messages of a topic, oldest-first. When
	/// <paramref name="before"/> is set (the id of the oldest message already loaded), only
	/// strictly-older messages are returned — an exact, stable cursor for "load more history".
	/// </summary>
	Task<List<MessageEntity>> GetByTopic(Guid topicId, Guid? before, int limit);
	Task<MessageEntity?> GetById(Guid id);

	Task<MessageEntity> Create(
		Guid topicId,
		Guid authorUserId,
		string authorDisplayName,
		string contentHtml,
		List<Guid> mentions,
		List<MessageAttachmentEntity> attachments,
		bool isSystem);

	Task<MessageEntity?> Update(Guid id, string contentHtml, List<Guid> mentions);
	Task<MessageEntity?> SoftDelete(Guid id);
	Task DeleteByTopic(Guid topicId);

	Task<int> CountAfter(Guid topicId, DateTime after, Guid excludeAuthorId);

	/// <summary>
	/// Topics where the user has either authored a non-deleted message or been @mentioned.
	/// Drives the "subscribed by activity" set for desktop notifications.
	/// </summary>
	Task<List<Guid>> GetEngagedTopicIds(Guid userId);
}
