using Domain.Common;
using Domain.Entities.Sales;
using Domain.Enums.Sales.Orders;

namespace Application.Common.Exceptions;

/// <summary>
/// Lỗi nghiệp vụ có <c>code</c> (07 §2.8). 400 dùng <see cref="DomainException"/>, 409 dùng <see cref="ConflictException"/>
/// (ExceptionMiddleware nền đã đưa <c>Extensions</c> vào ProblemDetails); 403, 404, 429 dùng các lớp bên dưới, bộ lọc
/// <c>[SalesProblemCode]</c> của API đưa <c>code</c> vào ProblemDetails.
/// </summary>
public static class SalesProblems
{
    public static DomainException Bad(string code, string message, IReadOnlyDictionary<string, object?>? extra = null)
    {
        var extensions = new Dictionary<string, object?> { ["code"] = code };
        if (extra is not null)
        {
            foreach (var (key, value) in extra)
                extensions[key] = value;
        }

        return new DomainException(message, extensions);
    }

    public static ConflictException Conflict(string code, string message, IReadOnlyDictionary<string, object?>? extra = null)
    {
        var extensions = new Dictionary<string, object?> { ["code"] = code };
        if (extra is not null)
        {
            foreach (var (key, value) in extra)
                extensions[key] = value;
        }

        return new ConflictException(message, null, extensions);
    }

    /// <summary>UC-03 E4: version lệch, kèm <c>order</c> (OrderDetailDto mới nhất).</summary>
    public static ConflictException OrderChanged(object order) =>
        Conflict(SalesErrors.DonDaThayDoi, SalesErrors.DonDaThayDoiMessage, new Dictionary<string, object?> { ["order"] = order });

    /// <summary>Sửa khuyến mãi trên bản cũ, kèm <c>currentVersion</c>.</summary>
    public static ConflictException Stale(int currentVersion) =>
        Conflict(SalesErrors.DuLieuCu, SalesErrors.DuLieuCuMessage, new Dictionary<string, object?> { ["currentVersion"] = currentVersion });

    /// <summary>BR-02: giá đang áp dụng khác giá khách thấy; không tạo đơn.</summary>
    public static ConflictException PriceChanged(decimal currentPrice, PriceType priceType) =>
        Conflict(SalesErrors.GiaDaThayDoi, SalesErrors.GiaDaThayDoiMessage, new Dictionary<string, object?>
        {
            ["currentPrice"] = currentPrice,
            ["priceType"] = priceType.ToString()
        });

    public static SalesForbiddenException OtherAssignee(string? assigneeName) =>
        new(SalesErrors.DonCuaNguoiKhac, SalesErrors.DonCuaNguoiKhacMessage(assigneeName));

    public static SalesNotFoundException OrderNotFound() => new(SalesErrors.KhongTimThayDon, SalesErrors.KhongTimThayDonMessage);
}

/// <summary>403 kèm <c>code</c> (vd <c>DonCuaNguoiKhac</c>).</summary>
public sealed class SalesForbiddenException(string code, string message) : ForbiddenException(message)
{
    public string Code { get; } = code;
}

/// <summary>404 kèm <c>code</c> (vd <c>KhongTimThayDon</c>).</summary>
public sealed class SalesNotFoundException(string code, string message) : NotFoundException(message)
{
    public string Code { get; } = code;
}

/// <summary>429 kèm <c>code</c>, header <c>Retry-After</c> (BR-05, 07 §3.6).</summary>
public sealed class SalesTooManyRequestsException(string code, string message, int retryAfterSeconds, bool includeRetryAfterField)
    : Exception(message)
{
    public string Code { get; } = code;

    public int RetryAfterSeconds { get; } = retryAfterSeconds;

    /// <summary><c>DatHangQuaNhanh</c> kèm trường <c>retryAfterSeconds</c> trong ProblemDetails.</summary>
    public bool IncludeRetryAfterField { get; } = includeRetryAfterField;
}
