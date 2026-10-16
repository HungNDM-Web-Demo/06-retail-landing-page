using Application.Common.Models;
using Domain.Enums.Sales.Orders;
using Domain.Enums.Sales.Tracking;

namespace Application.DTOs.Reports;

// Tổng quan, báo cáo, chi phí quảng cáo, sự kiện pixel (07 §2.6, §2.7). Tỉ lệ null khi mẫu số 0 (FE hiện "—").

public class DateRangeQuery
{
    /// <summary>yyyy-MM-dd giờ Việt Nam; vắng → 7 ngày tới hôm nay.</summary>
    public string? From { get; set; }

    public string? To { get; set; }
}

public sealed class SourceReportQuery : DateRangeQuery
{
    public string? Source { get; set; }
    public string? Campaign { get; set; }
}

public sealed class ComboReportQuery : DateRangeQuery
{
    public string? Source { get; set; }
}

public sealed class AdCostQuery : DateRangeQuery
{
    public string? Source { get; set; }
}

public sealed class ConversionEventQuery : PaginationQuery
{
    public ConversionEventType? Type { get; set; }
}

public sealed class MetricCompare
{
    public decimal? Value { get; init; }
    public decimal? Previous { get; init; }
    public decimal? Change { get; init; }
}

public sealed class HourOrders
{
    public int Hour { get; init; }
    public int Orders { get; init; }
}

public sealed class TrendDay
{
    public string Date { get; init; } = string.Empty;
    public int Orders { get; init; }
    public int Confirmed { get; init; }
    public decimal? ConfirmRate { get; init; }
}

public sealed class ComboShare
{
    public Guid ComboId { get; init; }
    public string ComboName { get; init; } = string.Empty;
    public int Orders { get; init; }
    public decimal Share { get; init; }
}

public sealed class SourceShare
{
    public string Source { get; init; } = string.Empty;
    public int Orders { get; init; }
    public decimal Share { get; init; }
}

public sealed class ManagerDashboard
{
    public string Date { get; init; } = string.Empty;
    public DateTime AsOf { get; init; }
    public MetricCompare Visits { get; init; } = new();
    public MetricCompare Orders { get; init; } = new();
    public MetricCompare ConversionRate { get; init; } = new();

    /// <summary>Mới + Chờ gọi lại toàn shop lúc này.</summary>
    public int PendingCalls { get; init; }

    /// <summary>Chờ gọi lại đã tới giờ.</summary>
    public int DueCallbacks { get; init; }

    public MetricCompare ConfirmRate { get; init; } = new();
    public MetricCompare ConfirmedValue { get; init; } = new();
    public IReadOnlyList<HourOrders> OrdersByHour { get; init; } = [];
    public IReadOnlyList<TrendDay> Trend14Days { get; init; } = [];
    public IReadOnlyList<ComboShare> ComboShare { get; init; } = [];
    public IReadOnlyList<SourceShare> SourceShare { get; init; } = [];
}

public sealed class TelesaleDashboard
{
    public string Date { get; init; } = string.Empty;
    public DateTime AsOf { get; init; }
    public bool IsReceiving { get; init; }
    public int MyNew { get; init; }
    public int UnassignedNew { get; init; }
    public int MyDueCallbacks { get; init; }
    public int MyLaterCallbacks { get; init; }
    public int MyConfirmedToday { get; init; }
    public int MyUpsellCountToday { get; init; }
    public decimal MyUpsellValueToday { get; init; }
}

public class SourceMetrics
{
    public int Visits { get; set; }
    public int Orders { get; set; }
    public decimal? ConversionRate { get; set; }
    public int Confirmed { get; set; }
    public decimal? ConfirmRate { get; set; }
    public int Delivered { get; set; }
    public int Returned { get; set; }
    public decimal? ReturnRate { get; set; }
    public decimal DeliveredRevenue { get; set; }
    public decimal AdCost { get; set; }
    public decimal? CostPerConfirmed { get; set; }
    public decimal? Roas { get; set; }
}

public sealed class CampaignReportRow : SourceMetrics
{
    /// <summary>Chuỗi rỗng = không có chiến dịch (FE hiện "(không có chiến dịch)").</summary>
    public string Campaign { get; init; } = string.Empty;
}

