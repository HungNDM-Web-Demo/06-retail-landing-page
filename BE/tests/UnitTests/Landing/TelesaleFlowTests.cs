using System.Reflection;
using Application.Common.Exceptions;
using Application.Constants;
using Application.DTOs.Catalog;
using Application.DTOs.Orders;
using Application.DTOs.Public;
using Application.DTOs.Reports;
using Application.Interfaces.Services.Catalog;
using Application.Interfaces.Services.Orders;
using Application.Interfaces.Services.Public;
using Application.Interfaces.Services.Reports;
using Application.Interfaces.Services.Roles;
using Domain.Common;
using Domain.Entities.Sales;
using Domain.Entities.Sales.Orders;
using Domain.Enums.Sales.Orders;
using FluentValidation;
using Infrastructure.Persistence.Seeders;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using UnitTests.TestSupport;

namespace UnitTests.Landing;

/// <summary>Luồng telesale, quản lý (07 §2.2–§2.7; TC-03, TC-12…TC-17, TC-19, TC-24…TC-31, TC-34, TC-36) và quyền theo vai trò.</summary>
public sealed class TelesaleFlowTests : IAsyncLifetime
{
    private SalesTestHost _host = null!;
    private LandingScenario _s = null!;

    public async Task InitializeAsync()
    {
        _host = await SalesTestHost.StartAsync();
        _s = new LandingScenario(_host);
    }

    public async Task DisposeAsync() => await _host.DisposeAsync();

    private DateTime Now => _host.Time.GetUtcNow().UtcDateTime;

    [Fact]
    public async Task TC12_TC13_Confirm_WithAndWithoutUpsell_ThenHandover_TC25()
    {
        var o5 = await _s.PlaceOrderAsync("C01", 1, "0901000001");
        var o6 = await _s.PlaceOrderAsync("C01", 2, "0901000007");
        var fresh = await _s.PlaceOrderAsync("C02", 1, "0901000018");
        var c02 = await _s.ComboAsync("C02");

        var d12 = await _s.CallAsync("nhanvien", o5.Id, CallResult.XacNhan, LandingScenario.ChangesOf(o5, c02.Id, 1));
        Assert.Equal((OrderStatus.DaXacNhan, 740_000m, 0m, 740_000m, 390_000m, 350_000m),
            (d12.Status, d12.Subtotal, d12.ShippingFee, d12.Total, d12.PlacedSubtotal, d12.UpsellAmount));
        Assert.Single(d12.Calls);
        Assert.Contains(d12.Events, e => e.Content == "Xác nhận · Upsell +350.000 ₫" && e.FromStatus == OrderStatus.Moi && e.ToStatus == OrderStatus.DaXacNhan);
        Assert.Contains(d12.Events, e => e.Content == "Sửa đơn: Mua 1 × 1 → Mua 2 tặng 1 × 1, tiền hàng 390.000 ₫ → 740.000 ₫");
        Assert.Contains(d12.Events, e => e.Content == "Đơn đã được xác nhận (SMS giả lập)");

        var d13 = await _s.CallAsync("nhanvien", o6.Id, CallResult.XacNhan);
        Assert.Equal((780_000m, 0m), (d13.Total, d13.UpsellAmount));

        var handover = await _s.AsAsync("nhanvien", s => s.HandoverAsync(new HandoverRequest { OrderIds = [o5.Id, o6.Id, fresh.Id], Carrier = Carrier.GHTK }));
        Assert.Equal("Đã bàn giao 2 đơn, bỏ qua 1 đơn không ở trạng thái Đã xác nhận", handover.Message);
        Assert.Equal([fresh.Id], handover.SkippedOrderIds);
        var shipments = await _host.QueryAsync<Shipment, List<Shipment>>(q => q.Where(x => x.OrderId == o5.Id || x.OrderId == o6.Id).ToListAsync());
        Assert.All(shipments, x => Assert.Matches(@"^GHTK\d{10}$", x.TrackingCode));
        Assert.Equal([740_000m, 780_000m], shipments.Select(x => x.CodAmount).Order());
        Assert.Equal(OrderStatus.Moi, (await _s.OrderByCodeAsync(fresh.Code)).Status);

        // TC-30: không hủy đơn đang giao.
        var shipped = await _s.OrderByCodeAsync(o5.Code);
        var ex = await Assert.ThrowsAsync<DomainException>(() => _s.AsAsync("nhanvien", s => s.CancelAsync(o5.Id,
            new CancelOrderRequest { Reason = CancelReason.KhachDoiY, Version = shipped.Version })));
        Assert.Equal("Không thể hủy đơn đã bàn giao vận chuyển", ex.Message);

        // TC-28: hoàn hàng thiếu lý do, rồi Khách từ chối nhận.
        var o6s = await _s.OrderByCodeAsync(o6.Code);
        await Assert.ThrowsAsync<ValidationException>(() => _s.AsAsync("nhanvien", s => s.ReturnAsync(o6.Id, new ReturnOrderRequest { Version = o6s.Version })));
        var returned = await _s.AsAsync("nhanvien", s => s.ReturnAsync(o6.Id, new ReturnOrderRequest { Reason = ReturnReason.KhachTuChoiNhan, Version = o6s.Version }));
        Assert.Equal(OrderStatus.HoanHang, returned.Status);
        Assert.Contains(returned.Events, e => e.Content == "Hoàn hàng: Khách từ chối nhận");

        // TC-31: đơn mới cùng số với đơn đang giao → cả hai Trùng; đơn đang giao không hủy được.
        var dup = await _s.PlaceOrderAsync("C01", 1, "0901000001");
        Assert.True(dup.IsDuplicate);
        Assert.True((await _s.OrderByCodeAsync(o5.Code)).IsDuplicate);
        var dupDetail = await _s.AsAsync("nhanvien", s => s.GetDetailAsync(dup.Id));
        Assert.False(dupDetail.RelatedOrders.Single(r => r.Id == o5.Id).CanCancel);
    }

