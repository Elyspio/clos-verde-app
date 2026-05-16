using ClosVerdeApp.Api.Abstractions.Common.Helpers;
using ClosVerdeApp.Api.Abstractions.Exceptions;
using ClosVerdeApp.Api.Abstractions.Interfaces.Repositories;
using ClosVerdeApp.Api.Abstractions.Interfaces.Services;
using ClosVerdeApp.Api.Abstractions.Models.Transports;
using Elyspio.Utils.Telemetry.Tracing.Elements;
using Microsoft.Extensions.Logging;

namespace ClosVerdeApp.Api.Core.Services;

/// <summary>
/// Implements <see cref="IAttachmentService"/>. Enforces a 25 MB cap and rejects
/// executable extensions; storage is delegated to <see cref="IAttachmentRepository"/>
/// (GridFS in production).
/// </summary>
public class AttachmentService(
	IAttachmentRepository attachmentRepository,
	ILogger<AttachmentService> logger
) : TracingService(logger), IAttachmentService
{
	public long MaxFileSizeBytes => 25L * 1024 * 1024;

	// Deny-list rather than allow-list: lets users send arbitrary docs while blocking
	// the obvious browser-executable formats. Case is normalised before lookup.
	private static readonly HashSet<string> ForbiddenExtensions = new(StringComparer.OrdinalIgnoreCase)
	{
		".exe", ".bat", ".cmd", ".sh", ".ps1", ".psm1", ".msi", ".com", ".scr", ".vbs", ".js", ".jse", ".wsf",
	};

	public async Task<Attachment> Upload(Guid uploaderUserId, string fileName, string contentType, Stream content)
	{
		using var logger = LogService($"{Log.F(uploaderUserId)} {Log.F(fileName)}");

		if (string.IsNullOrWhiteSpace(fileName))
			throw new HttpException.BadRequest("Le nom de fichier est requis.");

		var safeFileName = Path.GetFileName(fileName);
		var extension = Path.GetExtension(safeFileName);
		if (!string.IsNullOrEmpty(extension) && ForbiddenExtensions.Contains(extension))
			throw new HttpException.BadRequest($"Les fichiers « {extension} » ne sont pas autorisés.");

		var effectiveContentType = string.IsNullOrWhiteSpace(contentType) ? "application/octet-stream" : contentType;

		AttachmentMetadata metadata;
		try
		{
			metadata = await attachmentRepository.Upload(safeFileName, effectiveContentType, uploaderUserId, content);
		}
		catch (InvalidDataException)
		{
			// The size-limiting stream wrapper trips here when the caller crosses MaxFileSizeBytes.
			// The repository is expected to abort the partial GridFS upload on its own.
			throw new HttpException.BadRequest($"Le fichier dépasse la taille maximale autorisée ({MaxFileSizeBytes / (1024 * 1024)} Mo).");
		}

		if (metadata.SizeBytes <= 0)
		{
			await attachmentRepository.Delete(metadata.Id);
			throw new HttpException.BadRequest("Le fichier est vide.");
		}

		return ToTransport(metadata);
	}

	public async Task<(AttachmentMetadata Metadata, Stream Content)> Download(Guid attachmentId)
	{
		using var logger = LogService($"{Log.F(attachmentId)}");
		var metadata = await attachmentRepository.GetMetadata(attachmentId)
			?? throw new HttpException.NotFound<Attachment>(attachmentId);
		var stream = await attachmentRepository.OpenDownloadStream(attachmentId);
		return (metadata, stream);
	}

	public async Task<AttachmentMetadata> RequireOwnedByUploader(Guid attachmentId, Guid expectedUploaderUserId)
	{
		using var logger = LogService($"{Log.F(attachmentId)} {Log.F(expectedUploaderUserId)}");
		var metadata = await attachmentRepository.GetMetadata(attachmentId)
			?? throw new HttpException.BadRequest($"La pièce jointe {attachmentId} est introuvable.");
		if (metadata.UploaderUserId != expectedUploaderUserId)
			throw new HttpException.Forbidden("Vous ne pouvez attacher que vos propres téléversements.");
		return metadata;
	}

	public Attachment ToTransport(AttachmentMetadata metadata) => new()
	{
		Id = metadata.Id,
		FileName = metadata.FileName,
		ContentType = metadata.ContentType,
		SizeBytes = metadata.SizeBytes,
		DownloadUrl = $"/api/attachments/{metadata.Id}",
		IsImage = metadata.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase),
	};

	public async Task Delete(Guid attachmentId)
	{
		using var logger = LogService($"{Log.F(attachmentId)}");
		await attachmentRepository.Delete(attachmentId);
	}
}
