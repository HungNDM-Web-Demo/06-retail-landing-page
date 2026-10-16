using System.Text.Json;
using Application.Mappings.Content;
using Domain.Base;
using Domain.Entities.Cms.Catalog;
using Domain.Entities.Cms.Content;
using Domain.Entities.Sales;
using Domain.Entities.Sales.Marketing;
using Domain.Entities.Sales.Orders;
using Domain.Entities.Sales.Telesales;
using Domain.Entities.Sales.Tracking;
using Domain.Entities.System.Users;
using Domain.Enums.Sales.Orders;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Persistence.Seeders;

/// <summary>
/// Dữ liệu mẫu của Landing Page Bán hàng (bảng <c>Cms_*</c>, <c>Sales_*</c>), đọc từ <c>FE/src/mock/seed/demo-data.json</c>
/// (nguồn duy nhất, FE mock nạp cùng file; quy tắc suy ra trường: 06 §5). Trạng thái đơn đi qua chính method của entity
/// (<see cref="Order.ApplyCall"/>, <see cref="Order.Cancel"/>…) và câu dòng thời gian từ <see cref="OrderEventTexts"/>, nên dữ liệu
/// mẫu đúng quy tắc nghiệp vụ. Số liệu phải khớp 06 §5.6, §5.7 (test <c>SeedTests</c>).
/// </summary>
public sealed class DemoDataSeeder(AppDbContext db, TimeProvider timeProvider, ILogger<DemoDataSeeder> logger) : IDemoDataSeeder
{
    public const string SeedFileName = "demo-data.json";

    private const int MasterDataDaysAgo = 90;

    public async Task<bool> HasDataAsync(CancellationToken ct = default) =>
        await db.Set<Product>().AnyAsync(ct) || await db.Set<Combo>().IgnoreQueryFilters().AnyAsync(ct);

