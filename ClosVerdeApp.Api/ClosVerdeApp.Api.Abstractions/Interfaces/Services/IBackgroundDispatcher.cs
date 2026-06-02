namespace ClosVerdeApp.Api.Abstractions.Interfaces.Services;

/// <summary>
/// Runs fire-and-forget work off the request thread. Used to keep HTTP handlers from blocking on
/// best-effort side effects (e.g. Web Push fan-out to every subscriber over the network), which
/// must neither delay the response nor fail it. Implementations never surface exceptions to the
/// caller — failures are logged.
/// </summary>
public interface IBackgroundDispatcher
{
	/// <summary>Schedules <paramref name="work"/> to run in the background. Returns immediately.</summary>
	/// <param name="work">The work to run, given a cancellation token tied to the host lifetime.</param>
	/// <param name="description">Short label used in failure logs.</param>
	void Enqueue(Func<CancellationToken, Task> work, string description);
}
