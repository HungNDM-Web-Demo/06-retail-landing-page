using Domain.Enums.Cms.Catalog;

namespace Application.DTOs.Catalog;

// Khuyến mãi, combo (07 §2.2, §2.3).

public sealed class PromotionDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public DateTime StartAt { get; init; }

    /// <summary>Giá trị đã lưu.</summary>
    public DateTime EndAt { get; init; }

    /// <summary>Sau khi tự gia hạn (07 §3.3).</summary>
    public DateTime EffectiveEndAt { get; init; }

    /// <summary>null = tắt tự gia hạn.</summary>
    public int? AutoRenewDays { get; init; }

    public PromotionStatus Status { get; init; }
    public int Version { get; init; }
    public DateTime AsOf { get; init; }
}

public sealed class UpdatePromotionRequest
{
    public string Name { get; set; } = string.Empty;
    public DateTime StartAt { get; set; }
    public DateTime EndAt { get; set; }
    public int? AutoRenewDays { get; set; }
    public int Version { get; set; }
}

public sealed class ComboDto
{
    public Guid Id { get; init; }
    public string Code { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public int BottleCount { get; init; }
    public string? GiftText { get; init; }
    public decimal PromoPrice { get; init; }
    public decimal RegularPrice { get; init; }
    public bool FreeShipping { get; init; }
    public string? Badge { get; init; }
    public string? ImageUrl { get; init; }
    public int SortOrder { get; init; }
    public bool IsDefault { get; init; }
    public bool IsVisible { get; init; }
    public decimal PromoPricePerBottle { get; init; }
    public decimal RegularPricePerBottle { get; init; }

    /// <summary>Đơn có ComboId hoặc PlacedComboId là combo này.</summary>
    public int OrderCount { get; init; }

    public DateTime UpdatedAt { get; init; }
}

public sealed class SaveComboRequest
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int BottleCount { get; set; }
    public string? GiftText { get; set; }
    public decimal PromoPrice { get; set; }
    public decimal RegularPrice { get; set; }
    public bool FreeShipping { get; set; }
    public string? Badge { get; set; }
    public string? ImageUrl { get; set; }
}
