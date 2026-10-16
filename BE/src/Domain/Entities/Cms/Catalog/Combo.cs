using Domain.Base;
using Domain.Entities.Sales;
using Domain.Enums.Sales.Orders;

namespace Domain.Entities.Cms.Catalog;

/// <summary>Combo bán trên landing (06 §4 <c>Cms_Combos</c>, BR-01). Xóa mềm, mã unique trên mọi dòng.</summary>
public class Combo : BaseEntity, ICreationTracked, IModificationTracked, ISoftDelete
{
    public const int CodeMax = 5;
    public const int NameMax = 50;
    public const int DescriptionMax = 200;
    public const int GiftTextMax = 100;
    public const int BadgeMax = 30;
    public const int ImageUrlMax = 500;

    public string Code { get; private set; } = string.Empty;
    public Guid ProductId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public int BottleCount { get; private set; }
    public string? GiftText { get; private set; }
    public decimal PromoPrice { get; private set; }
    public decimal RegularPrice { get; private set; }
    public bool FreeShipping { get; private set; }
    public string? Badge { get; private set; }
    public string? ImageUrl { get; private set; }
    public int SortOrder { get; private set; }
    public bool IsDefault { get; private set; }
    public bool IsVisible { get; private set; }

    public Guid? CreatedBy { get; set; }
    public Guid? UpdatedBy { get; set; }
    public bool IsDeleted { get; set; }

    public static Combo Create(string code, Guid productId, int sortOrder, bool isVisible) =>
        new() { Code = code, ProductId = productId, SortOrder = sortOrder, IsVisible = isVisible };

    public void Update(string name, string description, int bottleCount, string? giftText, decimal promoPrice, decimal regularPrice,
        bool freeShipping, string? badge, string? imageUrl)
    {
        Name = name.Trim();
        Description = description.Trim();
        BottleCount = bottleCount;
        GiftText = TrimToNull(giftText);
        PromoPrice = promoPrice;
        RegularPrice = regularPrice;
        FreeShipping = freeShipping;
        Badge = TrimToNull(badge);
        ImageUrl = TrimToNull(imageUrl);
    }

    public decimal PriceOf(PriceType priceType) => OrderPricing.UnitPrice(PromoPrice, RegularPrice, priceType);

    public void SetVisible(bool visible) => IsVisible = visible;

    public void SetDefault(bool isDefault) => IsDefault = isDefault;

    public void SetSortOrder(int sortOrder) => SortOrder = sortOrder;

    private static string? TrimToNull(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
