namespace ClosVerdeApp.Api.Abstractions.Exceptions;

/// <summary>Raised when a browser push endpoint is no longer valid and should be removed.</summary>
public class PushSubscriptionGoneException(string endpoint) : Exception($"Push subscription is gone: {endpoint}")
{
	public string Endpoint { get; } = endpoint;
}
