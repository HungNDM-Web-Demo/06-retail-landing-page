using Application.Common.Time;
using Application.DTOs.Reports;
using Application.Interfaces.Repositories;
using Application.Interfaces.Services.Reports;
using Domain.Entities.Cms.Catalog;
using Domain.Entities.Sales;
using Domain.Entities.Sales.Marketing;
using Domain.Entities.Sales.Orders;
using Domain.Entities.Sales.Tracking;
using Domain.Entities.System.Users;
using Domain.Enums.Sales.Orders;
using Infrastructure.Implementations.Services.Sales;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Implementations.Services.Reports;

/// <summary>
/// Báo cáo (07 §2.7, §3.11, BR-08, BR-14, BR-19, BR-22). "Đơn tính" = không hủy lý do Đơn trùng; đơn, xác nhận, giao, hoàn theo
/// nhóm đơn đặt trong kỳ; doanh thu đã giao (Σ tiền hàng, không gồm phí ship) theo ngày giao; chi phí theo ngày. Đọc dữ liệu trong
/// khoảng ngày (≤ 366 ngày) rồi tổng hợp trong bộ nhớ, cùng một cách cho mọi provider.
/// </summary>
public sealed class SalesReportService(
    IGenericRepository<Order> orders,
    IGenericRepository<OrderCall> calls,
    IGenericRepository<VisitStat> visitStats,
    IGenericRepository<AdCost> adCosts,
    IGenericRepository<Combo> combos,
    IGenericRepository<User> users,
    TimeProvider time) : ISalesReportService
{
    private sealed record OrderRow(Guid Id, string Source, string Campaign, Guid ComboId, string ComboName, int Bottles, decimal Total,
        decimal Subtotal, OrderStatus Status, CancelReason? CancelReason, Guid? AssigneeId, Guid? ConfirmedById, decimal Upsell)
    {
        public bool IsCounted => !(Status == OrderStatus.DaHuy && CancelReason == Domain.Enums.Sales.Orders.CancelReason.DonTrung);

        public bool IsConfirmed => Status is OrderStatus.DaXacNhan or OrderStatus.DangGiao or OrderStatus.DaGiao or OrderStatus.HoanHang;
    }

    private DateOnly Today => SalesRules.VietnamDate(time.GetUtcNow().UtcDateTime);

    public async Task<SourceReport> GetSourcesAsync(SourceReportQuery query, CancellationToken ct = default)
    {
        var (from, to) = SalesSupport.ParseRange(query.From, query.To, Today);
        var start = SalesRules.StartOfDayUtc(from);
        var end = SalesRules.StartOfDayUtc(to.AddDays(1));
        var sourceFilter = string.IsNullOrWhiteSpace(query.Source) ? null : query.Source.Trim().ToLowerInvariant();
        var campaignFilter = query.Campaign?.Trim();

        var visits = await visitStats.QueryNoTracking().Where(s => s.HourStart >= start && s.HourStart < end)
            .GroupBy(s => new { s.Source, s.Campaign })
            .Select(g => new { g.Key.Source, g.Key.Campaign, Visits = g.Sum(s => s.Visits) })
            .ToListAsync(ct);
        var placed = (await PlacedAsync(start, end, ct)).Where(o => o.IsCounted).ToList();
        var delivered = await DeliveredAsync(start, end, ct);
        var costs = await adCosts.QueryNoTracking().Where(c => c.Date >= from && c.Date <= to)
            .Select(c => new { c.Source, c.Campaign, c.Amount }).ToListAsync(ct);

        bool Keep(string source, string campaign) =>
            (sourceFilter is null || source == sourceFilter) && (campaignFilter is null || campaign == campaignFilter);

        var sources = visits.Select(v => v.Source).Concat(placed.Select(o => o.Source)).Concat(costs.Select(c => c.Source))
            .Distinct().Where(s => sourceFilter is null || s == sourceFilter).ToList();

        var rows = new List<SourceReportRow>();
        foreach (var source in sources)
        {
            var campaigns = visits.Where(v => v.Source == source).Select(v => v.Campaign)
                .Concat(placed.Where(o => o.Source == source).Select(o => o.Campaign))
                .Concat(costs.Where(c => c.Source == source && c.Campaign != string.Empty).Select(c => c.Campaign))
                .Distinct()
                .Where(c => Keep(source, c))
                .ToList();
            if (campaignFilter is not null && campaigns.Count == 0)
                continue;

            var campaignRows = campaigns.Select(c => Metrics(
                    visits.Where(v => v.Source == source && v.Campaign == c).Sum(v => v.Visits),
                    placed.Where(o => o.Source == source && o.Campaign == c).ToList(),
                    delivered.Where(o => o.Source == source && o.Campaign == c).Sum(o => o.Subtotal),
                    costs.Where(x => x.Source == source && x.Campaign == c && c != string.Empty).Sum(x => x.Amount),
                    new CampaignReportRow { Campaign = c }))
                .OrderByDescending(r => r.Orders).ThenByDescending(r => r.Visits).ThenBy(r => r.Campaign, StringComparer.Ordinal)
                .ToList();

            var sourceVisits = visits.Where(v => v.Source == source && Keep(source, v.Campaign)).Sum(v => v.Visits);
            var sourceOrders = placed.Where(o => o.Source == source && Keep(source, o.Campaign)).ToList();
            var sourceRevenue = delivered.Where(o => o.Source == source && Keep(source, o.Campaign)).Sum(o => o.Subtotal);
            var sourceCost = costs.Where(c => c.Source == source && (campaignFilter is null || c.Campaign == campaignFilter)).Sum(c => c.Amount);
            var row = Metrics(sourceVisits, sourceOrders, sourceRevenue, sourceCost, new SourceReportRow { Source = source, Campaigns = campaignRows });
            rows.Add(row);
        }

        rows = rows.OrderByDescending(r => r.Orders).ThenByDescending(r => r.Visits).ThenBy(r => r.Source, StringComparer.Ordinal).ToList();
        var totals = Totals(rows);
        return new SourceReport { From = VietnamDates.Format(from), To = VietnamDates.Format(to), Rows = rows, Totals = totals };
    }

    public async Task<ComboReport> GetCombosAsync(ComboReportQuery query, CancellationToken ct = default)
    {
        var (from, to) = SalesSupport.ParseRange(query.From, query.To, Today);
        var start = SalesRules.StartOfDayUtc(from);
        var end = SalesRules.StartOfDayUtc(to.AddDays(1));
        var source = string.IsNullOrWhiteSpace(query.Source) ? null : query.Source.Trim().ToLowerInvariant();

        var placed = (await PlacedAsync(start, end, ct)).Where(o => o.IsCounted && (source is null || o.Source == source)).ToList();
        var delivered = (await DeliveredAsync(start, end, ct)).Where(o => source is null || o.Source == source).ToList();
        var comboList = await combos.QueryNoTracking().IgnoreQueryFilters()
            .Select(c => new { c.Id, c.Code, c.Name, c.SortOrder, c.IsDeleted }).ToListAsync(ct);

        var ids = comboList.Where(c => !c.IsDeleted).Select(c => c.Id)
            .Concat(placed.Select(o => o.ComboId)).Concat(delivered.Select(o => o.ComboId)).Distinct();
        var total = placed.Count;
        var rows = ids.Select(id =>
        {
            var combo = comboList.FirstOrDefault(c => c.Id == id);
            var group = placed.Where(o => o.ComboId == id).ToList();
            var confirmed = group.Where(o => o.IsConfirmed).ToList();
            return new
            {
                Sort = combo?.SortOrder ?? int.MaxValue,
                Row = new ComboReportRow
                {
                    ComboId = id,
                    ComboCode = combo?.Code ?? string.Empty,
                    ComboName = combo?.Name ?? group.FirstOrDefault()?.ComboName ?? string.Empty,
                    Orders = group.Count,
                    Share = SalesSupport.Percent(group.Count, total, 1) ?? 0,
                    Bottles = confirmed.Sum(o => o.Bottles),
                    Confirmed = confirmed.Count,
                    DeliveredRevenue = delivered.Where(o => o.ComboId == id).Sum(o => o.Subtotal),
                    AverageOrderValue = confirmed.Count == 0 ? null : Math.Round(confirmed.Sum(o => o.Total) / confirmed.Count, 0, MidpointRounding.AwayFromZero)
                }
            };
        }).OrderBy(x => x.Sort).ThenBy(x => x.Row.ComboCode, StringComparer.Ordinal).Select(x => x.Row).ToList();

        return new ComboReport { From = VietnamDates.Format(from), To = VietnamDates.Format(to), Source = source, Rows = rows, TotalOrders = total };
    }

    public async Task<TelesaleReport> GetTelesalesAsync(DateRangeQuery query, CancellationToken ct = default)
    {
        var (from, to) = SalesSupport.ParseRange(query.From, query.To, Today);
        var start = SalesRules.StartOfDayUtc(from);
        var end = SalesRules.StartOfDayUtc(to.AddDays(1));

        var placed = (await PlacedAsync(start, end, ct)).Where(o => o.IsCounted).ToList();
        var countedIds = placed.Select(o => o.Id).ToHashSet();
        var callPairs = (await calls.QueryNoTracking()
                .Join(orders.QueryNoTracking().Where(o => o.PlacedAt >= start && o.PlacedAt < end), c => c.OrderId, o => o.Id, (c, o) => new { c.CallerId, c.OrderId })
                .Where(x => x.CallerId != null)
                .Distinct()
                .ToListAsync(ct))
            .Where(x => countedIds.Contains(x.OrderId))
            .ToList();

        var staff = await SalesSupport.ActiveStaff(users).Select(u => new { u.Id, u.FullName }).ToListAsync(ct);
        var people = staff.Select(s => s.Id)
            .Concat(placed.Where(o => o.AssigneeId != null).Select(o => o.AssigneeId!.Value))
            .Concat(placed.Where(o => o.ConfirmedById != null && o.IsConfirmed).Select(o => o.ConfirmedById!.Value))
            .Concat(callPairs.Select(c => c.CallerId!.Value))
            .Distinct().ToList();
        var names = await users.QueryNoTracking().IgnoreQueryFilters().Where(u => people.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.FullName, ct);

        var rows = people.Select(id =>
        {
            var assigned = placed.Count(o => o.AssigneeId == id);
            var confirmed = placed.Where(o => o.ConfirmedById == id && o.IsConfirmed).ToList();
            var upsell = confirmed.Where(o => o.Upsell > 0).ToList();
            var delivered = confirmed.Count(o => o.Status == OrderStatus.DaGiao);
            var returned = confirmed.Count(o => o.Status == OrderStatus.HoanHang);
            return new TelesaleReportRow
            {
                UserId = id,
                FullName = names.GetValueOrDefault(id) ?? string.Empty,
                Assigned = assigned,
                Called = callPairs.Count(c => c.CallerId == id),
                Confirmed = confirmed.Count,
                ConfirmRate = SalesSupport.Percent(confirmed.Count, assigned, 1),
                UpsellCount = upsell.Count,
                UpsellValue = upsell.Sum(o => o.Upsell),
                Delivered = delivered,
                Returned = returned,
                ReturnRate = SalesSupport.Percent(returned, delivered + returned, 1)
            };
        }).OrderByDescending(r => r.Assigned).ThenBy(r => r.FullName, StringComparer.Ordinal).ToList();

        return new TelesaleReport { From = VietnamDates.Format(from), To = VietnamDates.Format(to), Rows = rows };
    }

    public async Task<DailyReport> GetDailyAsync(DateRangeQuery query, CancellationToken ct = default)
    {
        var (from, to) = SalesSupport.ParseRange(query.From, query.To, Today);
        var length = to.DayNumber - from.DayNumber + 1;
        var prevTo = from.AddDays(-1);
        var prevFrom = prevTo.AddDays(-(length - 1));
        var windowStart = SalesRules.StartOfDayUtc(prevFrom);
        var windowEnd = SalesRules.StartOfDayUtc(to.AddDays(1));

        var list = await orders.QueryNoTracking()
            .Where(o => (o.PlacedAt >= windowStart && o.PlacedAt < windowEnd)
                || (o.ConfirmedAt >= windowStart && o.ConfirmedAt < windowEnd)
                || (o.CancelledAt >= windowStart && o.CancelledAt < windowEnd)
                || (o.Shipment != null && ((o.Shipment.DeliveredAt >= windowStart && o.Shipment.DeliveredAt < windowEnd)
                    || (o.Shipment.ReturnedAt >= windowStart && o.Shipment.ReturnedAt < windowEnd))))
            .Select(o => new
            {
                o.PlacedAt, o.ConfirmedAt, o.CancelledAt, o.Status, o.CancelReason, o.ReturnReason, o.Subtotal,
                DeliveredAt = o.Shipment != null ? o.Shipment.DeliveredAt : null,
                ReturnedAt = o.Shipment != null ? o.Shipment.ReturnedAt : null
            })
            .ToListAsync(ct);

        DailyTotals Totals(DateTime s, DateTime e)
        {
            var placed = list.Count(o => o.PlacedAt >= s && o.PlacedAt < e && !(o.Status == OrderStatus.DaHuy && o.CancelReason == CancelReason.DonTrung));
            var cancelled = list.Count(o => o.Status == OrderStatus.DaHuy && o.CancelReason != CancelReason.DonTrung && o.CancelledAt >= s && o.CancelledAt < e);
            var deliveredRows = list.Where(o => o.Status == OrderStatus.DaGiao && o.DeliveredAt >= s && o.DeliveredAt < e).ToList();
            return new DailyRow
            {
                Orders = placed,
                Confirmed = list.Count(o => Order.ConfirmedStatuses.Contains(o.Status) && o.ConfirmedAt >= s && o.ConfirmedAt < e),
                Cancelled = cancelled,
                Returned = list.Count(o => o.Status == OrderStatus.HoanHang && o.ReturnedAt >= s && o.ReturnedAt < e),
                Delivered = deliveredRows.Count,
                DeliveredRevenue = deliveredRows.Sum(o => o.Subtotal),
                CancelRate = SalesSupport.Percent(cancelled, placed, 1)
            };
        }

        var start = SalesRules.StartOfDayUtc(from);
        var days = Enumerable.Range(0, length).Select(i =>
        {
            var day = from.AddDays(i);
            var t = Totals(SalesRules.StartOfDayUtc(day), SalesRules.StartOfDayUtc(day.AddDays(1)));
            return new DailyRow
            {
                Date = VietnamDates.Format(day), Orders = t.Orders, Confirmed = t.Confirmed, Cancelled = t.Cancelled, Returned = t.Returned,
                Delivered = t.Delivered, DeliveredRevenue = t.DeliveredRevenue, CancelRate = t.CancelRate
            };
        }).ToList();
        var totals = Totals(start, windowEnd);
        var prev = Totals(windowStart, start);

        var inRangeCancelled = list.Where(o => o.Status == OrderStatus.DaHuy && o.CancelledAt >= start && o.CancelledAt < windowEnd).ToList();
        return new DailyReport
        {
            From = VietnamDates.Format(from),
            To = VietnamDates.Format(to),
            Totals = new DailyTotals
            {
                Orders = totals.Orders, Confirmed = totals.Confirmed, Cancelled = totals.Cancelled, Returned = totals.Returned,
                Delivered = totals.Delivered, DeliveredRevenue = totals.DeliveredRevenue, CancelRate = totals.CancelRate
            },
            Previous = new DailyPeriodTotals
            {
                From = VietnamDates.Format(prevFrom), To = VietnamDates.Format(prevTo),
                Orders = prev.Orders, Confirmed = prev.Confirmed, Cancelled = prev.Cancelled, Returned = prev.Returned,
                Delivered = prev.Delivered, DeliveredRevenue = prev.DeliveredRevenue, CancelRate = prev.CancelRate
            },
            Days = days,
            CancelReasons = inRangeCancelled.Where(o => o.CancelReason is { } r && r != CancelReason.DonTrung)
                .GroupBy(o => o.CancelReason!.Value)
                .Select(g => new CancelReasonCount { Reason = g.Key, Count = g.Count() })
                .OrderByDescending(x => x.Count).ThenBy(x => x.Reason).ToList(),
            DuplicateCancelled = inRangeCancelled.Count(o => o.CancelReason == CancelReason.DonTrung),
            ReturnReasons = list.Where(o => o.Status == OrderStatus.HoanHang && o.ReturnReason != null && o.ReturnedAt >= start && o.ReturnedAt < windowEnd)
                .GroupBy(o => o.ReturnReason!.Value)
                .Select(g => new ReturnReasonCount { Reason = g.Key, Count = g.Count() })
                .OrderByDescending(x => x.Count).ThenBy(x => x.Reason).ToList()
        };
    }

    private async Task<List<OrderRow>> PlacedAsync(DateTime start, DateTime end, CancellationToken ct) =>
        (await orders.QueryNoTracking().Where(o => o.PlacedAt >= start && o.PlacedAt < end)
            .Select(o => new
            {
                o.Id, o.Source, o.Campaign, o.ComboId, o.ComboName, o.BottleCount, o.Quantity, o.Total, o.Subtotal, o.Status, o.CancelReason,
                o.AssigneeId, o.ConfirmedById, o.UpsellAmount
            })
            .ToListAsync(ct))
        .Select(o => new OrderRow(o.Id, o.Source, o.Campaign ?? string.Empty, o.ComboId, o.ComboName, o.BottleCount * o.Quantity, o.Total,
            o.Subtotal, o.Status, o.CancelReason, o.AssigneeId, o.ConfirmedById, o.UpsellAmount))
        .ToList();

    /// <summary>Đơn Đã giao có ngày giao trong kỳ (doanh thu theo <c>DeliveredAt</c>, BR-19).</summary>
    private async Task<List<OrderRow>> DeliveredAsync(DateTime start, DateTime end, CancellationToken ct) =>
        (await orders.QueryNoTracking()
            .Where(o => o.Status == OrderStatus.DaGiao && o.Shipment != null && o.Shipment.DeliveredAt >= start && o.Shipment.DeliveredAt < end)
            .Select(o => new { o.Id, o.Source, o.Campaign, o.ComboId, o.ComboName, o.BottleCount, o.Quantity, o.Total, o.Subtotal, o.Status, o.CancelReason, o.AssigneeId, o.ConfirmedById, o.UpsellAmount })
            .ToListAsync(ct))
        .Select(o => new OrderRow(o.Id, o.Source, o.Campaign ?? string.Empty, o.ComboId, o.ComboName, o.BottleCount * o.Quantity, o.Total,
            o.Subtotal, o.Status, o.CancelReason, o.AssigneeId, o.ConfirmedById, o.UpsellAmount))
        .ToList();

    private static T Metrics<T>(int visits, List<OrderRow> placed, decimal revenue, decimal cost, T row)
        where T : SourceMetrics
    {
        var confirmed = placed.Count(o => o.IsConfirmed);
        var delivered = placed.Count(o => o.Status == OrderStatus.DaGiao);
        var returned = placed.Count(o => o.Status == OrderStatus.HoanHang);
        Fill(row, visits, placed.Count, confirmed, delivered, returned, revenue, cost);
        return row;
    }

    private static SourceMetrics Totals(IReadOnlyList<SourceReportRow> rows)
    {
        var totals = new SourceMetrics();
        Fill(totals, rows.Sum(r => r.Visits), rows.Sum(r => r.Orders), rows.Sum(r => r.Confirmed), rows.Sum(r => r.Delivered),
            rows.Sum(r => r.Returned), rows.Sum(r => r.DeliveredRevenue), rows.Sum(r => r.AdCost));
        return totals;
    }

    /// <summary>Điền chỉ số và tỉ lệ (07 §3.11, BR-08, BR-19, BR-22).</summary>
    private static void Fill(SourceMetrics m, int visits, int orderCount, int confirmed, int delivered, int returned, decimal revenue, decimal cost)
    {
        m.Visits = visits;
        m.Orders = orderCount;
        m.ConversionRate = SalesSupport.Percent(orderCount, visits, 2);
        m.Confirmed = confirmed;
        m.ConfirmRate = SalesSupport.Percent(confirmed, orderCount, 1);
        m.Delivered = delivered;
        m.Returned = returned;
        m.ReturnRate = SalesSupport.Percent(returned, delivered + returned, 1);
        m.DeliveredRevenue = revenue;
        m.AdCost = cost;
        m.CostPerConfirmed = cost == 0 || confirmed == 0
            ? null
            : Math.Round(cost / confirmed / SalesRules.PriceStep, 0, MidpointRounding.AwayFromZero) * SalesRules.PriceStep;
        m.Roas = cost == 0 ? null : Math.Round(revenue / cost, 2, MidpointRounding.AwayFromZero);
    }
}