    public async Task SeedAsync(CancellationToken ct = default)
    {
        var seed = SeedJson.Read<SalesSeedFile>(SeedFileName, timeProvider);
        var utcNow = timeProvider.GetUtcNow().UtcDateTime;
        var now = new DateTime(utcNow.Year, utcNow.Month, utcNow.Day, utcNow.Hour, utcNow.Minute, 0, DateTimeKind.Utc);
        var today = SalesRules.VietnamDate(now);
        var masterAt = SalesRules.StartOfDayUtc(today.AddDays(-MasterDataDaysAgo)).AddHours(1);

        var users = await db.Set<User>().AsNoTracking().Select(u => new { u.Username, u.Id, u.FullName }).ToListAsync(ct);
        SalesActor Actor(string? username)
        {
            if (username is null)
                return SalesActor.System;
            var user = users.FirstOrDefault(u => u.Username == username) ?? throw Invalid($"tài khoản '{username}' không có.");
            return new SalesActor(user.Id, user.FullName);
        }

        // Sản phẩm, combo, khuyến mãi, khối, đánh giá.
        var p = seed.Product ?? throw Invalid("thiếu product.");
        var product = Product.Create(p.Code, p.Name, p.ShortName, p.Volume, p.Unit, p.ShortDescription, p.ImageUrl);
        Add(product, masterAt);

        var combos = new Dictionary<string, Combo>();
        var comboSeeds = seed.Combos ?? [];
        for (var i = 0; i < comboSeeds.Count; i++)
        {
            var c = comboSeeds[i];
            var combo = Combo.Create(c.Code, product.Id, (i + 1) * SalesRules.SortOrderStep, isVisible: true);
            combo.Update(c.Name, c.Description, c.BottleCount, c.GiftText, c.PromoPrice, c.RegularPrice, c.FreeShipping, c.Badge, c.ImageUrl);
            combo.SetDefault(c.IsDefault);
            Add(combo, masterAt);
            combos[c.Code] = combo;
        }

        if (seed.Promotion is { } pr)
        {
            var promotion = Promotion.Create(pr.Name, SalesRules.StartOfDayUtc(today.AddDays(pr.StartDay)),
                SalesRules.StartOfDayUtc(today.AddDays(pr.EndDay + 1)).AddSeconds(-1), pr.AutoRenewDays);
            Add(promotion, masterAt);
        }

        var blockSeeds = seed.Blocks ?? [];
        for (var i = 0; i < blockSeeds.Count; i++)
        {
            var b = blockSeeds[i];
            var block = LandingBlock.Create(b.Type, (i + 1) * SalesRules.SortOrderStep);
            block.Update(b.Title, b.Subtitle, b.Body, b.ImageUrl, b.CtaText, (b.Items ?? []).Select(x => x.ToEntity()));
            Add(block, masterAt);
        }

        var reviewSeeds = seed.Reviews ?? [];
        for (var i = 0; i < reviewSeeds.Count; i++)
        {
            var r = reviewSeeds[i];
            var reviewedAt = SalesRules.StartOfDayUtc(today.AddDays(-r.DaysAgo)).AddHours(10);
            var review = Review.Create((i + 1) * SalesRules.SortOrderStep);
            review.Update(r.Name, r.Province, r.Rating, r.Content, r.AvatarUrl, r.PhotoUrl, reviewedAt, isSample: true);
            Add(review, reviewedAt);
        }

        await db.SaveChangesAsync(ct);

        // Đơn: mã theo (PlacedAt, chỉ số) trong mỗi ngày giờ Việt Nam (06 §5.4 quy tắc 7).
        var orderSeeds = (seed.Orders ?? []).Select(OrderSeed.Parse).ToList();
        var placed = orderSeeds.Select(o => (Seed: o, At: o.PlacedAt(today, now))).OrderBy(x => x.At).ThenBy(x => x.Seed.Index).ToList();
        var counters = new Dictionary<DateOnly, int>();
        var counts = (Orders: 0, Calls: 0, Events: 0, Shipments: 0);
        var lastAssigned = new Dictionary<Guid, DateTime>();
        foreach (var (o, at) in placed)
        {
            var day = SalesRules.VietnamDate(at);
            counters[day] = counters.GetValueOrDefault(day) + 1;
            var code = SalesSupportCode(day, counters[day]);
            var order = BuildOrder(o, at, code, combos, Actor, ref counts);
            if (order.AssigneeId is { } assigneeId && order.AssignedAt is { } assignedAt
                && (!lastAssigned.TryGetValue(assigneeId, out var prev) || assignedAt > prev))
                lastAssigned[assigneeId] = assignedAt;
        }

        foreach (var t in seed.Telesales ?? [])
        {
            var actor = Actor(t.Username);
            Add(TelesaleState.Create(actor.Id!.Value, t.IsReceiving, lastAssigned.TryGetValue(actor.Id.Value, out var la) ? la : null), masterAt);
        }

        await db.SaveChangesAsync(ct);
        db.ChangeTracker.Clear();

        // Lượt truy cập gộp theo giờ (06 §5.5): trùng khóa thì cộng dồn.
        var stats = new Dictionary<(DateTime, string, string), int>();
        var currentHour = VisitStat.HourOf(now);
        foreach (var v in seed.VisitStats ?? [])
        {
            var campaign = v.C ?? string.Empty;
            if (v.D is { } d && v.H is { } hours)
            {
                var dayStart = SalesRules.StartOfDayUtc(today.AddDays(d));
                for (var k = 0; k < hours.Count; k++)
                    if (hours[k] > 0)
                        Accumulate(stats, (dayStart.AddHours(k), v.S, campaign), hours[k]);
            }
            else if (v.R is { } recent)
            {
                for (var i = 0; i < recent.Count; i++)
                    if (recent[i] > 0)
                        Accumulate(stats, (currentHour.AddHours(-i), v.S, campaign), recent[i]);
            }
        }

        foreach (var ((hour, source, campaign), visits) in stats)
            Add(VisitStat.Create(hour, source, campaign, visits), hour);

        var costs = 0;
        foreach (var row in seed.AdCosts ?? [])
        {
            var a = row.EnumerateArray().ToArray();
            var date = today.AddDays(a[0].GetInt32());
            Add(AdCost.Create(date, a[1].GetString()!, a[2].ValueKind == JsonValueKind.String ? a[2].GetString() : null, a[3].GetDecimal()),
                SalesRules.StartOfDayUtc(date).AddHours(20));
            costs++;
        }

        await db.SaveChangesAsync(ct);
        db.ChangeTracker.Clear();

        logger.LogInformation(
            "Đã nạp dữ liệu mẫu Landing Page: {Combos} combo, {Blocks} khối, {Reviews} đánh giá, {Orders} đơn, {Calls} cuộc gọi, {Events} sự kiện, {Shipments} vận đơn, {Stats} dòng lượt truy cập, {Costs} dòng chi phí.",
            combos.Count, blockSeeds.Count, reviewSeeds.Count, counts.Orders, counts.Calls, counts.Events, counts.Shipments, stats.Count, costs);
    }

