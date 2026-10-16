using Domain.Base;
using Domain.Enums.Sales.Orders;

namespace Domain.Entities.Sales.Orders;

/// <summary>Dòng thời gian đơn (06 §4 <c>Sales_OrderEvents</c>, BR-16); câu theo 07 §3.8. Người null = Hệ thống.</summary>
public class OrderEvent : BaseEntity, ICreationTracked, IModificationTracked, IAuditLogExempt
{
    public const int ContentMax = 500;

    public Guid OrderId { get; private set; }
    public OrderEventType Type { get; private set; }
    public OrderStatus? FromStatus { get; private set; }
    public OrderStatus? ToStatus { get; private set; }
    public string Content { get; private set; } = string.Empty;
    public Guid? ActorId { get; private set; }
    public string? ActorName { get; private set; }
    public DateTime OccurredAt { get; private set; }

    public Guid? CreatedBy { get; set; }
    public Guid? UpdatedBy { get; set; }

    public static OrderEvent Create(Guid orderId, OrderEventType type, string content, SalesActor actor, DateTime at,
        OrderStatus? from, OrderStatus? to) => new()
    {
        OrderId = orderId,
        Type = type,
        Content = content.Length > ContentMax ? content[..ContentMax] : content,
        ActorId = actor.Id,
        ActorName = actor.Name,
        OccurredAt = at,
        FromStatus = from,
        ToStatus = to
    };
}
