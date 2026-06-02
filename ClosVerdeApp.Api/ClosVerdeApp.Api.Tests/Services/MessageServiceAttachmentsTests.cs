using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using ClosVerdeApp.Api.Abstractions.Common.Extensions;
using ClosVerdeApp.Api.Abstractions.Exceptions;
using ClosVerdeApp.Api.Abstractions.Interfaces.Repositories;
using ClosVerdeApp.Api.Abstractions.Interfaces.Services;
using ClosVerdeApp.Api.Abstractions.Models.Entities;
using ClosVerdeApp.Api.Abstractions.Models.Entities.Enums;
using ClosVerdeApp.Api.Abstractions.Models.Transports;
using ClosVerdeApp.Api.Core.Services;
using Microsoft.Extensions.Logging.Abstractions;
using MongoDB.Bson;
using Shouldly;
using Xunit;

namespace ClosVerdeApp.Api.Tests.Services;

public class MessageServiceAttachmentsTests
{
	[Fact]
	public async Task PostWithAttachmentsOnlySucceedsAndExposesDownloadUrl()
	{
		var harness = new Harness();
		var authorId = Guid.NewGuid();
		var topicId = harness.SeedTopic();
		var pdfId = await harness.UploadAttachment(authorId, "rapport.pdf", "application/pdf");

		var message = await harness.Service.Post(topicId, authorId, "Alice", contentHtml: "", attachmentIds: [pdfId]);

		message.ContentHtml.ShouldBeEmpty();
		message.Attachments.ShouldHaveSingleItem();
		message.Attachments[0].FileName.ShouldBe("rapport.pdf");
		message.Attachments[0].ContentType.ShouldBe("application/pdf");
		message.Attachments[0].DownloadUrl.ShouldBe($"/api/attachments/{pdfId}");
		message.Attachments[0].IsImage.ShouldBeFalse();
		harness.Publisher.MessagesCreated.ShouldHaveSingleItem();
	}

	[Fact]
	public async Task PostWithTextAndImageAttachmentMarksAttachmentAsImage()
	{
		var harness = new Harness();
		var authorId = Guid.NewGuid();
		var topicId = harness.SeedTopic();
		var imgId = await harness.UploadAttachment(authorId, "photo.png", "image/png");

		var message = await harness.Service.Post(topicId, authorId, "Alice", "<p>regarde</p>", [imgId]);

		message.ContentHtml.ShouldContain("regarde");
		message.Attachments[0].IsImage.ShouldBeTrue();
	}

	[Fact]
	public async Task PostRejectsEmptyMessageWithoutAttachments()
	{
		var harness = new Harness();
		var topicId = harness.SeedTopic();

		var ex = await Should.ThrowAsync<HttpException>(
			() => harness.Service.Post(topicId, Guid.NewGuid(), "Alice", "   ", []));
		ex.ShouldBeOfType<HttpException.BadRequest>();
	}

	[Fact]
	public async Task PostRejectsAttachmentUploadedByAnotherUser()
	{
		var harness = new Harness();
		var topicId = harness.SeedTopic();
		var otherUserId = Guid.NewGuid();
		var pdfId = await harness.UploadAttachment(otherUserId, "espion.pdf", "application/pdf");

		var ex = await Should.ThrowAsync<HttpException>(
			() => harness.Service.Post(topicId, Guid.NewGuid(), "Mallory", "<p>hello</p>", [pdfId]));
		ex.ShouldBeOfType<HttpException.Forbidden>();
	}

	[Fact]
	public async Task PostRejectsDuplicateAttachmentIds()
	{
		var harness = new Harness();
		var topicId = harness.SeedTopic();
		var authorId = Guid.NewGuid();
		var pdfId = await harness.UploadAttachment(authorId, "rapport.pdf", "application/pdf");

		var ex = await Should.ThrowAsync<HttpException>(
			() => harness.Service.Post(topicId, authorId, "Alice", "<p>hi</p>", [pdfId, pdfId]));
		ex.ShouldBeOfType<HttpException.BadRequest>();
	}

	[Fact]
	public async Task PostBindsMultipleAttachmentsInOrder()
	{
		var harness = new Harness();
		var topicId = harness.SeedTopic();
		var authorId = Guid.NewGuid();
		var first = await harness.UploadAttachment(authorId, "first.pdf", "application/pdf");
		var second = await harness.UploadAttachment(authorId, "second.png", "image/png");

		var message = await harness.Service.Post(topicId, authorId, "Alice", "<p>voilà</p>", [first, second]);

		message.Attachments.Select(a => a.FileName).ShouldBe(["first.pdf", "second.png"]);
	}

