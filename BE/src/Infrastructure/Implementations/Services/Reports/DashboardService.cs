using Application.Common.Time;
using Application.DTOs.Reports;
using Application.Interfaces.Repositories;
using Application.Interfaces.Services.Common;
using Application.Interfaces.Services.Reports;
using Domain.Entities.Sales;
using Domain.Entities.Sales.Orders;
using Domain.Entities.Sales.Telesales;
using Domain.Entities.Sales.Tracking;
using Domain.Enums.Sales.Orders;
using Infrastructure.Implementations.Services.Sales;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Implementations.Services.Reports;

/// <summary>
/// Tổng quan (07 §2.6, §3.11, FR-01…FR-03). Quản lý: hôm nay 00:00 giờ Việt Nam tới <c>now</c>, so với hôm qua cùng khung giờ
/// (07 §5 quyết định 19). Telesale: việc của người đang đăng nhập.
/// </summary>
public sealed class DashboardService(
    IGenericRepository<Order> orders,
    IGenericRepository<VisitStat> visitStats,
    IGenericRepository<TelesaleState> telesaleStates,
    ICurrentUserService currentUser,
    TimeProvider time) : IDashboardService
{
    private const int TrendDays = 14;

    public async Task<ManagerDashboard> GetManagerAsync(CancellationToken ct = default)
    {
        var now = time.GetUtcNow().UtcDateTime;
        var today = SalesRules.VietnamDate(now);
        var start = SalesRules.StartOfDayUtc(today);
        var prevStart = start.AddDays(-1);
        var prevEnd = now.AddDays(-1);
        var trendStart = SalesRules.StartOfDayUtc(today.AddDays(-(TrendDays - 1)));

        var visitsToday = await visitStats.QueryNoTracking().Where(s => s.HourStart >= start && s.HourStart <= now).SumAsync(s => s.Visits, ct);
        var visitsPrev = await visitStats.QueryNoTracking().Where(s => s.HourStart >= prevStart && s.HourStart <= prevEnd).SumAsync(s => s.Visits, ct);

        var list = await orders.QueryNoTracking()
            .Where(o => o.PlacedAt >= trendStart || o.ConfirmedAt >= prevStart)
            .ToListAsync(ct);
        var counted = list.Where(o => o.IsCounted).ToList();
        var todayOrders = counted.Where(o => o.PlacedAt >= start && o.PlacedAt <= now).ToList();
        var prevOrders = counted.Where(o => o.PlacedAt >= prevStart && o.PlacedAt <= prevEnd).ToList();

        var confirmedToday = todayOrders.Count(o => o.IsConfirmedStatus);
        var confirmedPrev = prevOrders.Count(o => o.IsConfirmedStatus);
        var valueToday = list.Where(o => o.IsConfirmedStatus && o.ConfirmedAt >= start && o.ConfirmedAt <= now).Sum(o => o.Total);
        var valuePrev = list.Where(o => o.IsConfirmedStatus && o.ConfirmedAt >= prevStart && o.ConfirmedAt <= prevEnd).Sum(o => o.Total);

        var pendingCalls = await orders.QueryNoTracking().CountAsync(o => o.Status == OrderStatus.Moi || o.Status == OrderStatus.ChoGoiLai, ct);
        var dueCallbacks = await orders.QueryNoTracking().CountAsync(o => o.Status == OrderStatus.ChoGoiLai && o.NextCallAt <= now, ct);

        var trend = Enumerable.Range(0, TrendDays).Select(i =>
        {
            var day = today.AddDays(i - (TrendDays - 1));
            var dayStart = SalesRules.StartOfDayUtc(day);
            var dayEnd = SalesRules.StartOfDayUtc(day.AddDays(1));
            var dayOrders = counted.Where(o => o.PlacedAt >= dayStart && o.PlacedAt < dayEnd).ToList();
            var confirmed = dayOrders.Count(o => o.IsConfirmedStatus);
            return new TrendDay
            {
                Date = VietnamDates.Format(day),
                Orders = dayOrders.Count,
                Confirmed = confirmed,
                ConfirmRate = SalesSupport.Percent(confirmed, dayOrders.Count, 1)
            };
        }).ToList();

        return new ManagerDashboard
        {
            Date = VietnamDates.Format(today),
            AsOf = now,
            Visits = Compare(visitsToday, visitsPrev),
            Orders = Compare(todayOrders.Count, prevOrders.Count),
            ConversionRate = CompareRate(SalesSupport.Percent(todayOrders.Count, visitsToday, 2), SalesSupport.Percent(prevOrders.Count, visitsPrev, 2), 2),
            PendingCalls = pendingCalls,
            DueCallbacks = dueCallbacks,
            ConfirmRate = CompareRate(SalesSupport.Percent(confirmedToday, todayOrders.Count, 1), SalesSupport.Percent(confirmedPrev, prevOrders.Count, 1), 1),
            ConfirmedValue = Compare(valueToday, valuePrev),
            OrdersByHour = Enumerable.Range(0, 24)
                .Select(h => new HourOrders { Hour = h, Orders = todayOrders.Count(o => SalesRules.ToVietnam(o.PlacedAt).Hour == h) })
                .ToList(),
            Trend14Days = trend,
            ComboShare = todayOrders.GroupBy(o => o.ComboId)
                .Select(g => new ComboShare
                {
                    ComboId = g.Key,
                    ComboName = g.OrderByDescending(o => o.PlacedAt).First().ComboName,
                    Orders = g.Count(),
                    Share = SalesSupport.Percent(g.Count(), todayOrders.Count, 1) ?? 0
                })
                .OrderByDescending(x => x.Orders).ThenBy(x => x.ComboName).ToList(),
            SourceShare = todayOrders.GroupBy(o => o.Source)
                .Select(g => new SourceShare { Source = g.Key, Orders = g.Count(), Share = SalesSupport.Percent(g.Count(), todayOrders.Count, 1) ?? 0 })
                .OrderByDescending(x => x.Orders).ThenBy(x => x.Source).ToList()
        };
    }

    public async Task<TelesaleDashboard> GetTelesaleAsync(CancellationToken ct = default)
    {
        var userId = currentUser.UserId ?? throw new UnauthorizedAccessException("Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn.");
        var now = time.GetUtcNow().UtcDateTime;
        var today = SalesRules.VietnamDate(now);
        var start = SalesRules.StartOfDayUtc(today);

        var mine = await orders.QueryNoTracking()
            .Where(o => (o.AssigneeId == userId && (o.Status == OrderStatus.Moi || o.Status == OrderStatus.ChoGoiLai))
                || (o.ConfirmedById == userId && o.ConfirmedAt >= start))
            .Select(o => new { o.AssigneeId, o.Status, o.NextCallAt, o.ConfirmedById, o.ConfirmedAt, o.UpsellAmount })
            .ToListAsync(ct);
        var unassigned = await orders.QueryNoTracking().CountAsync(o => o.Status == OrderStatus.Moi && o.AssigneeId == null, ct);
        var receiving = await telesaleStates.QueryNoTracking().Where(s => s.UserId == userId).Select(s => s.IsReceiving).FirstOrDefaultAsync(ct);

        var confirmed = mine.Where(o => o.ConfirmedById == userId && o.ConfirmedAt >= start && o.ConfirmedAt <= now
            && Order.ConfirmedStatuses.Contains(o.Status)).ToList();
        var upsell = confirmed.Where(o => o.UpsellAmount > 0).ToList();
        return new TelesaleDashboard
        {
            Date = VietnamDates.Format(today),
            AsOf = now,
            IsReceiving = receiving,
            MyNew = mine.Count(o => o.AssigneeId == userId && o.Status == OrderStatus.Moi),
            UnassignedNew = unassigned,
            MyDueCallbacks = mine.Count(o => o.AssigneeId == userId && o.Status == OrderStatus.ChoGoiLai && o.NextCallAt <= now),
            MyLaterCallbacks = mine.Count(o => o.AssigneeId == userId && o.Status == OrderStatus.ChoGoiLai && !(o.NextCallAt <= now)),
            MyConfirmedToday = confirmed.Count,
            MyUpsellCountToday = upsell.Count,
            MyUpsellValueToday = upsell.Sum(o => o.UpsellAmount)
        };
    }

    /// <summary>Số lượng, tiền: % thay đổi 1 chữ số, null khi kỳ trước = 0.</summary>
    private static MetricCompare Compare(decimal value, decimal previous) => new()
    {
        Value = value,
        Previous = previous,
        Change = previous == 0 ? null : Math.Round((value - previous) / previous * 100m, 1, MidpointRounding.AwayFromZero)
    };

    /// <summary>Tỉ lệ: chênh lệch điểm phần trăm, null khi một bên null.</summary>
    private static MetricCompare CompareRate(decimal? value, decimal? previous, int digits) => new()
    {
        Value = value,
        Previous = previous,
        Change = value is null || previous is null ? null : Math.Round(value.Value - previous.Value, digits, MidpointRounding.AwayFromZero)
    };
}
