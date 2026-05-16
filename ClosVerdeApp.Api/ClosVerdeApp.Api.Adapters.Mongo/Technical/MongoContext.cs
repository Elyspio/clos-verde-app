using Microsoft.Extensions.Configuration;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Conventions;
using MongoDB.Bson.Serialization.Serializers;
using MongoDB.Driver;
using MongoDB.Driver.GridFS;
using Serilog;

namespace ClosVerdeApp.Api.Adapters.Mongo.Technical;

/// <summary>
///     Manage app mongo connection
/// </summary>
public sealed class MongoContext
{
	static MongoContext()
	{
		var pack = new ConventionPack
		{
			new EnumRepresentationConvention(BsonType.String),
			new CamelCaseElementNameConvention(),
			new IgnoreIfNullConvention(true),
		};
		ConventionRegistry.Register("EnumStringConvention", pack, _ => true);
		BsonSerializer.RegisterSerializationProvider(new EnumAsStringSerializationProvider());
		BsonSerializer.RegisterSerializer(typeof(DateTime), new DateTimeSerializer(DateTimeKind.Utc, BsonType.DateTime));
	}

	/// <summary>
	///     Default constructor
	/// </summary>
	/// <param name="configuration"></param>
	public MongoContext(IConfiguration configuration)
	{
		var connectionString = configuration.GetConnectionString("MongoDB");

		ArgumentException.ThrowIfNullOrWhiteSpace(connectionString);

		var (client, url) = MongoClientFactory.Create(connectionString);

		var hosts = string.Join(",", url.Servers.Select(s => $"{s.Host}:{s.Port}"));
		
		Log.Logger.Information($"Connecting to Database '{hosts}/{url.DatabaseName}'");

		MongoDatabase = client.GetDatabase(url.DatabaseName);
		AttachmentsBucket = new GridFSBucket(MongoDatabase, new GridFSBucketOptions
		{
			BucketName = "attachments",
			ChunkSizeBytes = 1024 * 256,
		});
	}

	/// <summary>
	///     Récupération de la IMongoDatabase
	/// </summary>
	/// <returns></returns>
	public IMongoDatabase MongoDatabase { get; }

	/// <summary>
	///     GridFS bucket backing message attachments. Files live in
	///     <c>attachments.files</c>/<c>attachments.chunks</c>.
	/// </summary>
	public IGridFSBucket AttachmentsBucket { get; }
}