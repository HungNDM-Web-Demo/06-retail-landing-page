using Application.DTOs.Catalog;

namespace Application.Interfaces.Services.Catalog;

/// <summary>Chương trình khuyến mãi (07 §2.2, FR-16, UC-11).</summary>
public interface IPromotionService
{
    Task<PromotionDto> GetAsync(CancellationToken ct = default);

    Task<PromotionDto> UpdateAsync(UpdatePromotionRequest request, CancellationToken ct = default);
}

/// <summary>Combo (07 §2.3, FR-15, BR-01).</summary>
public interface IComboService
{
    Task<IReadOnlyList<ComboDto>> GetAllAsync(CancellationToken ct = default);

    Task<ComboDto> CreateAsync(SaveComboRequest request, CancellationToken ct = default);

    Task<ComboDto> UpdateAsync(Guid id, SaveComboRequest request, CancellationToken ct = default);

    Task SetVisibilityAsync(Guid id, bool isVisible, CancellationToken ct = default);

    Task SetDefaultAsync(Guid id, CancellationToken ct = default);

    Task ReorderAsync(IReadOnlyList<Guid> ids, CancellationToken ct = default);

    Task DeleteAsync(Guid id, CancellationToken ct = default);
}
