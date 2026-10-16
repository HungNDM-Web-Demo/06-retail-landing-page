namespace Application.DTOs.Common;

/// <summary>Ẩn, hiện combo, khối, đánh giá (07 §2.3, §2.4).</summary>
public sealed class SetVisibilityRequest
{
    public bool IsVisible { get; set; }
}

/// <summary>Sắp xếp: đủ mọi Id, đánh lại 10, 20, 30…</summary>
public sealed class ReorderRequest
{
    public List<Guid> Ids { get; set; } = [];
}

/// <summary>Thao tác đơn chỉ cần <c>version</c> (Đã giao, Không phải trùng).</summary>
public sealed class VersionRequest
{
    public int Version { get; set; }
}
