using Domain.Enums.Sales.Orders;

namespace Domain.Entities.Sales;

/// <summary>Tiền hàng, phí vận chuyển, tổng, giá mỗi chai, upsell (07 §3.1, BR-01, BR-02, BR-03, BR-12). Mọi số tiền là số nguyên đồng.</summary>
public static class OrderPricing
{
    public readonly record struct Amounts(decimal UnitPrice, decimal Subtotal, decimal ShippingFee, decimal Total);

    public static decimal UnitPrice(decimal promoPrice, decimal regularPrice, PriceType priceType) =>
        priceType == PriceType.KhuyenMai ? promoPrice : regularPrice;

    /// <summary>Tiền hàng = đơn giá × số lượng; phí 0 khi combo miễn phí ship hoặc tiền hàng ≥ 500.000 ₫.</summary>
    public static Amounts Calculate(decimal unitPrice, int quantity, bool freeShipping)
    {
        var subtotal = unitPrice * quantity;
        var shipping = freeShipping || subtotal >= SalesRules.FreeShippingThreshold ? 0m : SalesRules.ShippingFee;
        return new Amounts(unitPrice, subtotal, shipping, subtotal + shipping);
    }

    /// <summary><c>floor(price / bottleCount / 1.000) × 1.000</c>.</summary>
    public static decimal PricePerBottle(decimal price, int bottleCount) =>
        bottleCount <= 0 ? price : Math.Floor(price / bottleCount / SalesRules.PriceStep) * SalesRules.PriceStep;

    /// <summary><c>max(0, tiền hàng lúc xác nhận − tiền hàng lúc đặt)</c> (BR-12).</summary>
    public static decimal Upsell(decimal subtotal, decimal placedSubtotal) => Math.Max(0m, subtotal - placedSubtotal);

    public static bool IsValidPrice(decimal price) => price > 0 && price % SalesRules.PriceStep == 0;
}
