using Application.Common.Exceptions;
using Application.Common.Time;
using Application.DTOs.Catalog;
using Application.Interfaces.Repositories;
using Application.Interfaces.Services.Catalog;
using Application.Mappings.Catalog;
using Domain.Entities.Cms.Catalog;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Implementations.Services.Catalog;

/// <summary>Chương trình khuyến mãi một dòng (07 §2.2, FR-16, UC-11, TC-03). Lệch <c>version</c> → 409 <c>DuLieuCu</c>.</summary>
public sealed class PromotionService(IGenericRepository<Promotion> promotions, IUnitOfWork unitOfWork, TimeProvider time) : IPromotionService
{
    public async Task<PromotionDto> GetAsync(CancellationToken ct = default)
    {
        var promotion = await promotions.QueryNoTracking().OrderBy(p => p.CreatedAt).FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException("Chưa có chương trình khuyến mãi.");
        return promotion.ToDto(time.GetUtcNow().UtcDateTime);
    }

    public async Task<PromotionDto> UpdateAsync(UpdatePromotionRequest request, CancellationToken ct = default)
    {
        var promotion = await promotions.Query().OrderBy(p => p.CreatedAt).FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException("Chưa có chương trình khuyến mãi.");
        if (promotion.Version != request.Version)
            throw SalesProblems.Stale(promotion.Version);

        promotion.Update(request.Name, VietnamTime.ToUtc(request.StartAt), VietnamTime.ToUtc(request.EndAt), request.AutoRenewDays);
        try
        {
            await unitOfWork.SaveChangesAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            var current = await promotions.QueryNoTracking().Where(p => p.Id == promotion.Id).Select(p => p.Version).FirstAsync(ct);
            throw SalesProblems.Stale(current);
        }

        return promotion.ToDto(time.GetUtcNow().UtcDateTime);
    }
}
