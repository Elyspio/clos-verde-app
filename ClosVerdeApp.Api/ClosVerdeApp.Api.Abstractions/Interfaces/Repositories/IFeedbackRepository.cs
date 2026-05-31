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

	Task<List<FeedbackEntity>> List(FeedbackCategory? category, FeedbackStatus? status, int skip, int take);

	Task<long> Count(FeedbackCategory? category, FeedbackStatus? status);

	Task<List<FeedbackEntity>> ListByAuthor(Guid authorId, IReadOnlyCollection<FeedbackStatus>? statuses, int skip, int take);

	Task<long> CountByAuthor(Guid authorId, IReadOnlyCollection<FeedbackStatus>? statuses);

	Task<FeedbackEntity?> UpdateStatus(Guid id, FeedbackStatus status, string? adminNote, DateTime? resolvedAt);
}
