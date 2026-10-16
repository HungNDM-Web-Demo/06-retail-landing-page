using Application.Common.Models;
using Domain.Enums.Sales.Orders;

namespace Application.DTOs.Orders;

// Đơn hàng, telesale (07 §2.5).

public sealed class OrderQuery : PaginationQuery
{
    /// <summary>Vắng = Tất cả.</summary>
    public OrderStatus? Status { get; set; }

    /// <summary>yyyy-MM-dd theo ngày đặt, giờ Việt Nam.</summary>
    public string? From { get; set; }

    public string? To { get; set; }
    public Guid? ComboId { get; set; }
    public string? Source { get; set; }

    /// <summary>Id telesale hoặc <c>unassigned</c> = chưa chia.</summary>
    public string? AssigneeId { get; set; }

    public OrderTag? Tag { get; set; }
    public Guid? ConfirmedById { get; set; }
    public bool? UpsellOnly { get; set; }
}

public class OrderListItem
{
    public Guid Id { get; init; }
    public string Code { get; init; } = string.Empty;
    public DateTime PlacedAt { get; init; }
    public string CustomerName { get; init; } = string.Empty;
    public string Phone { get; init; } = string.Empty;
    public string Province { get; init; } = string.Empty;
    public Guid ComboId { get; init; }
    public string ComboCode { get; init; } = string.Empty;
    public string ComboName { get; init; } = string.Empty;
    public int Quantity { get; init; }
    public decimal Total { get; init; }
    public string Source { get; init; } = string.Empty;
    public string? Campaign { get; init; }
    public Guid? AssigneeId { get; init; }
    public string? AssigneeName { get; init; }
    public OrderStatus Status { get; init; }
    public IReadOnlyList<OrderTag> Tags { get; init; } = [];
    public DateTime? NextCallAt { get; init; }
    public int FailedCallCount { get; init; }
    public decimal UpsellAmount { get; init; }
    public int Version { get; init; }
}

public sealed class OrderListResult
{
    public IReadOnlyList<OrderListItem> Items { get; init; } = [];
    public int Page { get; init; }
    public int PageSize { get; init; }
    public int TotalCount { get; init; }
    public int TotalPages => PageSize > 0 ? (int)Math.Ceiling(TotalCount / (double)PageSize) : 0;
    public bool HasPreviousPage => Page > 1;
    public bool HasNextPage => Page < TotalPages;

    /// <summary>Số đơn từng tab (khóa OrderStatus + <c>TatCa</c>), cùng bộ lọc trừ <c>status</c>.</summary>
    public IReadOnlyDictionary<string, int> StatusCounts { get; init; } = new Dictionary<string, int>();
}

public sealed class OrderCallDto
{
    public Guid Id { get; init; }
    public DateTime CalledAt { get; init; }
    public Guid? CallerId { get; init; }
    public string CallerName { get; init; } = string.Empty;
    public CallResult Result { get; init; }
    public DateTime? CallbackAt { get; init; }
    public CancelReason? CancelReason { get; init; }
    public string? Note { get; init; }
}

public sealed class OrderEventDto
{
    public Guid Id { get; init; }
    public OrderEventType Type { get; init; }
    public OrderStatus? FromStatus { get; init; }
    public OrderStatus? ToStatus { get; init; }
    public string Content { get; init; } = string.Empty;

    /// <summary>Vắng = Hệ thống.</summary>
    public string? ActorName { get; init; }

    public DateTime OccurredAt { get; init; }
}

public sealed class ShipmentDto
{
    public Carrier Carrier { get; init; }
    public string TrackingCode { get; init; } = string.Empty;
    public decimal CodAmount { get; init; }
    public DateTime HandedOverAt { get; init; }
    public string HandedOverByName { get; init; } = string.Empty;
    public DateTime? DeliveredAt { get; init; }
    public DateTime? ReturnedAt { get; init; }
}

public sealed class RelatedOrder
{
    public Guid Id { get; init; }
    public string Code { get; init; } = string.Empty;
    public DateTime PlacedAt { get; init; }
    public string ComboName { get; init; } = string.Empty;
    public int Quantity { get; init; }
    public decimal Total { get; init; }
    public OrderStatus Status { get; init; }
    public CancelReason? CancelReason { get; init; }
    public ReturnReason? ReturnReason { get; init; }
    public string? AssigneeName { get; init; }
    public bool IsDuplicate { get; init; }

    /// <summary>Người xem hủy được đơn này (trạng thái Mới, Chờ gọi lại, Đã xác nhận; trong phạm vi xem; có quyền hủy).</summary>
    public bool CanCancel { get; init; }
}

