using Application.Common.Exceptions;
using Application.DTOs.Catalog;
using Application.Interfaces.Repositories;
using Application.Interfaces.Services.Catalog;
using Application.Mappings.Catalog;
using Domain.Entities.Cms.Catalog;
using Domain.Entities.Sales;
using Domain.Entities.Sales.Orders;
using FluentValidation;
using FluentValidation.Results;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Implementations.Services.Catalog;

/// <summary>
/// Combo (07 §2.3, FR-15, BR-01): tối đa 4 combo hiện, đúng một combo mặc định (không ẩn, không xóa được), combo đã có đơn
/// không xóa được. Mã <c>C</c> + 2 số kế tiếp số lớn nhất đã cấp (kể cả combo đã xóa). Đơn cũ giữ giá đã chụp.
/// </summary>
public sealed class ComboService(
    IGenericRepository<Combo> combos,
    IGenericRepository<Product> products,
    IGenericRepository<Order> orders,
    IUnitOfWork unitOfWork) : IComboService
{
    public async Task<IReadOnlyList<ComboDto>> GetAllAsync(CancellationToken ct = default)
    {
        var list = await combos.QueryNoTracking().OrderBy(c => c.SortOrder).ThenBy(c => c.Code).ToListAsync(ct);
        var counts = await OrderCountsAsync(ct);
        return list.Select(c => c.ToDto(counts.GetValueOrDefault(c.Id))).ToList();
    }

    public async Task<ComboDto> CreateAsync(SaveComboRequest request, CancellationToken ct = default)
    {
        var product = await products.QueryNoTracking().OrderBy(p => p.Code).FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException("Chưa có sản phẩm.");
        var all = await combos.QueryNoTracking().IgnoreQueryFilters().Select(c => c.Code).ToListAsync(ct);
        var next = all.Select(c => int.TryParse(c.AsSpan(1), out var n) ? n : 0).DefaultIfEmpty(0).Max() + 1;
        var active = await combos.QueryNoTracking().Select(c => new { c.SortOrder, c.IsVisible }).ToListAsync(ct);
        var sortOrder = (active.Count == 0 ? 0 : active.Max(c => c.SortOrder)) + SalesRules.SortOrderStep;
        var visible = active.Count(c => c.IsVisible) < SalesRules.MaxVisibleCombos;

        var combo = Combo.Create($"C{next:D2}", product.Id, sortOrder, visible);
        Apply(combo, request);
        // Chưa có combo mặc định (vd đã xóa hết) thì combo mới đang hiện làm mặc định.
        if (visible && !await combos.QueryNoTracking().AnyAsync(c => c.IsDefault, ct))
            combo.SetDefault(true);
        await combos.AddAsync(combo, ct);
        await unitOfWork.SaveChangesAsync(ct);
        return combo.ToDto(0);
    }

    public async Task<ComboDto> UpdateAsync(Guid id, SaveComboRequest request, CancellationToken ct = default)
    {
        var combo = await LoadAsync(id, ct);
        Apply(combo, request);
        await unitOfWork.SaveChangesAsync(ct);
        var counts = await OrderCountsAsync(ct);
        return combo.ToDto(counts.GetValueOrDefault(combo.Id));
    }

    public async Task SetVisibilityAsync(Guid id, bool isVisible, CancellationToken ct = default)
    {
        var combo = await LoadAsync(id, ct);
        if (combo.IsVisible == isVisible)
            return;

        if (isVisible && await combos.QueryNoTracking().CountAsync(c => c.IsVisible, ct) >= SalesRules.MaxVisibleCombos)
            throw SalesProblems.Bad(SalesErrors.QuaSoComboHienThi, SalesErrors.QuaSoComboHienThiMessage);
        if (!isVisible && combo.IsDefault)
            throw SalesProblems.Bad(SalesErrors.ComboMacDinhKhongAn, SalesErrors.ComboMacDinhKhongAnMessage);

        combo.SetVisible(isVisible);
        await unitOfWork.SaveChangesAsync(ct);
    }

    /// <summary>TC-34: đặt mặc định, combo mặc định cũ tự bỏ.</summary>
    public async Task SetDefaultAsync(Guid id, CancellationToken ct = default)
    {
        var combo = await LoadAsync(id, ct);
        if (!combo.IsVisible)
            throw SalesProblems.Bad(SalesErrors.ComboDangAn, SalesErrors.ComboDangAnMessage);

        foreach (var other in await combos.Query().Where(c => c.IsDefault && c.Id != id).ToListAsync(ct))
            other.SetDefault(false);
        combo.SetDefault(true);
        await unitOfWork.SaveChangesAsync(ct);
    }

    public async Task ReorderAsync(IReadOnlyList<Guid> ids, CancellationToken ct = default)
    {
        var list = await combos.Query().ToListAsync(ct);
        if (ids.Count != list.Count || ids.Distinct().Count() != ids.Count || list.Any(c => !ids.Contains(c.Id)))
            throw new ValidationException([new ValidationFailure("ids", "Danh sách sắp xếp không đầy đủ")]);

        for (var i = 0; i < ids.Count; i++)
            list.First(c => c.Id == ids[i]).SetSortOrder((i + 1) * SalesRules.SortOrderStep);
        await unitOfWork.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var combo = await LoadAsync(id, ct);
        if (combo.IsDefault)
            throw SalesProblems.Bad(SalesErrors.ComboMacDinhKhongAn, SalesErrors.ComboMacDinhKhongAnMessage);

        var orderCount = await orders.QueryNoTracking().CountAsync(o => o.ComboId == id || o.PlacedComboId == id, ct);
        if (orderCount > 0)
        {
            throw SalesProblems.Bad(SalesErrors.ComboDaCoDon, SalesErrors.ComboDaCoDonMessage,
                new Dictionary<string, object?> { ["orderCount"] = orderCount });
        }

        combos.Delete(combo);
        await unitOfWork.SaveChangesAsync(ct);
    }

    private async Task<Combo> LoadAsync(Guid id, CancellationToken ct) =>
        await combos.Query().FirstOrDefaultAsync(c => c.Id == id, ct) ?? throw new NotFoundException("Không tìm thấy combo.");

    private static void Apply(Combo combo, SaveComboRequest r) =>
        combo.Update(r.Name, r.Description, r.BottleCount, r.GiftText, r.PromoPrice, r.RegularPrice, r.FreeShipping, r.Badge, r.ImageUrl);

    /// <summary>Số đơn có ComboId hoặc PlacedComboId là combo (một đơn đổi combo tính cho cả hai combo).</summary>
    private async Task<Dictionary<Guid, int>> OrderCountsAsync(CancellationToken ct)
    {
        var pairs = await orders.QueryNoTracking().Select(o => new { o.ComboId, o.PlacedComboId }).ToListAsync(ct);
        var result = new Dictionary<Guid, int>();
        foreach (var p in pairs)
        {
            result[p.ComboId] = result.GetValueOrDefault(p.ComboId) + 1;
            if (p.PlacedComboId != p.ComboId)
                result[p.PlacedComboId] = result.GetValueOrDefault(p.PlacedComboId) + 1;
        }

        return result;
    }
}
