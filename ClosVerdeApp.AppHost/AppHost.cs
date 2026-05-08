using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

var builder = DistributedApplication.CreateBuilder(args);
var appHostDirectory = builder.AppHostDirectory;

builder.Services.AddLogging(o => o.AddSimpleConsole(x => x.SingleLine = true));

var mongo = builder.AddMongoDB("Mongo-Databases")
    .WithDataVolume()
    .WithLifetime(ContainerLifetime.Persistent);

var mongodb = mongo.AddDatabase("MongoDB");

var frontendPath = Path.GetFullPath(Path.Combine(appHostDirectory, "..", "ClosVerdeApp.Front"));

var frontend = builder.AddViteApp("frontend", frontendPath)
    .WithPnpm()
    .WithHttpsEndpoint(name: "https", port: 3000);

const string keycloakAuthority = "https://auth.elyspio.fr/realms/clos-verde";
const string keycloakClientId = "cv_dev-front";

var api = builder.AddProject<Projects.ClosVerdeApp_Api_Web>("api")
    .WithHttpsEndpoint(name: "https", port: 4000)
    .WithEnvironment("Cors__AllowedOrigins__0", frontend.GetEndpoint("https"))
    .WithEnvironment("Keycloak__Authority", keycloakAuthority)
    .WithEnvironment("Keycloak__ClientId", keycloakClientId)
    .WithReference(mongodb);

frontend
    .WithEnvironment("VITE_API_BASE_URL", api.GetEndpoint("https"))
    .WithEnvironment("VITE_KEYCLOAK_AUTHORITY", keycloakAuthority)
    .WithEnvironment("VITE_KEYCLOAK_CLIENT_ID", keycloakClientId);

builder.Build().Run();
