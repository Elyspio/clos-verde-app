using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using ClosVerdeApp.Api.Abstractions.Exceptions;
using ClosVerdeApp.Api.Abstractions.Interfaces.Repositories;
using ClosVerdeApp.Api.Core.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Shouldly;
using Xunit;

namespace ClosVerdeApp.Api.Tests.Services;

public class AttachmentServiceTests
{
	[Fact]
	public async Task UploadStoresFileAndReturnsTransportWithDownloadUrl()
	{
		var repository = new InMemoryAttachmentRepository();
		var sut = CreateService(repository);
		await using var content = new MemoryStream([1, 2, 3, 4, 5]);

		var attachment = await sut.Upload(Guid.NewGuid(), "rapport.pdf", "application/pdf", content);

		attachment.FileName.ShouldBe("rapport.pdf");
		attachment.ContentType.ShouldBe("application/pdf");
		attachment.SizeBytes.ShouldBe(5);
		attachment.IsImage.ShouldBeFalse();
		attachment.DownloadUrl.ShouldBe($"/api/attachments/{attachment.Id}");
		repository.Stored.ShouldHaveSingleItem();
	}

	[Fact]
	public async Task UploadFlagsImageContentTypes()
	{
		var sut = CreateService(new InMemoryAttachmentRepository());
		await using var content = new MemoryStream([0xFF, 0xD8, 0xFF]);

		var attachment = await sut.Upload(Guid.NewGuid(), "photo.jpg", "image/jpeg", content);

		attachment.IsImage.ShouldBeTrue();
	}

	[Fact]
	public async Task UploadRejectsEmptyStream()
	{
		var repository = new InMemoryAttachmentRepository();
		var sut = CreateService(repository);
		await using var content = new MemoryStream();

		var ex = await Should.ThrowAsync<HttpException>(() => sut.Upload(Guid.NewGuid(), "vide.txt", "text/plain", content));
		ex.ShouldBeOfType<HttpException.BadRequest>();
		// Service should clean up the 0-byte placeholder it just persisted.
		repository.Stored.ShouldBeEmpty();
	}

	[Fact]
	public async Task UploadTranslatesLimitOverrunIntoBadRequest()
	{
		var sut = CreateService(new InMemoryAttachmentRepository());
		await using var content = new ThrowOnReadStream();

		var ex = await Should.ThrowAsync<HttpException>(() => sut.Upload(Guid.NewGuid(), "lourd.bin", "application/octet-stream", content));
		ex.ShouldBeOfType<HttpException.BadRequest>();
		ex.Message.ShouldContain("Mo");
	}

	[Theory]
	[InlineData("malware.exe")]
	[InlineData("script.BAT")]
	[InlineData("shell.sh")]
	[InlineData("script.ps1")]
	public async Task UploadRejectsForbiddenExtensions(string fileName)
	{
		var sut = CreateService(new InMemoryAttachmentRepository());
		await using var content = new MemoryStream([1, 2, 3]);

		var ex = await Should.ThrowAsync<HttpException>(() => sut.Upload(Guid.NewGuid(), fileName, "application/octet-stream", content));
		ex.ShouldBeOfType<HttpException.BadRequest>();
	}

	[Fact]
	public async Task UploadStripsPathSeparatorsFromFileName()
	{
		var repository = new InMemoryAttachmentRepository();
		var sut = CreateService(repository);
		await using var content = new MemoryStream([1, 2, 3]);

		var attachment = await sut.Upload(Guid.NewGuid(), "..\\..\\secret.txt", "text/plain", content);

		attachment.FileName.ShouldBe("secret.txt");
	}

	[Fact]
	public async Task UploadDefaultsToOctetStreamWhenContentTypeIsMissing()
	{
		var repository = new InMemoryAttachmentRepository();
		var sut = CreateService(repository);
		await using var content = new MemoryStream([1, 2, 3]);

		var attachment = await sut.Upload(Guid.NewGuid(), "blob.bin", "", content);

		attachment.ContentType.ShouldBe("application/octet-stream");
	}

	[Fact]
	public async Task RequireOwnedByUploaderThrowsForbiddenWhenUploaderDiffers()
	{
		var repository = new InMemoryAttachmentRepository();
		var sut = CreateService(repository);
		var uploaderId = Guid.NewGuid();
		await using var content = new MemoryStream([1, 2, 3]);
		var uploaded = await sut.Upload(uploaderId, "doc.pdf", "application/pdf", content);

		var ex = await Should.ThrowAsync<HttpException>(() => sut.RequireOwnedByUploader(uploaded.Id, Guid.NewGuid()));
		ex.ShouldBeOfType<HttpException.Forbidden>();
	}

	[Fact]
	public async Task RequireOwnedByUploaderThrowsBadRequestWhenAttachmentMissing()
	{
		var sut = CreateService(new InMemoryAttachmentRepository());

		var ex = await Should.ThrowAsync<HttpException>(() => sut.RequireOwnedByUploader(Guid.NewGuid(), Guid.NewGuid()));
		ex.ShouldBeOfType<HttpException.BadRequest>();
	}

	[Fact]
	public async Task DownloadReturnsMetadataAndStream()
	{
		var repository = new InMemoryAttachmentRepository();
		var sut = CreateService(repository);
		await using var content = new MemoryStream([7, 8, 9]);
		var uploaded = await sut.Upload(Guid.NewGuid(), "data.bin", "application/octet-stream", content);

		var (metadata, stream) = await sut.Download(uploaded.Id);
		using var reader = new BinaryReader(stream);
		var bytes = reader.ReadBytes((int)metadata.SizeBytes);

		metadata.FileName.ShouldBe("data.bin");
		bytes.ShouldBe([7, 8, 9]);
	}

	[Fact]
	public async Task DownloadOfUnknownIdThrowsNotFound()
	{
		var sut = CreateService(new InMemoryAttachmentRepository());
		await Should.ThrowAsync<HttpException.NotFound<Abstractions.Models.Transports.Attachment>>(() => sut.Download(Guid.NewGuid()));
	}

	private static AttachmentService CreateService(IAttachmentRepository repository) =>
		new(repository, NullLogger<AttachmentService>.Instance);

	/// <summary>Read throws synchronously, simulating the limit wrapper rejecting an oversize upload.</summary>
	private sealed class ThrowOnReadStream : Stream
	{
		public override bool CanRead => true;
		public override bool CanSeek => false;
		public override bool CanWrite => false;
		public override long Length => throw new NotSupportedException();
		public override long Position { get => 0; set => throw new NotSupportedException(); }
		public override void Flush() { }
		public override int Read(byte[] buffer, int offset, int count) => throw new InvalidDataException("Payload exceeded limit.");
		public override Task<int> ReadAsync(byte[] buffer, int offset, int count, CancellationToken cancellationToken) => throw new InvalidDataException("Payload exceeded limit.");
		public override ValueTask<int> ReadAsync(Memory<byte> buffer, CancellationToken cancellationToken = default) => throw new InvalidDataException("Payload exceeded limit.");
		public override long Seek(long offset, SeekOrigin origin) => throw new NotSupportedException();
		public override void SetLength(long value) => throw new NotSupportedException();
		public override void Write(byte[] buffer, int offset, int count) => throw new NotSupportedException();
	}
}
