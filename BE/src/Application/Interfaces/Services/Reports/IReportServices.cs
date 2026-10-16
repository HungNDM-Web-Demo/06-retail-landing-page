using Application.Common.Models;
using Application.DTOs.Reports;

namespace Application.Interfaces.Services.Reports;

/// <summary>Tổng quan quản lý, telesale (07 §2.6, §3.11).</summary>
public interface IDashboardService
{
    Task<ManagerDashboard> GetManagerAsync(CancellationToken ct = default);

    Task<TelesaleDashboard> GetTelesaleAsync(CancellationToken ct = default);
}

/// <summary>Báo cáo theo nguồn, combo, telesale, ngày (07 §2.7, §3.11).</summary>
public interface ISalesReportService
{
    Task<SourceReport> GetSourcesAsync(SourceReportQuery query, CancellationToken ct = default);

    Task<ComboReport> GetCombosAsync(ComboReportQuery query, CancellationToken ct = default);

    Task<TelesaleReport> GetTelesalesAsync(DateRangeQuery query, CancellationToken ct = default);

    Task<DailyReport> GetDailyAsync(DateRangeQuery query, CancellationToken ct = default);
}

/// <summary>Chi phí quảng cáo (07 §2.7, FR-33).</summary>
public interface IAdCostService
{
    Task<IReadOnlyList<AdCostDto>> GetListAsync(AdCostQuery query, CancellationToken ct = default);

    Task<AdCostDto> CreateAsync(SaveAdCostRequest request, CancellationToken ct = default);

    Task<AdCostDto> UpdateAsync(Guid id, SaveAdCostRequest request, CancellationToken ct = default);

    Task DeleteAsync(Guid id, CancellationToken ct = default);
}

/// <summary>Nhật ký pixel giả lập (FR-14).</summary>
public interface IConversionEventService
{
    Task<PaginatedResult<ConversionEventDto>> GetPagedAsync(ConversionEventQuery query, CancellationToken ct = default);
}
