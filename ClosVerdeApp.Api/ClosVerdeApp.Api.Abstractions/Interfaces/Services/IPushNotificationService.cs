using ClosVerdeApp.Api.Abstractions.Models.Entities;
using ClosVerdeApp.Api.Abstractions.Models.Transports;

namespace ClosVerdeApp.Api.Abstractions.Interfaces.Services;

/// <summary>Applies notification recipient rules and sends Web Push payloads.</summary>
public interface IPushNotificationService
{
	Task NotifyMessageMention(Message message, TopicEntity topic, CancellationToken cancellationToken = default);
	Task NotifyReservationCreated(Reservation reservation, CancellationToken cancellationToken = default);
}
