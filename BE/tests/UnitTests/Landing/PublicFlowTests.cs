using Application.Common.Exceptions;
using Application.DTOs.Orders;
using Application.DTOs.Public;
using Application.DTOs.Reports;
using Application.Interfaces.Services.Orders;
using Application.Interfaces.Services.Public;
using Application.Interfaces.Services.Reports;
using Domain.Base;
using Domain.Entities.Sales;
using Domain.Entities.Sales.Orders;
using Domain.Entities.Sales.Tracking;
using Domain.Enums.Sales.Orders;
using Domain.Enums.Sales.Tracking;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using UnitTests.TestSupport;

namespace UnitTests.Landing;

/// <summary>Đặt hàng công khai, UTM, lượt truy cập (07 §2.1, §3.2, §3.6, §3.9, §3.10; TC-05…TC-11, TC-18, TC-20, TC-35).</summary>
public sealed class PublicFlowTests : IAsyncLifetime
{
    private SalesTestHost _host = null!;
    private LandingScenario _s = null!;

    public async Task InitializeAsync()
    {
        _host = await SalesTestHost.StartAsync();
        _s = new LandingScenario(_host);
    }

    public async Task DisposeAsync() => await _host.DisposeAsync();

    [Fact]
    public async Task TC05_PlaceOrder_C01_WithShipping()
    {
        var result = await _s.PlaceAsync(await _s.RequestAsync("C01", 1, "0901000001"));
        Assert.False(result.Duplicate);
        Assert.Equal((390_000m, 30_000m, 420_000m), (result.Order.Subtotal, result.Order.ShippingFee, result.Order.Total));
        Assert.Equal(PriceType.KhuyenMai, result.Order.PriceType);
        Assert.Matches(@"^LP261015\d{4}$", result.Order.Code);
        Assert.Equal("LP2610150014", result.Order.Code); // 13 đơn mẫu hôm nay → số 14
        Assert.False(result.Order.OutsideWorkingHours);

        var order = await _s.OrderByCodeAsync(result.Order.Code);
        Assert.Equal(OrderStatus.Moi, order.Status);
        Assert.Equal("Vũ Ngọc Ánh", order.AssigneeName);
        var events = await _host.QueryAsync<OrderEvent, List<string>>(q => q.Where(e => e.OrderId == order.Id).OrderBy(e => e.OccurredAt).Select(e => e.Content).ToListAsync());
        Assert.Equal(["Khách đặt hàng trên landing, nguồn Trực tiếp", "Đã gửi SMS xác nhận (giả lập)", "Chia cho Vũ Ngọc Ánh"], events);
        Assert.Equal(1, await _host.QueryAsync<ConversionEvent, int>(q => q.CountAsync(e => e.OrderId == order.Id && e.Type == ConversionEventType.Purchase)));
    }

    [Theory]
    [InlineData("C01", 2, "0901000007", 780_000, 0, 780_000)]
    [InlineData("C03", 2, "0901000008", 1_980_000, 0, 1_980_000)]
    [InlineData("C02", 1, "0901000002", 740_000, 0, 740_000)]
    public async Task TC06_TC07_Amounts(string combo, int qty, string phone, int subtotal, int ship, int total)
    {
        var result = await _s.PlaceAsync(await _s.RequestAsync(combo, qty, phone));
        Assert.Equal((subtotal, ship, total), ((int)result.Order.Subtotal, (int)result.Order.ShippingFee, (int)result.Order.Total));
    }