    [Fact]
    public async Task TC14_TC15_TC16_TC19_CallResults()
    {
        var o7 = await _s.PlaceOrderAsync("C03", 2, "0901000008");
        var d14 = await _s.CallAsync("nhanvien", o7.Id, CallResult.KhongNgheMay);
        Assert.Equal((OrderStatus.ChoGoiLai, 1, Now.AddHours(2)), (d14.Status, d14.FailedCallCount, d14.NextCallAt!.Value));
        Assert.Contains(d14.Events, e => e.Content == "Không nghe máy (lần 1), hẹn gọi lại 16:00");

        // TC-19: hẹn gọi lại +1 phút → tới giờ, lên đầu danh sách.
        var d19 = await _s.CallAsync("nhanvien", o7.Id, CallResult.HenGoiLai, callbackAt: Now.AddMinutes(1));
        Assert.Contains(d19.Events, e => e.Content == "Hẹn gọi lại lúc 14:01 15/10");
        _host.Time.Advance(TimeSpan.FromMinutes(1));
        var list = await _s.AsAsync("nhanvien", s => s.GetListAsync(new OrderQuery { Status = OrderStatus.ChoGoiLai }));
        Assert.Contains(OrderTag.DenGioGoiLai, list.Items.Single(i => i.Id == o7.Id).Tags);
        Assert.All(list.Items.TakeWhile(i => i.Tags.Contains(OrderTag.DenGioGoiLai)), i => Assert.True(i.NextCallAt <= Now));
        Assert.Contains(OrderTag.DenGioGoiLai, list.Items[0].Tags);

        await Assert.ThrowsAsync<ValidationException>(() => _s.CallAsync("nhanvien", o7.Id, CallResult.HenGoiLai, callbackAt: Now.AddDays(8)));

        // TC-15: Nguyễn Văn Nam lần 3 → Đã hủy, Không liên lạc được.
        var nam = await _s.OrderByPhoneAsync("0912000111");
        var d15 = await _s.CallAsync("nhanvien", nam.Id, CallResult.KhongNgheMay);
        Assert.Equal((OrderStatus.DaHuy, CancelReason.KhongLienLacDuoc, 3), (d15.Status, d15.CancelReason!.Value, d15.Calls.Count));
        Assert.Null(d15.CancelledByName);
        Assert.Contains(d15.Events, e => e.Content == "Không nghe máy (lần 3), hủy vì không liên lạc được");

        // TC-16: khách hủy thiếu lý do → lỗi, đơn giữ nguyên; sai số → hủy.
        var o10 = await _s.PlaceOrderAsync("C02", 1, "0901000002");
        var err = await Assert.ThrowsAsync<ValidationException>(() => _s.CallAsync("nhanvien", o10.Id, CallResult.KhachHuy));
        Assert.Equal("Chọn lý do hủy", err.Errors.Single().ErrorMessage);
        await Assert.ThrowsAsync<ValidationException>(() => _s.CallAsync("nhanvien", o10.Id, CallResult.KhachHuy, reason: CancelReason.Khac));
        Assert.Equal(OrderStatus.Moi, (await _s.OrderByCodeAsync(o10.Code)).Status);
        var o11 = await _s.PlaceOrderAsync("C01", 1, "0901000011");
        var d16 = await _s.CallAsync("nhanvien", o11.Id, CallResult.SaiSo);
        Assert.Equal((OrderStatus.DaHuy, CancelReason.SaiSoDienThoai, "Vũ Ngọc Ánh"), (d16.Status, d16.CancelReason!.Value, d16.CancelledByName));
        var dKh = await _s.CallAsync("nhanvien", o10.Id, CallResult.KhachHuy, reason: CancelReason.CheGiaCao);
        Assert.Contains(dKh.Events, e => e.Content == "Khách hủy: Chê giá cao");

        // Đơn đã hủy không ghi cuộc gọi.
        var stale = await _s.OrderByCodeAsync(o11.Code);
        var notCallable = await Assert.ThrowsAsync<DomainException>(() => _s.CallAsync("nhanvien", stale.Id, CallResult.XacNhan));
        Assert.Equal(SalesErrors.DonKhongChoGoi, notCallable.Extensions["code"]);
    }

