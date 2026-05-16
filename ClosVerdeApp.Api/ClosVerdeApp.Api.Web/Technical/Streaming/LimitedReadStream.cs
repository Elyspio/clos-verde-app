namespace ClosVerdeApp.Api.Web.Technical.Streaming;

/// <summary>
/// Read-only stream wrapper that throws <see cref="InvalidDataException"/> as soon as
/// more than <c>maxBytes</c> bytes have been read. Used to fail-fast on oversize uploads
/// without first buffering the whole payload.
/// </summary>
public sealed class LimitedReadStream(Stream inner, long maxBytes) : Stream
{
	private long _read;

	public long BytesRead => _read;

	public override bool CanRead => inner.CanRead;
	public override bool CanSeek => false;
	public override bool CanWrite => false;
	public override long Length => throw new NotSupportedException();
	public override long Position { get => _read; set => throw new NotSupportedException(); }

	public override void Flush() => inner.Flush();

	public override int Read(byte[] buffer, int offset, int count)
	{
		var n = inner.Read(buffer, offset, count);
		Track(n);
		return n;
	}

	public override int Read(Span<byte> buffer)
	{
		var n = inner.Read(buffer);
		Track(n);
		return n;
	}

	public override async ValueTask<int> ReadAsync(Memory<byte> buffer, CancellationToken cancellationToken = default)
	{
		var n = await inner.ReadAsync(buffer, cancellationToken);
		Track(n);
		return n;
	}

	public override Task<int> ReadAsync(byte[] buffer, int offset, int count, CancellationToken cancellationToken)
		=> ReadAsync(buffer.AsMemory(offset, count), cancellationToken).AsTask();

	public override long Seek(long offset, SeekOrigin origin) => throw new NotSupportedException();
	public override void SetLength(long value) => throw new NotSupportedException();
	public override void Write(byte[] buffer, int offset, int count) => throw new NotSupportedException();

	private void Track(int read)
	{
		if (read <= 0) return;
		_read += read;
		if (_read > maxBytes)
			throw new InvalidDataException($"Payload exceeded {maxBytes} bytes.");
	}
}
