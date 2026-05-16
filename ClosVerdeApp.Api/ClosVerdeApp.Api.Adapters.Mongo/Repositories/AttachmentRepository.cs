using ClosVerdeApp.Api.Abstractions.Common.Extensions;
using ClosVerdeApp.Api.Abstractions.Common.Helpers;
using ClosVerdeApp.Api.Abstractions.Interfaces.Repositories;
using ClosVerdeApp.Api.Adapters.Mongo.Technical;
using Elyspio.Utils.Telemetry.Tracing.Elements;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MongoDB.Bson;
using MongoDB.Driver;
using MongoDB.Driver.GridFS;

namespace ClosVerdeApp.Api.Adapters.Mongo.Repositories;

/// <summary>
/// GridFS-backed implementation of <see cref="IAttachmentRepository"/>.
/// Stores uploader id + upload timestamp inside the file metadata so the
/// service layer can enforce ownership without a side collection.
/// </summary>
internal class AttachmentRepository : TracingAdapter, IAttachmentRepository
{
	private const string UploaderUserIdMetaKey = "uploaderUserId";
	private const string ContentTypeMetaKey = "contentType";

	private readonly IGridFSBucket _bucket;

	public AttachmentRepository(IConfiguration configuration, ILogger<AttachmentRepository> logger) : base(logger)
	{
		var context = new MongoContext(configuration);
		_bucket = context.AttachmentsBucket;
	}

	public async Task<AttachmentMetadata> Upload(string fileName, string contentType, Guid uploaderUserId, Stream content)
	{
		using var logger = LogAdapter($"{Log.F(fileName)} {Log.F(contentType)} {Log.F(uploaderUserId)}");

		var options = new GridFSUploadOptions
		{
			Metadata = new BsonDocument
			{
				{ UploaderUserIdMetaKey, uploaderUserId.ToString("D") },
				{ ContentTypeMetaKey, contentType },
			},
		};

		// OpenUploadStreamAsync (vs UploadFromStreamAsync) lets us abort cleanly when the
		// source stream throws — important so an over-limit upload doesn't leave orphan chunks.
		var uploadStream = await _bucket.OpenUploadStreamAsync(fileName, options);
		try
		{
			await content.CopyToAsync(uploadStream);
			await uploadStream.CloseAsync();
		}
		catch
		{
			await uploadStream.AbortAsync();
			throw;
		}

		var info = await FindInfo(uploadStream.Id);
		return ToMetadata(info ?? throw new InvalidOperationException($"GridFS file {uploadStream.Id} disappeared after upload."));
	}

	public async Task<AttachmentMetadata?> GetMetadata(Guid id)
	{
		using var logger = LogAdapter($"{Log.F(id)}");
		var info = await FindInfo(id.AsObjectId());
		return info is null ? null : ToMetadata(info);
	}

	public async Task<Stream> OpenDownloadStream(Guid id)
	{
		using var logger = LogAdapter($"{Log.F(id)}");
		return await _bucket.OpenDownloadStreamAsync(id.AsObjectId());
	}

	public async Task Delete(Guid id)
	{
		using var logger = LogAdapter($"{Log.F(id)}");
		try
		{
			await _bucket.DeleteAsync(id.AsObjectId());
		}
		catch (GridFSFileNotFoundException)
		{
			// Idempotent delete: missing files are fine.
		}
	}

	private async Task<GridFSFileInfo?> FindInfo(ObjectId id)
	{
		var filter = Builders<GridFSFileInfo>.Filter.Eq("_id", id);
		using var cursor = await _bucket.FindAsync(filter, new GridFSFindOptions { Limit = 1 });
		return await cursor.FirstOrDefaultAsync();
	}

	private static AttachmentMetadata ToMetadata(GridFSFileInfo info)
	{
		var metadata = info.Metadata ?? new BsonDocument();
		var uploaderRaw = metadata.GetValue(UploaderUserIdMetaKey, BsonNull.Value);
		var uploader = uploaderRaw.IsString && Guid.TryParse(uploaderRaw.AsString, out var parsed) ? parsed : Guid.Empty;
		var contentType = metadata.GetValue(ContentTypeMetaKey, BsonNull.Value).IsString
			? metadata[ContentTypeMetaKey].AsString
			: "application/octet-stream";

		return new AttachmentMetadata
		{
			Id = info.Id.AsGuid(),
			FileName = info.Filename,
			ContentType = contentType,
			SizeBytes = info.Length,
			UploaderUserId = uploader,
			UploadedAt = info.UploadDateTime,
		};
	}
}
