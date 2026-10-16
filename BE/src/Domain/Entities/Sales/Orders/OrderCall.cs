using Domain.Base;
using Domain.Enums.Sales.Orders;

namespace Domain.Entities.Sales.Orders;

/// <summary>Cuộc gọi của telesale (06 §4 <c>Sales_OrderCalls</c>, FR-22). Không xóa.</summary>
public class OrderCall : BaseEntity, ICreationTracked, IModificationTracked, IAuditLogExempt
{
    public const int NoteMax = 300;

    public Guid OrderId { get; private set; }
    public DateTime CalledAt { get; private set; }
    public Guid? CallerId { get; private set; }
    public string CallerName { get; private set; } = string.Empty;
    public CallResult Result { get; private set; }
    public DateTime? CallbackAt { get; private set; }
    public CancelReason? CancelReason { get; private set; }
    public string? Note { get; private set; }

    public Guid? CreatedBy { get; set; }
    public Guid? UpdatedBy { get; set; }

    public static OrderCall Create(Guid orderId, DateTime calledAt, SalesActor caller, CallResult result, DateTime? callbackAt,
        CancelReason? cancelReason, string? note) => new()
    {
        OrderId = orderId,
        CalledAt = calledAt,
        CallerId = caller.Id,
        CallerName = caller.Name ?? string.Empty,
        Result = result,
        CallbackAt = callbackAt,
        CancelReason = cancelReason,
        Note = string.IsNullOrWhiteSpace(note) ? null : note.Trim()
    };
}
