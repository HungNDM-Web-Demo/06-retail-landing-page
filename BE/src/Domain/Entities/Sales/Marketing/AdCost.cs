using Domain.Base;

namespace Domain.Entities.Sales.Marketing;

/// <summary>Chi phí quảng cáo theo ngày, nguồn, chiến dịch (06 §4 <c>Sales_AdCosts</c>, FR-33). Xóa cứng, có ghi nhật ký.</summary>
public class AdCost : BaseEntity, ICreationTracked, IModificationTracked
{
    public const int SourceMax = 50;
    public const int CampaignMax = 100;

    /// <summary>Ngày giờ Việt Nam.</summary>
    public DateOnly Date { get; private set; }
    public string Source { get; private set; } = string.Empty;

    /// <summary>Chuỗi rỗng = chi phí cả nguồn.</summary>
    public string Campaign { get; private set; } = string.Empty;

    public decimal Amount { get; private set; }

    public Guid? CreatedBy { get; set; }
    public Guid? UpdatedBy { get; set; }

    public static AdCost Create(DateOnly date, string source, string? campaign, decimal amount)
    {
        var cost = new AdCost();
        cost.Update(date, source, campaign, amount);
        return cost;
    }

    public void Update(DateOnly date, string source, string? campaign, decimal amount)
    {
        Date = date;
        Source = source;
        Campaign = campaign?.Trim() ?? string.Empty;
        Amount = amount;
    }
}
