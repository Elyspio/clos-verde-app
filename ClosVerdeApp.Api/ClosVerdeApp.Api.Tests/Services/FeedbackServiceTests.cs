using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
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

public class FeedbackServiceTests
{
	[Fact]
	public async Task CreatePersistsFeedbackAndPublishesEvent()
	{
		var harness = new Harness();
		var authorId = Guid.NewGuid();

		var feedback = await harness.Service.Create(
			new CreateFeedbackRequest
			{
				Category = FeedbackCategory.Bug,
				Title = "Le bouton ne marche pas",
				Body = "Quand je clique, rien ne se passe.",
			},
			authorId,
			"Alice",
			"alice@example.com");

		feedback.Title.ShouldBe("Le bouton ne marche pas");
		feedback.Category.ShouldBe(FeedbackCategory.Bug);
		feedback.Status.ShouldBe(FeedbackStatus.Open);
		feedback.Author.Id.ShouldBe(authorId);
		feedback.Author.Email.ShouldBe("alice@example.com");
		harness.Repo.Items.ShouldHaveSingleItem();
		harness.Publisher.Created.ShouldHaveSingleItem();
	}

	[Fact]
	public async Task CreateRejectsEmptyTitle()
	{
		var harness = new Harness();

		var ex = await Should.ThrowAsync<HttpException>(() => harness.Service.Create(
			new CreateFeedbackRequest { Category = FeedbackCategory.Bug, Title = "   ", Body = "ok" },
			Guid.NewGuid(), "Alice", null));
		ex.ShouldBeOfType<HttpException.BadRequest>();
	}

	[Fact]
	public async Task CreateRejectsEmptyBody()
	{
		var harness = new Harness();

		var ex = await Should.ThrowAsync<HttpException>(() => harness.Service.Create(
			new CreateFeedbackRequest { Category = FeedbackCategory.Suggestion, Title = "Idée", Body = "" },
			Guid.NewGuid(), "Alice", null));
		ex.ShouldBeOfType<HttpException.BadRequest>();
	}

	[Fact]
	public async Task CreateRejectsTooLongBody()
	{
		var harness = new Harness();

		var ex = await Should.ThrowAsync<HttpException>(() => harness.Service.Create(
			new CreateFeedbackRequest { Category = FeedbackCategory.Bug, Title = "ok", Body = new string('a', 4001) },
			Guid.NewGuid(), "Alice", null));
		ex.ShouldBeOfType<HttpException.BadRequest>();
	}

	[Fact]
	public async Task CreateRejectsDuplicateAttachmentIds()
	{
		var harness = new Harness();
		var authorId = Guid.NewGuid();
		var pdf = await harness.UploadAttachment(authorId, "doc.pdf", "application/pdf");

		var ex = await Should.ThrowAsync<HttpException>(() => harness.Service.Create(
			new CreateFeedbackRequest
			{
				Category = FeedbackCategory.Bug,
				Title = "bug",
				Body = "trace ci-jointe",
				AttachmentIds = [pdf, pdf],
			},
			authorId, "Alice", null));
		ex.ShouldBeOfType<HttpException.BadRequest>();
	}

	[Fact]
	public async Task CreateRejectsAttachmentOwnedByAnotherUser()
	{
		var harness = new Harness();
		var authorId = Guid.NewGuid();
		var otherId = Guid.NewGuid();
		var stolen = await harness.UploadAttachment(otherId, "secret.pdf", "application/pdf");

		var ex = await Should.ThrowAsync<HttpException>(() => harness.Service.Create(
			new CreateFeedbackRequest
			{
				Category = FeedbackCategory.Bug,
				Title = "bug",
				Body = "trace",
				AttachmentIds = [stolen],
			},
			authorId, "Alice", null));
		ex.ShouldBeOfType<HttpException.Forbidden>();
	}

