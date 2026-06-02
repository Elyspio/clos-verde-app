using MongoDB.Bson;

namespace ClosVerdeApp.Api.Adapters.Mongo.Technical;

/// <summary>
/// Builds <b>deterministic</b> ObjectId bounds for a given timestamp.
/// <para>
/// An ObjectId encodes its timestamp in its first 4 bytes (big-endian, 1-second resolution),
/// followed by 8 bytes of process-random + counter data. <see cref="ObjectId.GenerateNewId(System.DateTime)"/>
/// is <b>not</b> usable as a comparison bound: it fills those trailing 8 bytes with the current
/// process' random value and an ever-incrementing counter, so it is non-deterministic and never
/// equals the minimum/maximum ObjectId of a second. These helpers zero / saturate the trailing
/// bytes so range queries (<c>m.Id &lt; / &gt; bound</c>) behave predictably at second boundaries.
/// </para>
/// </summary>
internal static class ObjectIdBounds
{
	/// <summary>
	/// Largest ObjectId whose timestamp is <paramref name="timestampUtc"/> (trailing bytes all <c>0xFF</c>).
	/// Used as an exclusive lower bound: <c>m.Id &gt; Max(t)</c> matches only documents created in a
	/// strictly later second, treating everything in second <paramref name="timestampUtc"/> as "before".
	/// Returns <see cref="ObjectId.Empty"/> for timestamps at or before the Unix epoch so that
	/// "never read" sentinels (e.g. <see cref="System.DateTime.MinValue"/>) match every document.
	/// </summary>
	public static ObjectId Max(DateTime timestampUtc) => Build(timestampUtc, 0xFF);

	private static ObjectId Build(DateTime timestampUtc, byte fill)
	{
		var utc = timestampUtc.Kind == DateTimeKind.Utc ? timestampUtc : timestampUtc.ToUniversalTime();
		if (utc <= DateTime.UnixEpoch) return ObjectId.Empty;

		var seconds = (long)(utc - DateTime.UnixEpoch).TotalSeconds;
		if (seconds <= 0) return ObjectId.Empty;
		if (seconds > uint.MaxValue) seconds = uint.MaxValue;

		var ts = (uint)seconds;
		var bytes = new byte[12];
		bytes[0] = (byte)(ts >> 24);
		bytes[1] = (byte)(ts >> 16);
		bytes[2] = (byte)(ts >> 8);
		bytes[3] = (byte)ts;
		for (var i = 4; i < 12; i++) bytes[i] = fill;
		return new ObjectId(bytes);
	}
}
