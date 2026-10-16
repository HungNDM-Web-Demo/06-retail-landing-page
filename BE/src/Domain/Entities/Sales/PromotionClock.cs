using Domain.Enums.Cms.Catalog;
using Domain.Enums.Sales.Orders;

namespace Domain.Entities.Sales;

/// <summary>
/// Khuyến mãi theo giờ máy chủ (07 §3.3, BR-02, BR-20). Tự gia hạn chỉ bắt đầu từ ngày hôm sau ngày kết thúc (giờ Việt Nam);
/// kết quả không lưu DB, tính lúc đọc.
/// </summary>
public static class PromotionClock
{
    public static DateTime EffectiveEndAt(DateTime endAt, int? autoRenewDays, DateTime now)
    {
        if (autoRenewDays is not > 0 || SalesRules.VietnamDate(now) <= SalesRules.VietnamDate(endAt))
            return endAt;

        var period = TimeSpan.FromDays(autoRenewDays.Value);
        // k nhỏ nhất ≥ 1 sao cho endAt + k × period > now.
        var k = Math.Max(1, (now - endAt).Ticks / period.Ticks + 1);
        return endAt + TimeSpan.FromTicks(period.Ticks * k);
    }

    public static PromotionStatus Status(DateTime startAt, DateTime effectiveEndAt, DateTime now) =>
        now < startAt ? PromotionStatus.SapChay : now < effectiveEndAt ? PromotionStatus.DangChay : PromotionStatus.DaKetThuc;

    /// <summary>Mức giá khi khách gửi form lúc <paramref name="now"/>: trong [startAt, effectiveEndAt) là giá khuyến mãi.</summary>
    public static PriceType PriceTypeAt(DateTime startAt, DateTime effectiveEndAt, DateTime now) =>
        Status(startAt, effectiveEndAt, now) == PromotionStatus.DangChay ? PriceType.KhuyenMai : PriceType.GiaThuong;
}
