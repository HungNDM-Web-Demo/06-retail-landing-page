using Application.Common.Models;
using Domain.Enums.Cms.Content;

namespace Application.DTOs.Content;

// Sản phẩm, khối nội dung, đánh giá (07 §2.4).

public sealed class ContentItemDto
{
    public string? Title { get; set; }
    public string? Text { get; set; }
    public string? Value { get; set; }
    public string? Icon { get; set; }
    public string? ImageUrl { get; set; }
    public string? AfterImageUrl { get; set; }
}

public sealed class ProductDto
{
    public Guid Id { get; init; }
    public string Code { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string ShortName { get; init; } = string.Empty;
    public string Volume { get; init; } = string.Empty;
    public string Unit { get; init; } = string.Empty;
    public string ShortDescription { get; init; } = string.Empty;
    public string? ImageUrl { get; init; }
    public DateTime UpdatedAt { get; init; }
}

public sealed class UpdateProductRequest
{
    public string Name { get; set; } = string.Empty;
    public string ShortName { get; set; } = string.Empty;
    public string Volume { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;
    public string ShortDescription { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
}

public sealed class LandingBlockDto
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
    public bool IsVisible { get; init; }

    /// <summary>Hero, Order, Footer.</summary>
    public bool IsRequired { get; init; }

    public DateTime UpdatedAt { get; init; }
}

public sealed class UpdateLandingBlockRequest
{
    public string Title { get; set; } = string.Empty;
    public string? Subtitle { get; set; }
    public string? Body { get; set; }
    public string? ImageUrl { get; set; }
    public string? CtaText { get; set; }
    public List<ContentItemDto> Items { get; set; } = [];
}

public sealed class ReviewDto
{
    public Guid Id { get; init; }
    public string CustomerName { get; init; } = string.Empty;
    public string Province { get; init; } = string.Empty;
    public int Rating { get; init; }
    public string Content { get; init; } = string.Empty;
    public string? AvatarUrl { get; init; }
    public string? PhotoUrl { get; init; }
    public DateTime ReviewedAt { get; init; }
    public int SortOrder { get; init; }
    public bool IsVisible { get; init; }
    public bool IsSample { get; init; }
}

public sealed class SaveReviewRequest
{
    public string CustomerName { get; set; } = string.Empty;
    public string Province { get; set; } = string.Empty;
    public int Rating { get; set; }
    public string Content { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public string? PhotoUrl { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public bool IsSample { get; set; }
}

/// <summary><c>GET /api/reviews?page&amp;pageSize&amp;search&amp;isVisible</c>.</summary>
public sealed class ReviewQuery : PaginationQuery
{
    public bool? IsVisible { get; set; }
}
