using ClosVerdeApp.Api.Abstractions.Models.Transports;

namespace ClosVerdeApp.Api.Abstractions.Interfaces.Services;

/// <summary>
/// Posts, edits, and soft-deletes messages, sanitises HTML content, tracks read receipts,
/// and exposes a system-message helper used by <c>ObjectionService</c> and the scanner.
/// </summary>
public interface IMessageService
{
	Task<List<Message>> List(Guid topicId, DateTime? before, int limit);
	Task<Message> Post(Guid topicId, Guid authorUserId, string authorDisplayName, string contentHtml, IReadOnlyList<Guid> attachmentIds);
	Task<Message> PostSystem(Guid topicId, Guid actorUserId, string actorDisplayName, string contentHtml);
	Task<Message> Edit(Guid messageId, Guid currentUserId, string contentHtml);
	Task<Message> SoftDelete(Guid messageId, Guid currentUserId);
	Task<DateTime> MarkRead(Guid topicId, Guid currentUserId, DateTime? at);
}
