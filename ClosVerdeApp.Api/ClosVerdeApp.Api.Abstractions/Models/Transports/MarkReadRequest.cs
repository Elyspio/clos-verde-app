namespace ClosVerdeApp.Api.Abstractions.Models.Transports;

/// <summary>Body for <c>POST /api/topics/{id}/read</c>. Defaults to "now" when <c>At</c> is omitted.</summary>
public class MarkReadRequest
{
	public DateTime? At { get; init; }
}
