using Elyspio.Utils.Telemetry.Technical.Extensions;
using ClosVerdeApp.Api.Abstractions.Interfaces.Injections;
using ClosVerdeApp.Api.Abstractions.Models.Configuration;
using ClosVerdeApp.Api.Adapters.Mongo.Injections;
using ClosVerdeApp.Api.Adapters.Rest.Injections;
using ClosVerdeApp.Api.Core.Background;
using ClosVerdeApp.Api.Core.Injections;
using ClosVerdeApp.Api.Web.Technical.Extensions;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.IdentityModel.Tokens;
using Serilog;

namespace ClosVerdeApp.Api.Web.Start;

public sealed class AppBuilder
{
	public AppBuilder(string[] args)
	{
		var builder = WebApplication.CreateBuilder(args);

		builder.Configuration.AddJsonFile("appsettings.docker.json", true, true);

		builder.AddLogging();
		builder.AddServiceDefaults();
		builder.Services.AddAppOpenTelemetry(builder.Configuration);

		builder.Services.AddModule<CoreModule>(builder.Configuration);
		builder.Services.AddModule<MongoAdapterModule>(builder.Configuration);
		builder.Services.AddModule<RestAdapterModule>(builder.Configuration);

		builder.Services.Configure<ReservationOptions>(builder.Configuration.GetSection(ReservationOptions.SectionName));
		builder.Services.Configure<KeycloakAdminOptions>(builder.Configuration.GetSection(KeycloakAdminOptions.SectionName));

		// Backs the user-directory cache (populates @mention candidates) and the Keycloak admin
		// access-token cache used by the REST adapter.
		builder.Services.AddMemoryCache();

		builder.Services.AddHostedService<ReservationStatusBackfill>();
		builder.Services.AddHostedService<TopicSeeder>();
		builder.Services.AddHostedService<ReservationValidationScanner>();

		var authority = builder.Configuration["Keycloak:Authority"]
			?? throw new InvalidOperationException("Keycloak:Authority must be configured.");
		var clientId = builder.Configuration["Keycloak:ClientId"]
			?? throw new InvalidOperationException("Keycloak:ClientId must be configured.");

		// Token validation strategy:
		// Keycloak does not put this API's identifier in the standard `aud` claim — public clients
		// receive an `aud` of the realm/account, not of the resource server. Instead, the realm
		// signs an `azp` (authorized party) claim that names the originating client. We disable
		// the built-in audience check and assert `azp == Keycloak:ClientId` ourselves in
		// `OnTokenValidated`, which is the authoritative binding for this realm. If the realm
		// configuration ever changes to issue a proper resource audience, switch back to
		// `ValidateAudience = true` with `ValidAudience` set to the resource id.
		builder.Services
			.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
			.AddJwtBearer(opts =>
			{
				opts.Authority = authority;
				opts.RequireHttpsMetadata = true;
				opts.MapInboundClaims = false;
				opts.TokenValidationParameters = new TokenValidationParameters
				{
					ValidateIssuer = true,
					ValidIssuer = authority,
					ValidateAudience = false, // see comment above; replaced by azp check below
					ValidateLifetime = true,
					ValidateIssuerSigningKey = true,
					NameClaimType = "name",
					RoleClaimType = "realm_access.roles",
					ClockSkew = TimeSpan.FromMinutes(1)
				};
				opts.Events = new JwtBearerEvents
				{
					OnTokenValidated = ctx =>
					{
						var azp = ctx.Principal?.FindFirst("azp")?.Value;
						if (!string.Equals(azp, clientId, StringComparison.Ordinal))
							ctx.Fail($"Invalid azp claim: expected '{clientId}', got '{azp}'.");
						return Task.CompletedTask;
					}
				};
			});

		builder.Services.AddAuthorization();

		builder.Services
			.AddAppControllers()
			.AddAppSignalR()
			.AddAppSwagger()
			.AddAppOpenTelemetry(builder.Configuration);

		builder.Services.SetupCors(builder.Configuration, builder.Environment);

		Application = builder.Build();
	}

	public WebApplication Application { get; }
}

public static class Extensions
{
	public static IServiceCollection AddLogging(this WebApplicationBuilder builder)
	{
		builder.Logging.AddOpenTelemetry(logging =>
		{
			logging.IncludeFormattedMessage = true;
			logging.IncludeScopes = true;
		});

		builder.Host.UseSerilogWithTelemetry();

		return builder.Services;
	}

	public static IHostApplicationBuilder AddServiceDefaults(this IHostApplicationBuilder builder)
	{
		builder.AddDefaultHealthChecks();
		return builder;
	}

	public static IHostApplicationBuilder AddDefaultHealthChecks(this IHostApplicationBuilder builder)
	{
		builder.Services.AddHealthChecks()
			.AddCheck("self", () => HealthCheckResult.Healthy(), ["live"]);
		return builder;
	}

	public static WebApplication MapDefaultEndpoints(this WebApplication app)
	{
		app.MapHealthChecks("/health", new HealthCheckOptions
		{
			Predicate = _ => true
		});

		app.MapHealthChecks("/alive", new HealthCheckOptions
		{
			Predicate = r => r.Tags.Contains("live")
		});

		return app;
	}
}