    [Fact]
    public async Task TC08_InvalidForm_FieldErrors()
    {
        async Task<Dictionary<string, string>> Errors(Action<PlaceOrderRequest> change)
        {
            var request = await _s.RequestAsync("C01", 1, "0901000001");
            change(request);
            var ex = await Assert.ThrowsAsync<ValidationException>(() => _s.PlaceAsync(request));
            return ex.Errors.ToDictionary(e => e.PropertyName, e => e.ErrorMessage);
        }

        Assert.Equal("Số điện thoại di động gồm 10 số, bắt đầu bằng 03, 05, 07, 08 hoặc 09", (await Errors(r => r.Phone = "0212345678"))["phone"]);
        Assert.Equal("Số điện thoại di động gồm 10 số, bắt đầu bằng 03, 05, 07, 08 hoặc 09", (await Errors(r => r.Phone = "09123"))["phone"]);
        Assert.Equal("Họ tên không được chứa số", (await Errors(r => r.CustomerName = "Anh 123"))["customerName"]);
        Assert.Equal("Địa chỉ chi tiết từ 10 đến 200 ký tự", (await Errors(r => r.Address = "Q1"))["address"]);
        Assert.Equal("Chọn tỉnh/thành trong danh sách", (await Errors(r => r.Province = "Sài Gòn"))["province"]);
        Assert.Equal("Số lượng từ 1 đến 5", (await Errors(r => r.Quantity = 6))["quantity"]);
        Assert.Equal(0, await _host.QueryAsync<Order, int>(q => q.CountAsync(o => o.Phone == "0901000001")));

        var ok = await _s.PlaceAsync(await _s.RequestAsync("C01", 1, "+84912345678"));
        Assert.Equal("0912345678", ok.Order.Phone);
    }

    [Fact]
    public async Task TC09_Idempotent_AndCooldown()
    {
        var request = await _s.RequestAsync("C01", 1, "0901000013", visitor: "browser-a");
        var first = await _s.PlaceAsync(request);
        var again = await _s.PlaceAsync(request);
        Assert.True(again.Duplicate);
        Assert.Equal(first.Order.Code, again.Order.Code);
        Assert.Equal(1, await _host.QueryAsync<Order, int>(q => q.CountAsync(o => o.Phone == "0901000013")));

        _host.Time.Advance(TimeSpan.FromSeconds(20));
        var ex = await Assert.ThrowsAsync<SalesTooManyRequestsException>(async () =>
            await _s.PlaceAsync(await _s.RequestAsync("C02", 1, "0901000013", visitor: "browser-a")));
        Assert.Equal(SalesErrors.DatHangQuaNhanh, ex.Code);
        Assert.Equal("Bạn vừa đặt hàng, vui lòng chờ 60 giây nếu muốn đặt thêm", ex.Message);
        Assert.Equal(40, ex.RetryAfterSeconds);

        _host.Time.Advance(TimeSpan.FromSeconds(41));
        await _s.PlaceAsync(await _s.RequestAsync("C02", 1, "0901000013", visitor: "browser-a"));
    }

    [Fact]
    public async Task MaxFiveOrdersPerPhonePer24h()
    {
        for (var i = 0; i < 5; i++)
            await _s.PlaceAsync(await _s.RequestAsync("C01", 1, "0901000015"));
        var ex = await Assert.ThrowsAsync<SalesTooManyRequestsException>(async () =>
            await _s.PlaceAsync(await _s.RequestAsync("C01", 1, "0901000015")));
        Assert.Equal(SalesErrors.QuaNhieuDonCungSo, ex.Code);
    }

    [Fact]
    public async Task PriceChanged_And_ComboHidden()
    {
        var conflict = await Assert.ThrowsAsync<ConflictException>(async () =>
            await _s.PlaceAsync(await _s.RequestAsync("C01", 1, "0901000016", expectedPrice: 450_000)));
        Assert.Equal(SalesErrors.GiaDaThayDoi, conflict.Extensions["code"]);
        Assert.Equal(390_000m, conflict.Extensions["currentPrice"]);
        Assert.Equal("KhuyenMai", conflict.Extensions["priceType"]);

        var request = await _s.RequestAsync("C01", 1, "0901000016");
        request.ComboId = Guid.NewGuid();
        var bad = await Assert.ThrowsAsync<Domain.Common.DomainException>(() => _s.PlaceAsync(request));
        Assert.Equal(SalesErrors.ComboDaThayDoi, bad.Extensions["code"]);
        Assert.Equal(0, await _host.QueryAsync<Order, int>(q => q.CountAsync(o => o.Phone == "0901000016")));
    }

