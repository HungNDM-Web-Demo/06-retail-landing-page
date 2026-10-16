using Application.DTOs.Catalog;
using Application.Validators.Common;
using Domain.Entities.Cms.Catalog;
using Domain.Entities.Sales;
using FluentValidation;

namespace Application.Validators.Catalog;

public sealed class UpdatePromotionRequestValidator : AppValidator<UpdatePromotionRequest>
{
    public UpdatePromotionRequestValidator()
    {
        RuleFor(x => x.Name)
            .Must(v => !string.IsNullOrWhiteSpace(v)).WithMessage("Nhập tên chương trình")
            .Must(v => v.Trim().Length <= Promotion.NameMax).WithMessage("Tên chương trình tối đa 100 ký tự");
        RuleFor(x => x.EndAt).GreaterThan(x => x.StartAt).WithMessage("Thời điểm kết thúc phải sau thời điểm bắt đầu");
        RuleFor(x => x.AutoRenewDays)
            .InclusiveBetween(Promotion.AutoRenewMin, Promotion.AutoRenewMax).When(x => x.AutoRenewDays.HasValue)
            .WithMessage("Số ngày tự gia hạn từ 1 đến 30");
    }
}

/// <summary>BR-01, TC-34: giá bội số 1.000 ₫, giá khuyến mãi không lớn hơn giá thường.</summary>
public sealed class SaveComboRequestValidator : AppValidator<SaveComboRequest>
{
    public SaveComboRequestValidator()
    {
        RuleFor(x => x.Name)
            .Must(v => !string.IsNullOrWhiteSpace(v)).WithMessage("Nhập tên combo")
            .Must(v => v.Trim().Length <= Combo.NameMax).WithMessage("Tên combo tối đa 50 ký tự");
        RuleFor(x => x.Description)
            .Must(v => !string.IsNullOrWhiteSpace(v)).WithMessage("Nhập nội dung combo")
            .Must(v => v.Trim().Length <= Combo.DescriptionMax).WithMessage("Nội dung combo tối đa 200 ký tự");
        RuleFor(x => x.BottleCount).InclusiveBetween(1, SalesRules.MaxBottleCount).WithMessage("Số chai từ 1 đến 10");
        RuleFor(x => x.PromoPrice)
            .GreaterThan(0).WithMessage("Giá phải lớn hơn 0")
            .Must(v => v % SalesRules.PriceStep == 0).WithMessage("Giá phải là bội số 1.000 ₫")
            .LessThanOrEqualTo(x => x.RegularPrice).WithMessage("Giá khuyến mãi không lớn hơn giá thường");
        RuleFor(x => x.RegularPrice)
            .GreaterThan(0).WithMessage("Giá phải lớn hơn 0")
            .Must(v => v % SalesRules.PriceStep == 0).WithMessage("Giá phải là bội số 1.000 ₫");
        RuleFor(x => x.GiftText).MaximumLength(Combo.GiftTextMax).WithMessage("Quà tặng tối đa 100 ký tự");
        RuleFor(x => x.Badge).MaximumLength(Combo.BadgeMax).WithMessage("Nhãn tối đa 30 ký tự");
        RuleFor(x => x.ImageUrl).MaximumLength(Combo.ImageUrlMax).WithMessage("Đường dẫn ảnh tối đa 500 ký tự");
    }
}
