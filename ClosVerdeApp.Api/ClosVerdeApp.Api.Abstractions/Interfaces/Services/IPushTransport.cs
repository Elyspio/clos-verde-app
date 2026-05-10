using ClosVerdeApp.Api.Abstractions.Models.Entities;
using ClosVerdeApp.Api.Abstractions.Models.Transports;

namespace ClosVerdeApp.Api.Abstractions.Interfaces.Services;

/// <summary>Low-level Web Push transport.</summary>
public interface IPushTransport
{
	Task Send(PushSubscriptionEntity subscription, PushNotificationPayload payload, CancellationToken cancellationToken = default);
}