	[Fact]
	public async Task CreateBindsOwnedAttachments()
	{
		var harness = new Harness();
		var authorId = Guid.NewGuid();
		var screenshot = await harness.UploadAttachment(authorId, "screen.png", "image/png");

		var feedback = await harness.Service.Create(
			new CreateFeedbackRequest
			{
				Category = FeedbackCategory.Bug,
				Title = "bug",
				Body = "voir capture",
				AttachmentIds = [screenshot],
			},
			authorId, "Alice", null);

		feedback.Attachments.ShouldHaveSingleItem();
		feedback.Attachments[0].FileName.ShouldBe("screen.png");
		feedback.Attachments[0].IsImage.ShouldBeTrue();
	}

	[Fact]
	public async Task UpdateStatusToResolvedSetsResolvedAtAndPublishes()
	{
		var harness = new Harness();
		var authorId = Guid.NewGuid();
		var created = await harness.Service.Create(
			new CreateFeedbackRequest { Category = FeedbackCategory.Bug, Title = "t", Body = "b" },
			authorId, "Alice", null);

		var updated = await harness.Service.UpdateStatus(created.Id, FeedbackStatus.Resolved, "fixed in next deploy");

		updated.Status.ShouldBe(FeedbackStatus.Resolved);
		updated.ResolvedAt.ShouldNotBeNull();
		updated.AdminNote.ShouldBe("fixed in next deploy");
		harness.Publisher.Updated.ShouldHaveSingleItem();
	}

	[Fact]
	public async Task UpdateStatusToOpenClearsResolvedAt()
	{
		var harness = new Harness();
		var authorId = Guid.NewGuid();
		var created = await harness.Service.Create(
			new CreateFeedbackRequest { Category = FeedbackCategory.Bug, Title = "t", Body = "b" },
			authorId, "Alice", null);
		await harness.Service.UpdateStatus(created.Id, FeedbackStatus.Resolved, null);

		var reopened = await harness.Service.UpdateStatus(created.Id, FeedbackStatus.Open, null);

		reopened.Status.ShouldBe(FeedbackStatus.Open);
		reopened.ResolvedAt.ShouldBeNull();
	}

	[Fact]
	public async Task UpdateStatusThrowsWhenFeedbackUnknown()
	{
		var harness = new Harness();

		var ex = await Should.ThrowAsync<HttpException>(() =>
			harness.Service.UpdateStatus(Guid.NewGuid(), FeedbackStatus.Resolved, null));
		ex.ShouldBeOfType<HttpException.NotFound<FeedbackEntity>>();
	}

	[Fact]
	public async Task ListPaginatesAndFiltersByCategoryAndStatus()
	{
		var harness = new Harness();
		var authorId = Guid.NewGuid();

		for (var i = 0; i < 5; i++)
		{
			await harness.Service.Create(
				new CreateFeedbackRequest { Category = FeedbackCategory.Bug, Title = $"bug {i}", Body = "x" },
				authorId, "Alice", null);
		}
		await harness.Service.Create(
			new CreateFeedbackRequest { Category = FeedbackCategory.Suggestion, Title = "idée", Body = "x" },
			authorId, "Alice", null);

		var bugs = await harness.Service.List(FeedbackCategory.Bug, null, page: 1, pageSize: 3);
		bugs.Total.ShouldBe(5);
		bugs.Items.Count.ShouldBe(3);

		var allOpen = await harness.Service.List(null, FeedbackStatus.Open, page: 1, pageSize: 100);
		allOpen.Total.ShouldBe(6);
	}

	[Fact]
	public async Task ListMineReturnsOnlyAuthoredFeedback()
	{
		var harness = new Harness();
		var aliceId = Guid.NewGuid();
		var bobId = Guid.NewGuid();
		await harness.Service.Create(new CreateFeedbackRequest { Category = FeedbackCategory.Bug, Title = "a", Body = "x" }, aliceId, "Alice", null);
		await harness.Service.Create(new CreateFeedbackRequest { Category = FeedbackCategory.Bug, Title = "b", Body = "x" }, bobId, "Bob", null);
		await harness.Service.Create(new CreateFeedbackRequest { Category = FeedbackCategory.Bug, Title = "c", Body = "x" }, aliceId, "Alice", null);

		var mine = await harness.Service.ListMine(aliceId, null, 1, 50);

		mine.Total.ShouldBe(2);
		mine.Items.ShouldAllBe(f => f.Author.Id == aliceId);
	}

