using API.Base;
using API.Filters;
using Application.Constants;
using Application.DTOs.Common;
using Application.DTOs.Orders;
using Application.Interfaces.Services.Orders;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers.Orders;

/// <summary>
/// Đơn hàng (07 §2.5, UC-03…UC-09). Thao tác đổi đơn trả 200 kèm <c>OrderDetailDto</c> mới; đơn ngoài phạm vi xem → 403
/// <c>DonCuaNguoiKhac</c>; không tồn tại → 404 <c>KhongTimThayDon</c>; lệch version → 409 <c>DonDaThayDoi</c> kèm <c>order</c>.
/// </summary>
[Route("api/orders")]
[SalesProblemCode]
public sealed class OrdersController(IOrderService service) : BaseApiController
{
    [HttpGet]
    [AuthorizePermission(ProjectPermissions.Orders.View)]
    public async Task<ActionResult<OrderListResult>> GetList([FromQuery] OrderQuery query, CancellationToken ct) =>
        Ok(await service.GetListAsync(query, ct));

    /// <summary>Mọi đơn khớp bộ lọc (tối đa 5.000) để FE dựng file Excel (FR-28).</summary>
    [HttpGet("export-rows")]
    [AuthorizePermission(ProjectPermissions.Orders.Export)]
    public async Task<ActionResult<IReadOnlyList<OrderExportRow>>> GetExportRows([FromQuery] OrderQuery query, CancellationToken ct) =>
        Ok(await service.GetExportRowsAsync(query, ct));

    [HttpGet("{id:guid}")]
    [AuthorizePermission(ProjectPermissions.Orders.View)]
    public async Task<ActionResult<OrderDetailDto>> GetDetail(Guid id, CancellationToken ct) => Ok(await service.GetDetailAsync(id, ct));

    [HttpPut("{id:guid}")]
    [AuthorizePermission(ProjectPermissions.Orders.Call)]
    public async Task<ActionResult<OrderDetailDto>> Update(Guid id, UpdateOrderRequest request, CancellationToken ct) =>
        Ok(await service.UpdateAsync(id, request, ct));

    [HttpPost("{id:guid}/calls")]
    [AuthorizePermission(ProjectPermissions.Orders.Call)]
    public async Task<ActionResult<OrderDetailDto>> RecordCall(Guid id, RecordCallRequest request, CancellationToken ct) =>
        Ok(await service.RecordCallAsync(id, request, ct));

    [HttpPost("{id:guid}/claim")]
    [AuthorizePermission(ProjectPermissions.Orders.Call)]
    public async Task<ActionResult<OrderDetailDto>> Claim(Guid id, CancellationToken ct) => Ok(await service.ClaimAsync(id, ct));

    [HttpPost("{id:guid}/cancel")]
    [AuthorizePermission(ProjectPermissions.Orders.Cancel)]
    public async Task<ActionResult<OrderDetailDto>> Cancel(Guid id, CancelOrderRequest request, CancellationToken ct) =>
        Ok(await service.CancelAsync(id, request, ct));

    [HttpPost("{id:guid}/not-duplicate")]
    [AuthorizePermission(ProjectPermissions.Orders.Call)]
    public async Task<ActionResult<OrderDetailDto>> NotDuplicate(Guid id, VersionRequest request, CancellationToken ct) =>
        Ok(await service.NotDuplicateAsync(id, request.Version, ct));

    [HttpPost("{id:guid}/deliver")]
    [AuthorizePermission(ProjectPermissions.Orders.Ship)]
    public async Task<ActionResult<OrderDetailDto>> Deliver(Guid id, VersionRequest request, CancellationToken ct) =>
        Ok(await service.DeliverAsync(id, request.Version, ct));

    [HttpPost("{id:guid}/return")]
    [AuthorizePermission(ProjectPermissions.Orders.Ship)]
    public async Task<ActionResult<OrderDetailDto>> Return(Guid id, ReturnOrderRequest request, CancellationToken ct) =>
        Ok(await service.ReturnAsync(id, request, ct));

    [HttpPost("{id:guid}/notes")]
    [AuthorizePermission(ProjectPermissions.Orders.View)]
    public async Task<ActionResult<OrderDetailDto>> AddNote(Guid id, AddNoteRequest request, CancellationToken ct) =>
        Ok(await service.AddNoteAsync(id, request, ct));

    [HttpPost("handover")]
    [AuthorizePermission(ProjectPermissions.Orders.Ship)]
    public async Task<ActionResult<HandoverResult>> Handover(HandoverRequest request, CancellationToken ct) =>
        Ok(await service.HandoverAsync(request, ct));

    [HttpPost("reassign")]
    [AuthorizePermission(ProjectPermissions.Orders.Assign)]
    public async Task<ActionResult<ReassignResult>> Reassign(ReassignRequest request, CancellationToken ct) =>
        Ok(await service.ReassignAsync(request, ct));
}

/// <summary>Telesale và công tắc "Nhận đơn" (07 §2.5, BR-09).</summary>
[Route("api/telesales")]
[SalesProblemCode]
public sealed class TelesalesController(ITelesaleService service) : BaseApiController
{
    [HttpGet]
    [AuthorizePermission(ProjectPermissions.Orders.View)]
    public async Task<ActionResult<IReadOnlyList<TelesaleDto>>> GetAll(CancellationToken ct) => Ok(await service.GetAllAsync(ct));

    /// <summary>Người không có vai trò STAFF → 400 <c>KhongPhaiTelesale</c>.</summary>
    [HttpPut("me/receiving")]
    [AuthorizePermission(ProjectPermissions.Orders.Call)]
    public async Task<ActionResult<TelesaleDto>> SetReceiving(SetReceivingRequest request, CancellationToken ct) =>
        Ok(await service.SetMyReceivingAsync(request.IsReceiving, ct));
}
