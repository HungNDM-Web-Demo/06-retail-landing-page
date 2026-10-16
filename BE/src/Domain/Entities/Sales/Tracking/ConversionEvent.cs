using Domain.Base;
using Domain.Enums.Sales.Tracking;

namespace Domain.Entities.Sales.Tracking;

/// <summary>Nhật ký sự kiện pixel giả lập (06 §4 <c>Sales_ConversionEvents</c>, FR-14, P3).</summary>
public class ConversionEvent : BaseEntity, ICreationTracked, IModificationTracked, IAuditLogExempt
{
    public const int PixelCallMax = 300;

    public ConversionEventType Type { get; private set; }
    public DateTime OccurredAt { get; private set; }
    public string VisitorId { get; private set; } = string.Empty;
    public Guid? VisitId { get; private set; }
    public Guid? OrderId { get; private set; }
    public string Source { get; private set; } = string.Empty;
    public string? Campaign { get; private set; }
    public decimal? Value { get; private set; }
    public string PixelCall { get; private set; } = string.Empty;

    public Guid? CreatedBy { get; set; }
    public Guid? UpdatedBy { get; set; }

    public static ConversionEvent Create(ConversionEventType type, DateTime at, string visitorId, Guid? visitId, Guid? orderId,
        string source, string? campaign, decimal? value, string? orderCode) => new()
    {
        Type = type,
        OccurredAt = at,
        VisitorId = visitorId,
        VisitId = visitId,
        OrderId = orderId,
        Source = source,
        Campaign = campaign,
        Value = value,
        PixelCall = OrderEventTexts.PixelCall(source, type, value, orderCode)
    };
}