	[Fact]
	public async Task ListMineFiltersByStatusAndHidesAdminNote()
	{
		var harness = new Harness();
		var authorId = Guid.NewGuid();
		var open = await harness.Service.Create(new CreateFeedbackRequest { Category = FeedbackCategory.Bug, Title = "open", Body = "x" }, authorId, "Alice", null);
		var resolved = await harness.Service.Create(new CreateFeedbackRequest { Category = FeedbackCategory.Bug, Title = "done", Body = "x" }, authorId, "Alice", null);
		await harness.Service.UpdateStatus(resolved.Id, FeedbackStatus.Resolved, "note interne");

		var mine = await harness.Service.ListMine(authorId, [FeedbackStatus.Resolved], 1, 50);

		mine.Total.ShouldBe(1);
		mine.Items.ShouldHaveSingleItem().Id.ShouldBe(resolved.Id);
		mine.Items[0].AdminNote.ShouldBeNull();
		mine.Items.ShouldNotContain(f => f.Id == open.Id);
	}

	[Fact]
	public async Task CloseMineResolvesOwnFeedbackAndPublishes()
	{
		var harness = new Harness();
		var authorId = Guid.NewGuid();
		var created = await harness.Service.Create(
			new CreateFeedbackRequest { Category = FeedbackCategory.Bug, Title = "t", Body = "b" },
			authorId, "Alice", null);

		var closed = await harness.Service.CloseMine(created.Id, authorId);

		closed.Status.ShouldBe(FeedbackStatus.Resolved);
		closed.ResolvedAt.ShouldNotBeNull();
		closed.AdminNote.ShouldBeNull();
		harness.Publisher.Updated.ShouldHaveSingleItem();
	}

	[Fact]
	public async Task CloseMineRejectsAnotherUsersFeedback()
	{
		var harness = new Harness();
		var ownerId = Guid.NewGuid();
		var otherId = Guid.NewGuid();
		var created = await harness.Service.Create(
			new CreateFeedbackRequest { Category = FeedbackCategory.Bug, Title = "t", Body = "b" },
			ownerId, "Alice", null);

		var ex = await Should.ThrowAsync<HttpException>(() => harness.Service.CloseMine(created.Id, otherId));
		ex.ShouldBeOfType<HttpException.Forbidden>();
	}

	[Fact]
	public async Task CloseMineThrowsWhenFeedbackUnknown()
	{
		var harness = new Harness();

		var ex = await Should.ThrowAsync<HttpException>(() => harness.Service.CloseMine(Guid.NewGuid(), Guid.NewGuid()));
		ex.ShouldBeOfType<HttpException.NotFound<FeedbackEntity>>();
	}

	[Fact]
	public async Task CloseMineAlreadyResolvedKeepsResolvedAt()
	{
		var harness = new Harness();
		var authorId = Guid.NewGuid();
		var created = await harness.Service.Create(
			new CreateFeedbackRequest { Category = FeedbackCategory.Bug, Title = "t", Body = "b" },
			authorId, "Alice", null);
		var firstClose = await harness.Service.CloseMine(created.Id, authorId);

		var secondClose = await harness.Service.CloseMine(created.Id, authorId);

		secondClose.Status.ShouldBe(FeedbackStatus.Resolved);
		secondClose.ResolvedAt.ShouldBe(firstClose.ResolvedAt);
	}

	private sealed class Harness
	{
		public FakeFeedbackRepository Repo { get; } = new();
		public FakeFeedbackPublisher Publisher { get; } = new();
		public InMemoryAttachmentRepository Attachments { get; } = new();
		public AttachmentService AttachmentSvc { get; }
		public FeedbackService Service { get; }

