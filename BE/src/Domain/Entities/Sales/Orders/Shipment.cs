using Domain.Base;
using Domain.Enums.Sales.Orders;

namespace Domain.Entities.Sales.Orders;

/// <summary>Vận đơn giả lập (06 §4 <c>Sales_Shipments</c>, BR-17); tối đa một vận đơn mỗi đơn.</summary>
public class Shipment : BaseEntity, ICreationTracked, IModificationTracked, IAuditLogExempt
{
    public const int TrackingCodeMax = 20;

    public Guid OrderId { get; private set; }
    public Carrier Carrier { get; private set; }
    public string TrackingCode { get; private set; } = string.Empty;
    public decimal CodAmount { get; private set; }
    public DateTime HandedOverAt { get; private set; }
    public Guid? HandedOverById { get; private set; }
    public string HandedOverByName { get; private set; } = string.Empty;
    public DateTime? DeliveredAt { get; private set; }
    public DateTime? ReturnedAt { get; private set; }

    public Guid? CreatedBy { get; set; }
    public Guid? UpdatedBy { get; set; }

    public static Shipment Create(Guid orderId, Carrier carrier, string trackingCode, decimal codAmount, DateTime at, SalesActor actor) => new()
    {
        OrderId = orderId,
        Carrier = carrier,
        TrackingCode = trackingCode,
        CodAmount = codAmount,
        HandedOverAt = at,
        HandedOverById = actor.Id,
        HandedOverByName = actor.Name ?? string.Empty
    };

    public void MarkDelivered(DateTime at) => DeliveredAt = at;

    public void MarkReturned(DateTime at) => ReturnedAt = at;
}
