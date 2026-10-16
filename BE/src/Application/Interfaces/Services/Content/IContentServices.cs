using Application.Common.Models;
using Application.DTOs.Content;

namespace Application.Interfaces.Services.Content;

/// <summary>Sản phẩm chủ lực (07 §2.4).</summary>
public interface IProductService
{
    Task<ProductDto> GetAsync(CancellationToken ct = default);

    Task<ProductDto> UpdateAsync(UpdateProductRequest request, CancellationToken ct = default);
}

/// <summary>Khối nội dung landing (07 §2.4, FR-17).</summary>
public interface ILandingBlockService
{
    Task<IReadOnlyList<LandingBlockDto>> GetAllAsync(CancellationToken ct = default);

    Task<LandingBlockDto> UpdateAsync(Guid id, UpdateLandingBlockRequest request, CancellationToken ct = default);

    Task SetVisibilityAsync(Guid id, bool isVisible, CancellationToken ct = default);

    Task ReorderAsync(IReadOnlyList<Guid> ids, CancellationToken ct = default);
}

/// <summary>Đánh giá khách hàng (07 §2.4, FR-18).</summary>
public interface IReviewService
{
    Task<PaginatedResult<ReviewDto>> GetPagedAsync(ReviewQuery query, CancellationToken ct = default);

    Task<ReviewDto> CreateAsync(SaveReviewRequest request, CancellationToken ct = default);

    Task<ReviewDto> UpdateAsync(Guid id, SaveReviewRequest request, CancellationToken ct = default);

    Task SetVisibilityAsync(Guid id, bool isVisible, CancellationToken ct = default);

    Task ReorderAsync(IReadOnlyList<Guid> ids, CancellationToken ct = default);
}
