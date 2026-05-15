using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
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

public class PushNotificationServiceTests
{
	[Fact]
	public async Task NotifyMessageMentionSendsOnlyToMentionedNonMutedUsers()
	{
		var authorId = Guid.NewGuid();
		var mutedUserId = Guid.NewGuid();
		var recipientId = Guid.NewGuid();
		var unmentionedId = Guid.NewGuid();
		var topicId = Guid.NewGuid();
		var repository = new FakePushSubscriptionRepository([
			Subscription(recipientId, "https://push.example/recipient"),
			Subscription(mutedUserId, "https://push.example/muted"),
			Subscription(unmentionedId, "https://push.example/unmentioned")
		]);
		var transport = new RecordingPushTransport();
		var sut = CreateService(repository, transport: transport);

		var messageId = Guid.NewGuid();

		await sut.NotifyMessageMention(
			new Message
			{
				Id = messageId,
				TopicId = topicId,
				AuthorUserId = authorId,
				AuthorDisplayName = "Alice",
				ContentHtml = "<p>Salut</p>",
				Mentions = [recipientId, mutedUserId],
				CreatedAt = DateTime.UtcNow,
				EditedAt = null,
				IsDeleted = false,
				IsSystem = false
			},
			new TopicEntity
			{
				Id = ObjectId.GenerateNewId(),
				Kind = TopicKind.Custom,
				Name = "Salon",
				UpdatedAt = DateTime.UtcNow,
				MessageCount = 0,
				Muted = new Dictionary<string, bool> { [mutedUserId.ToString("D")] = true },
				ReadReceipts = []
			},
			TestContext.Current.CancellationToken);

		transport.Sent.Count.ShouldBe(1);
		transport.Sent[0].Subscription.UserId.ShouldBe(recipientId);
		transport.Sent[0].Payload.Type.ShouldBe("message-mention");
		transport.Sent[0].Payload.Url.ShouldBe($"/messages/{topicId}#message-{messageId}");
	}

	[Fact]
	public async Task NotifyMessageMentionDoesNotSendToAuthor()
	{
		var authorId = Guid.NewGuid();
		var repository = new FakePushSubscriptionRepository([Subscription(authorId, "https://push.example/author")]);
		var transport = new RecordingPushTransport();
		var sut = CreateService(repository, transport: transport);

		await sut.NotifyMessageMention(
			new Message
			{
				Id = Guid.NewGuid(),
				TopicId = Guid.NewGuid(),
				AuthorUserId = authorId,
				AuthorDisplayName = "Alice",
				ContentHtml = "<p>@me</p>",
				Mentions = [authorId],
				CreatedAt = DateTime.UtcNow,
				EditedAt = null,
				IsDeleted = false,
				IsSystem = false
			},
			Topic(),
			TestContext.Current.CancellationToken);

		transport.Sent.ShouldBeEmpty();
	}

	[Fact]
	public async Task NotifyReservationCreatedSendsToEveryDirectoryUserExceptCreator()
	{
		var creatorId = Guid.NewGuid();
		var recipientId = Guid.NewGuid();
		var otherRecipientId = Guid.NewGuid();
		var repository = new FakePushSubscriptionRepository([
			Subscription(creatorId, "https://push.example/creator"),
			Subscription(recipientId, "https://push.example/recipient"),
			Subscription(otherRecipientId, "https://push.example/other")
		]);
		var transport = new RecordingPushTransport();
		var sut = CreateService(
			repository,
			new FakeUserDirectoryService([
				new DirectoryUser { Id = creatorId, DisplayName = "Alice" },
				new DirectoryUser { Id = recipientId, DisplayName = "Bob" },
				new DirectoryUser { Id = otherRecipientId, DisplayName = "Claire" }
			]),
			transport);

		var reservationId = Guid.NewGuid();
		var startDate = new DateTime(2026, 7, 1, 10, 0, 0, DateTimeKind.Utc);

		await sut.NotifyReservationCreated(
			new Reservation
			{
				Id = reservationId,
				User = new UserRef { Id = creatorId, DisplayName = "Alice" },
				StartDate = startDate,
				EndDate = startDate.AddDays(1),
				Note = null,
				CreatedAt = DateTime.UtcNow,
				Validation = new ReservationValidationDto { Status = ReservationStatus.Pending, Deadline = DateTime.UtcNow.AddHours(1) },
				TopicId = null,
				Objection = null
			},
			TestContext.Current.CancellationToken);

		transport.Sent.Select(s => s.Subscription.UserId).ShouldBe([recipientId, otherRecipientId], ignoreOrder: true);
		transport.Sent.ShouldAllBe(s => s.Payload.Type == "reservation-created");
		transport.Sent.ShouldAllBe(s => s.Payload.Url == $"/calendrier?reservation={reservationId}&date=2026-07-01");
	}

