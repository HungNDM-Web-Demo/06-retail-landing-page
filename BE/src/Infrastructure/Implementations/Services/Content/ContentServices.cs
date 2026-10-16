using Application.Common.Exceptions;
using Application.Common.Models;
using Application.Common.Time;
using Application.DTOs.Content;
using Application.Interfaces.Repositories;
using Application.Interfaces.Services.Content;
using Application.Mappings.Content;
using Domain.Entities.Cms.Catalog;
using Domain.Entities.Cms.Content;
using Domain.Entities.Sales;
using Domain.Enums.Cms.Content;
using FluentValidation;
using FluentValidation.Results;
using Infrastructure.Extensions;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Implementations.Services.Content;

/// <summary>Sản phẩm chủ lực một dòng (07 §2.4).</summary>
public sealed class ProductService(IGenericRepository<Product> products, IUnitOfWork unitOfWork) : IProductService
{
    public async Task<ProductDto> GetAsync(CancellationToken ct = default) => (await LoadAsync(false, ct)).ToDto();

    public async Task<ProductDto> UpdateAsync(UpdateProductRequest request, CancellationToken ct = default)
    {
        var product = await LoadAsync(true, ct);
        product.Update(request.Name, request.ShortName, request.Volume, request.Unit, request.ShortDescription, request.ImageUrl);
        await unitOfWork.SaveChangesAsync(ct);
        return product.ToDto();
    }

    private async Task<Product> LoadAsync(bool track, CancellationToken ct) =>
        await (track ? products.Query() : products.QueryNoTracking()).OrderBy(p => p.Code).FirstOrDefaultAsync(ct)
        ?? throw new NotFoundException("Chưa có sản phẩm.");
}

/// <summary>
/// Khối nội dung landing (07 §2.4, FR-17): Hero, Order, Footer luôn hiện (<c>KhoiBatBuoc</c>); Hero đầu, Footer cuối
/// (<c>ThuTuKhoiKhongHopLe</c>); kiểm mục theo loại khối (Faq, BeforeAfter).
/// </summary>
public sealed class LandingBlockService(IGenericRepository<LandingBlock> blocks, IUnitOfWork unitOfWork) : ILandingBlockService
{
    public async Task<IReadOnlyList<LandingBlockDto>> GetAllAsync(CancellationToken ct = default) =>
        (await blocks.QueryNoTracking().OrderBy(b => b.SortOrder).ToListAsync(ct)).Select(b => b.ToDto()).ToList();

    public async Task<LandingBlockDto> UpdateAsync(Guid id, UpdateLandingBlockRequest request, CancellationToken ct = default)
    {
        var block = await LoadAsync(id, ct);
        var items = request.Items ?? [];
        var failures = new List<ValidationFailure>();
        for (var i = 0; i < items.Count; i++)
        {
            var item = items[i];
            if (block.Type == BlockType.Faq)
            {
                if (string.IsNullOrWhiteSpace(item.Title))
                    failures.Add(new ValidationFailure($"items[{i}].title", "Nhập câu hỏi"));
                if (string.IsNullOrWhiteSpace(item.Text))
                    failures.Add(new ValidationFailure($"items[{i}].text", "Nhập câu trả lời"));
            }
            else if (block.Type == BlockType.BeforeAfter)
            {
                if (string.IsNullOrWhiteSpace(item.ImageUrl))
                    failures.Add(new ValidationFailure($"items[{i}].imageUrl", "Chọn ảnh trước"));
                if (string.IsNullOrWhiteSpace(item.AfterImageUrl))
                    failures.Add(new ValidationFailure($"items[{i}].afterImageUrl", "Chọn ảnh sau"));
            }
        }

        if (failures.Count > 0)
            throw new ValidationException(failures);

        block.Update(request.Title, request.Subtitle, request.Body, request.ImageUrl, request.CtaText, items.Select(i => i.ToEntity()));
        await unitOfWork.SaveChangesAsync(ct);
        return block.ToDto();
    }

    public async Task SetVisibilityAsync(Guid id, bool isVisible, CancellationToken ct = default)
    {
        var block = await LoadAsync(id, ct);
        if (!isVisible && block.IsRequired)
            throw SalesProblems.Bad(SalesErrors.KhoiBatBuoc, SalesErrors.KhoiBatBuocMessage(BlockLabel(block.Type)));
        block.SetVisible(isVisible);
        await unitOfWork.SaveChangesAsync(ct);
    }

    public async Task ReorderAsync(IReadOnlyList<Guid> ids, CancellationToken ct = default)
    {
        var list = await blocks.Query().ToListAsync(ct);
        if (ids.Count != list.Count || ids.Distinct().Count() != ids.Count || list.Any(b => !ids.Contains(b.Id)))
            throw new ValidationException([new ValidationFailure("ids", "Danh sách sắp xếp không đầy đủ")]);

        var ordered = ids.Select(id => list.First(b => b.Id == id)).ToList();
        if (ordered[0].Type != BlockType.Hero || ordered[^1].Type != BlockType.Footer)
            throw SalesProblems.Bad(SalesErrors.ThuTuKhoiKhongHopLe, SalesErrors.ThuTuKhoiKhongHopLeMessage);

        for (var i = 0; i < ordered.Count; i++)
            ordered[i].SetSortOrder((i + 1) * SalesRules.SortOrderStep);
        await unitOfWork.SaveChangesAsync(ct);
    }

