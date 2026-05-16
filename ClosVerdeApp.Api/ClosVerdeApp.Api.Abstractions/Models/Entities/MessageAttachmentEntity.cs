using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace ClosVerdeApp.Api.Abstractions.Models.Entities;

/// <summary>
/// Embedded reference to a file stored in the GridFS <c>attachments</c> bucket.
/// The <see cref="Id"/> matches the GridFS file <c>_id</c>; the rest is denormalised
/// metadata so message lists do not need to query the bucket to render an attachment row.
/// </summary>
public class MessageAttachmentEntity
{
	[BsonRepresentation(BsonType.ObjectId)]
	public ObjectId Id { get; set; }

	public required string FileName { get; set; }

	public required string ContentType { get; set; }

	public required long SizeBytes { get; set; }
}
