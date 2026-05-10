using System.Net;
using System.Text.Json;
using ClosVerdeApp.Api.Abstractions.Exceptions;
using ClosVerdeApp.Api.Abstractions.Interfaces.Services;
using ClosVerdeApp.Api.Abstractions.Models.Configuration;
using ClosVerdeApp.Api.Abstractions.Models.Entities;
using ClosVerdeApp.Api.Abstractions.Models.Transports;
using Elyspio.Utils.Telemetry.Tracing.Elements;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using WebPush;

namespace ClosVerdeApp.Api.Core.Services;

public class WebPushTransport(
	IOptionsMonitor<PushNotificationOptions> options,
	ILogger<WebPushTransport> logger
) : TracingService(logger), IPushTransport
{
	private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

	public async Task Send(PushSubscriptionEntity subscription, PushNotificationPayload payload, CancellationToken cancellationToken = default)
	{
		using var logger = LogService();
		var opts = options.CurrentValue;
		if (!opts.Enabled || !opts.HasVapidKeys) return;

		var webPushSubscription = new PushSubscription(subscription.Endpoint, subscription.P256dh, subscription.Auth);
		var vapidDetails = new VapidDetails(opts.Subject, opts.PublicKey, opts.PrivateKey);
		var json = JsonSerializer.Serialize(payload, JsonOptions);

		try
		{
			using var client = new WebPushClient();
			await client.SendNotificationAsync(webPushSubscription, json, vapidDetails, cancellationToken);
		}
		catch (WebPushException ex) when (ex.StatusCode is HttpStatusCode.Gone or HttpStatusCode.NotFound)
		{
			throw new PushSubscriptionGoneException(subscription.Endpoint);
		}
	}
}
