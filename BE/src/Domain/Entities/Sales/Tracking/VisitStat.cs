using Domain.Base;

namespace Domain.Entities.Sales.Tracking;

/// <summary>Lượt truy cập gộp theo giờ, nguồn, chiến dịch (06 §4 <c>Sales_VisitStats</c>); báo cáo đọc bảng này.</summary>
public class VisitStat : BaseEntity, ICreationTracked, IModificationTracked, IAuditLogExempt
{
    public DateTime HourStart { get; private set; }
    public string Source { get; private set; } = string.Empty;

    /// <summary>Chuỗi rỗng = không có chiến dịch (làm khóa unique).</summary>
    public string Campaign { get; private set; } = string.Empty;

    public int Visits { get; private set; }

    public Guid? CreatedBy { get; set; }
    public Guid? UpdatedBy { get; set; }

    public static VisitStat Create(DateTime hourStart, string source, string? campaign, int visits) => new()
    {
        HourStart = hourStart,
        Source = source,
        Campaign = campaign ?? string.Empty,
        Visits = visits
    };

    public void Add(int visits) => Visits += visits;

    /// <summary>Đầu giờ UTC (phút, giây = 0) của một thời điểm.</summary>
    public static DateTime HourOf(DateTime utc) => new(utc.Year, utc.Month, utc.Day, utc.Hour, 0, 0, DateTimeKind.Utc);
}