    public async Task ClearAsync(CancellationToken ct = default)
    {
        // Bảng con trước, bảng cha sau (06 §3: đặt lại xóa cứng toàn bộ Cms_*, Sales_*).
        await db.Set<ConversionEvent>().ExecuteDeleteAsync(ct);
        await db.Set<OrderEvent>().ExecuteDeleteAsync(ct);
        await db.Set<OrderCall>().ExecuteDeleteAsync(ct);
        await db.Set<Shipment>().ExecuteDeleteAsync(ct);
        await db.Set<Order>().ExecuteDeleteAsync(ct);
        await db.Set<Visit>().ExecuteDeleteAsync(ct);
        await db.Set<VisitStat>().ExecuteDeleteAsync(ct);
        await db.Set<TelesaleState>().ExecuteDeleteAsync(ct);
        await db.Set<AdCost>().ExecuteDeleteAsync(ct);
        await db.Set<Review>().ExecuteDeleteAsync(ct);
        await db.Set<LandingBlock>().ExecuteDeleteAsync(ct);
        await db.Set<Promotion>().ExecuteDeleteAsync(ct);
        await db.Set<Combo>().IgnoreQueryFilters().ExecuteDeleteAsync(ct);
        await db.Set<Product>().ExecuteDeleteAsync(ct);
    }

