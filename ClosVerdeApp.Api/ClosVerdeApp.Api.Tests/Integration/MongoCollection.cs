using Xunit;

namespace ClosVerdeApp.Api.Tests.Integration;

/// <summary>Shares a single MongoDB container across all integration test classes in this collection.</summary>
[CollectionDefinition(Name)]
public sealed class MongoCollection : ICollectionFixture<MongoFixture>
{
	public const string Name = "mongo";
}
