using Domain.Base;
using Domain.Enums.Cms.Content;

namespace Domain.Entities.Cms.Content;

/// <summary>Một mục trong khối nội dung (07 §2.4 <c>ContentItem</c>); lưu dạng mảng JSON ở cột <c>Items</c>.</summary>
public sealed class ContentItem
{
    public string? Title { get; set; }
    public string? Text { get; set; }
    public string? Value { get; set; }
    public string? Icon { get; set; }
    public string? ImageUrl { get; set; }
    public string? AfterImageUrl { get; set; }
}

/// <summary>Khối nội dung landing, mỗi loại một dòng (06 §4 <c>Cms_LandingBlocks</c>, FR-04, FR-17). Không xóa, chỉ ẩn.</summary>
public class LandingBlock : BaseEntity, ICreationTracked, IModificationTracked
{
    public const int TitleMax = 150;
    public const int SubtitleMax = 300;
    public const int ImageUrlMax = 500;
    public const int CtaTextMax = 50;

    /// <summary>Khối luôn hiển thị (Hero đầu, Footer cuối; 07 §5 quyết định 6).</summary>
    public static readonly IReadOnlyList<BlockType> RequiredTypes = [BlockType.Hero, BlockType.Order, BlockType.Footer];

    public BlockType Type { get; private set; }
    public string Title { get; private set; } = string.Empty;
    public string? Subtitle { get; private set; }
    public string? Body { get; private set; }
    public string? ImageUrl { get; private set; }
    public string? CtaText { get; private set; }
    public List<ContentItem> Items { get; private set; } = [];
    public int SortOrder { get; private set; }
    public bool IsVisible { get; private set; } = true;

    public Guid? CreatedBy { get; set; }
    public Guid? UpdatedBy { get; set; }

    public bool IsRequired => RequiredTypes.Contains(Type);

    public static LandingBlock Create(BlockType type, int sortOrder) => new() { Type = type, SortOrder = sortOrder };

    public void Update(string title, string? subtitle, string? body, string? imageUrl, string? ctaText, IEnumerable<ContentItem> items)
    {
        Title = title.Trim();
        Subtitle = TrimToNull(subtitle);
        Body = string.IsNullOrWhiteSpace(body) ? null : body;
        ImageUrl = TrimToNull(imageUrl);
        CtaText = TrimToNull(ctaText);
        // Gán danh sách mới để EF nhận ra cột JSON đã đổi.
        Items = items.Select(Clean).ToList();
    }

    public void SetVisible(bool visible) => IsVisible = visible;

    public void SetSortOrder(int sortOrder) => SortOrder = sortOrder;

    private static ContentItem Clean(ContentItem item) => new()
    {
        Title = TrimToNull(item.Title),
        Text = TrimToNull(item.Text),
        Value = TrimToNull(item.Value),
        Icon = TrimToNull(item.Icon),
        ImageUrl = TrimToNull(item.ImageUrl),
        AfterImageUrl = TrimToNull(item.AfterImageUrl)
    };

    private static string? TrimToNull(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
