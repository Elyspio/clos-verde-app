using ClosVerdeApp.Api.Abstractions.Models.Entities;

namespace ClosVerdeApp.Api.Abstractions.Interfaces.Repositories;

/// <summary>Persistence for browser Web Push subscriptions.</summary>
public interface IPushSubscriptionRepository
{
	Task<PushSubscriptionEntity> Upsert(Guid userId, string endpoint, string p256dh, string auth, string? userAgent);
	Task Delete(Guid userId, string endpoint);
	Task DeleteByEndpoint(string endpoint);
	Task<List<PushSubscriptionEntity>> GetByUserIds(IReadOnlyCollection<Guid> userIds);
	Task MarkFailure(string endpoint, DateTime failureAt);
}
