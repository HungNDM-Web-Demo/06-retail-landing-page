using Application.DTOs.Public;
using Application.Interfaces.Repositories;
using Application.Interfaces.Services.Public;
using Domain.Entities.Sales;
using Domain.Entities.Sales.Tracking;
using Domain.Enums.Sales.Tracking;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Implementations.Services.Public;

/// <summary>
/// Lượt truy cập và sự kiện pixel giả lập (07 §3.2, §3.8, BR-07, BR-08). Gom lượt theo phiên 30 phút của <c>visitorId</c>;
/// UTM mới khác (nguồn, chiến dịch) của lượt đang mở thì tính lượt mới. Lượt mới cộng 1 vào <c>Sales_VisitStats</c> của giờ hiện tại.
/// </summary>
public sealed class VisitTrackingService(
    IGenericRepository<Visit> visits,
    IGenericRepository<VisitStat> visitStats,
    IGenericRepository<ConversionEvent> conversionEvents,
    IUnitOfWork unitOfWork,
    TimeProvider time) : IVisitTrackingService
{
    public async Task<RecordVisitResult> RecordVisitAsync(RecordVisitRequest request, CancellationToken ct = default)
    {
        var now = time.GetUtcNow().UtcDateTime;
        var visitorId = request.VisitorId.Trim();
        var hasUtm = !string.IsNullOrWhiteSpace(request.UtmSource);
        var attribution = Resolve(request, hasUtm);

        var since = now.AddMinutes(-SalesRules.VisitTimeoutMinutes);
        var open = await visits.Query()
            .Where(v => v.VisitorId == visitorId && v.LastSeenAt >= since)
            .OrderByDescending(v => v.LastSeenAt)
            .FirstOrDefaultAsync(ct);

        var sameVisit = open is not null
            && !(hasUtm && (attribution.Source != open.Source || attribution.Campaign != open.Campaign));
        if (sameVisit)
        {
            open!.Touch(now);
            await unitOfWork.SaveChangesAsync(ct);
            return new RecordVisitResult
            {
                VisitId = open.Id,
                IsNewVisit = false,
                Attribution = new Attribution
                {
                    Source = open.Source,
                    Medium = open.Medium,
                    Campaign = open.Campaign,
                    Content = open.AdContent,
                    Referrer = open.Referrer
                },
                SaveAttribution = hasUtm
            };
        }

        var path = string.IsNullOrWhiteSpace(request.Path) ? null : request.Path.Split('?', '#')[0].Trim();
        if (path is { Length: > Visit.PathMax })
            path = path[..Visit.PathMax];

        var visit = Visit.Start(visitorId, now, attribution.Source, attribution.Medium, attribution.Campaign, attribution.Content,
            attribution.Referrer, request.Device, path);
        await visits.AddAsync(visit, ct);
        await conversionEvents.AddAsync(
            ConversionEvent.Create(ConversionEventType.PageView, now, visitorId, visit.Id, null, visit.Source, visit.Campaign, null, null), ct);
        await unitOfWork.SaveChangesAsync(ct);

        await BumpVisitStatAsync(VisitStat.HourOf(now), visit.Source, visit.Campaign, ct);

        return new RecordVisitResult { VisitId = visit.Id, IsNewVisit = true, Attribution = attribution, SaveAttribution = hasUtm };
    }

    /// <summary>"Bắt đầu điền form" (FR-14): ghi sự kiện theo nguồn của lượt, cập nhật <c>LastSeenAt</c> (BR-08).</summary>
    public async Task TrackEventAsync(TrackEventRequest request, CancellationToken ct = default)
    {
        var now = time.GetUtcNow().UtcDateTime;
        var visitorId = request.VisitorId.Trim();
        Visit? visit = null;
        if (request.VisitId is { } visitId)
            visit = await visits.Query().FirstOrDefaultAsync(v => v.Id == visitId && v.VisitorId == visitorId, ct);
        visit ??= await visits.Query().Where(v => v.VisitorId == visitorId).OrderByDescending(v => v.LastSeenAt).FirstOrDefaultAsync(ct);

        visit?.Touch(now);
        await conversionEvents.AddAsync(ConversionEvent.Create(request.Type, now, visitorId, visit?.Id, null,
            visit?.Source ?? SalesRules.DirectSource, visit?.Campaign, null, null), ct);
        await unitOfWork.SaveChangesAsync(ct);
    }

    /// <summary>
    /// Nguồn của lượt (07 §3.2): UTM trên URL → nguồn lưu trên trình duyệt (≤ 7 ngày) → tên miền giới thiệu → <c>direct</c>.
    /// </summary>
    public static Attribution Resolve(RecordVisitRequest request, bool hasUtm)
    {
        if (hasUtm)
        {
            return new Attribution
            {
                Source = SourceNormalizer.NormalizeSource(request.UtmSource),
                Medium = SourceNormalizer.NormalizeUtm(request.UtmMedium),
                Campaign = SourceNormalizer.NormalizeUtm(request.UtmCampaign),
                Content = SourceNormalizer.NormalizeUtm(request.UtmContent)
            };
        }

        if (request.StoredAttribution is { } stored && !string.IsNullOrWhiteSpace(stored.Source))
            return Normalize(stored);

        if (SourceNormalizer.HostOf(request.Referrer) is { } host)
            return new Attribution { Source = SourceNormalizer.SourceFromHost(host), Referrer = host };

        return new Attribution { Source = SalesRules.DirectSource };
    }

    /// <summary>Chuẩn hóa lại nguồn FE gửi kèm (đơn, nguồn lưu) bằng cùng hàm.</summary>
    public static Attribution Normalize(Attribution? value)
    {
        if (value is null)
            return new Attribution { Source = SalesRules.DirectSource };

        var host = SourceNormalizer.HostOf(value.Referrer);
        var source = !string.IsNullOrWhiteSpace(value.Source)
            ? SourceNormalizer.NormalizeSource(value.Source)
            : host is not null ? SourceNormalizer.SourceFromHost(host) : SalesRules.DirectSource;
        return new Attribution
        {
            Source = source,
            Medium = SourceNormalizer.NormalizeUtm(value.Medium),
            Campaign = SourceNormalizer.NormalizeUtm(value.Campaign),
            Content = SourceNormalizer.NormalizeUtm(value.Content),
            Referrer = host
        };
    }

    /// <summary>Upsert <c>Visits = Visits + 1</c> theo (giờ, nguồn, chiến dịch); trùng khóa do hai request cùng lúc thì cộng lại.</summary>
    private async Task BumpVisitStatAsync(DateTime hourStart, string source, string? campaign, CancellationToken ct)
    {
        var key = campaign ?? string.Empty;
        var updated = await visitStats.Query()
            .Where(s => s.HourStart == hourStart && s.Source == source && s.Campaign == key)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.Visits, x => x.Visits + 1), ct);
        if (updated > 0)
            return;

        var stat = VisitStat.Create(hourStart, source, key, 1);
        await visitStats.AddAsync(stat, ct);
        try
        {
            await unitOfWork.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            visitStats.Delete(stat);
            await visitStats.Query()
                .Where(s => s.HourStart == hourStart && s.Source == source && s.Campaign == key)
                .ExecuteUpdateAsync(s => s.SetProperty(x => x.Visits, x => x.Visits + 1), ct);
        }
    }
}
