using ClosVerdeApp.Api.Abstractions.Common.Extensions;

namespace ClosVerdeApp.Api.Core.Helpers;

/// <summary>
/// Formats a reservation period as a human-readable French label (e.g. used in conflict messages).
/// <para>
/// Reservation dates are stored in UTC; the frontend renders them in the user's browser timezone.
/// The backend must therefore format against a <b>fixed application timezone</b> (the property's
/// timezone, Europe/Paris) rather than <c>DateTime.ToLocalTime()</c>, whose result depends on the
/// arbitrary timezone of the server process (UTC in containers) and would otherwise show the wrong
/// day/time — e.g. an all-day booking surfacing as "31/05 à 22h00" instead of "01/06".
/// </para>
/// </summary>
public static class ReservationPeriodFormatter
{
	/// <summary>The property's timezone. Resolved via the IANA id (works cross-platform on .NET 6+).</summary>
	public static readonly TimeZoneInfo AppTimeZone = ResolveAppTimeZone();

	private static TimeZoneInfo ResolveAppTimeZone()
	{
		// IANA id resolves on Linux and (via ICU) on Windows; fall back to the Windows id, then UTC.
		foreach (var id in new[] { "Europe/Paris", "Romance Standard Time" })
		{
			try { return TimeZoneInfo.FindSystemTimeZoneById(id); }
			catch (TimeZoneNotFoundException) { /* try next */ }
			catch (InvalidTimeZoneException) { /* try next */ }
		}
		return TimeZoneInfo.Utc;
	}

	/// <summary>Formats the UTC period into a label like "du 01/06 jusqu'à la fin de la journée".</summary>
	public static string Format(DateTime startUtc, DateTime endUtc, TimeZoneInfo? zone = null)
	{
		zone ??= AppTimeZone;
		var start = TimeZoneInfo.ConvertTimeFromUtc(startUtc.AsUtc(), zone);
		var end = TimeZoneInfo.ConvertTimeFromUtc(endUtc.AsUtc(), zone);

		var startLabel = IsStartOfDay(start) ? $"{start:dd/MM}" : $"{start:dd/MM 'à' HH'h'mm}";

		if (start.Date == end.Date && IsEndOfDay(end))
			return $"du {startLabel} jusqu'à la fin de la journée";

		if (IsEndOfDay(end))
			return $"du {startLabel} au {end:dd/MM}";

		var endLabel = IsStartOfDay(end) ? $"{end:dd/MM}" : $"{end:dd/MM 'à' HH'h'mm}";
		return $"du {startLabel} au {endLabel}";
	}

	private static bool IsStartOfDay(DateTime date) => date.Hour == 0 && date.Minute == 0;

	private static bool IsEndOfDay(DateTime date) => date.Hour == 23 && date.Minute == 59;
}
