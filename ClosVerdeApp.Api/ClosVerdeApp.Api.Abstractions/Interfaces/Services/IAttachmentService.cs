using ClosVerdeApp.Api.Abstractions.Interfaces.Repositories;
using ClosVerdeApp.Api.Abstractions.Models.Transports;

namespace ClosVerdeApp.Api.Abstractions.Interfaces.Services;

/// <summary>
/// Orchestrates file uploads for message attachments: validates size/extension,
/// persists to GridFS, and serves the bytes back on download.
/// </summary>
public interface IAttachmentService
{
	/// <summary>Max byte size accepted for a single attachment.</summary>
	long MaxFileSizeBytes { get; }

	/// <summary>
	/// Streams <paramref name="content"/> straight into GridFS. The stream is consumed forward-only
	/// and never fully buffered: the service wraps it in a size-limited reader so an oversize upload
	/// fails the moment it crosses the cap rather than after the whole payload has been received.
	/// Throws <c>HttpException.BadRequest</c> when the file is empty, too large, or has a forbidden extension.
	/// </summary>
	Task<Attachment> Upload(Guid uploaderUserId, string fileName, string contentType, Stream content);

	/// <summary>Returns the file content + raw metadata so callers can stream it back to the client.</summary>
	Task<(AttachmentMetadata Metadata, Stream Content)> Download(Guid attachmentId);

	/// <summary>
	/// Looks up metadata and asserts it was uploaded by <paramref name="expectedUploaderUserId"/>.
	/// Used by the message service to enforce that one cannot attach someone else's pending upload.
	/// </summary>
	Task<AttachmentMetadata> RequireOwnedByUploader(Guid attachmentId, Guid expectedUploaderUserId);

	/// <summary>Maps repository-level metadata into the transport DTO carried by messages.</summary>
	Attachment ToTransport(AttachmentMetadata metadata);

	/// <summary>Deletes the underlying GridFS file. No-op if it does not exist.</summary>
	Task Delete(Guid attachmentId);
}
