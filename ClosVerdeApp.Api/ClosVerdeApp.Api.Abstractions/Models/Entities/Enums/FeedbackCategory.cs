namespace ClosVerdeApp.Api.Abstractions.Models.Entities.Enums;

/// <summary>
/// Category an end-user picks when submitting feedback. Drives the form's contextual
/// placeholders and checklist on the front, and the colour code on the admin board.
/// </summary>
public enum FeedbackCategory
{
	Bug = 0,
	Suggestion = 1,
	Question = 2,
	Other = 3
}
