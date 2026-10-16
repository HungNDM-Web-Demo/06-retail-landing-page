using Application.Common.Exceptions;
using Application.Common.Time;
using Application.DTOs.Orders;
using Application.Validators.Orders;
using Domain.Entities.Cms.Catalog;
using Domain.Entities.Sales;
using Domain.Entities.Sales.Orders;
using Domain.Enums.Sales.Orders;
using FluentValidation.Results;
using Infrastructure.Implementations.Services.Sales;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Implementations.Services.Orders;

// Thao tác trên một đơn: sửa, ghi cuộc gọi, nhận đơn, hủy, không phải trùng, giao, hoàn, ghi chú (07 §2.5).
public sealed partial class OrderService
{
    private const string ComboNotForSale = "Combo không còn bán";
    private const string NoteRequiredForOther = "Nhập ghi chú cho lý do Khác";

    /// <summary>BR-13: sửa họ tên, tỉnh, địa chỉ, combo, số lượng khi Mới, Chờ gọi lại.</summary>
    public async Task<OrderDetailDto> UpdateAsync(Guid id, UpdateOrderRequest request, CancellationToken ct = default)
    {
        var viewer = await ViewerAsync(ct);
        var order = await LoadAsync(id, ct);
        EnsureInScope(order, viewer);
        await EnsureVersionAsync(order, request.Version, viewer, ct);
        if (order.Status is not (OrderStatus.Moi or OrderStatus.ChoGoiLai))
            throw SalesProblems.Bad(SalesErrors.KhongSuaDonDaXacNhan, SalesErrors.KhongSuaDonDaXacNhanMessage);

        var failures = OrderInputRules.CheckChanges(request);
        OrderInputRules.ThrowIfAny(failures);
        var combo = await ComboForChangeAsync(order, request.ComboId, "comboId", ct);

        if (ApplyChanges(order, request, combo, viewer.Actor, Now))
        {
            order.Touch();
            await SaveAsync(order.Id, viewer, ct);
        }

        return await BuildDetailAsync(id, viewer, ct);
    }

