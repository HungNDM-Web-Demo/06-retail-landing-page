using Application.DTOs.Orders;

namespace Application.Interfaces.Services.Orders;

/// <summary>
/// Đơn hàng phía quản trị (07 §2.5). Phạm vi xem: có <c>orders.view-all</c> thấy mọi đơn, chỉ có <c>orders.view</c> thấy đơn
/// chưa chia và đơn mình phụ trách; đơn ngoài phạm vi → 403 <c>DonCuaNguoiKhac</c>. Thao tác đổi đơn trả OrderDetailDto mới.
/// </summary>
public interface IOrderService
{
    Task<OrderListResult> GetListAsync(OrderQuery query, CancellationToken ct = default);

    Task<OrderDetailDto> GetDetailAsync(Guid id, CancellationToken ct = default);

    Task<OrderDetailDto> UpdateAsync(Guid id, UpdateOrderRequest request, CancellationToken ct = default);

    Task<OrderDetailDto> RecordCallAsync(Guid id, RecordCallRequest request, CancellationToken ct = default);

    Task<OrderDetailDto> ClaimAsync(Guid id, CancellationToken ct = default);

    Task<OrderDetailDto> CancelAsync(Guid id, CancelOrderRequest request, CancellationToken ct = default);

    Task<OrderDetailDto> NotDuplicateAsync(Guid id, int version, CancellationToken ct = default);

    Task<OrderDetailDto> DeliverAsync(Guid id, int version, CancellationToken ct = default);

    Task<OrderDetailDto> ReturnAsync(Guid id, ReturnOrderRequest request, CancellationToken ct = default);

    Task<OrderDetailDto> AddNoteAsync(Guid id, AddNoteRequest request, CancellationToken ct = default);

    Task<HandoverResult> HandoverAsync(HandoverRequest request, CancellationToken ct = default);

    Task<ReassignResult> ReassignAsync(ReassignRequest request, CancellationToken ct = default);

    Task<IReadOnlyList<OrderExportRow>> GetExportRowsAsync(OrderQuery query, CancellationToken ct = default);
}

/// <summary>Telesale (vai trò STAFF) và công tắc "Nhận đơn" (BR-09).</summary>
public interface ITelesaleService
{
    Task<IReadOnlyList<TelesaleDto>> GetAllAsync(CancellationToken ct = default);

    Task<TelesaleDto> SetMyReceivingAsync(bool isReceiving, CancellationToken ct = default);
}
