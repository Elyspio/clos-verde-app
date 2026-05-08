using Elyspio.Utils.Telemetry.Technical.Extensions;
using ClosVerdeApp.Api.Abstractions.Interfaces.Injections;
using ClosVerdeApp.Api.Adapters.Mongo.Injections;
using ClosVerdeApp.Api.Adapters.Rest.Injections;
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

		var authority = builder.Configuration["Keycloak:Authority"]
			?? throw new InvalidOperationException("Keycloak:Authority must be configured.");
		var clientId = builder.Configuration["Keycloak:ClientId"]
			?? throw new InvalidOperationException("Keycloak:ClientId must be configured.");

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
					ValidateAudience = false,
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

		builder.Services.SetupCors(builder.Configuration);

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
