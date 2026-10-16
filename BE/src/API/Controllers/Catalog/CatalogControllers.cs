using API.Base;
using API.Filters;
using Application.Constants;
using Application.DTOs.Catalog;
using Application.DTOs.Common;
using Application.Interfaces.Services.Catalog;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers.Catalog;

/// <summary>Chương trình khuyến mãi (07 §2.2, FR-16, UC-11).</summary>
[Route("api/promotion")]
[SalesProblemCode]
public sealed class PromotionController(IPromotionService service) : BaseApiController
{
    [HttpGet]
    [AuthorizePermission(ProjectPermissions.Combos.View)]
    public async Task<ActionResult<PromotionDto>> Get(CancellationToken ct) => Ok(await service.GetAsync(ct));

    /// <summary>Lệch <c>version</c> → 409 <c>DuLieuCu</c> kèm <c>currentVersion</c>.</summary>
    [HttpPut]
    [AuthorizePermission(ProjectPermissions.Combos.Update)]
    public async Task<ActionResult<PromotionDto>> Update(UpdatePromotionRequest request, CancellationToken ct) =>
        Ok(await service.UpdateAsync(request, ct));
}

/// <summary>Combo (07 §2.3, FR-15, BR-01).</summary>
[Route("api/combos")]
[SalesProblemCode]
public sealed class CombosController(IComboService service) : BaseApiController
{
    [HttpGet]
    [AuthorizePermission(ProjectPermissions.Combos.View)]
    public async Task<ActionResult<IReadOnlyList<ComboDto>>> GetAll(CancellationToken ct) => Ok(await service.GetAllAsync(ct));

    [HttpPost]
    [AuthorizePermission(ProjectPermissions.Combos.Create)]
    public async Task<ActionResult<ComboDto>> Create(SaveComboRequest request, CancellationToken ct) =>
        StatusCode(StatusCodes.Status201Created, await service.CreateAsync(request, ct));

    [HttpPut("{id:guid}")]
    [AuthorizePermission(ProjectPermissions.Combos.Update)]
    public async Task<ActionResult<ComboDto>> Update(Guid id, SaveComboRequest request, CancellationToken ct) =>
        Ok(await service.UpdateAsync(id, request, ct));

    [HttpPatch("{id:guid}/visibility")]
    [AuthorizePermission(ProjectPermissions.Combos.Update)]
    public async Task<IActionResult> SetVisibility(Guid id, SetVisibilityRequest request, CancellationToken ct)
    {
        await service.SetVisibilityAsync(id, request.IsVisible, ct);
        return NoContent();
    }

    /// <summary>Đặt mặc định, combo mặc định cũ tự bỏ (TC-34).</summary>
    [HttpPut("{id:guid}/default")]
    [AuthorizePermission(ProjectPermissions.Combos.Update)]
    public async Task<IActionResult> SetDefault(Guid id, CancellationToken ct)
    {
        await service.SetDefaultAsync(id, ct);
        return NoContent();
    }

    [HttpPut("order")]
    [AuthorizePermission(ProjectPermissions.Combos.Update)]
    public async Task<IActionResult> Reorder(ReorderRequest request, CancellationToken ct)
    {
        await service.ReorderAsync(request.Ids, ct);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [AuthorizePermission(ProjectPermissions.Combos.Delete)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await service.DeleteAsync(id, ct);
        return NoContent();
    }
}
