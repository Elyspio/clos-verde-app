using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using ClosVerdeApp.Api.Abstractions.Common.Extensions;
using ClosVerdeApp.Api.Abstractions.Interfaces.Repositories;
using MongoDB.Bson;

namespace ClosVerdeApp.Api.Tests.Services;

/// <summary>
/// In-memory <see cref="IAttachmentRepository"/> shared across service tests so we do not
/// need a live MongoDB GridFS bucket. Stores file bytes in a list keyed by generated Guid id.
/// </summary>
internal sealed class InMemoryAttachmentRepository : IAttachmentRepository
{
	public List<(AttachmentMetadata Metadata, byte[] Bytes)> Stored { get; } = [];

	public async Task<AttachmentMetadata> Upload(string fileName, string contentType, Guid uploaderUserId, Stream content)
	{
		await using var copy = new MemoryStream();
		await content.CopyToAsync(copy);
		var bytes = copy.ToArray();
		var metadata = new AttachmentMetadata
		{
			// Generate an id that round-trips through ObjectId<->Guid the same way the real
			// GridFS-backed repository does, so service layer Guid.AsObjectId().AsGuid() works.
			Id = ObjectId.GenerateNewId().AsGuid(),
			FileName = fileName,
			ContentType = contentType,
			SizeBytes = bytes.Length,
			UploaderUserId = uploaderUserId,
			UploadedAt = DateTime.UtcNow,
		};
		Stored.Add((metadata, bytes));
		return metadata;
	}

	public Task<AttachmentMetadata?> GetMetadata(Guid id)
	{
		var hit = Stored.FirstOrDefault(e => e.Metadata.Id == id);
		return Task.FromResult<AttachmentMetadata?>(hit.Metadata);
	}

	public Task<Stream> OpenDownloadStream(Guid id)
	{
		var match = Stored.FirstOrDefault(e => e.Metadata.Id == id);
		if (match.Metadata is null) throw new InvalidOperationException($"unknown attachment id {id}");
		return Task.FromResult<Stream>(new MemoryStream(match.Bytes, writable: false));
	}

	public Task Delete(Guid id)
	{
		Stored.RemoveAll(e => e.Metadata.Id == id);
		return Task.CompletedTask;
	}
}
