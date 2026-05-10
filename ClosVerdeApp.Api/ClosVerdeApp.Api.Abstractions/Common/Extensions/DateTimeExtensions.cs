namespace ClosVerdeApp.Api.Abstractions.Common.Extensions;

public static class DateTimeExtensions
{
	public static DateTime AsUtc(this DateTime value) => value.Kind switch
	{
		DateTimeKind.Utc => value,
		DateTimeKind.Local => value.ToUniversalTime(),
		_ => DateTime.SpecifyKind(value, DateTimeKind.Utc),
	};

	public static DateTime? AsUtc(this DateTime? value) => value?.AsUtc();
}