    /// <summary>FR-22, FR-23, BR-10 (07 §3.7). Đơn chưa chia thì tự giao cho người gọi (07 §5 quyết định 21).</summary>
    public async Task<OrderDetailDto> RecordCallAsync(Guid id, RecordCallRequest request, CancellationToken ct = default)
    {
        var viewer = await ViewerAsync(ct);
        var order = await LoadAsync(id, ct);
        EnsureInScope(order, viewer);
        await EnsureVersionAsync(order, request.Version, viewer, ct);
        if (order.Status is not (OrderStatus.Moi or OrderStatus.ChoGoiLai))
            throw SalesProblems.Bad(SalesErrors.DonKhongChoGoi, SalesErrors.DonKhongChoGoiMessage);

        var now = Now;
        var callbackAt = request.CallbackAt is { } cb ? VietnamTime.ToUtc(cb) : (DateTime?)null;
        var failures = new List<ValidationFailure>();
        if (!Enum.IsDefined(request.Result))
            failures.Add(new ValidationFailure("result", "Kết quả gọi không hợp lệ"));
        if (request.Result == CallResult.HenGoiLai)
        {
            if (callbackAt is null)
                failures.Add(new ValidationFailure("callbackAt", "Chọn giờ gọi lại"));
            else if (callbackAt <= now || callbackAt > now.AddDays(SalesRules.MaxCallbackDays))
                failures.Add(new ValidationFailure("callbackAt", "Giờ gọi lại phải sau hiện tại và trong 7 ngày tới"));
        }

        if (request.Result == CallResult.KhachHuy)
        {
            if (request.CancelReason is null)
                failures.Add(new ValidationFailure("cancelReason", "Chọn lý do hủy"));
            else if (!OrderInputRules.CustomerCancelReasons.Contains(request.CancelReason.Value))
                failures.Add(new ValidationFailure("cancelReason", "Lý do không hợp lệ"));
            else if (request.CancelReason == CancelReason.Khac && string.IsNullOrWhiteSpace(request.Note))
                failures.Add(new ValidationFailure("note", NoteRequiredForOther));
        }

        OrderInputRules.CheckNote(request.Note, failures);
        Combo? combo = null;
        if (request.Changes is not null)
        {
            if (request.Result != CallResult.XacNhan)
                failures.Add(new ValidationFailure("changes", "Chỉ sửa đơn khi xác nhận"));
            else
            {
                failures.AddRange(OrderInputRules.CheckChanges(request.Changes));
                if (failures.Count == 0)
                    combo = await ComboForChangeAsync(order, request.Changes.ComboId, "comboId", ct);
            }
        }

        OrderInputRules.ThrowIfAny(failures);

        // Đơn chưa chia: người gọi nhận đơn.
        if (order.AssigneeId is null)
        {
            order.AssignTo(viewer.UserId, viewer.Actor.Name!, now);
            order.AddEvent(OrderEventType.ChiaDon, OrderEventTexts.Claimed(viewer.Actor.Name!), viewer.Actor, now);
        }

        if (request.Changes is not null && combo is not null)
            ApplyChanges(order, request.Changes, combo, viewer.Actor, now);

        var cancelReason = request.Result == CallResult.KhachHuy ? request.CancelReason : null;
        await calls.AddAsync(OrderCall.Create(order.Id, now, viewer.Actor, request.Result,
            request.Result == CallResult.HenGoiLai ? callbackAt : null, cancelReason, request.Note), ct);
        var (from, to) = order.ApplyCall(request.Result, now, viewer.Actor, callbackAt, cancelReason, request.Note);
        order.AddEvent(OrderEventType.CuocGoi,
            OrderEventTexts.Call(request.Result, order.FailedCallCount, order.NextCallAt, cancelReason, order.UpsellAmount, request.Note),
            viewer.Actor, now, from == to ? null : from, from == to ? null : to);
        if (request.Result == CallResult.XacNhan)
            order.AddEvent(OrderEventType.TinNhan, OrderEventTexts.SmsConfirmed, SalesActor.System, now);
        order.Touch();

        if (order.Status == OrderStatus.DaHuy)
            SalesSupport.RecomputeDuplicates(await SamePhoneAsync(order.Phone, ct), now);

        await SaveAsync(order.Id, viewer, ct);
        return await BuildDetailAsync(id, viewer, ct);
    }

    /// <summary>BR-09: nhận đơn chưa chia; đơn đã có người → 409 <c>DonDaCoNguoiNhan</c>.</summary>
    public async Task<OrderDetailDto> ClaimAsync(Guid id, CancellationToken ct = default)
    {
        var viewer = await ViewerAsync(ct);
        var order = await LoadAsync(id, ct);
        if (order.AssigneeId == viewer.UserId)
            return await BuildDetailAsync(id, viewer, ct);
        if (order.AssigneeId is not null)
        {
            // Kèm đơn mới nhất khi người gọi xem được đơn đó (quản lý), để FE thay cache.
            var extra = IsInScope(order, viewer)
                ? new Dictionary<string, object?> { ["order"] = await BuildDetailAsync(id, viewer, ct) }
                : null;
            throw SalesProblems.Conflict(SalesErrors.DonDaCoNguoiNhan, SalesErrors.DonDaCoNguoiNhanMessage(order.AssigneeName), extra);
        }

        var now = Now;
        order.AssignTo(viewer.UserId, viewer.Actor.Name!, now);
        order.AddEvent(OrderEventType.ChiaDon, OrderEventTexts.Claimed(viewer.Actor.Name!), viewer.Actor, now);
        order.Touch();
        await SaveAsync(order.Id, viewer, ct);
        return await BuildDetailAsync(id, viewer, ct);
    }