    [Fact]
    public async Task TC03_TC17_PromotionEnded_KeepsPromoPrice()
    {
        var o3 = await _s.PlaceOrderAsync("C01", 1, "0901000003");
        Assert.Equal(420_000m, o3.Total);

        await _host.SignInAsync("quanly");
        var promo = await _host.CallAsync<IPromotionService, PromotionDto>(s => s.GetAsync());
        var ended = await _host.CallAsync<IPromotionService, PromotionDto>(s => s.UpdateAsync(new UpdatePromotionRequest
        {
            Name = promo.Name, StartAt = promo.StartAt, EndAt = Now.AddMinutes(-1), AutoRenewDays = 3, Version = promo.Version
        }));
        Assert.Equal(Domain.Enums.Cms.Catalog.PromotionStatus.DaKetThuc, ended.Status);
        var stale = await Assert.ThrowsAsync<ConflictException>(() => _host.CallAsync<IPromotionService, PromotionDto>(s => s.UpdateAsync(new UpdatePromotionRequest
        {
            Name = promo.Name, StartAt = promo.StartAt, EndAt = promo.EndAt, Version = promo.Version
        })));
        Assert.Equal(SalesErrors.DuLieuCu, stale.Extensions["code"]);

        // TC-03: landing giá thường, không giá gạch; C01 × 1 = 480.000.
        var landing = await _host.CallAsync<IPublicLandingService, LandingPageDto>(s => s.GetLandingAsync());
        var c01 = landing.Combos.Single(c => c.Code == "C01");
        Assert.Equal((PriceType.GiaThuong, 450_000m, (decimal?)null), (c01.PriceType, c01.Price, c01.CompareAtPrice));
        var regular = await _s.PlaceAsync(await _s.RequestAsync("C01", 1, "0901000019"));
        Assert.Equal((PriceType.GiaThuong, 480_000m), (regular.Order.PriceType, regular.Order.Total));

        // TC-17: đổi sang C03 vẫn giá khuyến mãi đã chốt.
        var c03 = await _s.ComboAsync("C03");
        var d17 = await _s.CallAsync("nhanvien", o3.Id, CallResult.XacNhan, LandingScenario.ChangesOf(o3, c03.Id, 1));
        Assert.Equal((990_000m, 0m, 600_000m, OrderStatus.DaXacNhan), (d17.Subtotal, d17.ShippingFee, d17.UpsellAmount, d17.Status));

        // Đặt lại kết thúc 23:59:59 ngày kia → đang chạy lại.
        await _host.SignInAsync("quanly");
        var restored = await _host.CallAsync<IPromotionService, PromotionDto>(s => s.UpdateAsync(new UpdatePromotionRequest
        {
            Name = promo.Name, StartAt = promo.StartAt, EndAt = promo.EndAt, AutoRenewDays = 3, Version = ended.Version
        }));
        Assert.Equal(Domain.Enums.Cms.Catalog.PromotionStatus.DangChay, restored.Status);
    }