    [Fact]
    public async Task TC10_Utm_SavedOnOrder()
    {
        await _host.SignInAsync(null);
        var visit = await _host.CallAsync<IVisitTrackingService, RecordVisitResult>(s => s.RecordVisitAsync(new RecordVisitRequest
        {
            VisitorId = "v-utm", UtmSource = "FB", UtmMedium = "cpc", UtmCampaign = "serum_t10", UtmContent = "video_a", Path = "/"
        }));
        Assert.True(visit.IsNewVisit && visit.SaveAttribution);
        Assert.Equal("facebook", visit.Attribution.Source);

        var request = await _s.RequestAsync("C02", 1, "0901000002", visitor: "v-utm", attribution: visit.Attribution);
        request.VisitId = visit.VisitId;
        var placed = await _s.PlaceAsync(request);
        var order = await _s.OrderByCodeAsync(placed.Order.Code);
        Assert.Equal(("facebook", "cpc", "serum_t10", "video_a"), (order.Source, order.Medium, order.Campaign, order.AdContent));
        Assert.Equal(visit.VisitId, order.VisitId);
    }

    [Fact]
    public async Task TC11_TC32_TC35_Visits()
    {
        await _host.SignInAsync(null);
        Task<RecordVisitResult> Visit(RecordVisitRequest r) => _host.CallAsync<IVisitTrackingService, RecordVisitResult>(s => s.RecordVisitAsync(r));

        var direct = await Visit(new RecordVisitRequest { VisitorId = "incog-1", Path = "/" });
        Assert.Equal("direct", direct.Attribution.Source);
        var reload = await Visit(new RecordVisitRequest { VisitorId = "incog-1", Path = "/" });
        Assert.False(reload.IsNewVisit);
        _host.Time.Advance(TimeSpan.FromSeconds(61));
        var tt = await Visit(new RecordVisitRequest { VisitorId = "incog-1", UtmSource = "tt", Path = "/" });
        Assert.True(tt.IsNewVisit);
        Assert.Equal("tiktok", tt.Attribution.Source);
        var stored = await Visit(new RecordVisitRequest { VisitorId = "incog-2", StoredAttribution = new Attribution { Source = "google", Campaign = "gg_pmax" } });
        Assert.Equal(("google", "gg_pmax"), (stored.Attribution.Source, stored.Attribution.Campaign));
        var referred = await Visit(new RecordVisitRequest { VisitorId = "incog-3", Referrer = "https://m.facebook.com/" });
        Assert.Equal(("facebook", "m.facebook.com"), (referred.Attribution.Source, referred.Attribution.Referrer));

        // TC-35: 4 cửa sổ demo_test, 1 đơn → 25,00%.
        RecordVisitResult? last = null;
        for (var i = 0; i < 4; i++)
            last = await Visit(new RecordVisitRequest { VisitorId = $"demo-{i}", UtmSource = "demo_test", Path = "/" });
        var request = await _s.RequestAsync("C01", 1, "0901000009", visitor: "demo-3", attribution: last!.Attribution);
        await _s.PlaceAsync(request);
        await _host.SignInAsync("quanly");
        var report = await _host.CallAsync<ISalesReportService, SourceReport>(s => s.GetSourcesAsync(new SourceReportQuery { From = "2026-10-15", To = "2026-10-15" }));
        var row = report.Rows.Single(r => r.Source == "demo_test");
        Assert.Equal((4, 1, 25.00m), (row.Visits, row.Orders, row.ConversionRate!.Value));
    }

    [Fact]
    public async Task TC18_ReturnRisk_NoDuplicate()
    {
        var order = await _s.PlaceOrderAsync("C02", 1, "0987654321");
        Assert.True(order.IsReturnRisk);
        Assert.False(order.IsDuplicate);
        Assert.Equal("Vũ Ngọc Ánh", order.AssigneeName);

        var detail = await _s.AsAsync("nhanvien", s => s.GetDetailAsync(order.Id));
        Assert.Equal(2, detail.ReturnedCount);
        Assert.Contains(OrderTag.RuiRoHoan, detail.Tags);
        Assert.Equal(3, detail.RelatedOrders.Count);
    }

