using Application.DTOs.Orders;
using Domain.Entities.Sales;
using Domain.Entities.Sales.Orders;
using Domain.Enums.Sales.Orders;
using FluentValidation.Results;
using Infrastructure.Implementations.Services.Sales;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Implementations.Services.Orders;

// Thao tác nhiều đơn: bàn giao vận chuyển, chia lại (07 §2.5).
public sealed partial class OrderService
{
    /// <summary>
    /// FR-25, BR-17: đơn ngoài phạm vi xem hoặc không ở Đã xác nhận bị bỏ qua; không còn đơn nào → 400 <c>KhongCoDonBanGiao</c>.
    /// Mã vận đơn = mã đơn vị + yyMMdd (ngày bàn giao) + 4 số ngẫu nhiên, không trùng (07 §3.4).
    /// </summary>
    public async Task<HandoverResult> HandoverAsync(HandoverRequest request, CancellationToken ct = default)
    {
        var viewer = await ViewerAsync(ct);
        var carrier = request.Carrier!.Value;
        var ids = request.OrderIds.Distinct().ToList();
        var loaded = await orders.Query().Where(o => ids.Contains(o.Id)).ToListAsync(ct);
        var eligible = loaded.Where(o => IsInScope(o, viewer) && o.Status == OrderStatus.DaXacNhan).ToList();
        var skippedIds = ids.Where(id => eligible.All(o => o.Id != id)).ToList();
        if (eligible.Count == 0)
            throw Application.Common.Exceptions.SalesProblems.Bad(SalesErrors.KhongCoDonBanGiao, SalesErrors.KhongCoDonBanGiaoMessage);

        var now = Now;
        var prefix = carrier + SalesRules.ToVietnam(now).ToString("yyMMdd", System.Globalization.CultureInfo.InvariantCulture);
        var used = (await shipments.QueryNoTracking().Where(s => s.TrackingCode.StartsWith(prefix)).Select(s => s.TrackingCode).ToListAsync(ct))
            .ToHashSet(StringComparer.Ordinal);

        foreach (var order in eligible.OrderBy(o => o.PlacedAt))
        {
            string code;
            do
                code = prefix + Random.Shared.Next(0, 10_000).ToString("D4", System.Globalization.CultureInfo.InvariantCulture);
            while (!used.Add(code));

            await shipments.AddAsync(Shipment.Create(order.Id, carrier, code, order.Total, now, viewer.Actor), ct);
            order.MarkShipped();
            order.AddEvent(OrderEventType.BanGiao, OrderEventTexts.HandedOver(carrier, code, order.Total), viewer.Actor, now,
                OrderStatus.DaXacNhan, OrderStatus.DangGiao);
            order.Touch();
        }

        try
        {
            await unitOfWork.ExecuteInTransactionAsync(c => unitOfWork.SaveChangesAsync(c), ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw Application.Common.Exceptions.SalesProblems.Conflict(SalesErrors.DonDaThayDoi, SalesErrors.DonDaThayDoiMessage);
        }

        return new HandoverResult
        {
            HandedOver = eligible.Count,
            Skipped = skippedIds.Count,
            SkippedOrderIds = skippedIds,
            Message = skippedIds.Count == 0
                ? $"Đã bàn giao {eligible.Count} đơn"
                : $"Đã bàn giao {eligible.Count} đơn, bỏ qua {skippedIds.Count} đơn không ở trạng thái Đã xác nhận"
        };
    }

    /// <summary>
    /// FR-20, TC-24: chia lại cho tài khoản STAFF đang hoạt động; bỏ qua đơn Đã giao, Hoàn hàng, Đã hủy hoặc đã là của người đó.
    /// Không đổi <c>LastAssignedAt</c> (07 §5 quyết định 23).
    /// </summary>
    public async Task<ReassignResult> ReassignAsync(ReassignRequest request, CancellationToken ct = default)
    {
        var viewer = await ViewerAsync(ct);
        var assignee = await SalesSupport.ActiveStaff(users).Where(u => u.Id == request.AssigneeId)
            .Select(u => new { u.Id, u.FullName }).FirstOrDefaultAsync(ct)
            ?? throw new FluentValidation.ValidationException([new ValidationFailure("assigneeId", "Chọn telesale")]);

        var ids = request.OrderIds.Distinct().ToList();
        var loaded = await orders.Query().Where(o => ids.Contains(o.Id)).ToListAsync(ct);
        var eligible = loaded
            .Where(o => IsInScope(o, viewer)
                && o.Status is not (OrderStatus.DaGiao or OrderStatus.HoanHang or OrderStatus.DaHuy)
                && o.AssigneeId != assignee.Id)
            .ToList();

        var now = Now;
        foreach (var order in eligible)
        {
            order.AssignTo(assignee.Id, assignee.FullName, now);
            order.AddEvent(OrderEventType.ChiaDon, OrderEventTexts.AssignedTo(assignee.FullName), viewer.Actor, now);
            order.Touch();
        }

        if (eligible.Count > 0)
            await unitOfWork.ExecuteInTransactionAsync(c => unitOfWork.SaveChangesAsync(c), ct);

        var skipped = ids.Count - eligible.Count;
        return new ReassignResult
        {
            Reassigned = eligible.Count,
            Skipped = skipped,
            Message = $"Đã chia lại {eligible.Count} đơn cho {assignee.FullName}" + (skipped > 0 ? $", bỏ qua {skipped} đơn" : string.Empty)
        };
    }
}