	[Fact]
	public async Task SoftDeleteRemovesAttachmentBytesFromStorage()
	{
		var harness = new Harness();
		var topicId = harness.SeedTopic();
		var authorId = Guid.NewGuid();
		var pdfId = await harness.UploadAttachment(authorId, "doc.pdf", "application/pdf");
		var message = await harness.Service.Post(topicId, authorId, "Alice", "", [pdfId]);

		await harness.Service.SoftDelete(message.Id, authorId);

		harness.Attachments.Stored.ShouldBeEmpty();
	}

	[Fact]
	public async Task PostMarksTopicAsReadForAuthorAndBumpsStatistics()
	{
		var harness = new Harness();
		var authorId = Guid.NewGuid();
		var topicId = harness.SeedTopic();

		await harness.Service.Post(topicId, authorId, "Alice", "<p>hello</p>", []);

		harness.Topics.BumpCount.ShouldBe(1);
		harness.Topics.ReadReceipts.ShouldContainKey(authorId);
	}

	[Fact]
	public async Task PostDefersPushFanOutToBackgroundAndIsNotBrokenByPushFailures()
	{
		var harness = new Harness();
		harness.PushNotifications.FailMention = true; // push transport is down / slow
		var topicId = harness.SeedTopic();

		// Previously Post awaited the push fan-out inline, so a failing transport made Post throw
		// (and a slow one delayed the response). It must now return regardless.
		var message = await harness.Service.Post(topicId, Guid.NewGuid(), "Alice", "<p>coucou</p>", []);

		message.ShouldNotBeNull();
		// The push was scheduled off-thread, not awaited.
		harness.Dispatcher.Enqueued.ShouldHaveSingleItem();
		// And that scheduled work is exactly what would have failed inline before.
		await Should.ThrowAsync<InvalidOperationException>(() => harness.Dispatcher.Enqueued[0](CancellationToken.None));
	}

	private sealed class Harness
	{
		public FakeMessageRepository Messages { get; } = new();
		public FakeTopicRepository Topics { get; } = new();
		public FakeMessageRealtimePublisher Publisher { get; } = new();
		public FakePushNotificationService PushNotifications { get; } = new();
		public InMemoryAttachmentRepository Attachments { get; } = new();
		public AttachmentService AttachmentSvc { get; }
		public MessageService Service { get; }

		public FakeBackgroundDispatcher Dispatcher { get; } = new();

		public Harness()
		{
			AttachmentSvc = new AttachmentService(Attachments, NullLogger<AttachmentService>.Instance);
			Service = new MessageService(Messages, Topics, Publisher, PushNotifications, AttachmentSvc, Dispatcher, NullLogger<MessageService>.Instance);
		}

		public Guid SeedTopic()
		{
			var entity = new TopicEntity
			{
				Id = ObjectId.GenerateNewId(),
				Kind = TopicKind.Custom,
				Name = "Salon",
				UpdatedAt = DateTime.UtcNow,
				MessageCount = 0,
				Muted = [],
				ReadReceipts = []
			};
			Topics.Add(entity);
			return entity.Id.AsGuid();
		}

		public async Task<Guid> UploadAttachment(Guid uploaderId, string fileName, string contentType)
		{
			await using var content = new MemoryStream([1, 2, 3, 4]);
			var attachment = await AttachmentSvc.Upload(uploaderId, fileName, contentType, content);
			return attachment.Id;
		}
	}

	private sealed class FakeMessageRepository : IMessageRepository
	{
		public List<MessageEntity> Items { get; } = [];

		public Task<List<MessageEntity>> GetByTopic(Guid topicId, Guid? before, int limit) =>
			Task.FromResult(Items.Where(m => m.TopicId == topicId).ToList());

		public Task<MessageEntity?> GetById(Guid id) =>
			Task.FromResult(Items.FirstOrDefault(m => m.Id.AsGuid() == id));

		public Task<MessageEntity> Create(Guid topicId, Guid authorUserId, string authorDisplayName, string contentHtml, List<Guid> mentions, List<MessageAttachmentEntity> attachments, bool isSystem)
		{
			var entity = new MessageEntity
			{
				Id = ObjectId.GenerateNewId(),
				TopicId = topicId,
				AuthorUserId = authorUserId,
				AuthorDisplayName = authorDisplayName,
				ContentHtml = contentHtml,
				Mentions = mentions,
				Attachments = attachments,
				IsSystem = isSystem,
			};
			Items.Add(entity);
			return Task.FromResult(entity);
		}

		public Task<MessageEntity?> Update(Guid id, string contentHtml, List<Guid> mentions)
		{
			var entity = Items.FirstOrDefault(m => m.Id.AsGuid() == id);
			if (entity is null) return Task.FromResult<MessageEntity?>(null);
			entity.ContentHtml = contentHtml;
			entity.Mentions = mentions;
			entity.EditedAt = DateTime.UtcNow;
			return Task.FromResult<MessageEntity?>(entity);
		}

