using ClosVerdeApp.Api.Abstractions.Exceptions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace ClosVerdeApp.Api.Web.Technical.Filters;

public sealed class HttpExceptionFilter : ExceptionFilterAttribute
{
	public override void OnException(ExceptionContext context)
	{
		if (context.Exception is HttpException ex)
		{
			context.Result = new ObjectResult(new
			{
				status = (int)ex.Code,
				message = ex.Message
			})
			{
				StatusCode = (int)ex.Code
			};
		}
		else
		{
			context.Result = new ObjectResult(new
			{
				status = 500,
				message = context.Exception.Message
			})
			{
				StatusCode = 500
			};
		}

		Console.WriteLine(context.Exception);

		base.OnException(context);
	}
}
