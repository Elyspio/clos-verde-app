namespace ClosVerdeApp.Api.Abstractions.Models.Entities.Enums;

/// <summary>
/// Discriminator for the kind of discussion: the singleton <c>Global</c> "Général",
/// user-created <c>Custom</c> rooms, or per-reservation <c>Reservation</c> threads.
/// </summary>
public enum TopicKind
{
	Global = 0,
	Custom = 1,
	Reservation = 2
}