    [Fact]
    public async Task TC24_Receiving_Claim_Reassign_Scope()
    {
        await _host.SignInAsync("nhanvien");
        await _host.CallAsync<ITelesaleService, TelesaleDto>(s => s.SetMyReceivingAsync(false));
        var o = await _s.PlaceOrderAsync("C01", 1, "0901000014");
        Assert.Null(o.AssigneeId);

        var claimed = await _s.AsAsync("nhanvien", s => s.ClaimAsync(o.Id));
        Assert.Equal("Vũ Ngọc Ánh", claimed.AssigneeName);
        Assert.Contains(claimed.Events, e => e.Content == "Vũ Ngọc Ánh nhận đơn");
        var again = await Assert.ThrowsAsync<ConflictException>(() => _s.AsAsync("nhanvien2", s => s.ClaimAsync(o.Id)));
        Assert.Equal("Đơn đã được chia cho Vũ Ngọc Ánh", again.Message);

        var hangId = await _host.SignInAsync("nhanvien2");
        var result = await _s.AsAsync("quanly", s => s.ReassignAsync(new ReassignRequest { OrderIds = [o.Id], AssigneeId = hangId!.Value }));
        Assert.Equal("Đã chia lại 1 đơn cho Phạm Thu Hằng", result.Message);
        var forbidden = await Assert.ThrowsAsync<SalesForbiddenException>(() => _s.AsAsync("nhanvien", s => s.GetDetailAsync(o.Id)));
        Assert.Equal((SalesErrors.DonCuaNguoiKhac, "Đơn đang do Phạm Thu Hằng phụ trách"), (forbidden.Code, forbidden.Message));
        var mine = await _s.AsAsync("nhanvien", s => s.GetListAsync(new OrderQuery { PageSize = 100 }));
        Assert.DoesNotContain(mine.Items, i => i.Id == o.Id);
        var managerView = await _s.AsAsync("quanly", s => s.GetDetailAsync(o.Id));
        Assert.Contains(managerView.Events, e => e.Content == "Chia cho Phạm Thu Hằng");

        await Assert.ThrowsAsync<SalesNotFoundException>(() => _s.AsAsync("quanly", s => s.GetDetailAsync(Guid.NewGuid())));
        await _host.SignInAsync("quanly");
        var notStaff = await Assert.ThrowsAsync<DomainException>(() => _host.CallAsync<ITelesaleService, TelesaleDto>(s => s.SetMyReceivingAsync(true)));
        Assert.Equal(SalesErrors.KhongPhaiTelesale, notStaff.Extensions["code"]);

        // Nhận đơn bật lại: vòng xoay giữa nhanvien và nhanvien2 (LastAssignedAt nhỏ nhất trước).
        await _host.SignInAsync("nhanvien");
        await _host.CallAsync<ITelesaleService, TelesaleDto>(s => s.SetMyReceivingAsync(true));
        await _host.SignInAsync("nhanvien2");
        await _host.CallAsync<ITelesaleService, TelesaleDto>(s => s.SetMyReceivingAsync(true));
        var first = await _s.PlaceOrderAsync("C01", 1, "0901000010");
        var second = await _s.PlaceOrderAsync("C01", 1, "0901000012");
        Assert.Equal("Phạm Thu Hằng", first.AssigneeName);
        Assert.Equal("Vũ Ngọc Ánh", second.AssigneeName);
    }

    [Fact]
    public async Task ConfirmWithInvalidChanges_ErrorKeysMatchFormFields()
    {
        var o = await _s.PlaceOrderAsync("C01", 1, "0901000015");
        var changes = LandingScenario.ChangesOf(o, Guid.NewGuid(), 9);
        changes.CustomerName = "Anh 123";
        changes.Address = "Q1";
        var err = await Assert.ThrowsAsync<ValidationException>(() => _s.CallAsync("nhanvien", o.Id, CallResult.XacNhan, changes));
        // Khóa lỗi giống PUT /api/orders/{id} (không tiền tố "changes."), FE gắn thẳng vào ô form xác nhận.
        Assert.Equal(["address", "customerName", "quantity"], err.Errors.Select(e => e.PropertyName).Distinct().Order().ToArray());

        var unknownCombo = LandingScenario.ChangesOf(o, Guid.NewGuid(), 1);
        var comboErr = await Assert.ThrowsAsync<ValidationException>(() => _s.CallAsync("nhanvien", o.Id, CallResult.XacNhan, unknownCombo));
        Assert.Equal("comboId", comboErr.Errors.Single().PropertyName);
    }

