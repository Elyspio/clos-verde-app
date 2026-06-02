using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using ClosVerdeApp.Api.Abstractions.Common.Extensions;
using ClosVerdeApp.Api.Abstractions.Models.Entities;
using ClosVerdeApp.Api.Abstractions.Models.Entities.Enums;
using ClosVerdeApp.Api.Adapters.Mongo.Repositories;
using ClosVerdeApp.Api.Adapters.Mongo.Repositories.Base;
using Microsoft.Extensions.Logging.Abstractions;
using MongoDB.Bson;
using Shouldly;
using Xunit;

namespace ClosVerdeApp.Api.Tests.Integration;

/// <summary>
/// Verifies the embedded-array query backing feedback-attachment access control resolves the
/// owning feedback (and only it) against a real MongoDB.
/// </summary>
[Collection(MongoCollection.Name)]
public sealed class FeedbackRepositoryAttachmentTests(MongoFixture fixture)
{
	private FeedbackRepository CreateRepository() =>
		new(fixture.Configuration, NullLogger<BaseRepository<FeedbackEntity>>.Instance);

	[Fact]
	public async Task FindByAttachmentIdResolvesTheOwningFeedback()
	{
		var repo = CreateRepository();
		var author = new FeedbackAuthor { Id = Guid.NewGuid(), DisplayName = "Alice", Email = null };

		var attachmentId = ObjectId.GenerateNewId();
		var created = await repo.Create(
			FeedbackCategory.Bug, "titre", "corps", author,
			[new MessageAttachmentEntity { Id = attachmentId, FileName = "p.txt", ContentType = "text/plain", SizeBytes = 3 }],
			context: null);

		// Another feedback with its own attachment must not be matched.
		await repo.Create(
			FeedbackCategory.Bug, "autre", "corps", new FeedbackAuthor { Id = Guid.NewGuid(), DisplayName = "Bob", Email = null },
			[new MessageAttachmentEntity { Id = ObjectId.GenerateNewId(), FileName = "q.txt", ContentType = "text/plain", SizeBytes = 3 }],
			context: null);

		var found = await repo.FindByAttachmentId(attachmentId.AsGuid());

		found.ShouldNotBeNull();
		found.Id.ShouldBe(created.Id);
		found.Author.Id.ShouldBe(author.Id);

		var unknown = await repo.FindByAttachmentId(Guid.NewGuid());
		unknown.ShouldBeNull();
	}
}
