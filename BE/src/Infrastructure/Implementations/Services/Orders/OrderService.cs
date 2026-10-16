using Application.Common.Exceptions;
using Application.Common.Models;
using Application.Constants;
using Application.DTOs.Orders;
using Application.Interfaces.Repositories;
using Application.Interfaces.Services.Common;
using Application.Interfaces.Services.Orders;
using Application.Interfaces.Services.Roles;
using Application.Mappings.Orders;
using Domain.Entities.Cms.Catalog;
using Domain.Entities.Sales;
using Domain.Entities.Sales.Orders;
using Domain.Entities.System.Users;
using Domain.Enums.Sales.Orders;
using Infrastructure.Extensions;
using Infrastructure.Implementations.Services.Sales;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Implementations.Services.Orders;

/// <summary>
/// Đơn hàng phía quản trị (07 §2.5, UC-03…UC-09). Phạm vi xem (FR-19): có <c>orders.view-all</c> thấy mọi đơn, chỉ có
/// <c>orders.view</c> thấy đơn chưa chia và đơn mình phụ trách. Thao tác theo <c>{id}</c> kiểm theo thứ tự: tồn tại (404) → phạm vi
/// (403 <c>DonCuaNguoiKhac</c>) → <c>version</c> (409 <c>DonDaThayDoi</c> kèm đơn mới nhất) → trạng thái → dữ liệu. Mọi ghi trong
/// transaction, tăng <c>Version</c>; hai người cùng ghi thì người sau nhận 409.
/// </summary>
public sealed partial class OrderService(
    IGenericRepository<Order> orders,
    IGenericRepository<OrderCall> calls,
    IGenericRepository<Shipment> shipments,
    IGenericRepository<Combo> combos,
    IGenericRepository<User> users,
    IUnitOfWork unitOfWork,
    ICurrentUserService currentUser,
    IPermissionService permissions,
    TimeProvider time) : IOrderService
{
    private DateTime Now => time.GetUtcNow().UtcDateTime;

    /// <summary>Người thao tác và quyền hiện tại.</summary>
    private sealed record Viewer(SalesActor Actor, bool ViewAll, bool CanCancel)
    {
        public Guid UserId => Actor.Id!.Value;
    }

    private async Task<Viewer> ViewerAsync(CancellationToken ct)
    {
        var actor = await SalesSupport.ActorAsync(currentUser, users, ct);
        var access = await permissions.GetUserAccessAsync(actor.Id!.Value, ct);
        return new Viewer(actor, access.HasPermission(ProjectPermissions.Orders.ViewAll), access.HasPermission(ProjectPermissions.Orders.Cancel));
    }

    private static IQueryable<Order> InScope(IQueryable<Order> query, Viewer viewer) =>
        viewer.ViewAll ? query : query.Where(o => o.AssigneeId == null || o.AssigneeId == viewer.UserId);

    private static bool IsInScope(Order order, Viewer viewer) =>
        viewer.ViewAll || order.AssigneeId == null || order.AssigneeId == viewer.UserId;

    private static void EnsureInScope(Order order, Viewer viewer)
    {
        if (!IsInScope(order, viewer))
            throw SalesProblems.OtherAssignee(order.AssigneeName);
    }

    /// <summary>Đơn có theo dõi để sửa; không có → 404 <c>KhongTimThayDon</c>.</summary>
    private async Task<Order> LoadAsync(Guid id, CancellationToken ct) =>
        await orders.Query().FirstOrDefaultAsync(o => o.Id == id, ct) ?? throw SalesProblems.OrderNotFound();

    private async Task EnsureVersionAsync(Order order, int version, Viewer viewer, CancellationToken ct)
    {
        if (order.Version != version)
            throw SalesProblems.OrderChanged(await BuildDetailAsync(order.Id, viewer, ct));
    }

    /// <summary>Lưu trong transaction; tranh chấp version lúc lưu → 409 kèm đơn mới nhất.</summary>
    private async Task SaveAsync(Guid orderId, Viewer viewer, CancellationToken ct)
    {
        try
        {
            await unitOfWork.ExecuteInTransactionAsync(c => unitOfWork.SaveChangesAsync(c), ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw SalesProblems.OrderChanged(await BuildDetailAsync(orderId, viewer, ct));
        }
    }

    private Task<List<Order>> SamePhoneAsync(string phone, CancellationToken ct) =>
        orders.Query().Where(o => o.Phone == phone).ToListAsync(ct);

    public async Task<OrderDetailDto> GetDetailAsync(Guid id, CancellationToken ct = default)
    {
        var viewer = await ViewerAsync(ct);
        var order = await orders.QueryNoTracking().FirstOrDefaultAsync(o => o.Id == id, ct) ?? throw SalesProblems.OrderNotFound();
        EnsureInScope(order, viewer);
        return await BuildDetailAsync(id, viewer, ct);
    }

    private async Task<OrderDetailDto> BuildDetailAsync(Guid id, Viewer viewer, CancellationToken ct)
    {
        var now = Now;
        var order = await orders.QueryNoTracking()
            .Include(o => o.Calls)
            .Include(o => o.Events)
            .Include(o => o.Shipment)
            .AsSplitQuery()
            .FirstOrDefaultAsync(o => o.Id == id, ct) ?? throw SalesProblems.OrderNotFound();

        var samePhone = await orders.QueryNoTracking()
            .Where(o => o.Phone == order.Phone && o.Id != order.Id)
            .OrderByDescending(o => o.PlacedAt)
            .ToListAsync(ct);
        var related = samePhone.Select(o => new RelatedOrder
        {
            Id = o.Id,
            Code = o.Code,
            PlacedAt = o.PlacedAt,
            ComboName = o.ComboName,
            Quantity = o.Quantity,
            Total = o.Total,
            Status = o.Status,
            CancelReason = o.CancelReason,
            ReturnReason = o.ReturnReason,
            AssigneeName = o.AssigneeName,
            IsDuplicate = o.IsDuplicate,
            CanCancel = viewer.CanCancel && Order.CancellableStatuses.Contains(o.Status) && IsInScope(o, viewer)
        }).ToList();
        var returnedCount = samePhone.Count(o => o.Status == OrderStatus.HoanHang) + (order.Status == OrderStatus.HoanHang ? 1 : 0);
        return order.ToDetail(now, related, returnedCount);
    }

    public async Task<OrderListResult> GetListAsync(OrderQuery query, CancellationToken ct = default)
    {
        var viewer = await ViewerAsync(ct);
        var now = Now;
        var filtered = ApplyFilters(InScope(orders.QueryNoTracking(), viewer), query, now);

        var counts = await filtered.GroupBy(o => o.Status).Select(g => new { Status = g.Key, Count = g.Count() }).ToListAsync(ct);
        var statusCounts = Enum.GetValues<OrderStatus>().ToDictionary(s => s.ToString(), s => counts.FirstOrDefault(c => c.Status == s)?.Count ?? 0);
        statusCounts["TatCa"] = counts.Sum(c => c.Count);

        if (query.Status is { } status)
            filtered = filtered.Where(o => o.Status == status);

        var page = query.GetPage();
        var pageSize = query.GetPageSize();
        var total = await filtered.CountAsync(ct);
        var items = await Sort(filtered, query, now).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);

        return new OrderListResult
        {
            Items = items.Select(o => o.ToListItem(now)).ToList(),
            Page = page,
            PageSize = pageSize,
            TotalCount = total,
            StatusCounts = statusCounts
        };
    }

    public async Task<IReadOnlyList<OrderExportRow>> GetExportRowsAsync(OrderQuery query, CancellationToken ct = default)
    {
        var viewer = await ViewerAsync(ct);
        var now = Now;
        var filtered = ApplyFilters(InScope(orders.QueryNoTracking(), viewer), query, now);
        if (query.Status is { } status)
            filtered = filtered.Where(o => o.Status == status);

        var rows = await Sort(filtered, query, now).Take(SalesRules.MaxExportRows).ToListAsync(ct);
        var comboIds = rows.Select(o => o.ComboId).Distinct().ToList();
        var gifts = await combos.QueryNoTracking().IgnoreQueryFilters().Where(c => comboIds.Contains(c.Id))
            .ToDictionaryAsync(c => c.Id, c => c.GiftText, ct);

        return rows.Select(o =>
        {
            var gift = gifts.GetValueOrDefault(o.ComboId);
            return new OrderExportRow
            {
                Code = o.Code,
                CustomerName = o.CustomerName,
                Phone = o.Phone,
                Address = o.Address,
                Province = o.Province,
                Goods = $"{o.ComboName} × {o.Quantity} ({o.BottleCount * o.Quantity} chai serum{(string.IsNullOrEmpty(gift) ? string.Empty : $", tặng {gift}")})",
                CodAmount = o.Total,
                Note = o.Note
            };
        }).ToList();
    }

    /// <summary>Bộ lọc danh sách trừ <c>status</c> (để đếm tab, TC-22).</summary>
    private static IQueryable<Order> ApplyFilters(IQueryable<Order> q, OrderQuery query, DateTime now)
    {
        if (query.GetSearchTerm() is { } term)
        {
            var pattern = LikePattern.Contains(term);
            var phonePattern = LikePattern.Contains(PhoneNormalizer.Normalize(term));
            q = q.Where(o => AppDbFunctions.Matches(o.Phone, phonePattern)
                || AppDbFunctions.Matches(o.Code, pattern)
                || AppDbFunctions.Matches(o.CustomerName, pattern));
        }

        if (!string.IsNullOrWhiteSpace(query.From) || !string.IsNullOrWhiteSpace(query.To))
        {
            var failures = new List<FluentValidation.Results.ValidationFailure>();
            if (!string.IsNullOrWhiteSpace(query.From))
            {
                if (Application.Common.Time.VietnamDates.TryParse(query.From, out var from))
                {
                    var start = SalesRules.StartOfDayUtc(from);
                    q = q.Where(o => o.PlacedAt >= start);
                }
                else
                    failures.Add(new FluentValidation.Results.ValidationFailure("from", "Ngày không hợp lệ"));
            }

            if (!string.IsNullOrWhiteSpace(query.To))
            {
                if (Application.Common.Time.VietnamDates.TryParse(query.To, out var to))
                {
                    var end = SalesRules.StartOfDayUtc(to.AddDays(1));
                    q = q.Where(o => o.PlacedAt < end);
                }
                else
                    failures.Add(new FluentValidation.Results.ValidationFailure("to", "Ngày không hợp lệ"));
            }

            if (failures.Count > 0)
                throw new FluentValidation.ValidationException(failures);
        }

        if (query.ComboId is { } comboId)
            q = q.Where(o => o.ComboId == comboId);

        if (!string.IsNullOrWhiteSpace(query.Source))
        {
            var source = query.Source.Trim().ToLowerInvariant();
            q = q.Where(o => o.Source == source);
        }

        if (!string.IsNullOrWhiteSpace(query.AssigneeId))
        {
            if (string.Equals(query.AssigneeId.Trim(), "unassigned", StringComparison.OrdinalIgnoreCase))
                q = q.Where(o => o.AssigneeId == null);
            else if (Guid.TryParse(query.AssigneeId, out var assigneeId))
                q = q.Where(o => o.AssigneeId == assigneeId);
            else
                throw new FluentValidation.ValidationException([new FluentValidation.Results.ValidationFailure("assigneeId", "Telesale không hợp lệ")]);
        }

        q = query.Tag switch
        {
            OrderTag.Trung => q.Where(o => o.IsDuplicate),
            OrderTag.RuiRoHoan => q.Where(o => o.IsReturnRisk),
            OrderTag.DenGioGoiLai => q.Where(o => o.Status == OrderStatus.ChoGoiLai && o.NextCallAt <= now),
            _ => q
        };

        if (query.ConfirmedById is { } confirmedById)
        {
            q = q.Where(o => o.ConfirmedById == confirmedById
                && (o.Status == OrderStatus.DaXacNhan || o.Status == OrderStatus.DangGiao || o.Status == OrderStatus.DaGiao || o.Status == OrderStatus.HoanHang));
        }

        if (query.UpsellOnly == true)
            q = q.Where(o => o.UpsellAmount > 0);

        return q;
    }

    /// <summary>Mặc định (BR-11): đơn Đến giờ gọi lại lên đầu theo giờ hẹn, rồi mới đặt trước; hoặc theo placedAt, total, nextCallAt.</summary>
    private static IQueryable<Order> Sort(IQueryable<Order> q, PaginationQuery query, DateTime now)
    {
        var desc = query.IsDescending();
        switch (query.SortBy?.Trim().ToLowerInvariant())
        {
            case "placedat":
                return (desc ? q.OrderByDescending(o => o.PlacedAt) : q.OrderBy(o => o.PlacedAt)).ThenBy(o => o.Id);
            case "total":
                return (desc ? q.OrderByDescending(o => o.Total) : q.OrderBy(o => o.Total)).ThenByDescending(o => o.PlacedAt).ThenBy(o => o.Id);
            case "nextcallat":
                return (desc ? q.OrderByDescending(o => o.NextCallAt) : q.OrderBy(o => o.NextCallAt)).ThenByDescending(o => o.PlacedAt).ThenBy(o => o.Id);
            default:
                return q
                    .OrderBy(o => o.Status == OrderStatus.ChoGoiLai && o.NextCallAt <= now ? 0 : 1)
                    .ThenBy(o => o.Status == OrderStatus.ChoGoiLai && o.NextCallAt <= now ? o.NextCallAt : null)
                    .ThenByDescending(o => o.PlacedAt)
                    .ThenBy(o => o.Id);
        }
    }
}
