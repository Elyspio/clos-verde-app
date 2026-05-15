using System.ComponentModel.DataAnnotations;

namespace ClosVerdeApp.Api.Abstractions.Models.Transports;

public class VapidPublicKeyResponse
{
	[Required] public required string PublicKey { get; init; }
}

public class PushSubscriptionRequest
{
	[Required] public required string Endpoint { get; init; }
	[Required] public required PushSubscriptionKeys Keys { get; init; }
	public string? UserAgent { get; init; }
}

public class PushSubscriptionKeys
{
	[Required] public required string P256dh { get; init; }
	[Required] public required string Auth { get; init; }
}

public class DeletePushSubscriptionRequest
{
	[Required] public required string Endpoint { get; init; }
}

public class PushNotificationPayload
{
	[Required] public required string Type { get; init; }
	[Required] public required string Title { get; init; }
	[Required] public required string Body { get; init; }
	[Required] public required string Url { get; init; }
	[Required] public required string Tag { get; init; }
}
