using ClosVerdeApp.Api.Abstractions.Interfaces.Services;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace ClosVerdeApp.Api.Core.Services;

/// <summary>
/// Default <see cref="IBackgroundDispatcher"/>: runs each work item on the thread pool, decoupled
/// from the originating request. Exceptions are caught and logged so a failing side effect never
/// bubbles back into (or after) the HTTP response. Work is cancelled when the host is shutting down.
/// </summary>
public sealed class BackgroundDispatcher : IBackgroundDispatcher
{
	private readonly ILogger<BackgroundDispatcher> _logger;
	private readonly CancellationTokenSource _shutdown;

	public BackgroundDispatcher(IHostApplicationLifetime lifetime, ILogger<BackgroundDispatcher> logger)
	{
		_logger = logger;
		_shutdown = CancellationTokenSource.CreateLinkedTokenSource(lifetime.ApplicationStopping);
	}

	public void Enqueue(Func<CancellationToken, Task> work, string description)
	{
		_ = Task.Run(async () =>
		{
			try
			{
				await work(_shutdown.Token);
			}
			catch (OperationCanceledException) when (_shutdown.IsCancellationRequested)
			{
				// Host is shutting down — expected, ignore.
			}
			catch (Exception ex)
			{
				_logger.LogWarning(ex, "Background task '{Description}' failed", description);
			}
		}, _shutdown.Token);
	}
}
