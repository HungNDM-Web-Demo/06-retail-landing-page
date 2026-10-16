using Application.DTOs.Orders;
using Application.DTOs.Reports;
using Application.Interfaces.Services.Orders;
using Application.Interfaces.Services.Public;
using Application.Interfaces.Services.Reports;
using Domain.Entities.Cms.Catalog;
using Domain.Entities.Cms.Content;
using Domain.Entities.Sales.Marketing;
using Domain.Entities.Sales.Orders;
using Domain.Entities.Sales.Telesales;
using Domain.Entities.Sales.Tracking;
using Domain.Enums.Cms.Catalog;
using Domain.Enums.Sales.Orders;
using Microsoft.EntityFrameworkCore;
using UnitTests.TestSupport;

namespace UnitTests.Landing;

/// <summary>Dữ liệu mẫu khớp số đối chiếu 06 §5.1, §5.6, §5.7 (nạp lúc 14:00 giờ Việt Nam).</summary>
public sealed class SeedTests : IAsyncLifetime
{
    private SalesTestHost _host = null!;

    public async Task InitializeAsync() => _host = await SalesTestHost.StartAsync();

    public async Task DisposeAsync() => await _host.DisposeAsync();

    [Fact]
    public async Task RowCounts_MatchDesign()
    {
        Assert.Equal(1, await _host.QueryAsync<Product, int>(q => q.CountAsync()));
        Assert.Equal(3, await _host.QueryAsync<Combo, int>(q => q.CountAsync()));
        Assert.Equal(12, await _host.QueryAsync<LandingBlock, int>(q => q.CountAsync()));
        Assert.Equal(20, await _host.QueryAsync<Review, int>(q => q.CountAsync()));
        Assert.Equal(623, await _host.QueryAsync<Order, int>(q => q.CountAsync()));
        Assert.Equal(1010, await _host.QueryAsync<OrderCall, int>(q => q.CountAsync()));
        Assert.Equal(4342, await _host.QueryAsync<OrderEvent, int>(q => q.CountAsync()));
        Assert.Equal(437, await _host.QueryAsync<Shipment, int>(q => q.CountAsync()));
        Assert.Equal(472, await _host.QueryAsync<AdCost, int>(q => q.CountAsync()));
        Assert.Equal(3, await _host.QueryAsync<TelesaleState, int>(q => q.CountAsync()));
        Assert.InRange(await _host.QueryAsync<VisitStat, int>(q => q.CountAsync()), 9_500, 9_700);
    }

    [Fact]
    public async Task Tags_AndSpecialCustomers()
    {
        Assert.Equal(0, await _host.QueryAsync<Order, int>(q => q.CountAsync(o => o.IsDuplicate && o.Status != OrderStatus.DaHuy)));
        Assert.Equal(1, await _host.QueryAsync<Order, int>(q => q.CountAsync(o => o.IsReturnRisk)));
        Assert.Equal(0, await _host.QueryAsync<Order, int>(q => q.CountAsync(o => o.Phone.StartsWith("090100"))));

        var nam = await _host.QueryAsync<Order, Order>(q => q.SingleAsync(o => o.Phone == "0912000111"));
        Assert.Equal(OrderStatus.ChoGoiLai, nam.Status);
        Assert.Equal(2, nam.FailedCallCount);
        Assert.Equal(SalesTestHost.Start.UtcDateTime.AddMinutes(-30), nam.NextCallAt);

        var hoa = await _host.QueryAsync<Order, List<Order>>(q => q.Where(o => o.Phone == "0987654321").ToListAsync());
        Assert.Equal(3, hoa.Count);
        Assert.Equal(2, hoa.Count(o => o.Status == OrderStatus.HoanHang));
        Assert.Contains(hoa, o => o.Status == OrderStatus.ChoGoiLai && o.IsReturnRisk);

        var promotion = await _host.QueryAsync<Promotion, Promotion>(q => q.SingleAsync());
        Assert.Equal(PromotionStatus.DangChay, promotion.StatusAt(SalesTestHost.Start.UtcDateTime));
        Assert.Equal(new DateTime(2026, 10, 17, 16, 59, 59, DateTimeKind.Utc), promotion.EndAt);
    }

    [Fact]
    public async Task TelesaleDashboard_ForNhanvien()
    {
        await _host.SignInAsync("nhanvien");
        var d = await _host.CallAsync<IDashboardService, TelesaleDashboard>(s => s.GetTelesaleAsync());
        Assert.True(d.IsReceiving);
        Assert.Equal(4, d.MyNew);
        Assert.Equal(1, d.UnassignedNew);
        Assert.Equal(3, d.MyDueCallbacks);
        Assert.Equal(1, d.MyLaterCallbacks);
        Assert.Equal(3, d.MyConfirmedToday);
        Assert.Equal(2, d.MyUpsellCountToday);
        Assert.Equal(600_000m, d.MyUpsellValueToday);

        var list = await _host.CallAsync<IOrderService, OrderListResult>(s => s.GetListAsync(new OrderQuery { Status = OrderStatus.Moi }));
        Assert.Equal(5, list.TotalCount);
        Assert.Equal(5, list.StatusCounts["Moi"]);
    }

