using ClosVerdeApp.Api.Abstractions.Models.Entities;
using ClosVerdeApp.Api.Abstractions.Models.Entities.Enums;

namespace ClosVerdeApp.Api.Abstractions.Interfaces.Repositories;

/// <summary>Persistence for feedback entries. Sorted by most recent on read.</summary>
public interface IFeedbackRepository
{
	Task<FeedbackEntity> Create(
		FeedbackCategory category,
		string title,
		string body,
		FeedbackAuthor author,
		List<MessageAttachmentEntity> attachments,
		FeedbackContext? context);

	Task<FeedbackEntity?> GetById(Guid id);

	/// <summary>
	/// Returns the feedback that embeds the given attachment id, or <c>null</c> if no feedback
	/// references it. Used to gate downloads of private feedback attachments.
	/// </summary>
	Task<FeedbackEntity?> FindByAttachmentId(Guid attachmentId);

	Task<List<FeedbackEntity>> List(FeedbackCategory? category, FeedbackStatus? status, int skip, int take);

	Task<long> Count(FeedbackCategory? category, FeedbackStatus? status);

	Task<List<FeedbackEntity>> ListByAuthor(Guid authorId, IReadOnlyCollection<FeedbackStatus>? statuses, int skip, int take);

	Task<long> CountByAuthor(Guid authorId, IReadOnlyCollection<FeedbackStatus>? statuses);

	Task<FeedbackEntity?> UpdateStatus(Guid id, FeedbackStatus status, string? adminNote, DateTime? resolvedAt);

	Task<FeedbackEntity?> AddReply(Guid id, FeedbackReply reply);
}
