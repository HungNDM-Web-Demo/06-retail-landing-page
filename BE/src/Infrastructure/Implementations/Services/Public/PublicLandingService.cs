using Application.Common.Models;
using Application.DTOs.Public;
using Application.Interfaces.Repositories;
using Application.Interfaces.Services.Public;
using Application.Mappings.Catalog;
using Application.Mappings.Content;
using Domain.Entities.Cms.Catalog;
using Domain.Entities.Cms.Content;
using Domain.Entities.Sales;
using Domain.Entities.Sales.Orders;
using Domain.Entities.System.Settings;
using Domain.Enums.Cms.Content;
using Domain.Enums.Sales.Orders;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Implementations.Services.Public;

/// <summary>
/// Dữ liệu landing công khai (07 §2.1, FR-04…FR-08, FR-13, NFR-04): thông tin shop từ <c>Store.*</c>, <c>Brand.*</c>; khối, combo,
/// đánh giá đang hiện; khuyến mãi theo giờ máy chủ (§3.3). Chỉ trả trường công khai.
/// </summary>
public sealed class PublicLandingService(
    IGenericRepository<Setting> settings,
    IGenericRepository<Product> products,
    IGenericRepository<Combo> combos,
    IGenericRepository<Promotion> promotions,
    IGenericRepository<LandingBlock> blocks,
    IGenericRepository<Review> reviews,
    IGenericRepository<Order> orders,
    TimeProvider time) : IPublicLandingService
{
    private static readonly string[] StoreKeys =
    [
        "Store.Name", "Store.Tagline", "Store.Hotline", "Store.Email", "Store.Address", "Store.WorkingHours", "Store.BusinessInfo",
        "Brand.LogoUrl", "Brand.PrimaryColor"
    ];

    private DateTime Now => time.GetUtcNow().UtcDateTime;

    public async Task<LandingPageDto> GetLandingAsync(CancellationToken ct = default)
    {
        var now = Now;
        var store = await StoreAsync(ct);
        var product = await products.QueryNoTracking().OrderBy(p => p.Code).FirstOrDefaultAsync(ct);
        var promotion = await promotions.QueryNoTracking().OrderBy(p => p.CreatedAt).FirstOrDefaultAsync(ct);
        var priceType = promotion?.PriceTypeAt(now) ?? PriceType.GiaThuong;

        var visibleCombos = (await combos.QueryNoTracking().Where(c => c.IsVisible).OrderBy(c => c.SortOrder).ThenBy(c => c.Code).ToListAsync(ct))
            .Select(c => c.ToPublic(priceType))
            .ToList();

        var visibleReviews = await reviews.QueryNoTracking().Where(r => r.IsVisible)
            .Select(r => new { r.Rating }).ToListAsync(ct);
        var topReviews = await reviews.QueryNoTracking().Where(r => r.IsVisible)
            .OrderBy(r => r.SortOrder).ThenBy(r => r.CreatedAt).Take(SalesRules.LandingReviewCount).ToListAsync(ct);

        var blockList = await blocks.QueryNoTracking().Where(b => b.IsVisible).OrderBy(b => b.SortOrder).ToListAsync(ct);
        if (visibleReviews.Count == 0)
            blockList = blockList.Where(b => b.Type != BlockType.Reviews).ToList();

        return new LandingPageDto
        {
            Store = store,
            Product = product?.ToPublic() ?? new PublicProduct(),
            Blocks = blockList.Select(b => b.ToPublic()).ToList(),
            Combos = visibleCombos,
            Promotion = promotion?.ToPublic(now) ?? new PublicPromotion { Status = Domain.Enums.Cms.Catalog.PromotionStatus.DaKetThuc, AsOf = now },
            MinPricePerBottle = visibleCombos.Count == 0 ? 0 : visibleCombos.Min(c => c.PricePerBottle),
            ReviewSummary = new ReviewSummary
            {
                Total = visibleReviews.Count,
                Average = visibleReviews.Count == 0
                    ? 0
                    : Math.Round((decimal)visibleReviews.Sum(r => r.Rating) / visibleReviews.Count, 1, MidpointRounding.AwayFromZero)
            },
            Reviews = topReviews.Select(r => r.ToPublic()).ToList(),
            ShippingFee = SalesRules.ShippingFee,
            FreeShippingThreshold = SalesRules.FreeShippingThreshold,
            AsOf = now
        };
    }

    public async Task<PublicPromotion> GetPromotionAsync(CancellationToken ct = default)
    {
        var now = Now;
        var promotion = await promotions.QueryNoTracking().OrderBy(p => p.CreatedAt).FirstOrDefaultAsync(ct);
        return promotion?.ToPublic(now) ?? new PublicPromotion { Status = Domain.Enums.Cms.Catalog.PromotionStatus.DaKetThuc, AsOf = now };
    }

    public async Task<PaginatedResult<PublicReview>> GetReviewsAsync(int page, int pageSize, CancellationToken ct = default)
    {
        page = page < 1 ? 1 : page;
        pageSize = pageSize < 1 ? SalesRules.ReviewPageSize : Math.Min(pageSize, PaginationQuery.MaxPageSize);
        var query = reviews.QueryNoTracking().Where(r => r.IsVisible);
        var total = await query.CountAsync(ct);
        var items = await query.OrderBy(r => r.SortOrder).ThenBy(r => r.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);
        return new PaginatedResult<PublicReview>
        {
            Items = items.Select(r => r.ToPublic()).ToList(),
            Page = page,
            PageSize = pageSize,
            TotalCount = total
        };
    }

    /// <summary>BR-21: đơn trong 48 giờ, chưa hủy, mới nhất trước, tối đa 10; tên gọi = từ cuối của họ tên; không trả SĐT, địa chỉ.</summary>
    public async Task<IReadOnlyList<RecentOrderNotice>> GetRecentOrdersAsync(CancellationToken ct = default)
    {
        var now = Now;
        var since = now.AddHours(-SalesRules.RecentOrderHours);
        var rows = await orders.QueryNoTracking()
            .Where(o => o.PlacedAt >= since && o.PlacedAt <= now && o.Status != OrderStatus.DaHuy)
            .OrderByDescending(o => o.PlacedAt)
            .Take(SalesRules.RecentOrderMax)
            .Select(o => new { o.CustomerName, o.Province, o.PlacedComboName, o.PlacedAt })
            .ToListAsync(ct);

        return rows.Select(o => new RecentOrderNotice
        {
            DisplayName = o.CustomerName.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries).LastOrDefault() ?? o.CustomerName,
            Province = o.Province,
            ComboName = o.PlacedComboName,
            PlacedAt = o.PlacedAt
        }).ToList();
    }

    private async Task<PublicStoreInfo> StoreAsync(CancellationToken ct)
    {
        var values = await settings.QueryNoTracking().Where(s => StoreKeys.Contains(s.Key))
            .ToDictionaryAsync(s => s.Key, s => s.Value, ct);
        string? Get(string key) => values.TryGetValue(key, out var v) && !string.IsNullOrWhiteSpace(v) ? v : null;

        return new PublicStoreInfo
        {
            Name = Get("Store.Name") ?? string.Empty,
            Tagline = Get("Store.Tagline"),
            Hotline = Get("Store.Hotline") ?? string.Empty,
            Email = Get("Store.Email"),
            Address = Get("Store.Address") ?? string.Empty,
            WorkingHours = Get("Store.WorkingHours") ?? string.Empty,
            BusinessInfo = Get("Store.BusinessInfo"),
            LogoUrl = Get("Brand.LogoUrl") ?? string.Empty,
            PrimaryColor = Get("Brand.PrimaryColor") ?? string.Empty
        };
    }
}
