using Application.Common.Time;
using Application.DTOs.Reports;
using Application.Validators.Common;
using Domain.Entities.Sales;
using Domain.Entities.Sales.Marketing;
using FluentValidation;

namespace Application.Validators.Reports;

/// <summary>Chi phí quảng cáo (07 §2.7); "ngày không ở tương lai" kiểm ở service (cần đồng hồ).</summary>
public sealed class SaveAdCostRequestValidator : AppValidator<SaveAdCostRequest>
{
    public SaveAdCostRequestValidator()
    {
        RuleFor(x => x.Date).Must(v => VietnamDates.TryParse(v, out _)).WithMessage("Chọn ngày");
        RuleFor(x => x.Source)
            .Must(v => !string.IsNullOrWhiteSpace(v)).WithMessage("Nhập nguồn")
            .Must(v => v.Trim().Length <= AdCost.SourceMax).WithMessage("Nguồn tối đa 50 ký tự");
        RuleFor(x => x.Campaign).MaximumLength(AdCost.CampaignMax).WithMessage("Chiến dịch tối đa 100 ký tự");
        RuleFor(x => x.Amount)
            .GreaterThan(0).WithMessage("Số tiền phải lớn hơn 0")
            .Must(v => v % SalesRules.PriceStep == 0).WithMessage("Số tiền là bội số 1.000 ₫");
    }
}
