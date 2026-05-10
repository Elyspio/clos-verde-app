using System.ComponentModel.DataAnnotations;

namespace ClosVerdeApp.Api.Abstractions.Models.Transports;

/// <summary>A topic plus the calling user's unread count and mute state, returned by <c>GET /api/topics</c>.</summary>
public class TopicListItem
{
	[Required] public required Topic Topic { get; init; }
	[Required] public required int UnreadCount { get; init; }
	[Required] public required bool IsMuted { get; init; }
	public DateTime? LastReadAt { get; init; }
}
