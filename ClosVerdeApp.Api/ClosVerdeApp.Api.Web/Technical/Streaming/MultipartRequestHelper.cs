using Microsoft.Net.Http.Headers;

namespace ClosVerdeApp.Api.Web.Technical.Streaming;

/// <summary>
/// Small helpers around <see cref="MediaTypeHeaderValue"/> and
/// <see cref="ContentDispositionHeaderValue"/> used by the streaming upload endpoint.
/// </summary>
public static class MultipartRequestHelper
{
	public static string GetBoundary(MediaTypeHeaderValue contentType, int lengthLimit)
	{
		var boundary = contentType.Boundary.Value;
		if (string.IsNullOrWhiteSpace(boundary))
			throw new InvalidDataException("Missing content-type boundary.");
		if (boundary.Length > lengthLimit)
			throw new InvalidDataException($"Multipart boundary length exceeds the {lengthLimit}-character limit.");
		return boundary;
	}

	public static bool IsMultipartContentType(string? contentType)
		=> !string.IsNullOrEmpty(contentType)
			&& contentType.Contains("multipart/", StringComparison.OrdinalIgnoreCase);

	public static bool HasFileContentDisposition(ContentDispositionHeaderValue? contentDisposition)
		=> contentDisposition is not null
			&& contentDisposition.DispositionType.Equals("form-data")
			&& (!string.IsNullOrEmpty(contentDisposition.FileName.Value) || !string.IsNullOrEmpty(contentDisposition.FileNameStar.Value));
}
