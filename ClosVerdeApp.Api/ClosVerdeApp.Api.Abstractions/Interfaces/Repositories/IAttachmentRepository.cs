namespace ClosVerdeApp.Api.Abstractions.Interfaces.Repositories;

/// <summary>
/// Persistence for message attachments, backed by a MongoDB GridFS bucket.
/// Files start out "pending" (no owning message); the message service binds them
/// when a message is posted.
/// </summary>
public interface IAttachmentRepository
{
	/// <summary>
	/// Streams <paramref name="content"/> into GridFS and returns the metadata.
	/// </summary>
	Task<AttachmentMetadata> Upload(string fileName, string contentType, Guid uploaderUserId, Stream content);

	/// <summary>Returns metadata for a previously uploaded file, or null if it does not exist.</summary>
	Task<AttachmentMetadata?> GetMetadata(Guid id);

	/// <summary>Opens a read stream for the file. The caller is responsible for disposing it.</summary>
	Task<Stream> OpenDownloadStream(Guid id);

	/// <summary>Deletes a file. No-op if it does not exist.</summary>
	Task Delete(Guid id);
}

/// <summary>Bucket-level metadata kept on every GridFS file.</summary>
public sealed class AttachmentMetadata
{
	public required Guid Id { get; init; }
	public required string FileName { get; init; }
	public required string ContentType { get; init; }
	public required long SizeBytes { get; init; }
	public required Guid UploaderUserId { get; init; }
	public required DateTime UploadedAt { get; init; }
}
