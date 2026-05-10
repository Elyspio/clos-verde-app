using ClosVerdeApp.Api.Abstractions.Exceptions;
using ClosVerdeApp.Api.Abstractions.Common.Helpers;
using ClosVerdeApp.Api.Abstractions.Interfaces.Repositories;
using ClosVerdeApp.Api.Abstractions.Interfaces.Services;
using ClosVerdeApp.Api.Abstractions.Models.Configuration;
using ClosVerdeApp.Api.Abstractions.Models.Transports;
using Elyspio.Utils.Telemetry.Tracing.Elements;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ClosVerdeApp.Api.Core.Services;

public class PushSubscriptionService(
	IPushSubscriptionRepository pushSubscriptionRepository,
	IOptionsMonitor<PushNotificationOptions> options,
	ILogger<PushSubscriptionService> logger
) : TracingService(logger), IPushSubscriptionService
{
	public Task<VapidPublicKeyResponse?> GetPublicKey()
	{
		using var logger = LogService();
		var opts = options.CurrentValue;
		if (!opts.Enabled || !opts.HasVapidKeys) return Task.FromResult<VapidPublicKeyResponse?>(null);
		return Task.FromResult<VapidPublicKeyResponse?>(new VapidPublicKeyResponse { PublicKey = opts.PublicKey });
	}

	public async Task Save(Guid userId, PushSubscriptionRequest request)
	{
		using var logger = LogService($"{Log.F(userId)}");
		Validate(request);
		await pushSubscriptionRepository.Upsert(userId, request.Endpoint.Trim(), request.Keys.P256dh.Trim(), request.Keys.Auth.Trim(), request.UserAgent);
	}

	public async Task Delete(Guid userId, DeletePushSubscriptionRequest request)
	{
		using var logger = LogService($"{Log.F(userId)}");
		if (string.IsNullOrWhiteSpace(request.Endpoint))
			throw new HttpException.BadRequest("L'abonnement aux notifications est invalide.");

		await pushSubscriptionRepository.Delete(userId, request.Endpoint.Trim());
	}

	private static void Validate(PushSubscriptionRequest request)
	{
		if (string.IsNullOrWhiteSpace(request.Endpoint) ||
			string.IsNullOrWhiteSpace(request.Keys.P256dh) ||
			string.IsNullOrWhiteSpace(request.Keys.Auth))
			throw new HttpException.BadRequest("L'abonnement aux notifications est invalide.");
	}
}