    [Fact]
    public async Task TC20_DuplicateCancel_RemovesTagAndCount()
    {
        await _host.SignInAsync("quanly");
        var before = await _host.CallAsync<IDashboardService, ManagerDashboard>(s => s.GetManagerAsync());
        var c01 = await _s.PlaceOrderAsync("C01", 1, "0901000004");
        var c02 = await _s.PlaceOrderAsync("C02", 1, "0901000004");
        c01 = await _s.OrderByCodeAsync(c01.Code);
        Assert.True(c01.IsDuplicate && c02.IsDuplicate);
        Assert.Equal(c01.AssigneeId, c02.AssigneeId);

        var cancelled = await _s.AsAsync("nhanvien", s => s.CancelAsync(c01.Id, new CancelOrderRequest { Reason = CancelReason.DonTrung, Version = c01.Version }));
        Assert.Equal(OrderStatus.DaHuy, cancelled.Status);
        Assert.False((await _s.OrderByCodeAsync(c02.Code)).IsDuplicate);

        await _host.SignInAsync("quanly");
        var after = await _host.CallAsync<IDashboardService, ManagerDashboard>(s => s.GetManagerAsync());
        Assert.Equal(before.Orders.Value + 1, after.Orders.Value);
        Assert.Equal(before.PendingCalls + 1, after.PendingCalls);

        var daily = await _host.CallAsync<ISalesReportService, DailyReport>(s => s.GetDailyAsync(new DateRangeQuery { From = "2026-10-15", To = "2026-10-15" }));
        Assert.Equal(1, daily.DuplicateCancelled);
        Assert.DoesNotContain(daily.CancelReasons, r => r.Reason == CancelReason.DonTrung);
    }

    [Fact]
    public async Task TC21_NotDuplicate_AndOldCancelledOrder()
    {
        // Đơn cũ của Nguyễn Văn Nam hủy (lần không nghe máy thứ 3) → đơn mới không Trùng.
        var nam = await _s.OrderByPhoneAsync("0912000111");
        await _s.CallAsync("nhanvien", nam.Id, CallResult.KhongNgheMay);
        var namNew = await _s.PlaceOrderAsync("C01", 1, "0912000111");
        Assert.False(namNew.IsDuplicate);

        var a = await _s.PlaceOrderAsync("C01", 1, "0901000005");
        var b = await _s.PlaceOrderAsync("C02", 1, "0901000005");
        var detail = await _s.AsAsync("nhanvien", s => s.NotDuplicateAsync(b.Id, b.Version));
        Assert.DoesNotContain(OrderTag.Trung, detail.Tags);
        var aAfter = await _s.OrderByCodeAsync(a.Code);
        Assert.False(aAfter.IsDuplicate);
        Assert.True(aAfter.DuplicateCleared);
        Assert.Contains(detail.Events, e => e.Content == "Bỏ nhãn Trùng: không phải đơn trùng");
    }

    [Fact]
    public async Task RecentOrders_Public()
    {
        var list = await _host.CallAsync<IPublicLandingService, IReadOnlyList<RecentOrderNotice>>(s => s.GetRecentOrdersAsync());
        Assert.InRange(list.Count, 1, 10);
        Assert.Equal("Bích", list[0].DisplayName);
        var reviews = await _host.CallAsync<IPublicLandingService, Application.Common.Models.PaginatedResult<PublicReview>>(s => s.GetReviewsAsync(2, 6));
        Assert.Equal(6, reviews.Items.Count);
        Assert.Equal(20, reviews.TotalCount);
    }

    [Fact]
    public async Task Concurrent_SameRequestId_CreatesOneOrder()
    {
        var request = await _s.RequestAsync("C01", 1, "0901000017");
        await _host.SignInAsync(null);
        var tasks = Enumerable.Range(0, 2).Select(_ => _host.CallAsync<IOrderPlacementService, WriteOutcome<PlaceOrderResult>>(s => s.PlaceOrderAsync(request))).ToList();
        var results = await Task.WhenAll(tasks);
        Assert.Single(results.Select(r => r.Value.Order.Code).Distinct());
        Assert.Equal(1, await _host.QueryAsync<Order, int>(q => q.CountAsync(o => o.Phone == "0901000017")));
    }
}
