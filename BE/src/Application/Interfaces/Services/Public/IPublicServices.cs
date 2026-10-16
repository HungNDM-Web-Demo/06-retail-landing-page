using Application.Common.Models;
using Application.DTOs.Public;

namespace Application.Interfaces.Services.Public;

/// <summary>Dữ liệu landing công khai (07 §2.1): landing, khuyến mãi, đánh giá, đơn gần đây.</summary>
public interface IPublicLandingService
{
    Task<LandingPageDto> GetLandingAsync(CancellationToken ct = default);

    Task<PublicPromotion> GetPromotionAsync(CancellationToken ct = default);

    Task<PaginatedResult<PublicReview>> GetReviewsAsync(int page, int pageSize, CancellationToken ct = default);

    Task<IReadOnlyList<RecentOrderNotice>> GetRecentOrdersAsync(CancellationToken ct = default);
}

/// <summary>Lượt truy cập, sự kiện pixel giả lập (07 §3.2, BR-07, BR-08, FR-14).</summary>
public interface IVisitTrackingService
{
    Task<RecordVisitResult> RecordVisitAsync(RecordVisitRequest request, CancellationToken ct = default);

    Task TrackEventAsync(TrackEventRequest request, CancellationToken ct = default);
}

/// <summary>Đặt hàng công khai (07 §2.1 bảng kiểm tra, §3.6, §3.9, §3.10). Trùng <c>clientRequestId</c> → bản cũ, Created = false.</summary>
public interface IOrderPlacementService
{
    Task<WriteOutcome<PlaceOrderResult>> PlaceOrderAsync(PlaceOrderRequest request, CancellationToken ct = default);
}

/// <summary>Giới hạn tần suất API công khai theo IP, cửa sổ cố định 1 phút (07 §2.1).</summary>
public interface IPublicRateLimiter
{
    /// <summary>Trả false khi vượt giới hạn, kèm số giây cần chờ (header <c>Retry-After</c>).</summary>
    bool TryAcquire(string policy, string key, out int retryAfterSeconds);
}

/// <summary>Tên chính sách giới hạn tần suất (07 §2.1).</summary>
public static class PublicRatePolicies
{
    public const string Read = "public-read";
    public const string Track = "public-track";
    public const string Order = "public-order";

    public static int LimitOf(string policy) => policy switch
    {
        Track => 60,
        Order => 10,
        _ => 120
    };
}
