using API.Base;
using API.Filters;
using Application.Common.Models;
using Application.Constants;
using Application.DTOs.Common;
using Application.DTOs.Content;
using Application.Interfaces.Services.Content;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers.Content;

/// <summary>Sản phẩm chủ lực (07 §2.4).</summary>
[Route("api/product")]
[SalesProblemCode]
public sealed class ProductController(IProductService service) : BaseApiController
{
    [HttpGet]
    [AuthorizePermission(ProjectPermissions.LandingContents.View)]
    public async Task<ActionResult<ProductDto>> Get(CancellationToken ct) => Ok(await service.GetAsync(ct));

    [HttpPut]
    [AuthorizePermission(ProjectPermissions.LandingContents.Update)]
    public async Task<ActionResult<ProductDto>> Update(UpdateProductRequest request, CancellationToken ct) =>
        Ok(await service.UpdateAsync(request, ct));
}

/// <summary>Khối nội dung landing (07 §2.4, FR-17).</summary>
[Route("api/landing-blocks")]
[SalesProblemCode]
public sealed class LandingBlocksController(ILandingBlockService service) : BaseApiController
{
    [HttpGet]
    [AuthorizePermission(ProjectPermissions.LandingContents.View)]
    public async Task<ActionResult<IReadOnlyList<LandingBlockDto>>> GetAll(CancellationToken ct) => Ok(await service.GetAllAsync(ct));

    [HttpPut("{id:guid}")]
    [AuthorizePermission(ProjectPermissions.LandingContents.Update)]
    public async Task<ActionResult<LandingBlockDto>> Update(Guid id, UpdateLandingBlockRequest request, CancellationToken ct) =>
        Ok(await service.UpdateAsync(id, request, ct));

    [HttpPatch("{id:guid}/visibility")]
    [AuthorizePermission(ProjectPermissions.LandingContents.Update)]
    public async Task<IActionResult> SetVisibility(Guid id, SetVisibilityRequest request, CancellationToken ct)
    {
        await service.SetVisibilityAsync(id, request.IsVisible, ct);
        return NoContent();
    }

    [HttpPut("order")]
    [AuthorizePermission(ProjectPermissions.LandingContents.Update)]
    public async Task<IActionResult> Reorder(ReorderRequest request, CancellationToken ct)
    {
        await service.ReorderAsync(request.Ids, ct);
        return NoContent();
    }
}

/// <summary>Đánh giá khách hàng (07 §2.4, FR-18).</summary>
[Route("api/reviews")]
[SalesProblemCode]
public sealed class ReviewsController(IReviewService service) : BaseApiController
{
    [HttpGet]
    [AuthorizePermission(ProjectPermissions.LandingContents.View)]
    public async Task<ActionResult<PaginatedResult<ReviewDto>>> GetPaged([FromQuery] ReviewQuery query, CancellationToken ct) =>
        Ok(await service.GetPagedAsync(query, ct));

    [HttpPost]
    [AuthorizePermission(ProjectPermissions.LandingContents.Update)]
    public async Task<ActionResult<ReviewDto>> Create(SaveReviewRequest request, CancellationToken ct) =>
        StatusCode(StatusCodes.Status201Created, await service.CreateAsync(request, ct));

    [HttpPut("{id:guid}")]
    [AuthorizePermission(ProjectPermissions.LandingContents.Update)]
    public async Task<ActionResult<ReviewDto>> Update(Guid id, SaveReviewRequest request, CancellationToken ct) =>
        Ok(await service.UpdateAsync(id, request, ct));

    [HttpPatch("{id:guid}/visibility")]
    [AuthorizePermission(ProjectPermissions.LandingContents.Update)]
    public async Task<IActionResult> SetVisibility(Guid id, SetVisibilityRequest request, CancellationToken ct)
    {
        await service.SetVisibilityAsync(id, request.IsVisible, ct);
        return NoContent();
    }

    [HttpPut("order")]
    [AuthorizePermission(ProjectPermissions.LandingContents.Update)]
    public async Task<IActionResult> Reorder(ReorderRequest request, CancellationToken ct)
    {
        await service.ReorderAsync(request.Ids, ct);
        return NoContent();
    }
}
