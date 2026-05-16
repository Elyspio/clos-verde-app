using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace ClosVerdeApp.Api.Web.Technical.Streaming;

/// <summary>
/// Removes the form-value, form-file, and JQuery providers from the value-provider chain so
/// MVC will NOT buffer the request body to populate a model. Required for endpoints that
/// stream multipart sections directly via <see cref="Microsoft.AspNetCore.WebUtilities.MultipartReader"/>.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class DisableFormValueModelBindingAttribute : Attribute, IResourceFilter
{
	public void OnResourceExecuting(ResourceExecutingContext context)
	{
		var factories = context.ValueProviderFactories;
		factories.RemoveType<FormValueProviderFactory>();
		factories.RemoveType<FormFileValueProviderFactory>();
		factories.RemoveType<JQueryFormValueProviderFactory>();
	}

	public void OnResourceExecuted(ResourceExecutedContext context) { }
}
