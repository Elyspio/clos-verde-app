using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ClosVerdeApp.Api.Abstractions.Common.Extensions;
using ClosVerdeApp.Api.Abstractions.Models.Entities;
using ClosVerdeApp.Api.Adapters.Mongo.Repositories;
using ClosVerdeApp.Api.Adapters.Mongo.Repositories.Base;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using MongoDB.Bson;
using MongoDB.Driver;
using Shouldly;
using Xunit;

namespace ClosVerdeApp.Api.Tests.Integration;

/// <summary>
/// Integration coverage for cursor pagination and unread counting against a real MongoDB.
/// Reproduces the bug where a non-deterministic, timestamp-derived ObjectId bound duplicated
/// (or skipped) messages sharing the same one-second ObjectId timestamp, then verifies the
/// id-cursor fix.
/// </summary>
[Collection(MongoCollection.Name)]
public sealed class MessageRepositoryPaginationTests(MongoFixture fixture)
{
	private MessageRepository CreateRepository() =>
		new(fixture.Configuration, NullLogger<BaseRepository<MessageEntity>>.Instance);

	private IMongoCollection<MessageEntity> RawCollection()
	{
		var connectionString = fixture.Configuration.GetConnectionString("MongoDB")!;
		var url = new MongoUrl(connectionString);
		return new MongoClient(connectionString).GetDatabase(url.DatabaseName).GetCollection<MessageEntity>("Message");
	}

	private static MessageEntity NewMessage(Guid topicId, ObjectId id, Guid authorId) => new()
	{
		Id = id,
		TopicId = topicId,
		AuthorUserId = authorId,
		AuthorDisplayName = "Tester",
		ContentHtml = $"<p>{id}</p>",
		Mentions = [],
		Attachments = [],
		IsSystem = false,
	};

	[Fact]
	public async Task PagingOverASharedSecondReturnsEveryMessageExactlyOnce()
	{
		var repo = CreateRepository(); // triggers MongoContext conventions registration
		var collection = RawCollection();
		var topicId = Guid.NewGuid();
		var author = Guid.NewGuid();

		// Three of the five messages share the exact same one-second ObjectId timestamp, and that
		// burst straddles the page boundary (page size = 2) — the precise shape that broke before.
		var secondA = new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc);
		var secondB = secondA.AddSeconds(1);
		var secondC = secondA.AddSeconds(2);

		var mA1 = ObjectId.GenerateNewId(secondA);
		var mB1 = ObjectId.GenerateNewId(secondB);
		var mB2 = ObjectId.GenerateNewId(secondB);
		var mB3 = ObjectId.GenerateNewId(secondB);
		var mC1 = ObjectId.GenerateNewId(secondC);
		var seeded = new[] { mA1, mB1, mB2, mB3, mC1 };

		await collection.InsertManyAsync(seeded.Select(id => NewMessage(topicId, id, author)));

		// --- Demonstrate the OLD behaviour: a timestamp-derived bound re-includes the cursor row. ---
		var cursor = mB3; // oldest row of page 1 (newest 2 = mC1, mB3)
		var buggyBound = ObjectId.GenerateNewId(cursor.CreationTime); // what ToObjectIdLowerBound did
		var olderWithBuggyBound = await collection
			.Find(Builders<MessageEntity>.Filter.And(
				Builders<MessageEntity>.Filter.Eq(m => m.TopicId, topicId),
				Builders<MessageEntity>.Filter.Lt(m => m.Id, buggyBound)))
			.SortByDescending(m => m.Id)
			.Limit(2)
			.ToListAsync();
		// The boundary message mB3 is wrongly pulled into the "older" page again → duplicate.
		olderWithBuggyBound.Select(m => m.Id).ShouldContain(mB3);

		// --- New behaviour: page with the exact id cursor through the repository. ---
		var collected = new List<ObjectId>();
		Guid? before = null;
		while (true)
		{
			var page = await repo.GetByTopic(topicId, before, limit: 2);
			if (page.Count == 0) break;
			collected.AddRange(page.Select(m => m.Id));
			before = page[0].Id.AsGuid(); // oldest of the page = next cursor
			if (page.Count < 2) break;
		}

		// Every seeded message appears exactly once, in chronological order — no dup, no skip.
		collected.ShouldBe(collected.Distinct());
		collected.OrderBy(x => x).ShouldBe(seeded.OrderBy(x => x));
	}

	[Fact]
	public async Task CountAfterTreatsMessagesInTheReadSecondAsRead()
	{
		var repo = CreateRepository();
		var collection = RawCollection();
		var topicId = Guid.NewGuid();
		var author = Guid.NewGuid();
		var reader = Guid.NewGuid();

		var readSecond = new DateTime(2026, 2, 2, 8, 30, 0, DateTimeKind.Utc);

		// A message late within the read second, with trailing bytes far higher than anything
		// ObjectId.GenerateNewId(readSecond) would produce — the case that yielded a phantom
		// unread count with the old bound. It must still be considered "read".
		var lateInReadSecond = CraftObjectId(readSecond, 0xEE);
		var afterRead = ObjectId.GenerateNewId(readSecond.AddSeconds(5));

		await collection.InsertManyAsync(
		[
			NewMessage(topicId, lateInReadSecond, author),
			NewMessage(topicId, afterRead, author),
		]);

		// Reader has read up to readSecond. Only the strictly-later message stays unread.
		var unread = await repo.CountAfter(topicId, readSecond, reader);
		unread.ShouldBe(1);

		// Reading up to the later message clears everything.
		var allRead = await repo.CountAfter(topicId, afterRead.CreationTime, reader);
		allRead.ShouldBe(0);
	}

	/// <summary>Builds an ObjectId with the given timestamp (second resolution) and fixed trailing bytes.</summary>
	private static ObjectId CraftObjectId(DateTime timestampUtc, byte trailing)
	{
		var seconds = (uint)(timestampUtc - DateTime.UnixEpoch).TotalSeconds;
		var bytes = new byte[12];
		bytes[0] = (byte)(seconds >> 24);
		bytes[1] = (byte)(seconds >> 16);
		bytes[2] = (byte)(seconds >> 8);
		bytes[3] = (byte)seconds;
		for (var i = 4; i < 12; i++) bytes[i] = trailing;
		return new ObjectId(bytes);
	}
}
