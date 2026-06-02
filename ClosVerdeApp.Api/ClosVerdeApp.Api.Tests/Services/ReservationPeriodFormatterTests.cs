using System;
using ClosVerdeApp.Api.Core.Helpers;
using Shouldly;
using Xunit;

namespace ClosVerdeApp.Api.Tests.Services;

public class ReservationPeriodFormatterTests
{
	// An all-day booking made by a Paris user on 1 June (CEST = UTC+2) is stored in UTC as
	// 31/05 22:00 → 01/06 21:59. The label must read "01/06", in the property's timezone.
	private static readonly DateTime AllDayStartUtc = new(2026, 5, 31, 22, 0, 0, DateTimeKind.Utc);
	private static readonly DateTime AllDayEndUtc = new(2026, 6, 1, 21, 59, 0, DateTimeKind.Utc);

	[Fact]
	public void FormattingInServerUtcTimezoneShowsTheWrongDay()
	{
		// Reproduces the previous behaviour: a UTC server (containers default to UTC) used
		// DateTime.ToLocalTime(), so the boundary fell on the wrong calendar day/time.
		var label = ReservationPeriodFormatter.Format(AllDayStartUtc, AllDayEndUtc, TimeZoneInfo.Utc);

		label.ShouldBe("du 31/05 à 22h00 au 01/06 à 21h59");
		label.ShouldNotContain("01/06 jusqu'à la fin de la journée");
	}

	[Fact]
	public void FormattingInTheApplicationTimezoneShowsTheCorrectAllDayLabel()
	{
		// The fix: always format against the property's fixed timezone (Europe/Paris).
		var label = ReservationPeriodFormatter.Format(AllDayStartUtc, AllDayEndUtc);

		label.ShouldBe("du 01/06 jusqu'à la fin de la journée");
	}

	[Fact]
	public void FormattingAPreciseSlotKeepsLocalHours()
	{
		// 01/06 14:00 → 16:30 Paris time, stored UTC as 12:00 → 14:30.
		var startUtc = new DateTime(2026, 6, 1, 12, 0, 0, DateTimeKind.Utc);
		var endUtc = new DateTime(2026, 6, 1, 14, 30, 0, DateTimeKind.Utc);

		var label = ReservationPeriodFormatter.Format(startUtc, endUtc);

		label.ShouldBe("du 01/06 à 14h00 au 01/06 à 16h30");
	}
}