		public Task<MessageEntity?> SoftDelete(Guid id)
		{
			var entity = Items.FirstOrDefault(m => m.Id.AsGuid() == id);
			if (entity is null) return Task.FromResult<MessageEntity?>(null);
			entity.IsDeleted = true;
			entity.ContentHtml = string.Empty;
			entity.Mentions = [];
			entity.EditedAt = DateTime.UtcNow;
			return Task.FromResult<MessageEntity?>(entity);
		}

		public Task DeleteByTopic(Guid topicId)
		{
			Items.RemoveAll(m => m.TopicId == topicId);
			return Task.CompletedTask;
		}

		public Task<int> CountAfter(Guid topicId, DateTime after, Guid excludeAuthorId) => Task.FromResult(0);
		public Task<List<Guid>> GetEngagedTopicIds(Guid userId) => Task.FromResult(new List<Guid>());
	}

	private sealed class FakeTopicRepository : ITopicRepository
	{
		private readonly List<TopicEntity> _topics = [];
		public int BumpCount { get; private set; }
		public Dictionary<Guid, DateTime> ReadReceipts { get; } = [];

		public void Add(TopicEntity topic) => _topics.Add(topic);

		public Task<List<TopicEntity>> GetAll() => Task.FromResult(_topics);
		public Task<TopicEntity?> GetById(Guid id) => Task.FromResult(_topics.FirstOrDefault(t => t.Id.AsGuid() == id));
		public Task<TopicEntity?> GetGlobal() => Task.FromResult<TopicEntity?>(null);
		public Task<TopicEntity?> GetByReservation(Guid reservationId) => Task.FromResult<TopicEntity?>(null);

		public Task<TopicEntity> Create(TopicKind kind, string name, Guid? createdByUserId, string? createdByDisplayName, Guid? reservationId) =>
			throw new NotSupportedException();

		public Task<TopicEntity?> Rename(Guid id, string newName) => throw new NotSupportedException();
		public Task Delete(Guid id) { _topics.RemoveAll(t => t.Id.AsGuid() == id); return Task.CompletedTask; }

		public Task BumpStatistics(Guid id, DateTime lastMessageAt, int delta)
		{
			BumpCount++;
			var topic = _topics.First(t => t.Id.AsGuid() == id);
			topic.LastMessageAt = lastMessageAt;
			topic.MessageCount += delta;
			return Task.CompletedTask;
		}

		public Task DecrementMessageCount(Guid id)
		{
			var topic = _topics.First(t => t.Id.AsGuid() == id);
			topic.MessageCount = Math.Max(0, topic.MessageCount - 1);
			return Task.CompletedTask;
		}

		public Task MarkRead(Guid id, Guid userId, DateTime at)
		{
			ReadReceipts[userId] = at;
			return Task.CompletedTask;
		}

		public Task Mute(Guid id, Guid userId) => Task.CompletedTask;
		public Task Unmute(Guid id, Guid userId) => Task.CompletedTask;
	}

	private sealed class FakeMessageRealtimePublisher : IMessageRealtimePublisher
	{
		public List<Message> MessagesCreated { get; } = [];

		public Task PublishTopicCreated(Topic topic) => Task.CompletedTask;
		public Task PublishTopicUpdated(Topic topic) => Task.CompletedTask;
		public Task PublishTopicDeleted(Guid topicId) => Task.CompletedTask;

		public Task PublishMessageCreated(Message message) { MessagesCreated.Add(message); return Task.CompletedTask; }
		public Task PublishMessageUpdated(Message message) => Task.CompletedTask;
		public Task PublishMessageDeleted(Guid topicId, Guid messageId) => Task.CompletedTask;

		public Task PublishReadReceiptUpdated(Guid userId, Guid topicId, DateTime lastReadAt) => Task.CompletedTask;
	}

	private sealed class FakePushNotificationService : IPushNotificationService
	{
		/// <summary>Simulates a failing / unreachable push transport.</summary>
		public bool FailMention { get; set; }

		public Task NotifyMessageMention(Message message, TopicEntity topic, CancellationToken cancellationToken = default) =>
			FailMention ? Task.FromException(new InvalidOperationException("push transport unreachable")) : Task.CompletedTask;

		public Task NotifyReservationCreated(Reservation reservation, CancellationToken cancellationToken = default) => Task.CompletedTask;
	}

	private sealed class FakeBackgroundDispatcher : IBackgroundDispatcher
	{
		public List<Func<CancellationToken, Task>> Enqueued { get; } = [];
		public void Enqueue(Func<CancellationToken, Task> work, string description) => Enqueued.Add(work);
	}
}
