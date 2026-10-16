using Application.Common.Exceptions;
using Application.Common.Models;
using Application.Common.Time;
using Application.DTOs.Reports;
using Application.Interfaces.Repositories;
using Application.Interfaces.Services.Reports;
using Domain.Entities.Sales;
using Domain.Entities.Sales.Marketing;
using Domain.Entities.Sales.Orders;
using Domain.Entities.Sales.Tracking;
using FluentValidation;
using FluentValidation.Results;
using Infrastructure.Extensions;
using Infrastructure.Implementations.Services.Sales;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Implementations.Services.Reports;

/// <summary>Chi phí quảng cáo theo ngày, nguồn, chiến dịch (07 §2.7, FR-33). Nguồn chuẩn hóa như BR-07; trùng khóa → 409.</summary>
public sealed class AdCostService(IGenericRepository<AdCost> adCosts, IUnitOfWork unitOfWork, TimeProvider time) : IAdCostService
{
    private const string DuplicateMessage = "Đã có chi phí ngày này cho nguồn và chiến dịch đã chọn";

    public async Task<IReadOnlyList<AdCostDto>> GetListAsync(AdCostQuery query, CancellationToken ct = default)
    {
        var (from, to) = SalesSupport.ParseRange(query.From, query.To, SalesRules.VietnamDate(time.GetUtcNow().UtcDateTime));
        var source = adCosts.QueryNoTracking().Where(c => c.Date >= from && c.Date <= to);
        if (!string.IsNullOrWhiteSpace(query.Source))
        {
            var s = SourceNormalizer.NormalizeSource(query.Source);
            source = source.Where(c => c.Source == s);
        }

        var list = await source.OrderByDescending(c => c.Date).ThenBy(c => c.Source).ThenBy(c => c.Campaign).ToListAsync(ct);
        return list.Select(ToDto).ToList();
    }

    public async Task<AdCostDto> CreateAsync(SaveAdCostRequest request, CancellationToken ct = default)
    {
        var (date, source, campaign) = await ValidateAsync(request, null, ct);
        var cost = AdCost.Create(date, source, campaign, request.Amount);
        await adCosts.AddAsync(cost, ct);
        await unitOfWork.SaveChangesAsync(ct);
        return ToDto(cost);
    }

    public async Task<AdCostDto> UpdateAsync(Guid id, SaveAdCostRequest request, CancellationToken ct = default)
    {
        var cost = await adCosts.Query().FirstOrDefaultAsync(c => c.Id == id, ct) ?? throw new NotFoundException("Không tìm thấy chi phí quảng cáo.");
        var (date, source, campaign) = await ValidateAsync(request, id, ct);
        cost.Update(date, source, campaign, request.Amount);
        await unitOfWork.SaveChangesAsync(ct);
        return ToDto(cost);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var cost = await adCosts.Query().FirstOrDefaultAsync(c => c.Id == id, ct) ?? throw new NotFoundException("Không tìm thấy chi phí quảng cáo.");
        adCosts.Delete(cost);
        await unitOfWork.SaveChangesAsync(ct);
    }

    private async Task<(DateOnly Date, string Source, string Campaign)> ValidateAsync(SaveAdCostRequest request, Guid? id, CancellationToken ct)
    {
        VietnamDates.TryParse(request.Date, out var date);
        if (date > SalesRules.VietnamDate(time.GetUtcNow().UtcDateTime))
            throw new ValidationException([new ValidationFailure("date", "Ngày không được ở tương lai")]);

        var source = SourceNormalizer.NormalizeSource(request.Source);
        var campaign = request.Campaign?.Trim() ?? string.Empty;
        if (await adCosts.QueryNoTracking().AnyAsync(c => c.Date == date && c.Source == source && c.Campaign == campaign && c.Id != id, ct))
            throw new ConflictException(DuplicateMessage, "date");
        return (date, source, campaign);
    }

    private static AdCostDto ToDto(AdCost c) => new()
    {
        Id = c.Id,
        Date = VietnamDates.Format(c.Date),
        Source = c.Source,
        Campaign = c.Campaign,
        Amount = c.Amount,
        UpdatedAt = c.UpdatedAt ?? c.CreatedAt
    };
}

/// <summary>Nhật ký pixel giả lập, mới nhất trước (FR-14, P3).</summary>
public sealed class ConversionEventService(IGenericRepository<ConversionEvent> events, IGenericRepository<Order> orders) : IConversionEventService
{
    public async Task<PaginatedResult<ConversionEventDto>> GetPagedAsync(ConversionEventQuery query, CancellationToken ct = default)
    {
        var source = events.QueryNoTracking();
        if (query.Type is { } type)
            source = source.Where(e => e.Type == type);

        var page = query.GetPage();
        var pageSize = query.GetPageSize();
        var total = await source.CountAsync(ct);
        var items = await source.OrderByDescending(e => e.OccurredAt).ThenBy(e => e.Id)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .GroupJoin(orders.QueryNoTracking(), e => e.OrderId, o => (Guid?)o.Id, (e, os) => new { e, os })
            .SelectMany(x => x.os.DefaultIfEmpty(), (x, o) => new { x.e, Code = o != null ? o.Code : null })
            .ToListAsync(ct);

        return new PaginatedResult<ConversionEventDto>
        {
            Items = items
                .OrderByDescending(x => x.e.OccurredAt).ThenBy(x => x.e.Id)
                .Select(x => new ConversionEventDto
                {
                    Id = x.e.Id,
                    Type = x.e.Type,
                    OccurredAt = x.e.OccurredAt,
                    Source = x.e.Source,
                    Campaign = x.e.Campaign,
                    OrderCode = x.Code,
                    Value = x.e.Value,
                    PixelCall = x.e.PixelCall
                }).ToList(),
            Page = page,
            PageSize = pageSize,
            TotalCount = total
        };
    }
}
