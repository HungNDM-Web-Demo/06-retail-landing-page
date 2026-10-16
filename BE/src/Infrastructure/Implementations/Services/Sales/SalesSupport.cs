using Application.Common.Time;
using Application.Constants;
using Application.Interfaces.Repositories;
using Application.Interfaces.Services.Common;
using Domain.Entities.Sales;
using Domain.Entities.Sales.Orders;
using Domain.Entities.System.Users;
using Domain.Enums.Sales.Orders;
using FluentValidation;
using FluentValidation.Results;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Implementations.Services.Sales;

/// <summary>Phần dùng chung của các service bán hàng: người thao tác, nhãn Trùng (07 §3.10), mã đơn (§3.4), khoảng ngày báo cáo.</summary>
internal static class SalesSupport
{
    /// <summary>Người đang đăng nhập (Id + họ tên chụp vào bản ghi).</summary>
    public static async Task<SalesActor> ActorAsync(ICurrentUserService currentUser, IGenericRepository<User> users, CancellationToken ct)
    {
        var userId = currentUser.UserId ?? throw new UnauthorizedAccessException("Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn.");
        var name = await users.QueryNoTracking().Where(u => u.Id == userId).Select(u => u.FullName).FirstOrDefaultAsync(ct);
        return new SalesActor(userId, name ?? currentUser.Username ?? "Người dùng");
    }

    /// <summary>Tài khoản vai trò STAFF đang hoạt động (07 §5 quyết định 20).</summary>
    public static IQueryable<User> ActiveStaff(IGenericRepository<User> users) =>
        users.QueryNoTracking().Where(u => u.IsActive && u.UserRoles.Any(r => r.Role.Code == RoleCodes.Staff));

    /// <summary>
    /// Khi tạo đơn <paramref name="order"/> (07 §3.10): đơn cùng số, khác Đã hủy, đặt cách nhau ≤ 24 giờ → cả hai gắn nhãn Trùng;
    /// khách có ≥ 2 đơn Hoàn hàng → gắn Rủi ro hoàn. <paramref name="samePhone"/> là các đơn khác cùng số (đang theo dõi).
    /// </summary>
    public static void TagOnCreate(Order order, IReadOnlyList<Order> samePhone, DateTime now)
    {
        var window = TimeSpan.FromHours(SalesRules.DuplicateWindowHours);
        var others = samePhone
            .Where(o => o.Id != order.Id && o.Status != OrderStatus.DaHuy && (o.PlacedAt - order.PlacedAt).Duration() <= window)
            .ToList();
        if (others.Count > 0)
        {
            order.MarkDuplicate();
            order.AddEvent(OrderEventType.Nhan, OrderEventTexts.TagDuplicate, SalesActor.System, now);
            foreach (var other in others)
            {
                var wasTagged = other.IsDuplicate;
                other.MarkDuplicate();
                if (!wasTagged)
                {
                    other.AddEvent(OrderEventType.Nhan, OrderEventTexts.TagDuplicate, SalesActor.System, now);
                    other.Touch();
                }
            }
        }

        if (samePhone.Count(o => o.Id != order.Id && o.Status == OrderStatus.HoanHang) >= SalesRules.ReturnRiskThreshold)
        {
            order.MarkReturnRisk();
            order.AddEvent(OrderEventType.Nhan, OrderEventTexts.TagReturnRisk, SalesActor.System, now);
        }
    }

    /// <summary>
    /// Sau khi một đơn cùng số chuyển Đã hủy (mọi lý do, 07 §3.10, §5 quyết định 15): đơn còn nhãn Trùng mà không còn đơn nào
    /// cùng số khác Đã hủy trong 24 giờ thì bỏ nhãn. Đơn đã hủy giữ nhãn của nó.
    /// </summary>
    public static void RecomputeDuplicates(IReadOnlyList<Order> samePhone, DateTime now)
    {
        var window = TimeSpan.FromHours(SalesRules.DuplicateWindowHours);
        foreach (var order in samePhone.Where(o => o.Status != OrderStatus.DaHuy && o.IsDuplicate).ToList())
        {
            var keep = samePhone.Any(o => o.Id != order.Id && o.Status != OrderStatus.DaHuy && (o.PlacedAt - order.PlacedAt).Duration() <= window);
            if (keep)
                continue;

            order.ClearDuplicate(byUser: false);
            order.AddEvent(OrderEventType.Nhan, OrderEventTexts.UntagDuplicate, SalesActor.System, now);
            order.Touch();
        }
    }

    /// <summary>Tiền tố mã đơn <c>LP</c> + <c>yyMMdd</c> theo ngày giờ Việt Nam (BR-06).</summary>
    public static string OrderCodePrefix(DateOnly day) => "LP" + day.ToString("yyMMdd", System.Globalization.CultureInfo.InvariantCulture);

    /// <summary>Mã kế tiếp sau số lớn nhất đã có trong ngày.</summary>
    public static string NextOrderCode(DateOnly day, IEnumerable<string> existingCodes)
    {
        var prefix = OrderCodePrefix(day);
        var max = existingCodes
            .Where(c => c.StartsWith(prefix, StringComparison.Ordinal) && c.Length == prefix.Length + 4)
            .Select(c => int.TryParse(c.AsSpan(prefix.Length), out var n) ? n : 0)
            .DefaultIfEmpty(0)
            .Max();
        return prefix + (max + 1).ToString("D4", System.Globalization.CultureInfo.InvariantCulture);
    }

    /// <summary>
    /// Khoảng ngày báo cáo (07 §2): vắng → 7 ngày tới hôm nay; sai định dạng → errors.from/to; dài hơn 366 ngày → errors.from;
    /// <c>to</c> &lt; <c>from</c> → errors.to.
    /// </summary>
    public static (DateOnly From, DateOnly To) ParseRange(string? from, string? to, DateOnly today)
    {
        var failures = new List<ValidationFailure>();
        DateOnly fromDate = default, toDate = default;
        if (!string.IsNullOrWhiteSpace(to) && !VietnamDates.TryParse(to, out toDate))
            failures.Add(new ValidationFailure("to", "Ngày không hợp lệ"));
        if (!string.IsNullOrWhiteSpace(from) && !VietnamDates.TryParse(from, out fromDate))
            failures.Add(new ValidationFailure("from", "Ngày không hợp lệ"));
        if (failures.Count > 0)
            throw new ValidationException(failures);

        if (string.IsNullOrWhiteSpace(to))
            toDate = today;
        if (string.IsNullOrWhiteSpace(from))
            fromDate = toDate.AddDays(-(SalesRules.DefaultReportDays - 1));

        if (toDate < fromDate)
            throw new ValidationException([new ValidationFailure("to", "Ngày kết thúc phải sau ngày bắt đầu")]);
        if (toDate.DayNumber - fromDate.DayNumber + 1 > SalesRules.MaxReportDays)
            throw new ValidationException([new ValidationFailure("from", "Khoảng ngày tối đa 366 ngày")]);
        return (fromDate, toDate);
    }

    /// <summary>a / b × 100 làm tròn <paramref name="digits"/> chữ số; b = 0 → null.</summary>
    public static decimal? Percent(decimal a, decimal b, int digits) =>
        b == 0 ? null : Math.Round(a / b * 100m, digits, MidpointRounding.AwayFromZero);
}