public sealed class OrderDetailDto : OrderListItem
{
    public string Address { get; init; } = string.Empty;
    public string? Note { get; init; }
    public PriceType PriceType { get; init; }
    public decimal UnitPrice { get; init; }
    public int BottleCount { get; init; }
    public string PlacedComboName { get; init; } = string.Empty;
    public int PlacedQuantity { get; init; }
    public decimal PlacedSubtotal { get; init; }
    public decimal Subtotal { get; init; }
    public decimal ShippingFee { get; init; }
    public string? Medium { get; init; }
    public string? AdContent { get; init; }
    public string? Referrer { get; init; }
    public DeviceType Device { get; init; }
    public DateTime? AssignedAt { get; init; }
    public DateTime? ConfirmedAt { get; init; }
    public string? ConfirmedByName { get; init; }
    public CancelReason? CancelReason { get; init; }
    public string? CancelNote { get; init; }
    public DateTime? CancelledAt { get; init; }
    public string? CancelledByName { get; init; }
    public ReturnReason? ReturnReason { get; init; }
    public string? ReturnNote { get; init; }
    public ShipmentDto? Shipment { get; init; }

    /// <summary>Mới nhất trước.</summary>
    public IReadOnlyList<OrderCallDto> Calls { get; init; } = [];

    /// <summary>Mới nhất trước.</summary>
    public IReadOnlyList<OrderEventDto> Events { get; init; } = [];

    /// <summary>Cùng số điện thoại, mới nhất trước (kể cả ngoài phạm vi xem, chỉ thông tin tóm tắt).</summary>
    public IReadOnlyList<RelatedOrder> RelatedOrders { get; init; } = [];

    /// <summary>Số đơn Hoàn hàng của số điện thoại (BR-15).</summary>
    public int ReturnedCount { get; init; }

    public DateTime AsOf { get; init; }
}

public class OrderChanges
{
    public string CustomerName { get; set; } = string.Empty;
    public string Province { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public Guid ComboId { get; set; }
    public int Quantity { get; set; }
}

public sealed class UpdateOrderRequest : OrderChanges
{
    public int Version { get; set; }
}

public sealed class RecordCallRequest
{
    public CallResult Result { get; set; }

    /// <summary>Bắt buộc với HenGoiLai.</summary>
    public DateTime? CallbackAt { get; set; }

    /// <summary>Bắt buộc với KhachHuy.</summary>
    public CancelReason? CancelReason { get; set; }

    /// <summary>≤ 300; bắt buộc khi cancelReason = Khac.</summary>
    public string? Note { get; set; }

    /// <summary>Chỉ với XacNhan (UC-03 3a upsell).</summary>
    public OrderChanges? Changes { get; set; }

    public int Version { get; set; }
}

public sealed class CancelOrderRequest
{
    public CancelReason? Reason { get; set; }
    public string? Note { get; set; }
    public int Version { get; set; }
}

public sealed class ReturnOrderRequest
{
    public ReturnReason? Reason { get; set; }
    public string? Note { get; set; }
    public int Version { get; set; }
}

public sealed class AddNoteRequest
{
    public string Content { get; set; } = string.Empty;
}

public sealed class HandoverRequest
{
    public List<Guid> OrderIds { get; set; } = [];
    public Carrier? Carrier { get; set; }
}

public sealed class HandoverResult
{
    public int HandedOver { get; init; }
    public int Skipped { get; init; }
    public IReadOnlyList<Guid> SkippedOrderIds { get; init; } = [];
    public string Message { get; init; } = string.Empty;
}

public sealed class ReassignRequest
{
    public List<Guid> OrderIds { get; set; } = [];
    public Guid AssigneeId { get; set; }
}

public sealed class ReassignResult
{
    public int Reassigned { get; init; }
    public int Skipped { get; init; }
    public string Message { get; init; } = string.Empty;
}

public sealed class OrderExportRow
{
    public string Code { get; init; } = string.Empty;
    public string CustomerName { get; init; } = string.Empty;
    public string Phone { get; init; } = string.Empty;
    public string Address { get; init; } = string.Empty;
    public string Province { get; init; } = string.Empty;
    public string Goods { get; init; } = string.Empty;
    public decimal CodAmount { get; init; }
    public string? Note { get; init; }
}

public sealed class TelesaleDto
{
    public Guid UserId { get; init; }
    public string Username { get; init; } = string.Empty;
    public string FullName { get; init; } = string.Empty;
    public bool IsReceiving { get; init; }
    public DateTime? LastAssignedAt { get; init; }

    /// <summary>Đơn Mới, Chờ gọi lại đang phụ trách.</summary>
    public int OpenOrders { get; init; }
}

public sealed class SetReceivingRequest
{
    public bool IsReceiving { get; set; }
}
