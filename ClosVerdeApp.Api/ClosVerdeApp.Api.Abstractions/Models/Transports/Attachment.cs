using System.ComponentModel.DataAnnotations;
using ClosVerdeApp.Api.Abstractions.Interfaces.Business;

namespace ClosVerdeApp.Api.Abstractions.Models.Transports;

/// <summary>
/// Wire shape of an attachment carried by a <see cref="Message"/>. <see cref="DownloadUrl"/>
/// points to the backend endpoint that streams the file content from GridFS.
/// </summary>
public class Attachment : ITransport
{
	[Required] public required Guid Id { get; init; }
	[Required] public required string FileName { get; init; }
	[Required] public required string ContentType { get; init; }
	[Required] public required long SizeBytes { get; init; }
	[Required] public required string DownloadUrl { get; init; }
	[Required] public required bool IsImage { get; init; }
}
