using ClosVerdeApp.Api.Abstractions.Models.Transports;

namespace ClosVerdeApp.Api.Abstractions.Interfaces.Services;

/// <summary>Manages the current user's browser Web Push subscription.</summary>
public interface IPushSubscriptionService
{
	Task<VapidPublicKeyResponse?> GetPublicKey();
	Task Save(Guid userId, PushSubscriptionRequest request);
	Task Delete(Guid userId, DeletePushSubscriptionRequest request);
}