	[Fact]
	public async Task NotifyMessageMentionDeletesGoneSubscriptions()
	{
		var recipientId = Guid.NewGuid();
		var subscription = Subscription(recipientId, "https://push.example/gone");
		var repository = new FakePushSubscriptionRepository([subscription]);
		var transport = new RecordingPushTransport { GoneEndpoint = subscription.Endpoint };
		var sut = CreateService(repository, transport: transport);

		await sut.NotifyMessageMention(
			new Message
			{
				Id = Guid.NewGuid(),
				TopicId = Guid.NewGuid(),
				AuthorUserId = Guid.NewGuid(),
				AuthorDisplayName = "Alice",
				ContentHtml = "<p>Salut</p>",
				Mentions = [recipientId],
				CreatedAt = DateTime.UtcNow,
				EditedAt = null,
				IsDeleted = false,
				IsSystem = false
			},
			Topic(),
			TestContext.Current.CancellationToken);

		repository.DeletedEndpoints.ShouldContain(subscription.Endpoint);
	}

	private static PushNotificationService CreateService(
		FakePushSubscriptionRepository repository,
		IUserDirectoryService? directory = null,
		RecordingPushTransport? transport = null) =>
		new(repository, directory ?? new FakeUserDirectoryService([]), transport ?? new RecordingPushTransport(), NullLogger<PushNotificationService>.Instance);

	private static TopicEntity Topic() => new()
	{
		Id = ObjectId.GenerateNewId(),
		Kind = TopicKind.Custom,
		Name = "Salon",
		UpdatedAt = DateTime.UtcNow,
		MessageCount = 0,
		Muted = [],
		ReadReceipts = []
	};

	private static PushSubscriptionEntity Subscription(Guid userId, string endpoint) => new()
	{
		Id = ObjectId.GenerateNewId(),
		UserId = userId,
		Endpoint = endpoint,
		P256dh = "p256dh",
		Auth = "auth"
	};

	private sealed class FakePushSubscriptionRepository(List<PushSubscriptionEntity> subscriptions) : IPushSubscriptionRepository
	{
		public List<string> DeletedEndpoints { get; } = [];
		public List<string> FailedEndpoints { get; } = [];

		public Task<PushSubscriptionEntity> Upsert(Guid userId, string endpoint, string p256dh, string auth, string? userAgent) =>
			throw new NotSupportedException();

		public Task Delete(Guid userId, string endpoint)
		{
			DeletedEndpoints.Add(endpoint);
			return Task.CompletedTask;
		}

		public Task DeleteByEndpoint(string endpoint)
		{
			DeletedEndpoints.Add(endpoint);
			return Task.CompletedTask;
		}

		public Task<List<PushSubscriptionEntity>> GetByUserIds(IReadOnlyCollection<Guid> userIds) =>
			Task.FromResult(subscriptions.Where(s => userIds.Contains(s.UserId)).ToList());

		public Task MarkFailure(string endpoint, DateTime failureAt)
		{
			FailedEndpoints.Add(endpoint);
			return Task.CompletedTask;
		}
	}

	private sealed class FakeUserDirectoryService(List<DirectoryUser> users) : IUserDirectoryService
	{
		public Task<List<DirectoryUser>> ListAsync(CancellationToken cancellationToken = default) => Task.FromResult(users);
	}

	private sealed class RecordingPushTransport : IPushTransport
	{
		public string? GoneEndpoint { get; set; }
		public List<(PushSubscriptionEntity Subscription, PushNotificationPayload Payload)> Sent { get; } = [];

		public Task Send(PushSubscriptionEntity subscription, PushNotificationPayload payload, CancellationToken cancellationToken = default)
		{
			if (subscription.Endpoint == GoneEndpoint) throw new PushSubscriptionGoneException(subscription.Endpoint);
			Sent.Add((subscription, payload));
			return Task.CompletedTask;
		}
	}
}