    [Fact]
    public async Task VersionConflict_Returns409WithLatestOrder()
    {
        var o = await _s.PlaceOrderAsync("C01", 1, "0901000006");
        await _s.AsAsync("nhanvien", s => s.AddNoteAsync(o.Id, new AddNoteRequest { Content = "Khách hẹn gọi sau giờ trưa" }));
        await _s.CallAsync("nhanvien", o.Id, CallResult.KhongNgheMay);
        var ex = await Assert.ThrowsAsync<ConflictException>(() => _s.AsAsync("nhanvien", s => s.RecordCallAsync(o.Id,
            new RecordCallRequest { Result = CallResult.XacNhan, Version = o.Version })));
        Assert.Equal(SalesErrors.DonDaThayDoi, ex.Extensions["code"]);
        var latest = Assert.IsType<OrderDetailDto>(ex.Extensions["order"]);
        Assert.Equal(OrderStatus.ChoGoiLai, latest.Status);
        Assert.Contains(latest.Events, e => e.Type == OrderEventType.GhiChu);
    }

    [Fact]
    public async Task TC27_Delivered_Revenue_TC29_Cancel_TC36_TelesaleReport()
    {
        await _host.SignInAsync("quanly");
        var before = await _host.CallAsync<ISalesReportService, DailyReport>(s => s.GetDailyAsync(new DateRangeQuery { From = "2026-10-15", To = "2026-10-15" }));

        var o = await _s.PlaceOrderAsync("C01", 1, "0901000006");
        await _s.CallAsync("nhanvien", o.Id, CallResult.XacNhan);
        await _s.AsAsync("nhanvien", s => s.HandoverAsync(new HandoverRequest { OrderIds = [o.Id], Carrier = Carrier.GHN }));
        var shipped = await _s.OrderByCodeAsync(o.Code);
        var delivered = await _s.AsAsync("nhanvien", s => s.DeliverAsync(o.Id, shipped.Version));
        Assert.Equal(OrderStatus.DaGiao, delivered.Status);
        Assert.NotNull(delivered.Shipment!.DeliveredAt);

        await _host.SignInAsync("quanly");
        var after = await _host.CallAsync<ISalesReportService, DailyReport>(s => s.GetDailyAsync(new DateRangeQuery { From = "2026-10-15", To = "2026-10-15" }));
        Assert.Equal(before.Totals.DeliveredRevenue + 390_000m, after.Totals.DeliveredRevenue);

        // TC-29: hủy đơn đã xác nhận, ghi người hủy.
        var o18 = await _s.PlaceOrderAsync("C02", 1, "0987654321");
        var confirmed = await _s.CallAsync("nhanvien", o18.Id, CallResult.XacNhan);
        await Assert.ThrowsAsync<ValidationException>(() => _s.AsAsync("nhanvien", s => s.CancelAsync(o18.Id, new CancelOrderRequest { Version = confirmed.Version })));
        var notDup = await Assert.ThrowsAsync<DomainException>(() => _s.AsAsync("nhanvien", s => s.CancelAsync(o18.Id,
            new CancelOrderRequest { Reason = CancelReason.DonTrung, Version = confirmed.Version })));
        Assert.Equal(SalesErrors.KhongPhaiDonTrung, notDup.Extensions["code"]);
        var cancelled = await _s.AsAsync("nhanvien", s => s.CancelAsync(o18.Id, new CancelOrderRequest { Reason = CancelReason.KhachDoiY, Version = confirmed.Version }));
        Assert.Equal((OrderStatus.DaHuy, CancelReason.KhachDoiY, "Vũ Ngọc Ánh"), (cancelled.Status, cancelled.CancelReason!.Value, cancelled.CancelledByName));

        // TC-36: upsell hai đơn hôm nay = 350.000 + 600.000.
        var a = await _s.PlaceOrderAsync("C01", 1, "0901000001");
        var b = await _s.PlaceOrderAsync("C01", 1, "0901000003");
        await _s.CallAsync("nhanvien", a.Id, CallResult.XacNhan, LandingScenario.ChangesOf(a, (await _s.ComboAsync("C02")).Id, 1));
        await _s.CallAsync("nhanvien", b.Id, CallResult.XacNhan, LandingScenario.ChangesOf(b, (await _s.ComboAsync("C03")).Id, 1));
        await _host.SignInAsync("quanly");
        var report = await _host.CallAsync<ISalesReportService, TelesaleReport>(s => s.GetTelesalesAsync(new DateRangeQuery { From = "2026-10-15", To = "2026-10-15" }));
        var anh = report.Rows.Single(r => r.FullName == "Vũ Ngọc Ánh");
        var anhId = anh.UserId;
        var upsellOrders = await _s.AsAsync("quanly", s => s.GetListAsync(new OrderQuery { ConfirmedById = anhId, UpsellOnly = true, From = "2026-10-15", To = "2026-10-15" }));
        Assert.Contains(upsellOrders.Items, i => i.Id == a.Id && i.UpsellAmount == 350_000m);
        Assert.Contains(upsellOrders.Items, i => i.Id == b.Id && i.UpsellAmount == 600_000m);
        Assert.Equal(anh.UpsellCount, upsellOrders.TotalCount);
        Assert.Equal(anh.UpsellValue, upsellOrders.Items.Sum(i => i.UpsellAmount));

        await _host.SignInAsync("nhanvien");
        var dash = await _host.CallAsync<IDashboardService, TelesaleDashboard>(s => s.GetTelesaleAsync());
        Assert.Equal(600_000m + 950_000m, dash.MyUpsellValueToday);
    }

