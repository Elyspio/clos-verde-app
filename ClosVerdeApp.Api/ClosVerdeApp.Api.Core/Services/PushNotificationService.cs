using System.Text.RegularExpressions;
using ClosVerdeApp.Api.Abstractions.Common.Helpers;
using ClosVerdeApp.Api.Abstractions.Exceptions;
using ClosVerdeApp.Api.Abstractions.Interfaces.Repositories;
using ClosVerdeApp.Api.Abstractions.Interfaces.Services;
using ClosVerdeApp.Api.Abstractions.Models.Entities;
using ClosVerdeApp.Api.Abstractions.Models.Transports;
using Elyspio.Utils.Telemetry.Tracing.Elements;
using Microsoft.Extensions.Logging;

namespace ClosVerdeApp.Api.Core.Services;

public class PushNotificationService(
	IPushSubscriptionRepository pushSubscriptionRepository,
	IUserDirectoryService userDirectoryService,
	IPushTransport pushTransport,
	ILogger<PushNotificationService> logger
) : TracingService(logger), IPushNotificationService
{
	public async Task NotifyMessageMention(Message message, TopicEntity topic, CancellationToken cancellationToken = default)
	{
		using var logger = LogService($"{Log.F(message.Id)} {Log.F(message.TopicId)}");

		if (message.IsDeleted || message.IsSystem || message.Mentions.Count == 0) return;

		var recipientIds = message.Mentions
			.Where(id => id != message.AuthorUserId)
			.Where(id => !IsMuted(topic, id))
			.Distinct()
			.ToArray();

		if (recipientIds.Length == 0) return;

		var payload = new PushNotificationPayload
		{
			Type = "message-mention",
			Title = $"{message.AuthorDisplayName} vous a mentionné",
			Body = Truncate(StripHtml(message.ContentHtml), 140),
			Url = $"/messages/{message.TopicId}#message-{message.Id}",
			Tag = $"message:{message.Id}"
		};

		await SendToUsers(recipientIds, payload, cancellationToken);
	}

	public async Task NotifyReservationCreated(Reservation reservation, CancellationToken cancellationToken = default)
	{
		using var logger = LogService($"{Log.F(reservation.Id)}");

		var users = await userDirectoryService.ListAsync(cancellationToken);
		var recipientIds = users
			.Select(user => user.Id)
			.Where(id => id != reservation.User.Id)
			.Distinct()
			.ToArray();

		if (recipientIds.Length == 0) return;

		var payload = new PushNotificationPayload
		{
			Type = "reservation-created",
			Title = "Nouvelle réservation",
			Body = $"{reservation.User.DisplayName} a créé une réservation.",
			// Embedding the start date lets the calendar jump to the right month even
			// when the reservation isn't yet in the locally cached month query.
			Url = $"/calendrier?reservation={reservation.Id}&date={reservation.StartDate:yyyy-MM-dd}",
			Tag = $"reservation:{reservation.Id}"
		};

		await SendToUsers(recipientIds, payload, cancellationToken);
	}

	private async Task SendToUsers(IReadOnlyCollection<Guid> userIds, PushNotificationPayload payload, CancellationToken cancellationToken)
	{
		var subscriptions = await pushSubscriptionRepository.GetByUserIds(userIds);
		foreach (var subscription in subscriptions)
		{
			try
			{
				await pushTransport.Send(subscription, payload, cancellationToken);
			}
			catch (PushSubscriptionGoneException)
			{
				await pushSubscriptionRepository.DeleteByEndpoint(subscription.Endpoint);
			}
			catch (Exception ex)
			{
				logger.LogWarning(ex, "Could not send push notification to endpoint {Endpoint}", subscription.Endpoint);
				await pushSubscriptionRepository.MarkFailure(subscription.Endpoint, DateTime.UtcNow);
			}
		}
	}

	private static bool IsMuted(TopicEntity topic, Guid userId) =>
		topic.Muted.TryGetValue(userId.ToString("D"), out var muted) && muted;

	private static string StripHtml(string html) =>
		Regex.Replace(html, "<[^>]+>", string.Empty).Trim();

	private static string Truncate(string value, int maxLength) =>
		value.Length <= maxLength ? value : value[..maxLength];
}
