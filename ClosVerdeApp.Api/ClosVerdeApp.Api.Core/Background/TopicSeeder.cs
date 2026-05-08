using ClosVerdeApp.Api.Abstractions.Interfaces.Services;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace ClosVerdeApp.Api.Core.Background;

/// <summary>Idempotent startup hook that ensures the singleton "Général" topic exists.</summary>
public sealed class TopicSeeder(
	ITopicService topicService,
	ILogger<TopicSeeder> logger
) : IHostedService
{
	public async Task StartAsync(CancellationToken cancellationToken)
	{
		try
		{
			await topicService.EnsureGlobalSeeded();
			logger.LogInformation("Global topic seeded");
		}
		catch (Exception ex)
		{
			logger.LogError(ex, "Failed to seed global topic");
		}
	}

	public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