    /// <summary>FR-27, BR-16: hủy khi Mới, Chờ gọi lại, Đã xác nhận; sau khi hủy tính lại nhãn Trùng các đơn cùng số.</summary>
    public async Task<OrderDetailDto> CancelAsync(Guid id, CancelOrderRequest request, CancellationToken ct = default)
    {
        var viewer = await ViewerAsync(ct);
        var order = await LoadAsync(id, ct);
        EnsureInScope(order, viewer);
        await EnsureVersionAsync(order, request.Version, viewer, ct);
        if (order.Status is OrderStatus.DangGiao or OrderStatus.DaGiao or OrderStatus.HoanHang)
            throw SalesProblems.Bad(SalesErrors.KhongHuyDonDaBanGiao, SalesErrors.KhongHuyDonDaBanGiaoMessage);
        if (order.Status == OrderStatus.DaHuy)
            throw SalesProblems.Bad(SalesErrors.DonDaHuy, SalesErrors.DonDaHuyMessage);

        var failures = new List<ValidationFailure>();
        if (request.Reason is null)
            failures.Add(new ValidationFailure("reason", "Chọn lý do hủy"));
        else if (!OrderInputRules.UserCancelReasons.Contains(request.Reason.Value))
            failures.Add(new ValidationFailure("reason", "Lý do không hợp lệ"));
        else if (request.Reason == CancelReason.Khac && string.IsNullOrWhiteSpace(request.Note))
            failures.Add(new ValidationFailure("note", NoteRequiredForOther));
        OrderInputRules.CheckNote(request.Note, failures);
        OrderInputRules.ThrowIfAny(failures);

        if (request.Reason == CancelReason.DonTrung && !order.IsDuplicate)
            throw SalesProblems.Bad(SalesErrors.KhongPhaiDonTrung, SalesErrors.KhongPhaiDonTrungMessage);

        var now = Now;
        var from = order.Status;
        order.Cancel(request.Reason!.Value, request.Note, now, viewer.Actor);
        order.AddEvent(OrderEventType.DoiTrangThai, OrderEventTexts.Cancelled(request.Reason.Value, request.Note), viewer.Actor, now,
            from, OrderStatus.DaHuy);
        order.Touch();
        SalesSupport.RecomputeDuplicates(await SamePhoneAsync(order.Phone, ct), now);

        await SaveAsync(order.Id, viewer, ct);
        return await BuildDetailAsync(id, viewer, ct);
    }

    /// <summary>FR-24, TC-21: bỏ nhãn ở đơn này và mọi đơn còn nhãn cùng số trong 24 giờ.</summary>
    public async Task<OrderDetailDto> NotDuplicateAsync(Guid id, int version, CancellationToken ct = default)
    {
        var viewer = await ViewerAsync(ct);
        var order = await LoadAsync(id, ct);
        EnsureInScope(order, viewer);
        await EnsureVersionAsync(order, version, viewer, ct);
        if (!order.IsDuplicate)
            throw SalesProblems.Bad(SalesErrors.KhongPhaiDonTrung, SalesErrors.KhongPhaiDonTrungMessage);

        var now = Now;
        var window = TimeSpan.FromHours(SalesRules.DuplicateWindowHours);
        var targets = (await SamePhoneAsync(order.Phone, ct))
            .Where(o => o.Id == order.Id
                || (o.IsDuplicate && o.Status != OrderStatus.DaHuy && (o.PlacedAt - order.PlacedAt).Duration() <= window))
            .ToList();
        foreach (var target in targets)
        {
            target.ClearDuplicate(byUser: true);
            target.AddEvent(OrderEventType.Nhan, OrderEventTexts.NotDuplicate, viewer.Actor, now);
            target.Touch();
        }

        await SaveAsync(order.Id, viewer, ct);
        return await BuildDetailAsync(id, viewer, ct);
    }

    /// <summary>FR-26: giao thành công; doanh thu tính theo <c>DeliveredAt</c> (BR-19).</summary>
    public async Task<OrderDetailDto> DeliverAsync(Guid id, int version, CancellationToken ct = default)
    {
        var viewer = await ViewerAsync(ct);
        var order = await LoadAsync(id, ct);
        EnsureInScope(order, viewer);
        await EnsureVersionAsync(order, version, viewer, ct);
        if (order.Status != OrderStatus.DangGiao)
            throw SalesProblems.Bad(SalesErrors.DonChuaBanGiao, SalesErrors.DonChuaBanGiaoMessage);

        var now = Now;
        var shipment = await shipments.Query().FirstOrDefaultAsync(s => s.OrderId == order.Id, ct);
        shipment?.MarkDelivered(now);
        order.MarkDelivered();
        order.AddEvent(OrderEventType.DoiTrangThai, OrderEventTexts.Delivered, viewer.Actor, now, OrderStatus.DangGiao, OrderStatus.DaGiao);
        order.Touch();
        await SaveAsync(order.Id, viewer, ct);
        return await BuildDetailAsync(id, viewer, ct);
    }

