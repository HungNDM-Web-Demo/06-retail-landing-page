using API.Base;
using API.Filters;
using Application.Common.Models;
using Application.Constants;
using Application.DTOs.Reports;
using Application.Interfaces.Services.Reports;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers.Reports;

/// <summary>Tổng quan quản lý, telesale (07 §2.6, FR-01…FR-03).</summary>
[Route("api/dashboard")]
[SalesProblemCode]
public sealed class DashboardController(IDashboardService service) : BaseApiController
{
    [HttpGet("manager")]
    [AuthorizePermission(ProjectPermissions.Reports.View)]
    public async Task<ActionResult<ManagerDashboard>> GetManager(CancellationToken ct) => Ok(await service.GetManagerAsync(ct));

    [HttpGet("telesale")]
    [AuthorizePermission(ProjectPermissions.Orders.Call)]
    public async Task<ActionResult<TelesaleDashboard>> GetTelesale(CancellationToken ct) => Ok(await service.GetTelesaleAsync(ct));
}

/// <summary>Báo cáo theo nguồn, combo, telesale, ngày (07 §2.7, FR-29…FR-33).</summary>
[Route("api/reports")]
[SalesProblemCode]
[AuthorizePermission(ProjectPermissions.Reports.View)]
public sealed class ReportsController(ISalesReportService service) : BaseApiController
{
    [HttpGet("sources")]
    public async Task<ActionResult<SourceReport>> GetSources([FromQuery] SourceReportQuery query, CancellationToken ct) =>
        Ok(await service.GetSourcesAsync(query, ct));

    [HttpGet("combos")]
    public async Task<ActionResult<ComboReport>> GetCombos([FromQuery] ComboReportQuery query, CancellationToken ct) =>
        Ok(await service.GetCombosAsync(query, ct));

    [HttpGet("telesales")]
    public async Task<ActionResult<TelesaleReport>> GetTelesales([FromQuery] DateRangeQuery query, CancellationToken ct) =>
        Ok(await service.GetTelesalesAsync(query, ct));

    [HttpGet("daily")]
    public async Task<ActionResult<DailyReport>> GetDaily([FromQuery] DateRangeQuery query, CancellationToken ct) =>
        Ok(await service.GetDailyAsync(query, ct));
}

/// <summary>Chi phí quảng cáo (07 §2.7, FR-33).</summary>
[Route("api/ad-costs")]
[SalesProblemCode]
public sealed class AdCostsController(IAdCostService service) : BaseApiController
{
    [HttpGet]
    [AuthorizePermission(ProjectPermissions.AdCosts.View)]
    public async Task<ActionResult<IReadOnlyList<AdCostDto>>> GetList([FromQuery] AdCostQuery query, CancellationToken ct) =>
        Ok(await service.GetListAsync(query, ct));

    [HttpPost]
    [AuthorizePermission(ProjectPermissions.AdCosts.Create)]
    public async Task<ActionResult<AdCostDto>> Create(SaveAdCostRequest request, CancellationToken ct) =>
        StatusCode(StatusCodes.Status201Created, await service.CreateAsync(request, ct));

    [HttpPut("{id:guid}")]
    [AuthorizePermission(ProjectPermissions.AdCosts.Update)]
    public async Task<ActionResult<AdCostDto>> Update(Guid id, SaveAdCostRequest request, CancellationToken ct) =>
        Ok(await service.UpdateAsync(id, request, ct));

    [HttpDelete("{id:guid}")]
    [AuthorizePermission(ProjectPermissions.AdCosts.Update)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await service.DeleteAsync(id, ct);
        return NoContent();
    }
}

/// <summary>Nhật ký pixel giả lập (FR-14, P3).</summary>
[Route("api/conversion-events")]
[SalesProblemCode]
public sealed class ConversionEventsController(IConversionEventService service) : BaseApiController
{
    [HttpGet]
    [AuthorizePermission(ProjectPermissions.Reports.View)]
    public async Task<ActionResult<PaginatedResult<ConversionEventDto>>> GetPaged([FromQuery] ConversionEventQuery query, CancellationToken ct) =>
        Ok(await service.GetPagedAsync(query, ct));
}
