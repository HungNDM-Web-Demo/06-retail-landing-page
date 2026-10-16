using API.Base;
using API.Filters;
using Application.Common.Models;
using Application.DTOs.Public;
using Application.Interfaces.Services.Public;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers.Public;

/// <summary>
/// API công khai của landing (07 §2.1). Khách không đăng nhập; chỉ trả trường công khai. Giới hạn tần suất theo IP:
/// đọc 120, ghi nhận lượt/sự kiện 60, đặt hàng 10 yêu cầu mỗi phút → 429 <c>QuaNhieuYeuCau</c>.
/// </summary>
[Route("api/public")]
[AllowAnonymous]
[SalesProblemCode]
public sealed class PublicController(
    IPublicLandingService landing,
    IVisitTrackingService tracking,
    IOrderPlacementService placement) : BaseApiController
{
    /// <summary>
    /// Toàn bộ dữ liệu landing (FR-04…FR-08, NFR-04). Trình duyệt không dùng bản cache cũ (<c>no-cache</c>): sau 409
    /// <c>GiaDaThayDoi</c>, khi quản lý sửa combo, khuyến mãi, FE gọi lại phải thấy giá mới ngay (UC-11 bước 4, TC-03).
    /// Cache 60 giây nằm ở máy chủ Next (<c>revalidate: 60</c> khi render SEO).
    /// </summary>
    [HttpGet("landing")]
    [PublicRateLimit(PublicRatePolicies.Read)]
    public async Task<ActionResult<LandingPageDto>> GetLanding(CancellationToken ct)
    {
        Response.Headers.CacheControl = "no-cache";
        return Ok(await landing.GetLandingAsync(ct));
    }

    /// <summary>Trạng thái khuyến mãi + giờ máy chủ (FR-06, BR-20); không cache.</summary>
    [HttpGet("promotion")]
    [PublicRateLimit(PublicRatePolicies.Read)]
    public async Task<ActionResult<PublicPromotion>> GetPromotion(CancellationToken ct)
    {
        Response.Headers.CacheControl = "no-store";
        return Ok(await landing.GetPromotionAsync(ct));
    }

    /// <summary>Đánh giá đang hiện theo thứ tự, mặc định 6 mỗi trang (FR-08 "Xem thêm").</summary>
    [HttpGet("reviews")]
    [PublicRateLimit(PublicRatePolicies.Read)]
    public async Task<ActionResult<PaginatedResult<PublicReview>>> GetReviews([FromQuery] int page = 1, [FromQuery] int pageSize = 6,
        CancellationToken ct = default) =>
        Ok(await landing.GetReviewsAsync(page, pageSize, ct));

    /// <summary>Ghi nhận lượt truy cập (FR-11, FR-12, BR-07, BR-08).</summary>
    [HttpPost("visits")]
    [PublicRateLimit(PublicRatePolicies.Track)]
    public async Task<ActionResult<RecordVisitResult>> RecordVisit(RecordVisitRequest request, CancellationToken ct) =>
        Ok(await tracking.RecordVisitAsync(request, ct));

    /// <summary>Sự kiện "bắt đầu điền form" (FR-14) → 204.</summary>
    [HttpPost("events")]
    [PublicRateLimit(PublicRatePolicies.Track)]
    public async Task<IActionResult> TrackEvent(TrackEventRequest request, CancellationToken ct)
    {
        await tracking.TrackEventAsync(request, ct);
        return NoContent();
    }

    /// <summary>Đặt hàng (FR-09, FR-10): 201; trùng <c>clientRequestId</c> → 200, <c>duplicate = true</c>.</summary>
    [HttpPost("orders")]
    [PublicRateLimit(PublicRatePolicies.Order)]
    [ProducesResponseType<PlaceOrderResult>(StatusCodes.Status201Created)]
    [ProducesResponseType<PlaceOrderResult>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PlaceOrderResult>> PlaceOrder(PlaceOrderRequest request, CancellationToken ct)
    {
        var outcome = await placement.PlaceOrderAsync(request, ct);
        return outcome.Created ? StatusCode(StatusCodes.Status201Created, outcome.Value) : Ok(outcome.Value);
    }

    /// <summary>Tối đa 10 đơn thật gần đây (FR-13, BR-21).</summary>
    [HttpGet("recent-orders")]
    [PublicRateLimit(PublicRatePolicies.Read)]
    public async Task<ActionResult<IReadOnlyList<RecentOrderNotice>>> GetRecentOrders(CancellationToken ct) =>
        Ok(await landing.GetRecentOrdersAsync(ct));
}
