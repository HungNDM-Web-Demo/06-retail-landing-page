using Domain.Base;
using Domain.Enums.Sales.Orders;

namespace Domain.Entities.Sales.Tracking;

/// <summary>Lượt truy cập thô, một phiên xem landing (06 §4 <c>Sales_Visits</c>, BR-08); chỉ dùng gom phiên và gắn đơn.</summary>
public class Visit : BaseEntity, ICreationTracked, IModificationTracked, IAuditLogExempt
{
    public const int PathMax = 200;

    public string VisitorId { get; private set; } = string.Empty;
    public DateTime StartedAt { get; private set; }
    public DateTime LastSeenAt { get; private set; }
    public string Source { get; private set; } = string.Empty;
    public string? Medium { get; private set; }
    public string? Campaign { get; private set; }
    public string? AdContent { get; private set; }
    public string? Referrer { get; private set; }
    public DeviceType Device { get; private set; }
    public string? Path { get; private set; }

    public Guid? CreatedBy { get; set; }
    public Guid? UpdatedBy { get; set; }

    public static Visit Start(string visitorId, DateTime now, string source, string? medium, string? campaign, string? adContent,
        string? referrer, DeviceType device, string? path) => new()
    {
        VisitorId = visitorId,
        StartedAt = now,
        LastSeenAt = now,
        Source = source,
        Medium = medium,
        Campaign = campaign,
        AdContent = adContent,
        Referrer = referrer,
        Device = device,
        Path = path
    };

    public void Touch(DateTime now)
    {
        if (now > LastSeenAt)
            LastSeenAt = now;
    }
}
