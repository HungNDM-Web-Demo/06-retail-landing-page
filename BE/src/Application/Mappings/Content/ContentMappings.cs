using Application.DTOs.Content;
using Application.DTOs.Public;
using Domain.Entities.Cms.Catalog;
using Domain.Entities.Cms.Content;

namespace Application.Mappings.Content;

public static class ContentMappings
{
    public static ProductDto ToDto(this Product entity) => new()
    {
        Id = entity.Id,
        Code = entity.Code,
        Name = entity.Name,
        ShortName = entity.ShortName,
        Volume = entity.Volume,
        Unit = entity.Unit,
        ShortDescription = entity.ShortDescription,
        ImageUrl = entity.ImageUrl,
        UpdatedAt = entity.UpdatedAt ?? entity.CreatedAt
    };

    public static PublicProduct ToPublic(this Product entity) => new()
    {
        Id = entity.Id,
        Code = entity.Code,
        Name = entity.Name,
        ShortName = entity.ShortName,
        Volume = entity.Volume,
        Unit = entity.Unit,
        ShortDescription = entity.ShortDescription,
        ImageUrl = entity.ImageUrl
    };

    public static ContentItemDto ToDto(this ContentItem item) => new()
    {
        Title = item.Title,
        Text = item.Text,
        Value = item.Value,
        Icon = item.Icon,
        ImageUrl = item.ImageUrl,
        AfterImageUrl = item.AfterImageUrl
    };

    public static ContentItem ToEntity(this ContentItemDto item) => new()
    {
        Title = item.Title,
        Text = item.Text,
        Value = item.Value,
        Icon = item.Icon,
        ImageUrl = item.ImageUrl,
        AfterImageUrl = item.AfterImageUrl
    };

    public static LandingBlockDto ToDto(this LandingBlock entity) => new()
    {
        Id = entity.Id,
        Type = entity.Type,
        Title = entity.Title,
        Subtitle = entity.Subtitle,
        Body = entity.Body,
        ImageUrl = entity.ImageUrl,
        CtaText = entity.CtaText,
        Items = entity.Items.Select(i => i.ToDto()).ToList(),
        SortOrder = entity.SortOrder,
        IsVisible = entity.IsVisible,
        IsRequired = entity.IsRequired,
        UpdatedAt = entity.UpdatedAt ?? entity.CreatedAt
    };

    public static PublicBlock ToPublic(this LandingBlock entity) => new()
    {
        Id = entity.Id,
        Type = entity.Type,
        Title = entity.Title,
        Subtitle = entity.Subtitle,
        Body = entity.Body,
        ImageUrl = entity.ImageUrl,
        CtaText = entity.CtaText,
        Items = entity.Items.Select(i => i.ToDto()).ToList(),
        SortOrder = entity.SortOrder
    };

    public static ReviewDto ToDto(this Review entity) => new()
    {
        Id = entity.Id,
        CustomerName = entity.CustomerName,
        Province = entity.Province,
        Rating = entity.Rating,
        Content = entity.Content,
        AvatarUrl = entity.AvatarUrl,
        PhotoUrl = entity.PhotoUrl,
        ReviewedAt = entity.ReviewedAt,
        SortOrder = entity.SortOrder,
        IsVisible = entity.IsVisible,
        IsSample = entity.IsSample
    };

    public static PublicReview ToPublic(this Review entity) => new()
    {
        Id = entity.Id,
        CustomerName = entity.CustomerName,
        Province = entity.Province,
        Rating = entity.Rating,
        Content = entity.Content,
        AvatarUrl = entity.AvatarUrl,
        PhotoUrl = entity.PhotoUrl,
        ReviewedAt = entity.ReviewedAt,
        IsSample = entity.IsSample
    };
}