    [Fact]
    public async Task TC34_Combos()
    {
        using var scope = _host.Services.CreateScope();
        var validator = scope.ServiceProvider.GetRequiredService<IValidator<SaveComboRequest>>();
        var bad = validator.Validate(new SaveComboRequest { Name = "Mua 1", Description = "1 chai", BottleCount = 1, PromoPrice = 460_000, RegularPrice = 450_000 });
        Assert.Contains(bad.Errors, e => e.ErrorMessage == "Giá khuyến mãi không lớn hơn giá thường");
        bad = validator.Validate(new SaveComboRequest { Name = "Mua 1", Description = "1 chai", BottleCount = 1, PromoPrice = 389_500, RegularPrice = 450_000 });
        Assert.Contains(bad.Errors, e => e.ErrorMessage == "Giá phải là bội số 1.000 ₫");

        await _host.SignInAsync("quanly");
        var c03 = await _s.ComboAsync("C03");
        var c02 = await _s.ComboAsync("C02");
        await _host.CallAsync<IComboService>(s => s.SetDefaultAsync(c03.Id));
        var combos = await _host.CallAsync<IComboService, IReadOnlyList<ComboDto>>(s => s.GetAllAsync());
        Assert.True(combos.Single(c => c.Code == "C03").IsDefault);
        Assert.False(combos.Single(c => c.Code == "C02").IsDefault);
        Assert.True(combos.Single(c => c.Code == "C02").OrderCount > 0);

        var created = await _host.CallAsync<IComboService, ComboDto>(s => s.CreateAsync(new SaveComboRequest
        {
            Name = "Mua 4", Description = "4 chai", BottleCount = 4, PromoPrice = 1_200_000, RegularPrice = 1_800_000, FreeShipping = true
        }));
        Assert.Equal(("C04", true, 40), (created.Code, created.IsVisible, created.SortOrder));
        var fifth = await _host.CallAsync<IComboService, ComboDto>(s => s.CreateAsync(new SaveComboRequest
        {
            Name = "Mua 5", Description = "5 chai", BottleCount = 5, PromoPrice = 1_500_000, RegularPrice = 2_250_000, FreeShipping = true
        }));
        Assert.False(fifth.IsVisible);
        var tooMany = await Assert.ThrowsAsync<DomainException>(() => _host.CallAsync<IComboService>(s => s.SetVisibilityAsync(fifth.Id, true)));
        Assert.Equal(SalesErrors.QuaSoComboHienThi, tooMany.Extensions["code"]);
        var hideDefault = await Assert.ThrowsAsync<DomainException>(() => _host.CallAsync<IComboService>(s => s.SetVisibilityAsync(c03.Id, false)));
        Assert.Equal(SalesErrors.ComboMacDinhKhongAn, hideDefault.Extensions["code"]);
        var hasOrders = await Assert.ThrowsAsync<DomainException>(() => _host.CallAsync<IComboService>(s => s.DeleteAsync(c02.Id)));
        Assert.Equal(SalesErrors.ComboDaCoDon, hasOrders.Extensions["code"]);
        await _host.CallAsync<IComboService>(s => s.DeleteAsync(fifth.Id));

        var landing = await _host.CallAsync<IPublicLandingService, LandingPageDto>(s => s.GetLandingAsync());
        Assert.True(landing.Combos.Single(c => c.Code == "C03").IsDefault);
    }

