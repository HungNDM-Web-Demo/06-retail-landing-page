using Application.DTOs.Content;
using Domain.Enums.Cms.Catalog;
using Domain.Enums.Cms.Content;
using Domain.Enums.Sales.Orders;
using Domain.Enums.Sales.Tracking;

namespace Application.DTOs.Public;

// API công khai /api/public/* (07 §2.1). Chỉ trường công khai, khớp FE src/types/landing.ts.

public sealed class PublicStoreInfo
{
    public string Name { get; init; } = string.Empty;
    public string? Tagline { get; init; }
    public string Hotline { get; init; } = string.Empty;
    public string? Email { get; init; }
    public string Address { get; init; } = string.Empty;
    public string WorkingHours { get; init; } = string.Empty;
    public string? BusinessInfo { get; init; }
    public string LogoUrl { get; init; } = string.Empty;
    public string PrimaryColor { get; init; } = string.Empty;
}

public sealed class PublicCombo
{
    public Guid Id { get; init; }
    public string Code { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public int BottleCount { get; init; }
    public string? GiftText { get; init; }
    public string? ImageUrl { get; init; }
    public string? Badge { get; init; }
    public bool IsDefault { get; init; }

    /// <summary>Theo trạng thái khuyến mãi lúc đọc.</summary>
    public PriceType PriceType { get; init; }

    /// <summary>Giá đang áp dụng.</summary>
    public decimal Price { get; init; }

    /// <summary>Giá thường, chỉ khi đang khuyến mãi (gạch ngang).</summary>
    public decimal? CompareAtPrice { get; init; }

    public decimal PricePerBottle { get; init; }
    public bool FreeShipping { get; init; }

    /// <summary>Phí khi mua 1 suất: 0 hoặc 30.000.</summary>
    public decimal ShippingFeeForOne { get; init; }
}

public sealed class PublicPromotion
{
    public string Name { get; init; } = string.Empty;
    public PromotionStatus Status { get; init; }
    public DateTime StartAt { get; init; }

    /// <summary>Kết thúc sau khi tự gia hạn (<c>effectiveEndAt</c>).</summary>
    public DateTime EndAt { get; init; }

    public DateTime AsOf { get; init; }
}

public sealed class PublicReview
{
    public Guid Id { get; init; }
    public string CustomerName { get; init; } = string.Empty;
    public string Province { get; init; } = string.Empty;
    public int Rating { get; init; }
    public string Content { get; init; } = string.Empty;
    public string? AvatarUrl { get; init; }
    public string? PhotoUrl { get; init; }
    public DateTime ReviewedAt { get; init; }
    public bool IsSample { get; init; }
}

public sealed class PublicBlock
{
    public Guid Id { get; init; }
    public BlockType Type { get; init; }
    public string Title { get; init; } = string.Empty;
    public string? Subtitle { get; init; }
    public string? Body { get; init; }
    public string? ImageUrl { get; init; }
    public string? CtaText { get; init; }
    public IReadOnlyList<ContentItemDto> Items { get; init; } = [];
    public int SortOrder { get; init; }
}

public sealed class PublicProduct
{
    public Guid Id { get; init; }
    public string Code { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string ShortName { get; init; } = string.Empty;
    public string Volume { get; init; } = string.Empty;
    public string Unit { get; init; } = string.Empty;
    public string ShortDescription { get; init; } = string.Empty;
    public string? ImageUrl { get; init; }
}

public sealed class ReviewSummary
{
    /// <summary>Điểm trung bình của đánh giá đang hiện, 1 chữ số thập phân.</summary>
    public decimal Average { get; init; }

    public int Total { get; init; }
}

public sealed class LandingPageDto
{
    public PublicStoreInfo Store { get; init; } = new();
    public PublicProduct Product { get; init; } = new();
    public IReadOnlyList<PublicBlock> Blocks { get; init; } = [];
    public IReadOnlyList<PublicCombo> Combos { get; init; } = [];
    public PublicPromotion Promotion { get; init; } = new();

