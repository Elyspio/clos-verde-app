using ClosVerdeApp.Api.Web.Technical.Extensions;
using ClosVerdeApp.Api.Web.Technical.Hubs;

namespace ClosVerdeApp.Api.Web.Start;

/// <summary>
///     Application Initializer
/// </summary>
public static class AppRuntime
{
	/// <summary>
	///     Initialize runtime middlewares
	/// </summary>
	/// <param name="app"></param>
	/// <returns></returns>
	public static WebApplication Initialize(this WebApplication app)
	{
		// Map Aspire default endpoints (health checks)
		app.MapDefaultEndpoints();

		// Allow CORS
		app.UseCors();

		app.UseAppSwagger();

		// Setup authentication
		app.UseAuthentication();
		app.UseAuthorization();

		app.MapHub<ReservationHub>("/hubs/reservations");
		app.MapHub<MessageHub>("/hubs/messages");

		// Setup Controllers
		app.MapControllers();

		if (!app.Environment.IsProduction()) return app;

		// Start SPA serving
		app.UseRouting();

		app.UseStaticFiles();

		app.MapWhen(ctx => !ctx.Request.Path.StartsWithSegments("/api"), appBuilder =>
		{
			appBuilder.UseRouting();
			appBuilder.UseEndpoints(ep => { ep.MapFallbackToFile("index.html"); });
		});

		return app;
	}
}
