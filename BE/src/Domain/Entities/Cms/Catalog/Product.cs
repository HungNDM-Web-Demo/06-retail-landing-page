using Domain.Base;

namespace Domain.Entities.Cms.Catalog;

/// <summary>Sản phẩm chủ lực, một dòng (06 §4 <c>Cms_Products</c>, SRS §1.2).</summary>
public class Product : BaseEntity, ICreationTracked, IModificationTracked
{
    public const int CodeMax = 20;
    public const int NameMax = 150;
    public const int ShortNameMax = 50;
    public const int VolumeMax = 30;
    public const int UnitMax = 20;
    public const int ShortDescriptionMax = 500;
    public const int ImageUrlMax = 500;

    public string Code { get; private set; } = string.Empty;
    public string Name { get; private set; } = string.Empty;
    public string ShortName { get; private set; } = string.Empty;
    public string Volume { get; private set; } = string.Empty;
    public string Unit { get; private set; } = string.Empty;
    public string ShortDescription { get; private set; } = string.Empty;
    public string? ImageUrl { get; private set; }

    public Guid? CreatedBy { get; set; }
    public Guid? UpdatedBy { get; set; }

    public static Product Create(string code, string name, string shortName, string volume, string unit, string shortDescription, string? imageUrl)
    {
        var product = new Product { Code = code.Trim() };
        product.Update(name, shortName, volume, unit, shortDescription, imageUrl);
        return product;
    }

    public void Update(string name, string shortName, string volume, string unit, string shortDescription, string? imageUrl)
    {
        Name = name.Trim();
        ShortName = shortName.Trim();
        Volume = volume.Trim();
        Unit = unit.Trim();
        ShortDescription = shortDescription.Trim();
        ImageUrl = string.IsNullOrWhiteSpace(imageUrl) ? null : imageUrl.Trim();
    }
}
