using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

var builder = DistributedApplication.CreateBuilder(args);
var appHostDirectory = builder.AppHostDirectory;

builder.Services.AddLogging(o => o.AddSimpleConsole(x => x.SingleLine = true));

var password = builder.AddParameter("password", "password");


var mongo = builder.AddMongoDB("Mongo-Databases", password: password  )
    .WithDataVolume()
    .WithEndpoint(name: "tcp", port: 37017, targetPort: 27017)
    .WithLifetime(ContainerLifetime.Persistent);

var mongodb = mongo.AddDatabase("MongoDB");

// Local Keycloak for development. The realm import file under ./Realms seeds the `clos-verde` realm
// with the same client ids the production setup uses (cv_dev-front + cv_dev-api) and 10 deterministic
// users (alice.martin … julien.bernard, password = "password"). The data volume keeps custom realm
// changes around between `aspire run` cycles; deleting the volume re-seeds from the JSON.
const int keycloakPort = 8088;
const string keycloakRealm = "clos-verde";
const string keycloakFrontendClientId = "cv_dev-front";
const string keycloakAdminClientId = "cv_dev-api";
const string keycloakAdminClientSecret = "dev-cv-aspire-secret-FAKE-DO-NOT-DEPLOY";

var keycloak = builder.AddKeycloak("keycloak", port: keycloakPort)
    .WithDataVolume()
    .WithRealmImport(Path.Combine(appHostDirectory, "Realms"))
    .WithLifetime(ContainerLifetime.Persistent);

// One canonical authority URL: built once and reused everywhere. Both the API (issuer validation)
// and the SPA running in the user's browser need to reach Keycloak via the host port.
var keycloakAuthority = $"http://localhost:{keycloakPort}/realms/{keycloakRealm}";
var keycloakRoot = $"http://localhost:{keycloakPort}";

var frontendPath = Path.GetFullPath(Path.Combine(appHostDirectory, "..", "ClosVerdeApp.Front"));

var frontend = builder.AddViteApp("frontend", frontendPath)
    .WithPnpm()
    .WithHttpsEndpoint(name: "https", port: 3000);

var api = builder.AddProject<Projects.ClosVerdeApp_Api_Web>("api")
    .WithHttpsEndpoint(name: "https", port: 4000)
    .WithEnvironment("Cors__AllowedOrigins__0", frontend.GetEndpoint("https"))
    .WithEnvironment("Keycloak__Authority", keycloakAuthority)
    .WithEnvironment("Keycloak__ClientId", keycloakFrontendClientId)
    .WithEnvironment("Keycloak__Admin__ClientId", keycloakAdminClientId)
    .WithEnvironment("Keycloak__Admin__ClientSecret", keycloakAdminClientSecret)
    .WithEnvironment("Keycloak__Admin__TokenEndpoint", $"{keycloakAuthority}/protocol/openid-connect/token")
    .WithEnvironment("Keycloak__Admin__UsersEndpoint", $"{keycloakRoot}/admin/realms/{keycloakRealm}/users")
    .WithReference(mongodb)
    .WithReference(keycloak)
    .WaitFor(keycloak);

frontend
    .WithEnvironment("VITE_API_BASE_URL", api.GetEndpoint("https"))
    .WithEnvironment("VITE_KEYCLOAK_AUTHORITY", keycloakAuthority)
    .WithEnvironment("VITE_KEYCLOAK_CLIENT_ID", keycloakFrontendClientId)
    .WaitFor(keycloak);

builder.Build().Run();
