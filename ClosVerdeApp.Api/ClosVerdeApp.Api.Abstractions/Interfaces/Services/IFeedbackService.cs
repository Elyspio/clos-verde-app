using ClosVerdeApp.Api.Abstractions.Models.Entities.Enums;
using ClosVerdeApp.Api.Abstractions.Models.Transports;

namespace ClosVerdeApp.Api.Abstractions.Interfaces.Services;

/// <summary>
/// Submits, lists, and triages feedback entries. Authorisation (admin-only for list/update)
/// is handled by the controller layer through Keycloak realm roles.
/// </summary>
public interface IFeedbackService
{
	Task<Feedback> Create(
		CreateFeedbackRequest request,
		Guid authorId,
		string authorDisplayName,
		string? authorEmail);

	Task<FeedbackListResult> List(FeedbackCategory? category, FeedbackStatus? status, int page, int pageSize);

	Task<FeedbackListResult> ListMine(Guid authorId, IReadOnlyCollection<FeedbackStatus>? statuses, int page, int pageSize);

	Task<Feedback> CloseMine(Guid id, Guid authorId);

	Task<Feedback> UpdateStatus(Guid id, FeedbackStatus newStatus, string? adminNote);

	Task<Feedback> AddReply(Guid id, string body, Guid authorId, string authorDisplayName, bool isAdmin);

	Task<Feedback?> GetById(Guid id);

	/// <summary>
	/// Authorises reading an attachment by id. Feedback attachments are private to their author
	/// (and admins); throws <c>Forbidden</c> otherwise. No-op when the attachment is not bound to
	/// any feedback (e.g. a message attachment, which follows the shared-topic visibility rules).
	/// </summary>
	Task EnsureAttachmentReadable(Guid attachmentId, Guid currentUserId, bool isAdmin);
}

/// <summary>Page of feedback entries plus the total count for the same filter.</summary>
public class FeedbackListResult
{
	public required List<Feedback> Items { get; init; }
	public required long Total { get; init; }
	public required int Page { get; init; }
	public required int PageSize { get; init; }
}