    [Fact]
    public async Task ManagerDashboard_Today()
    {
        await _host.SignInAsync("quanly");
        var d = await _host.CallAsync<IDashboardService, ManagerDashboard>(s => s.GetManagerAsync());
        Assert.Equal(13m, d.Orders.Value);
        Assert.Equal(10, d.PendingCalls);
        Assert.Equal(38.5m, d.ConfirmRate.Value);
        Assert.Equal(3_670_000m, d.ConfirmedValue.Value);
        Assert.InRange(d.Visits.Value!.Value, 1, 392);
        Assert.Equal(14, d.Trend14Days.Count);
        Assert.Equal(24, d.OrdersByHour.Count);
    }

    /// <summary>06 §5.7: 59 ngày lịch sử.</summary>
    [Fact]
    public async Task SourceReport_History_MatchesDesign()
    {
        await _host.SignInAsync("quanly");
        var r = await _host.CallAsync<ISalesReportService, SourceReport>(s => s.GetSourcesAsync(new SourceReportQuery
        {
            From = "2026-08-17",
            To = "2026-10-14"
        }));
        // 588 đơn lịch sử + đơn Lê Thị Hoa đặt 30 giờ trước (rơi vào hôm qua, Chờ gọi lại, facebook, nhanvien; 06 §5.7 ghi chú).
        Assert.Equal(589, r.Totals.Orders);
        Assert.Equal(443, r.Totals.Confirmed);
        Assert.Equal(75.2m, r.Totals.ConfirmRate);
        Assert.Equal(11.8m, r.Totals.ReturnRate);
        Assert.Equal(255_070_000m, r.Totals.DeliveredRevenue);
        Assert.Equal(62_812_000m, r.Totals.AdCost);
        Assert.Equal(4.06m, r.Totals.Roas);
        Assert.Equal(32_924, r.Totals.Visits);


        var fb = r.Rows.Single(x => x.Source == "facebook");
        Assert.Equal((17_741, 319, 244, 203, 24, 139_670_000m, 36_658_000m, 3.81m),
            (fb.Visits, fb.Orders, fb.Confirmed, fb.Delivered, fb.Returned, fb.DeliveredRevenue, fb.AdCost, fb.Roas));
        var tt = r.Rows.Single(x => x.Source == "tiktok");
        Assert.Equal((9_909, 147, 108, 83, 18, 58_270_000m, 15_479_000m), (tt.Visits, tt.Orders, tt.Confirmed, tt.Delivered, tt.Returned, tt.DeliveredRevenue, tt.AdCost));
        var gg = r.Rows.Single(x => x.Source == "google");
        Assert.Equal((1_979, 61, 26_250_000m, 7_584_000m), (gg.Visits, gg.Orders, gg.DeliveredRevenue, gg.AdCost));
        var direct = r.Rows.Single(x => x.Source == "direct");
        Assert.Equal((2_315, 33, 19_120_000m, 0m), (direct.Visits, direct.Orders, direct.DeliveredRevenue, direct.AdCost));
        Assert.Null(direct.Roas);
        var zalo = r.Rows.Single(x => x.Source == "zalo");
        Assert.Equal((980, 29, 11_760_000m, 3_091_000m), (zalo.Visits, zalo.Orders, zalo.DeliveredRevenue, zalo.AdCost));
        Assert.Equal("facebook", r.Rows[0].Source);
    }

    [Fact]
    public async Task TelesaleReport_History_MatchesDesign()
    {
        await _host.SignInAsync("quanly");
        var r = await _host.CallAsync<ISalesReportService, TelesaleReport>(s => s.GetTelesalesAsync(new DateRangeQuery
        {
            From = "2026-08-17",
            To = "2026-10-14"
        }));
        var anh = r.Rows.Single(x => x.FullName == "Vũ Ngọc Ánh");
        Assert.Equal((290, 226, 77.9m, 48, 15_340_000m, 189, 25), (anh.Assigned, anh.Confirmed, anh.ConfirmRate, anh.UpsellCount, anh.UpsellValue, anh.Delivered, anh.Returned));
        var hang = r.Rows.Single(x => x.FullName == "Phạm Thu Hằng");
        Assert.Equal((155, 125, 40, 14_000_000m), (hang.Assigned, hang.Confirmed, hang.UpsellCount, hang.UpsellValue));
        var tuan = r.Rows.Single(x => x.FullName == "Đỗ Minh Tuấn");
        Assert.Equal((144, 92, 12, 3_680_000m), (tuan.Assigned, tuan.Confirmed, tuan.UpsellCount, tuan.UpsellValue));
    }

    [Fact]
    public async Task Landing_ShowsPromoPricesAndReviews()
    {
        var l = await _host.CallAsync<IPublicLandingService, Application.DTOs.Public.LandingPageDto>(s => s.GetLandingAsync());
        Assert.Equal("Diệp Lam", l.Store.Name);
        Assert.Equal(12, l.Blocks.Count);
        Assert.Equal(330_000m, l.MinPricePerBottle);
        Assert.Equal(4.8m, l.ReviewSummary.Average);
        Assert.Equal(20, l.ReviewSummary.Total);
        Assert.Equal(6, l.Reviews.Count);
        var c02 = l.Combos.Single(c => c.Code == "C02");
        Assert.True(c02.IsDefault);
        Assert.Equal((740_000m, 900_000m, 370_000m, 0m), (c02.Price, c02.CompareAtPrice!.Value, c02.PricePerBottle, c02.ShippingFeeForOne));
        Assert.Equal(30_000m, l.Combos.Single(c => c.Code == "C01").ShippingFeeForOne);
        Assert.Equal(PromotionStatus.DangChay, l.Promotion.Status);
    }
}
