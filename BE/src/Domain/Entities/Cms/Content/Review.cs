using Domain.Base;

namespace Domain.Entities.Cms.Content;

/// <summary>Đánh giá khách hàng (06 §4 <c>Cms_Reviews</c>, FR-08, FR-18). Không xóa, chỉ ẩn.</summary>
public class Review : BaseEntity, ICreationTracked, IModificationTracked
{
    public const int CustomerNameMax = 50;
    public const int ProvinceMax = 50;
    public const int ContentMax = 1000;
    public const int UrlMax = 500;

    public string CustomerName { get; private set; } = string.Empty;
    public string Province { get; private set; } = string.Empty;
    public int Rating { get; private set; }
    public string Content { get; private set; } = string.Empty;
    public string? AvatarUrl { get; private set; }
    public string? PhotoUrl { get; private set; }
    public DateTime ReviewedAt { get; private set; }
    public int SortOrder { get; private set; }
    public bool IsVisible { get; private set; } = true;
    public bool IsSample { get; private set; }

    public Guid? CreatedBy { get; set; }
    public Guid? UpdatedBy { get; set; }

    public static Review Create(int sortOrder) => new() { SortOrder = sortOrder };

    public void Update(string customerName, string province, int rating, string content, string? avatarUrl, string? photoUrl,
        DateTime reviewedAt, bool isSample)
    {
        CustomerName = customerName.Trim();
        Province = province.Trim();
        Rating = rating;
        Content = content.Trim();
        AvatarUrl = string.IsNullOrWhiteSpace(avatarUrl) ? null : avatarUrl.Trim();
        PhotoUrl = string.IsNullOrWhiteSpace(photoUrl) ? null : photoUrl.Trim();
        ReviewedAt = reviewedAt;
        IsSample = isSample;
    }

    public void SetVisible(bool visible) => IsVisible = visible;

    public void SetSortOrder(int sortOrder) => SortOrder = sortOrder;
}