    /// <summary>Dựng một đơn theo 06 §5.4 quy tắc 1–8.</summary>
    private Order BuildOrder(OrderSeed o, DateTime placedAt, string code, Dictionary<string, Combo> combos, Func<string?, SalesActor> actorOf,
        ref (int Orders, int Calls, int Events, int Shipments) counts)
    {
        var combo = combos.GetValueOrDefault(o.Combo) ?? throw Invalid($"đơn {o.Index} trỏ tới combo '{o.Combo}' không có.");
        string source;
        string? medium = null, campaign = null, content = null, referrer = null;
        if (o.Utm is { Count: > 0 } u)
        {
            source = SourceNormalizer.NormalizeSource(u[0]);
            medium = u.Count > 1 ? SourceNormalizer.NormalizeUtm(u[1]) : null;
            campaign = u.Count > 2 ? SourceNormalizer.NormalizeUtm(u[2]) : null;
            content = u.Count > 3 ? SourceNormalizer.NormalizeUtm(u[3]) : null;
        }
        else if (SourceNormalizer.HostOf(o.Referrer) is { } host)
        {
            source = SourceNormalizer.SourceFromHost(host);
            referrer = o.Referrer;
        }
        else
            source = SalesRules.DirectSource;

        var device = o.Device switch { "B" => DeviceType.MayTinhBang, "M" => DeviceType.MayTinh, _ => DeviceType.DienThoai };
        var order = Order.Place(code, placedAt, o.Name, o.Phone, o.Province, o.Address, o.Note, combo, o.Quantity,
            o.RegularPrice ? PriceType.GiaThuong : PriceType.KhuyenMai, source, medium, campaign, content, referrer, device, null, null, null);

        var actor = actorOf(o.Assignee);
        order.AddEvent(OrderEventType.TaoDon, OrderEventTexts.Created(source, campaign), SalesActor.System, placedAt, null, OrderStatus.Moi);
        order.AddEvent(OrderEventType.TinNhan, OrderEventTexts.SmsSent, SalesActor.System, placedAt);
        foreach (var tag in o.Tags)
        {
            if (tag == "T")
            {
                order.MarkDuplicate();
                order.AddEvent(OrderEventType.Nhan, OrderEventTexts.TagDuplicate, SalesActor.System, placedAt);
            }
            else if (tag == "R")
            {
                order.MarkReturnRisk();
                order.AddEvent(OrderEventType.Nhan, OrderEventTexts.TagReturnRisk, SalesActor.System, placedAt);
            }
        }

        if (actor.Id is { } assigneeId)
        {
            order.AssignTo(assigneeId, actor.Name!, placedAt);
            order.AddEvent(OrderEventType.ChiaDon, OrderEventTexts.AssignedTo(actor.Name!), SalesActor.System, placedAt);
        }

        var callEntities = new List<OrderCall>();
        foreach (var call in o.Calls.OrderBy(c => c.Minute))
        {
            var at = placedAt.AddMinutes(call.Minute);
            var result = call.Code switch
            {
                "XN" => CallResult.XacNhan,
                "KNM" => CallResult.KhongNgheMay,
                "TB" => CallResult.ThueBao,
                "SS" => CallResult.SaiSo,
                "HGL" => CallResult.HenGoiLai,
                "KH" => CallResult.KhachHuy,
                _ => throw Invalid($"đơn {o.Index} có mã kết quả gọi '{call.Code}' không hợp lệ.")
            };
            DateTime? callbackAt = result == CallResult.HenGoiLai && call.Extra is { ValueKind: JsonValueKind.Number } m
                ? placedAt.AddMinutes(m.GetInt32())
                : null;
            CancelReason? reason = result == CallResult.KhachHuy && call.Extra is { ValueKind: JsonValueKind.String } r
                ? Enum.Parse<CancelReason>(r.GetString()!)
                : null;

            if (result == CallResult.XacNhan && o.Change is { } change)
            {
                var target = combos.GetValueOrDefault(change.Combo) ?? throw Invalid($"đơn {o.Index} đổi sang combo '{change.Combo}' không có.");
                if (order.ChangeItems(target, change.Quantity) is { } text)
                    order.AddEvent(OrderEventType.SuaDon, OrderEventTexts.Edited([text]), actor, at);
            }

            callEntities.Add(OrderCall.Create(order.Id, at, actor, result, callbackAt, reason, call.Note));
            var (from, to) = order.ApplyCall(result, at, actor, callbackAt, reason, call.Note);
            order.AddEvent(OrderEventType.CuocGoi,
                OrderEventTexts.Call(result, order.FailedCallCount, order.NextCallAt, reason, order.UpsellAmount, result == CallResult.KhachHuy ? call.Note : null),
                actor, at, from == to ? null : from, from == to ? null : to);
            if (result == CallResult.XacNhan)
                order.AddEvent(OrderEventType.TinNhan, OrderEventTexts.SmsConfirmed, SalesActor.System, at);
        }

        if (o.Cancel is { } x)
        {
            var at = placedAt.AddMinutes(x.Minute);
            var reason = Enum.Parse<CancelReason>(x.Reason);
            var from = order.Status;
            order.Cancel(reason, x.Note, at, actor);
            order.AddEvent(OrderEventType.DoiTrangThai, OrderEventTexts.Cancelled(reason, x.Note), actor, at, from, OrderStatus.DaHuy);
        }

        Shipment? shipment = null;
        if (o.Ship is { } sh)
        {
            var at = placedAt.AddMinutes(sh.Minute);
            var carrier = Enum.Parse<Carrier>(sh.Carrier);
            var tracking = carrier + code[^10..];
            shipment = Shipment.Create(order.Id, carrier, tracking, order.Total, at, actor);
            var from = order.Status;
            order.MarkShipped();
            order.AddEvent(OrderEventType.BanGiao, OrderEventTexts.HandedOver(carrier, tracking, order.Total), actor, at, from, OrderStatus.DangGiao);
        }

        if (o.Delivered is { } dl && shipment is not null)
        {
            var at = placedAt.AddMinutes(dl);
            shipment.MarkDelivered(at);
            order.MarkDelivered();
            order.AddEvent(OrderEventType.DoiTrangThai, OrderEventTexts.Delivered, actor, at, OrderStatus.DangGiao, OrderStatus.DaGiao);
        }

        if (o.Return is { } rt && shipment is not null)
        {
            var at = placedAt.AddMinutes(rt.Minute);
            var reason = Enum.Parse<ReturnReason>(rt.Reason);
            shipment.MarkReturned(at);
            order.MarkReturned(reason, rt.Note);
            order.AddEvent(OrderEventType.DoiTrangThai, OrderEventTexts.Returned(reason, rt.Note), actor, at, OrderStatus.DangGiao, OrderStatus.HoanHang);
        }

        Add(order, placedAt);
        foreach (var call in callEntities)
            Add(call, call.CalledAt);
        foreach (var ev in order.Events)
            db.Entry(ev).Property(nameof(BaseEntity.CreatedAt)).CurrentValue = ev.OccurredAt;
        if (shipment is not null)
            Add(shipment, shipment.HandedOverAt);

        counts = (counts.Orders + 1, counts.Calls + callEntities.Count, counts.Events + order.Events.Count, counts.Shipments + (shipment is null ? 0 : 1));
        return order;
    }

    private static string SalesSupportCode(DateOnly day, int seq) =>
        Implementations.Services.Sales.SalesSupport.OrderCodePrefix(day) + seq.ToString("D4", System.Globalization.CultureInfo.InvariantCulture);

    private static void Accumulate(Dictionary<(DateTime, string, string), int> stats, (DateTime, string, string) key, int visits) =>
        stats[key] = stats.GetValueOrDefault(key) + visits;

    /// <summary>Thêm entity, gán sẵn CreatedAt lùi ngày (interceptor giữ nguyên).</summary>
    private void Add(BaseEntity entity, DateTime createdAt)
    {
        db.Add(entity);
        db.Entry(entity).Property(nameof(BaseEntity.CreatedAt)).CurrentValue = createdAt;
    }

    private static InvalidOperationException Invalid(string message) => new($"File seed '{SeedFileName}' không hợp lệ: {message}");
}