    [Fact]
    public async Task DemoReset_RestoresSeed()
    {
        await _s.PlaceOrderAsync("C01", 1, "0901000001");
        await _host.RunAsync(async sp =>
        {
            await sp.GetRequiredService<DemoDataResetter>().ResetAsync();
            return 0;
        });
        Assert.Equal(623, await _host.QueryAsync<Order, int>(q => q.CountAsync()));
        Assert.Equal(4342, await _host.QueryAsync<OrderEvent, int>(q => q.CountAsync()));
    }

    private static IReadOnlyList<string> ProjectCodes() =>
        typeof(ProjectPermissions).GetNestedTypes(BindingFlags.Public | BindingFlags.Static)
            .SelectMany(t => t.GetFields(BindingFlags.Public | BindingFlags.Static))
            .Where(f => f is { IsLiteral: true } && f.FieldType == typeof(string))
            .Select(f => (string)f.GetRawConstantValue()!)
            .ToList();

    [Fact]
    public void ProjectPermissions_DeclaredInSeedAndFe()
    {
        var codes = ProjectCodes();
        Assert.Equal(17, codes.Count);
        var seeded = SystemSeedData.Embedded.Permissions.Select(p => p.Code).ToHashSet();
        Assert.All(codes, c => Assert.Contains(c, seeded));

        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null && !File.Exists(Path.Combine(dir.FullName, "FE", "src", "config", "permissions.ts")))
            dir = dir.Parent;
        Assert.NotNull(dir);
        var fe = File.ReadAllText(Path.Combine(dir!.FullName, "FE", "src", "config", "permissions.ts"));
        Assert.All(codes, c => Assert.Contains($"'{c}'", fe));
    }

    [Theory]
    [InlineData("nhanvien", "orders.view", true)]
    [InlineData("nhanvien", "orders.call", true)]
    [InlineData("nhanvien", "orders.ship", true)]
    [InlineData("nhanvien", "orders.cancel", true)]
    [InlineData("nhanvien", "combos.view", true)]
    [InlineData("nhanvien", "orders.view-all", false)]
    [InlineData("nhanvien", "orders.export", false)]
    [InlineData("nhanvien", "orders.assign", false)]
    [InlineData("nhanvien", "reports.view", false)]
    [InlineData("nhanvien", "combos.update", false)]
    [InlineData("quanly", "orders.view-all", true)]
    [InlineData("quanly", "reports.view", true)]
    [InlineData("quanly", "ad-costs.update", true)]
    [InlineData("quanly", "landing-contents.update", true)]
    [InlineData("admin", "orders.assign", true)]
    public async Task RolePermissions(string username, string permission, bool expected)
    {
        var userId = await _host.SignInAsync(username);
        Assert.Equal(expected, await _host.CallAsync<IPermissionService, bool>(s => s.HasPermissionAsync(userId!.Value, permission)));
    }

    [Fact]
    public async Task AdCosts_Crud()
    {
        await _host.SignInAsync("quanly");
        var created = await _host.CallAsync<IAdCostService, AdCostDto>(s => s.CreateAsync(new SaveAdCostRequest
        {
            Date = "2026-10-15", Source = "FB", Campaign = "serum_t10", Amount = 300_000
        }));
        Assert.Equal(("facebook", "serum_t10"), (created.Source, created.Campaign));
        var dup = await Assert.ThrowsAsync<ConflictException>(() => _host.CallAsync<IAdCostService, AdCostDto>(s => s.CreateAsync(new SaveAdCostRequest
        {
            Date = "2026-10-15", Source = "facebook", Campaign = "serum_t10", Amount = 100_000
        })));
        Assert.Equal("date", dup.Field);
        await Assert.ThrowsAsync<ValidationException>(() => _host.CallAsync<IAdCostService, AdCostDto>(s => s.CreateAsync(new SaveAdCostRequest
        {
            Date = "2026-10-16", Source = "facebook", Amount = 100_000
        })));
        await _host.CallAsync<IAdCostService>(s => s.DeleteAsync(created.Id));
    }
}
