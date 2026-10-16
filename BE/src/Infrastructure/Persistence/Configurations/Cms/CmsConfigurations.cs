using System.Text.Json;
using System.Text.Json.Serialization;
using Domain.Entities.Cms.Catalog;
using Domain.Entities.Cms.Content;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations.Cms;

// Sản phẩm, combo, khuyến mãi, khối nội dung, đánh giá: Cms_* (06 §4). Viết trung lập provider.

public sealed class ProductConfiguration : IEntityTypeConfiguration<Product>
{
    public void Configure(EntityTypeBuilder<Product> builder)
    {
        builder.ToTable("Cms_Products");
        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.Property(x => x.Code).HasMaxLength(Product.CodeMax).IsRequired();
        builder.Property(x => x.Name).HasMaxLength(Product.NameMax).IsRequired();
        builder.Property(x => x.ShortName).HasMaxLength(Product.ShortNameMax).IsRequired();
        builder.Property(x => x.Volume).HasMaxLength(Product.VolumeMax).IsRequired();
        builder.Property(x => x.Unit).HasMaxLength(Product.UnitMax).IsRequired();
        builder.Property(x => x.ShortDescription).HasMaxLength(Product.ShortDescriptionMax).IsRequired();
        builder.Property(x => x.ImageUrl).HasMaxLength(Product.ImageUrlMax);
        builder.HasIndex(x => x.Code).IsUnique();
    }
}

public sealed class ComboConfiguration : IEntityTypeConfiguration<Combo>
{
    public void Configure(EntityTypeBuilder<Combo> builder)
    {
        builder.ToTable("Cms_Combos");
        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.Property(x => x.Code).HasMaxLength(Combo.CodeMax).IsRequired();
        builder.Property(x => x.Name).HasMaxLength(Combo.NameMax).IsRequired();
        builder.Property(x => x.Description).HasMaxLength(Combo.DescriptionMax).IsRequired();
        builder.Property(x => x.GiftText).HasMaxLength(Combo.GiftTextMax);
        builder.Property(x => x.PromoPrice).HasPrecision(18, 2);
        builder.Property(x => x.RegularPrice).HasPrecision(18, 2);
        builder.Property(x => x.Badge).HasMaxLength(Combo.BadgeMax);
        builder.Property(x => x.ImageUrl).HasMaxLength(Combo.ImageUrlMax);

        // Mã combo đã xóa không cấp lại: unique trên mọi dòng (06 §3).
        builder.HasIndex(x => x.Code).IsUnique();
        builder.HasIndex(x => new { x.IsVisible, x.SortOrder });

        builder.HasOne<Product>().WithMany().HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class PromotionConfiguration : IEntityTypeConfiguration<Promotion>
{
    public void Configure(EntityTypeBuilder<Promotion> builder)
    {
        builder.ToTable("Cms_Promotions");
        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.Property(x => x.Name).HasMaxLength(Promotion.NameMax).IsRequired();
        builder.Property(x => x.Version).IsConcurrencyToken();
    }
}

public sealed class LandingBlockConfiguration : IEntityTypeConfiguration<LandingBlock>
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public void Configure(EntityTypeBuilder<LandingBlock> builder)
    {
        builder.ToTable("Cms_LandingBlocks");
        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.Property(x => x.Title).HasMaxLength(LandingBlock.TitleMax).IsRequired();
        builder.Property(x => x.Subtitle).HasMaxLength(LandingBlock.SubtitleMax);
        builder.Property(x => x.ImageUrl).HasMaxLength(LandingBlock.ImageUrlMax);
        builder.Property(x => x.CtaText).HasMaxLength(LandingBlock.CtaTextMax);

        // Mảng ContentItem lưu chuỗi JSON (cột text, trung lập provider; 06 §4 ghi chú).
        builder.Property(x => x.Items)
            .HasConversion(
                items => JsonSerializer.Serialize(items, JsonOptions),
                json => JsonSerializer.Deserialize<List<ContentItem>>(json, JsonOptions) ?? new List<ContentItem>(),
                new ValueComparer<List<ContentItem>>(
                    (a, b) => JsonSerializer.Serialize(a, JsonOptions) == JsonSerializer.Serialize(b, JsonOptions),
                    v => JsonSerializer.Serialize(v, JsonOptions).GetHashCode(),
                    v => JsonSerializer.Deserialize<List<ContentItem>>(JsonSerializer.Serialize(v, JsonOptions), JsonOptions)!))
            .IsRequired();

        builder.Ignore(x => x.IsRequired);
        builder.HasIndex(x => x.Type).IsUnique();
    }
}

public sealed class ReviewConfiguration : IEntityTypeConfiguration<Review>
{
    public void Configure(EntityTypeBuilder<Review> builder)
    {
        builder.ToTable("Cms_Reviews");
        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.Property(x => x.CustomerName).HasMaxLength(Review.CustomerNameMax).IsRequired();
        builder.Property(x => x.Province).HasMaxLength(Review.ProvinceMax).IsRequired();
        builder.Property(x => x.Content).HasMaxLength(Review.ContentMax).IsRequired();
        builder.Property(x => x.AvatarUrl).HasMaxLength(Review.UrlMax);
        builder.Property(x => x.PhotoUrl).HasMaxLength(Review.UrlMax);
        builder.HasIndex(x => new { x.IsVisible, x.SortOrder });
    }
}
