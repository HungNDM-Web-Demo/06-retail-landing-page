using Application.DTOs.Catalog;
using Application.DTOs.Public;
using Domain.Entities.Cms.Catalog;
using Domain.Entities.Sales;
using Domain.Enums.Sales.Orders;

namespace Application.Mappings.Catalog;

public static class CatalogMappings
{
    public static PromotionDto ToDto(this Promotion entity, DateTime now)
    {
        var effectiveEnd = entity.EffectiveEndAt(now);
        return new PromotionDto
        {
            Id = entity.Id,
            Name = entity.Name,
            StartAt = entity.StartAt,
            EndAt = entity.EndAt,
            EffectiveEndAt = effectiveEnd,
            AutoRenewDays = entity.AutoRenewDays,
            Status = PromotionClock.Status(entity.StartAt, effectiveEnd, now),
            Version = entity.Version,
            AsOf = now
        };
    }

    public static PublicPromotion ToPublic(this Promotion entity, DateTime now)
    {
        var effectiveEnd = entity.EffectiveEndAt(now);
        return new PublicPromotion
        {
            Name = entity.Name,
            Status = PromotionClock.Status(entity.StartAt, effectiveEnd, now),
            StartAt = entity.StartAt,
            EndAt = effectiveEnd,
            AsOf = now
        };
    }

    public static ComboDto ToDto(this Combo entity, int orderCount) => new()
    {
        Id = entity.Id,
        Code = entity.Code,
        Name = entity.Name,
        Description = entity.Description,
        BottleCount = entity.BottleCount,
        GiftText = entity.GiftText,
        PromoPrice = entity.PromoPrice,
        RegularPrice = entity.RegularPrice,
        FreeShipping = entity.FreeShipping,
        Badge = entity.Badge,
        ImageUrl = entity.ImageUrl,
        SortOrder = entity.SortOrder,
        IsDefault = entity.IsDefault,
        IsVisible = entity.IsVisible,
        PromoPricePerBottle = OrderPricing.PricePerBottle(entity.PromoPrice, entity.BottleCount),
        RegularPricePerBottle = OrderPricing.PricePerBottle(entity.RegularPrice, entity.BottleCount),
        OrderCount = orderCount,
        UpdatedAt = entity.UpdatedAt ?? entity.CreatedAt
    };

    /// <summary>Combo trên landing theo mức giá đang áp dụng (07 §2.1 <c>PublicCombo</c>).</summary>
    public static PublicCombo ToPublic(this Combo entity, PriceType priceType)
    {
        var price = entity.PriceOf(priceType);
        return new PublicCombo
        {
            Id = entity.Id,
            Code = entity.Code,
            Name = entity.Name,
            Description = entity.Description,
            BottleCount = entity.BottleCount,
            GiftText = entity.GiftText,
            ImageUrl = entity.ImageUrl,
            Badge = entity.Badge,
            IsDefault = entity.IsDefault,
            PriceType = priceType,
            Price = price,
            CompareAtPrice = priceType == PriceType.KhuyenMai ? entity.RegularPrice : null,
            PricePerBottle = OrderPricing.PricePerBottle(price, entity.BottleCount),
            FreeShipping = entity.FreeShipping,
            ShippingFeeForOne = OrderPricing.Calculate(price, 1, entity.FreeShipping).ShippingFee
        };
    }
}