		public Harness()
		{
			AttachmentSvc = new AttachmentService(Attachments, NullLogger<AttachmentService>.Instance);
			Service = new FeedbackService(Repo, AttachmentSvc, Publisher, NullLogger<FeedbackService>.Instance);
		}

		public async Task<Guid> UploadAttachment(Guid uploaderId, string fileName, string contentType)
		{
			await using var content = new MemoryStream([1, 2, 3]);
			var attachment = await AttachmentSvc.Upload(uploaderId, fileName, contentType, content);
			return attachment.Id;
		}
	}

	private sealed class FakeFeedbackRepository : IFeedbackRepository
	{
		public List<FeedbackEntity> Items { get; } = [];

		public Task<FeedbackEntity> Create(
			FeedbackCategory category,
			string title,
			string body,
			FeedbackAuthor author,
			List<MessageAttachmentEntity> attachments,
			FeedbackContext? context)
		{
			var entity = new FeedbackEntity
			{
				Id = ObjectId.GenerateNewId(),
				Category = category,
				Title = title,
				Body = body,
				Author = author,
				Attachments = attachments,
				Context = context,
			};
			Items.Add(entity);
			return Task.FromResult(entity);
		}

		public Task<FeedbackEntity?> GetById(Guid id) =>
			Task.FromResult(Items.FirstOrDefault(f => f.Id.AsGuid() == id));

		public Task<List<FeedbackEntity>> List(FeedbackCategory? category, FeedbackStatus? status, int skip, int take)
		{
			var page = Items
				.Where(f => !category.HasValue || f.Category == category.Value)
				.Where(f => !status.HasValue || f.Status == status.Value)
				.OrderByDescending(f => f.Id)
				.Skip(skip)
				.Take(take)
				.ToList();
			return Task.FromResult(page);
		}

		public Task<long> Count(FeedbackCategory? category, FeedbackStatus? status)
		{
			var count = Items
				.Where(f => !category.HasValue || f.Category == category.Value)
				.Where(f => !status.HasValue || f.Status == status.Value)
				.LongCount();
			return Task.FromResult(count);
		}

		public Task<List<FeedbackEntity>> ListByAuthor(Guid authorId, IReadOnlyCollection<FeedbackStatus>? statuses, int skip, int take)
		{
			var page = Items
				.Where(f => f.Author.Id == authorId)
				.Where(f => statuses is not { Count: > 0 } || statuses.Contains(f.Status))
				.OrderByDescending(f => f.Id)
				.Skip(skip)
				.Take(take)
				.ToList();
			return Task.FromResult(page);
		}

		public Task<long> CountByAuthor(Guid authorId, IReadOnlyCollection<FeedbackStatus>? statuses)
		{
			var count = Items
				.Where(f => f.Author.Id == authorId)
				.Where(f => statuses is not { Count: > 0 } || statuses.Contains(f.Status))
				.LongCount();
			return Task.FromResult(count);
		}

		public Task<FeedbackEntity?> UpdateStatus(Guid id, FeedbackStatus status, string? adminNote, DateTime? resolvedAt)
		{
			var entity = Items.FirstOrDefault(f => f.Id.AsGuid() == id);
			if (entity is null) return Task.FromResult<FeedbackEntity?>(null);
			entity.Status = status;
			entity.AdminNote = adminNote;
			entity.ResolvedAt = resolvedAt;
			return Task.FromResult<FeedbackEntity?>(entity);
		}
	}

	private sealed class FakeFeedbackPublisher : IFeedbackRealtimePublisher
	{
		public List<Feedback> Created { get; } = [];
		public List<Feedback> Updated { get; } = [];

		public Task PublishFeedbackCreated(Feedback feedback) { Created.Add(feedback); return Task.CompletedTask; }
		public Task PublishFeedbackUpdated(Feedback feedback) { Updated.Add(feedback); return Task.CompletedTask; }
	}
}
