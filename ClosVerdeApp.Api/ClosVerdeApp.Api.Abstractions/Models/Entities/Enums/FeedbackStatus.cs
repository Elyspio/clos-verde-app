namespace ClosVerdeApp.Api.Abstractions.Models.Entities.Enums;

/// <summary>
/// Admin-controlled lifecycle of a feedback entry. <c>Open</c> is the initial state,
/// <c>Resolved</c> means acted upon, <c>Discarded</c> means consciously dismissed.
/// </summary>
public enum FeedbackStatus
{
	Open = 0,
	Resolved = 1,
	Discarded = 2
}