    /// <summary>Tên hiển thị khối (FE <c>blockTypeLabels</c>).</summary>
    public static string BlockLabel(BlockType type) => type switch
    {
        BlockType.Hero => "Banner chính",
        BlockType.Problems => "Vấn đề của khách",
        BlockType.Benefits => "Công dụng",
        BlockType.Ingredients => "Thành phần",
        BlockType.Specs => "Thông tin sản phẩm, cách dùng",
        BlockType.BeforeAfter => "Trước và sau",
        BlockType.Reviews => "Đánh giá khách hàng",
        BlockType.Certificates => "Chứng nhận",
        BlockType.Commitments => "Cam kết",
        BlockType.Faq => "Câu hỏi thường gặp",
        BlockType.Order => "Combo và form đặt hàng",
        BlockType.Footer => "Chân trang",
        _ => type.ToString()
    };

    private async Task<LandingBlock> LoadAsync(Guid id, CancellationToken ct) =>
        await blocks.Query().FirstOrDefaultAsync(b => b.Id == id, ct) ?? throw new NotFoundException("Không tìm thấy khối nội dung.");
}

/// <summary>Đánh giá khách hàng (07 §2.4, FR-18): thêm cuối danh sách, đang hiện; không xóa, chỉ ẩn.</summary>
public sealed class ReviewService(IGenericRepository<Review> reviews, IUnitOfWork unitOfWork, TimeProvider time) : IReviewService
{
    public async Task<PaginatedResult<ReviewDto>> GetPagedAsync(ReviewQuery query, CancellationToken ct = default)
    {
        var source = reviews.QueryNoTracking();
        if (query.GetSearchTerm() is { } term)
        {
            var pattern = LikePattern.Contains(term);
            source = source.Where(r => AppDbFunctions.Matches(r.CustomerName, pattern) || AppDbFunctions.Matches(r.Content, pattern));
        }

        if (query.IsVisible is { } visible)
            source = source.Where(r => r.IsVisible == visible);

        var page = query.GetPage();
        var pageSize = query.GetPageSize();
        var total = await source.CountAsync(ct);
        var items = await source.OrderBy(r => r.SortOrder).ThenBy(r => r.CreatedAt).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);
        return new PaginatedResult<ReviewDto> { Items = items.Select(r => r.ToDto()).ToList(), Page = page, PageSize = pageSize, TotalCount = total };
    }

    public async Task<ReviewDto> CreateAsync(SaveReviewRequest request, CancellationToken ct = default)
    {
        var max = await reviews.QueryNoTracking().Select(r => (int?)r.SortOrder).MaxAsync(ct) ?? 0;
        var review = Review.Create(max + SalesRules.SortOrderStep);
        Apply(review, request);
        await reviews.AddAsync(review, ct);
        await unitOfWork.SaveChangesAsync(ct);
        return review.ToDto();
    }

    public async Task<ReviewDto> UpdateAsync(Guid id, SaveReviewRequest request, CancellationToken ct = default)
    {
        var review = await LoadAsync(id, ct);
        Apply(review, request);
        await unitOfWork.SaveChangesAsync(ct);
        return review.ToDto();
    }

    public async Task SetVisibilityAsync(Guid id, bool isVisible, CancellationToken ct = default)
    {
        var review = await LoadAsync(id, ct);
        review.SetVisible(isVisible);
        await unitOfWork.SaveChangesAsync(ct);
    }

    public async Task ReorderAsync(IReadOnlyList<Guid> ids, CancellationToken ct = default)
    {
        var list = await reviews.Query().ToListAsync(ct);
        if (ids.Count != list.Count || ids.Distinct().Count() != ids.Count || list.Any(r => !ids.Contains(r.Id)))
            throw new ValidationException([new ValidationFailure("ids", "Danh sách sắp xếp không đầy đủ")]);
        for (var i = 0; i < ids.Count; i++)
            list.First(r => r.Id == ids[i]).SetSortOrder((i + 1) * SalesRules.SortOrderStep);
        await unitOfWork.SaveChangesAsync(ct);
    }

    private void Apply(Review review, SaveReviewRequest r) =>
        review.Update(r.CustomerName, r.Province, r.Rating, r.Content, r.AvatarUrl, r.PhotoUrl,
            r.ReviewedAt is { } at ? VietnamTime.ToUtc(at)
            : review.ReviewedAt == default ? time.GetUtcNow().UtcDateTime : review.ReviewedAt,
            r.IsSample);

    private async Task<Review> LoadAsync(Guid id, CancellationToken ct) =>
        await reviews.Query().FirstOrDefaultAsync(r => r.Id == id, ct) ?? throw new NotFoundException("Không tìm thấy đánh giá.");
}
