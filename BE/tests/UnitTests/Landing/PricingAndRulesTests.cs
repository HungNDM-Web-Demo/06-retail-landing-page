using Domain.Entities.Sales;
using Domain.Enums.Cms.Catalog;
using Domain.Enums.Sales.Orders;

namespace UnitTests.Landing;

/// <summary>Công thức tiền, khuyến mãi, chuẩn hóa nguồn và số điện thoại (07 §3.1–§3.5, số tính sẵn).</summary>
public sealed class PricingAndRulesTests
{
    [Theory]
    [InlineData(390_000, 1, false, 390_000, 30_000, 420_000)]   // C01 × 1 (TC-05)
    [InlineData(450_000, 1, false, 450_000, 30_000, 480_000)]   // C01 × 1 giá thường (TC-03)
    [InlineData(390_000, 2, false, 780_000, 0, 780_000)]        // C01 × 2 (TC-06)
    [InlineData(740_000, 1, true, 740_000, 0, 740_000)]         // C02 (TC-12)
    [InlineData(990_000, 1, true, 990_000, 0, 990_000)]         // C03 (TC-17)
    [InlineData(990_000, 2, true, 1_980_000, 0, 1_980_000)]     // C03 × 2 (TC-07)
    [InlineData(390_000, 5, false, 1_950_000, 0, 1_950_000)]
    [InlineData(900_000, 1, true, 900_000, 0, 900_000)]
    [InlineData(1_350_000, 1, true, 1_350_000, 0, 1_350_000)]
    public void Amounts(int unit, int qty, bool free, int subtotal, int ship, int total)
    {
        var a = OrderPricing.Calculate(unit, qty, free);
        Assert.Equal((subtotal, ship, total), ((int)a.Subtotal, (int)a.ShippingFee, (int)a.Total));
    }

    [Theory]
    [InlineData(390_000, 1, 390_000)]
    [InlineData(740_000, 2, 370_000)]
    [InlineData(990_000, 3, 330_000)]
    [InlineData(450_000, 1, 450_000)]
    [InlineData(900_000, 2, 450_000)]
    [InlineData(1_350_000, 3, 450_000)]
    public void PricePerBottle(int price, int bottles, int expected) =>
        Assert.Equal(expected, OrderPricing.PricePerBottle(price, bottles));

    [Fact]
    public void Upsell()
    {
        Assert.Equal(350_000m, OrderPricing.Upsell(740_000, 390_000));
        Assert.Equal(600_000m, OrderPricing.Upsell(990_000, 390_000));
        Assert.Equal(950_000m, OrderPricing.Upsell(740_000, 390_000) + OrderPricing.Upsell(990_000, 390_000));
        Assert.Equal(250_000m, OrderPricing.Upsell(990_000, 740_000));
        Assert.Equal(0m, OrderPricing.Upsell(390_000, 740_000));
        Assert.False(OrderPricing.IsValidPrice(389_500));
    }

    /// <summary>07 §3.3: tự gia hạn chỉ từ ngày hôm sau ngày kết thúc (giờ VN); trong ngày kết thúc không gia hạn (TC-03, TC-17).</summary>
    [Fact]
    public void PromotionClock_AutoRenew()
    {
        var start = new DateTime(2026, 10, 7, 17, 0, 0, DateTimeKind.Utc);       // 00:00 08/10 VN
        var end = new DateTime(2026, 10, 17, 16, 59, 59, DateTimeKind.Utc);      // 23:59:59 17/10 VN
        var now = new DateTime(2026, 10, 15, 7, 0, 0, DateTimeKind.Utc);
        Assert.Equal(end, PromotionClock.EffectiveEndAt(end, 3, now));

        // Quản lý đặt kết thúc 1 phút trước: hết khuyến mãi tới hết ngày, giá thường.
        var ended = now.AddMinutes(-1);
        Assert.Equal(ended, PromotionClock.EffectiveEndAt(ended, 3, now));
        Assert.Equal(PriceType.GiaThuong, PromotionClock.PriceTypeAt(start, ended, now));
        Assert.Equal(PromotionStatus.DaKetThuc, PromotionClock.Status(start, ended, now));

        // Sáng hôm sau ngày kết thúc 17/10 → chu kỳ mới 23:59:59 20/10.
        var next = new DateTime(2026, 10, 18, 1, 0, 0, DateTimeKind.Utc);
        Assert.Equal(end.AddDays(3), PromotionClock.EffectiveEndAt(end, 3, next));
        Assert.Equal(end.AddDays(6), PromotionClock.EffectiveEndAt(end, 3, end.AddDays(3).AddMinutes(1)));
        Assert.Equal(end, PromotionClock.EffectiveEndAt(end, null, next));
        Assert.Equal(PromotionStatus.SapChay, PromotionClock.Status(start, end, start.AddSeconds(-1)));
    }

    [Theory]
    [InlineData("FB", "facebook")]
    [InlineData(" tt ", "tiktok")]
    [InlineData("gg", "google")]
    [InlineData("ZL", "zalo")]
    [InlineData("", "direct")]
    [InlineData("demo_test", "demo_test")]
    public void NormalizeSource(string input, string expected) => Assert.Equal(expected, SourceNormalizer.NormalizeSource(input));

    [Theory]
    [InlineData("m.facebook.com", "facebook")]
    [InlineData("l.facebook.com", "facebook")]
    [InlineData("www.google.com.vn", "google")]
    [InlineData("vt.tiktok.com", "tiktok")]
    [InlineData("zalo.me", "zalo")]
    [InlineData("coccoc.com", "coccoc.com")]
    public void SourceFromHost(string host, string expected) => Assert.Equal(expected, SourceNormalizer.SourceFromHost(host));

    [Theory]
    [InlineData("+84912345678", "0912345678", true)]
    [InlineData("84912345678", "0912345678", true)]
    [InlineData("0912 345.678", "0912345678", true)]
    [InlineData("0212345678", "0212345678", false)]
    [InlineData("09123", "09123", false)]
    public void Phone(string input, string normalized, bool valid)
    {
        Assert.Equal(normalized, PhoneNormalizer.Normalize(input));
        Assert.Equal(valid, PhoneNormalizer.IsValid(PhoneNormalizer.Normalize(input)));
    }

    [Fact]
    public void MoneyFormat() => Assert.Equal("1.980.000 ₫", SalesRules.FormatMoney(1_980_000));
}