    /// <summary>"chỉ từ 330.000 ₫/chai" (UC-01 bước 2); 0 khi không có combo đang hiện.</summary>
    public decimal MinPricePerBottle { get; init; }

    public ReviewSummary ReviewSummary { get; init; } = new();

    /// <summary>6 đánh giá đầu.</summary>
    public IReadOnlyList<PublicReview> Reviews { get; init; } = [];

    public decimal ShippingFee { get; init; }
    public decimal FreeShippingThreshold { get; init; }
    public DateTime AsOf { get; init; }
}

public sealed class Attribution
{
    public string Source { get; set; } = string.Empty;
    public string? Medium { get; set; }
    public string? Campaign { get; set; }
    public string? Content { get; set; }
    public string? Referrer { get; set; }
}

public sealed class RecordVisitRequest
{
    public string VisitorId { get; set; } = string.Empty;

    // UTM nguyên văn từ URL.
    public string? UtmSource { get; set; }
    public string? UtmMedium { get; set; }
    public string? UtmCampaign { get; set; }
    public string? UtmContent { get; set; }

    /// <summary>Nguồn lưu trên trình duyệt từ lần có UTM gần nhất, còn trong 7 ngày.</summary>
    public Attribution? StoredAttribution { get; set; }

    /// <summary><c>document.referrer</c> khi khác tên miền landing.</summary>
    public string? Referrer { get; set; }

    public DeviceType Device { get; set; }
    public string? Path { get; set; }
}

public sealed class RecordVisitResult
{
    public Guid VisitId { get; init; }
    public bool IsNewVisit { get; init; }
    public Attribution Attribution { get; init; } = new();
    public bool SaveAttribution { get; init; }
}

public sealed class TrackEventRequest
{
    public string VisitorId { get; set; } = string.Empty;
    public Guid? VisitId { get; set; }
    public ConversionEventType Type { get; set; }
}

public sealed class PlaceOrderRequest
{
    public string ClientRequestId { get; set; } = string.Empty;
    public string VisitorId { get; set; } = string.Empty;
    public Guid? VisitId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Province { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string? Note { get; set; }
    public Guid ComboId { get; set; }

    /// <summary>1–5.</summary>
    public int Quantity { get; set; }

    /// <summary>Giá combo khách đang thấy (<c>PublicCombo.price</c>).</summary>
    public decimal ExpectedPrice { get; set; }

    public Attribution? Attribution { get; set; }
    public DeviceType Device { get; set; }
}

public sealed class PlacedOrderSummary
{
    public string Code { get; init; } = string.Empty;
    public DateTime PlacedAt { get; init; }
    public string CustomerName { get; init; } = string.Empty;
    public string Phone { get; init; } = string.Empty;
    public string Province { get; init; } = string.Empty;
    public string Address { get; init; } = string.Empty;
    public string ComboName { get; init; } = string.Empty;
    public int Quantity { get; init; }
    public PriceType PriceType { get; init; }
    public decimal UnitPrice { get; init; }
    public decimal Subtotal { get; init; }
    public decimal ShippingFee { get; init; }
    public decimal Total { get; init; }

    /// <summary>Đặt ngoài 8:00–21:00 giờ Việt Nam (UC-02 4a).</summary>
    public bool OutsideWorkingHours { get; init; }
}

public sealed class PlaceOrderResult
{
    public PlacedOrderSummary Order { get; init; } = new();
    public bool Duplicate { get; init; }
}

/// <summary>Kết quả ghi kèm cờ đã tạo mới (201) hay trả lại bản cũ (200).</summary>
public sealed record WriteOutcome<T>(T Value, bool Created);

public sealed class RecentOrderNotice
{
    public string DisplayName { get; init; } = string.Empty;
    public string Province { get; init; } = string.Empty;
    public string ComboName { get; init; } = string.Empty;
    public DateTime PlacedAt { get; init; }
}
