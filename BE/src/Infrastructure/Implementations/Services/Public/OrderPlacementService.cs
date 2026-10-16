using Application.Common.Exceptions;
using Application.DTOs.Public;
using Application.Interfaces.Repositories;
using Application.Interfaces.Services.Public;
using Application.Mappings.Orders;
using Application.Validators.Orders;
using Domain.Entities.Cms.Catalog;
using Domain.Entities.Sales;
using Domain.Entities.Sales.Orders;
using Domain.Entities.Sales.Telesales;
using Domain.Entities.Sales.Tracking;
using Domain.Entities.System.Users;
using Domain.Enums.Sales.Orders;
using Domain.Enums.Sales.Tracking;
using FluentValidation.Results;
using Infrastructure.Implementations.Services.Sales;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Infrastructure.Implementations.Services.Public;

/// <summary>
/// Đặt hàng công khai (07 §2.1, FR-09, FR-10). Thứ tự kiểm tra: (1) trùng <c>clientRequestId</c> → 200 đơn cũ; (2) dữ liệu BR-04;
/// (3) combo không còn bán → <c>ComboDaThayDoi</c>; (4) cùng trình duyệt trong 60 giây → 429 <c>DatHangQuaNhanh</c>; (5) số điện
/// thoại đã có 5 đơn trong 24 giờ → 429 <c>QuaNhieuDonCungSo</c>; (6) giá khách thấy khác giá đang áp dụng → 409 <c>GiaDaThayDoi</c>.
/// Tạo đơn trong một transaction: chốt mức giá, tính tiền (§3.1), nhãn (§3.10), chia đơn (§3.9), mã đơn (§3.4), dòng thời gian,
/// sự kiện Purchase. Hai request cùng lúc trùng mã đơn hoặc <c>clientRequestId</c> thì chạy lại một lần trong scope mới.
/// </summary>
public sealed class OrderPlacementService(
    IGenericRepository<Order> orders,
    IGenericRepository<Combo> combos,
    IGenericRepository<Promotion> promotions,
    IGenericRepository<Visit> visits,
    IGenericRepository<TelesaleState> telesaleStates,
    IGenericRepository<ConversionEvent> conversionEvents,
    IGenericRepository<User> users,
    IUnitOfWork unitOfWork,
    IServiceScopeFactory scopeFactory,
    TimeProvider time) : IOrderPlacementService
{
    private bool _isRetry;

    public async Task<WriteOutcome<PlaceOrderResult>> PlaceOrderAsync(PlaceOrderRequest request, CancellationToken ct = default)
    {
        try
        {
            return await PlaceCoreAsync(request, ct);
        }
        catch (DbUpdateException) when (!_isRetry)
        {
            await using var scope = scopeFactory.CreateAsyncScope();
            var fresh = (OrderPlacementService)scope.ServiceProvider.GetRequiredService<IOrderPlacementService>();
            fresh._isRetry = true;
            return await fresh.PlaceCoreAsync(request, ct);
        }
    }

    private async Task<WriteOutcome<PlaceOrderResult>> PlaceCoreAsync(PlaceOrderRequest request, CancellationToken ct)
    {
        var now = time.GetUtcNow().UtcDateTime;
        var requestId = request.ClientRequestId.Trim();
        var visitorId = request.VisitorId.Trim();

        // (1) Gửi lại cùng mã: trả đơn cũ, không xét bước sau (NFR-03).
        var existing = await orders.QueryNoTracking().FirstOrDefaultAsync(o => o.ClientRequestId == requestId, ct);
        if (existing is not null)
            return new WriteOutcome<PlaceOrderResult>(new PlaceOrderResult { Order = existing.ToSummary(), Duplicate = true }, false);

        // (2) BR-04 sau khi chuẩn hóa số điện thoại.
        var failures = new List<ValidationFailure>();
        OrderInputRules.CheckName(request.CustomerName, failures);
        OrderInputRules.CheckPhone(request.Phone, failures);
        OrderInputRules.CheckProvince(request.Province, failures);
        OrderInputRules.CheckAddress(request.Address, failures);
        OrderInputRules.CheckQuantity(request.Quantity, failures);
        OrderInputRules.CheckNote(request.Note, failures);
        OrderInputRules.CheckCombo(request.ComboId, failures);
        OrderInputRules.ThrowIfAny(failures);
        var phone = PhoneNormalizer.Normalize(request.Phone);

        // (3) Combo không có, đã xóa hoặc đang ẩn (UC-02 E4).
        var combo = await combos.QueryNoTracking().FirstOrDefaultAsync(c => c.Id == request.ComboId, ct);
        if (combo is null || !combo.IsVisible)
            throw SalesProblems.Bad(SalesErrors.ComboDaThayDoi, SalesErrors.ComboDaThayDoiMessage);

        // (4) BR-05: một trình duyệt một đơn mỗi 60 giây.
        var cooldownStart = now.AddSeconds(-SalesRules.OrderCooldownSeconds);
        var lastOfVisitor = await orders.QueryNoTracking()
            .Where(o => o.VisitorId == visitorId && o.PlacedAt > cooldownStart)
            .OrderByDescending(o => o.PlacedAt)
            .Select(o => (DateTime?)o.PlacedAt)
            .FirstOrDefaultAsync(ct);
        if (lastOfVisitor is { } last)
        {
            var wait = (int)Math.Ceiling(SalesRules.OrderCooldownSeconds - (now - last).TotalSeconds);
            throw new SalesTooManyRequestsException(SalesErrors.DatHangQuaNhanh, SalesErrors.DatHangQuaNhanhMessage, Math.Max(1, wait), true);
        }

        // (5) 07 §3.6: tối đa 5 đơn mọi trạng thái mỗi số trong 24 giờ.
        var dayAgo = now.AddHours(-SalesRules.DuplicateWindowHours);
        if (await orders.QueryNoTracking().CountAsync(o => o.Phone == phone && o.PlacedAt > dayAgo, ct) >= SalesRules.MaxOrdersPerPhonePer24h)
            throw new SalesTooManyRequestsException(SalesErrors.QuaNhieuDonCungSo, SalesErrors.QuaNhieuDonCungSoMessage, 60, false);

        // (6) BR-02: mức giá chốt lúc nhận request; khác giá khách thấy thì không tạo đơn.
        var promotion = await promotions.QueryNoTracking().OrderBy(p => p.CreatedAt).FirstOrDefaultAsync(ct);
        var priceType = promotion?.PriceTypeAt(now) ?? PriceType.GiaThuong;
        var currentPrice = combo.PriceOf(priceType);
        if (request.ExpectedPrice != currentPrice)
            throw SalesProblems.PriceChanged(currentPrice, priceType);

        Order order = null!;
        await unitOfWork.ExecuteInTransactionAsync(async c =>
        {
            order = await CreateAsync(request, combo, priceType, phone, visitorId, requestId, now, c);
            await unitOfWork.SaveChangesAsync(c);
        }, ct);

        return new WriteOutcome<PlaceOrderResult>(new PlaceOrderResult { Order = order.ToSummary(), Duplicate = false }, true);
    }

    private async Task<Order> CreateAsync(PlaceOrderRequest request, Combo combo, PriceType priceType, string phone, string visitorId,
        string requestId, DateTime now, CancellationToken ct)
    {
        var attribution = VisitTrackingService.Normalize(request.Attribution);

        // Gắn đơn vào lượt truy cập, cập nhật LastSeenAt (BR-08).
        Visit? visit = null;
        if (request.VisitId is { } visitId)
            visit = await visits.Query().FirstOrDefaultAsync(v => v.Id == visitId && v.VisitorId == visitorId, ct);
        visit?.Touch(now);

        var day = SalesRules.VietnamDate(now);
        var prefix = SalesSupport.OrderCodePrefix(day);
        var codes = await orders.QueryNoTracking().Where(o => o.Code.StartsWith(prefix)).Select(o => o.Code).ToListAsync(ct);

        var order = Order.Place(
            SalesSupport.NextOrderCode(day, codes), now,
            OrderInputRules.CleanName(request.CustomerName), phone, request.Province.Trim(), OrderInputRules.CleanText(request.Address),
            request.Note, combo, request.Quantity, priceType,
            attribution.Source, attribution.Medium, attribution.Campaign, attribution.Content, attribution.Referrer, request.Device,
            visitorId, visit?.Id, requestId);
        order.AddEvent(OrderEventType.TaoDon, OrderEventTexts.Created(order.Source, order.Campaign), SalesActor.System, now, null, OrderStatus.Moi);
        order.AddEvent(OrderEventType.TinNhan, OrderEventTexts.SmsSent, SalesActor.System, now);

        var samePhone = await orders.Query().Where(o => o.Phone == phone).ToListAsync(ct);
        SalesSupport.TagOnCreate(order, samePhone, now);
        await AssignAsync(order, samePhone, now, ct);

        await orders.AddAsync(order, ct);
        await conversionEvents.AddAsync(ConversionEvent.Create(ConversionEventType.Purchase, now, visitorId, visit?.Id, order.Id,
            order.Source, order.Campaign, order.Total, order.Code), ct);
        return order;
    }

    /// <summary>
    /// BR-09 (07 §3.9): cùng số với đơn đang mở có người phụ trách → giao người đó; không thì telesale đang bật "Nhận đơn" có
    /// <c>LastAssignedAt</c> nhỏ nhất (null trước, bằng nhau theo tên đăng nhập); không có ai → chưa chia.
    /// </summary>
    private async Task AssignAsync(Order order, IReadOnlyList<Order> samePhone, DateTime now, CancellationToken ct)
    {
        var holder = samePhone
            .Where(o => o.AssigneeId != null
                && o.Status is OrderStatus.Moi or OrderStatus.ChoGoiLai or OrderStatus.DaXacNhan)
            .OrderByDescending(o => o.PlacedAt)
            .FirstOrDefault();
        if (holder is not null)
        {
            order.AssignTo(holder.AssigneeId!.Value, holder.AssigneeName ?? string.Empty, now);
            order.AddEvent(OrderEventType.ChiaDon, OrderEventTexts.AssignedTo(holder.AssigneeName ?? string.Empty), SalesActor.System, now);
            return;
        }

        var staff = await SalesSupport.ActiveStaff(users).Select(u => new { u.Id, u.Username, u.FullName }).ToListAsync(ct);
        var staffIds = staff.Select(s => s.Id).ToList();
        var receiving = await telesaleStates.Query().Where(s => s.IsReceiving && staffIds.Contains(s.UserId)).ToListAsync(ct);
        var pick = receiving
            .Select(s => new { State = s, User = staff.First(u => u.Id == s.UserId) })
            .OrderBy(x => x.State.LastAssignedAt.HasValue)
            .ThenBy(x => x.State.LastAssignedAt)
            .ThenBy(x => x.User.Username, StringComparer.Ordinal)
            .FirstOrDefault();
        if (pick is null)
            return;

        pick.State.MarkAssigned(now);
        order.AssignTo(pick.User.Id, pick.User.FullName, now);
        order.AddEvent(OrderEventType.ChiaDon, OrderEventTexts.AssignedTo(pick.User.FullName), SalesActor.System, now);
    }
}