public sealed class SourceReportRow : SourceMetrics
{
    public string Source { get; init; } = string.Empty;
    public IReadOnlyList<CampaignReportRow> Campaigns { get; init; } = [];
}

public sealed class SourceReport
{
    public string From { get; init; } = string.Empty;
    public string To { get; init; } = string.Empty;
    public IReadOnlyList<SourceReportRow> Rows { get; init; } = [];
    public SourceMetrics Totals { get; init; } = new();
}

public sealed class ComboReportRow
{
    public Guid ComboId { get; init; }
    public string ComboCode { get; init; } = string.Empty;
    public string ComboName { get; init; } = string.Empty;
    public int Orders { get; init; }
    public decimal Share { get; init; }
    public int Bottles { get; init; }
    public int Confirmed { get; init; }
    public decimal DeliveredRevenue { get; init; }
    public decimal? AverageOrderValue { get; init; }
}

public sealed class ComboReport
{
    public string From { get; init; } = string.Empty;
    public string To { get; init; } = string.Empty;
    public string? Source { get; init; }
    public IReadOnlyList<ComboReportRow> Rows { get; init; } = [];
    public int TotalOrders { get; init; }
}

public sealed class TelesaleReportRow
{
    public Guid UserId { get; init; }
    public string FullName { get; init; } = string.Empty;
    public int Assigned { get; init; }
    public int Called { get; init; }
    public int Confirmed { get; init; }
    public decimal? ConfirmRate { get; init; }
    public int UpsellCount { get; init; }
    public decimal UpsellValue { get; init; }
    public int Delivered { get; init; }
    public int Returned { get; init; }
    public decimal? ReturnRate { get; init; }
}

public sealed class TelesaleReport
{
    public string From { get; init; } = string.Empty;
    public string To { get; init; } = string.Empty;
    public IReadOnlyList<TelesaleReportRow> Rows { get; init; } = [];
}

public class DailyTotals
{
    public int Orders { get; init; }
    public int Confirmed { get; init; }
    public int Cancelled { get; init; }
    public int Returned { get; init; }
    public int Delivered { get; init; }
    public decimal DeliveredRevenue { get; init; }
    public decimal? CancelRate { get; init; }
}

public sealed class DailyPeriodTotals : DailyTotals
{
    public string From { get; init; } = string.Empty;
    public string To { get; init; } = string.Empty;
}

public sealed class DailyRow : DailyTotals
{
    public string Date { get; init; } = string.Empty;
}

public sealed class CancelReasonCount
{
    public CancelReason Reason { get; init; }
    public int Count { get; init; }
}

public sealed class ReturnReasonCount
{
    public ReturnReason Reason { get; init; }
    public int Count { get; init; }
}

public sealed class DailyReport
{
    public string From { get; init; } = string.Empty;
    public string To { get; init; } = string.Empty;
    public DailyTotals Totals { get; init; } = new();
    public DailyPeriodTotals Previous { get; init; } = new();

    /// <summary>Đủ mọi ngày trong khoảng.</summary>
    public IReadOnlyList<DailyRow> Days { get; init; } = [];

    /// <summary>Không gồm DonTrung.</summary>
    public IReadOnlyList<CancelReasonCount> CancelReasons { get; init; } = [];

    public int DuplicateCancelled { get; init; }
    public IReadOnlyList<ReturnReasonCount> ReturnReasons { get; init; } = [];
}

public sealed class AdCostDto
{
    public Guid Id { get; init; }
    public string Date { get; init; } = string.Empty;
    public string Source { get; init; } = string.Empty;
    public string Campaign { get; init; } = string.Empty;
    public decimal Amount { get; init; }
    public DateTime UpdatedAt { get; init; }
}

public sealed class SaveAdCostRequest
{
    /// <summary>yyyy-MM-dd.</summary>
    public string? Date { get; set; }

    public string Source { get; set; } = string.Empty;
    public string? Campaign { get; set; }
    public decimal Amount { get; set; }
}

public sealed class ConversionEventDto
{
    public Guid Id { get; init; }
    public ConversionEventType Type { get; init; }
    public DateTime OccurredAt { get; init; }
    public string Source { get; init; } = string.Empty;
    public string? Campaign { get; init; }
    public string? OrderCode { get; init; }
    public decimal? Value { get; init; }
    public string PixelCall { get; init; } = string.Empty;
}
