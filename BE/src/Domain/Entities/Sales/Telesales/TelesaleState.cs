using Domain.Base;

namespace Domain.Entities.Sales.Telesales;

/// <summary>Trạng thái "Nhận đơn" của telesale (06 §4 <c>Sales_TelesaleStates</c>, BR-09).</summary>
public class TelesaleState : BaseEntity, ICreationTracked, IModificationTracked, IAuditLogExempt
{
    public Guid UserId { get; private set; }
    public bool IsReceiving { get; private set; }

    /// <summary>Vòng xoay BR-09: nhỏ nhất (null trước) nhận đơn kế tiếp; chia lại thủ công không đổi.</summary>
    public DateTime? LastAssignedAt { get; private set; }

    public Guid? CreatedBy { get; set; }
    public Guid? UpdatedBy { get; set; }

    public static TelesaleState Create(Guid userId, bool isReceiving, DateTime? lastAssignedAt) =>
        new() { UserId = userId, IsReceiving = isReceiving, LastAssignedAt = lastAssignedAt };

    public void SetReceiving(bool isReceiving) => IsReceiving = isReceiving;

    public void MarkAssigned(DateTime at) => LastAssignedAt = at;
}