    /// <summary>FR-26, BR-18: hoàn hàng bắt buộc lý do.</summary>
    public async Task<OrderDetailDto> ReturnAsync(Guid id, ReturnOrderRequest request, CancellationToken ct = default)
    {
        var viewer = await ViewerAsync(ct);
        var order = await LoadAsync(id, ct);
        EnsureInScope(order, viewer);
        await EnsureVersionAsync(order, request.Version, viewer, ct);
        if (order.Status != OrderStatus.DangGiao)
            throw SalesProblems.Bad(SalesErrors.DonChuaBanGiao, SalesErrors.DonChuaBanGiaoMessage);

        var failures = new List<ValidationFailure>();
        if (request.Reason is null || !Enum.IsDefined(request.Reason.Value))
            failures.Add(new ValidationFailure("reason", "Chọn lý do hoàn hàng"));
        else if (request.Reason == ReturnReason.Khac && string.IsNullOrWhiteSpace(request.Note))
            failures.Add(new ValidationFailure("note", NoteRequiredForOther));
        OrderInputRules.CheckNote(request.Note, failures);
        OrderInputRules.ThrowIfAny(failures);

        var now = Now;
        var shipment = await shipments.Query().FirstOrDefaultAsync(s => s.OrderId == order.Id, ct);
        shipment?.MarkReturned(now);
        order.MarkReturned(request.Reason!.Value, request.Note);
        order.AddEvent(OrderEventType.DoiTrangThai, OrderEventTexts.Returned(request.Reason.Value, request.Note), viewer.Actor, now,
            OrderStatus.DangGiao, OrderStatus.HoanHang);
        order.Touch();
        await SaveAsync(order.Id, viewer, ct);
        return await BuildDetailAsync(id, viewer, ct);
    }

    /// <summary>BR-13, 07 §5 quyết định 34: ghi chú mọi trạng thái, không đổi version.</summary>
    public async Task<OrderDetailDto> AddNoteAsync(Guid id, AddNoteRequest request, CancellationToken ct = default)
    {
        var viewer = await ViewerAsync(ct);
        var order = await LoadAsync(id, ct);
        EnsureInScope(order, viewer);
        order.AddEvent(OrderEventType.GhiChu, request.Content.Trim(), viewer.Actor, Now);
        await unitOfWork.SaveChangesAsync(ct);
        return await BuildDetailAsync(id, viewer, ct);
    }

    /// <summary>Combo khi sửa đơn: đã xóa, hoặc đang ẩn mà không phải combo hiện tại của đơn → "Combo không còn bán".</summary>
    private async Task<Combo> ComboForChangeAsync(Order order, Guid comboId, string field, CancellationToken ct)
    {
        var combo = await combos.QueryNoTracking().FirstOrDefaultAsync(c => c.Id == comboId, ct);
        if (combo is null || (!combo.IsVisible && combo.Id != order.ComboId))
            throw new FluentValidation.ValidationException([new ValidationFailure(field, ComboNotForSale)]);
        return combo;
    }

    /// <summary>Áp sửa đổi, ghi sự kiện <c>SuaDon</c>; trả false khi không có gì thay đổi.</summary>
    private static bool ApplyChanges(Order order, OrderChanges changes, Combo combo, SalesActor actor, DateTime now)
    {
        var parts = new List<string>();
        if (order.ChangeItems(combo, changes.Quantity) is { } items)
            parts.Add(items);
        parts.AddRange(order.ChangeCustomer(OrderInputRules.CleanName(changes.CustomerName), changes.Province.Trim(),
            OrderInputRules.CleanText(changes.Address)));
        if (parts.Count == 0)
            return false;

        order.AddEvent(OrderEventType.SuaDon, OrderEventTexts.Edited(parts), actor, now);
        return true;
    }
}
