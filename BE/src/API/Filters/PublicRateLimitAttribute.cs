using System.Globalization;
using API.Middlewares;
using Application.Common.Exceptions;
using Application.Interfaces.Services.Public;
using Domain.Entities.Sales;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace API.Filters;

/// <summary>
/// Giới hạn tần suất API công khai (07 §2.1, chép demo Menu QR): khóa = IP, cửa sổ cố định 1 phút. Vượt → 429 ProblemDetails
/// <c>code = QuaNhieuYeuCau</c> kèm header <c>Retry-After</c> (giây). Chạy trước khi đọc body.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class PublicRateLimitAttribute(string policy) : Attribute, IAsyncResourceFilter
{
    public string Policy { get; } = policy;

    public async Task OnResourceExecutionAsync(ResourceExecutingContext context, ResourceExecutionDelegate next)
    {
        var http = context.HttpContext;
        var limiter = http.RequestServices.GetRequiredService<IPublicRateLimiter>();
        var ip = http.Connection.RemoteIpAddress?.ToString() ?? "unknown";

        if (!limiter.TryAcquire(Policy, ip, out var retryAfter))
        {
            http.Response.Headers.RetryAfter = retryAfter.ToString(CultureInfo.InvariantCulture);
            var problem = ApiProblemDetails.Create(http, StatusCodes.Status429TooManyRequests, SalesErrors.QuaNhieuYeuCauMessage);
            problem.Extensions["code"] = SalesErrors.QuaNhieuYeuCau;
            context.Result = new ObjectResult(problem)
            {
                StatusCode = StatusCodes.Status429TooManyRequests,
                ContentTypes = { ApiProblemDetails.ContentType }
            };
            return;
        }

        await next();
    }
}

/// <summary>
/// Đưa <c>code</c> vào ProblemDetails cho lỗi 403, 404, 429 của nghiệp vụ bán hàng (07 §2.8; chép mẫu <c>PosNotFoundCodeAttribute</c>
/// của demo Menu QR). 400, 409 đã có <c>code</c> qua <c>Extensions</c> của ExceptionMiddleware nền; các lỗi khác để middleware xử lý.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class SalesProblemCodeAttribute : Attribute, IExceptionFilter
{
    public void OnException(ExceptionContext context)
    {
        var http = context.HttpContext;
        var (status, code, message) = context.Exception switch
        {
            SalesForbiddenException e => (StatusCodes.Status403Forbidden, e.Code, e.Message),
            SalesNotFoundException e => (StatusCodes.Status404NotFound, e.Code, e.Message),
            SalesTooManyRequestsException e => (StatusCodes.Status429TooManyRequests, e.Code, e.Message),
            _ => (0, string.Empty, string.Empty)
        };
        if (status == 0)
            return;

        var problem = ApiProblemDetails.Create(http, status, message);
        problem.Extensions["code"] = code;
        if (context.Exception is SalesTooManyRequestsException tooMany)
        {
            http.Response.Headers.RetryAfter = tooMany.RetryAfterSeconds.ToString(CultureInfo.InvariantCulture);
            if (tooMany.IncludeRetryAfterField)
                problem.Extensions["retryAfterSeconds"] = tooMany.RetryAfterSeconds;
        }

        context.Result = new ObjectResult(problem) { StatusCode = status, ContentTypes = { ApiProblemDetails.ContentType } };
        context.ExceptionHandled = true;
    }
}
