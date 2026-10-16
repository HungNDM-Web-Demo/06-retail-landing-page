using Application.DTOs.Content;
using Application.Validators.Common;
using Domain.Entities.Cms.Catalog;
using Domain.Entities.Cms.Content;
using Domain.Entities.Sales;
using FluentValidation;

namespace Application.Validators.Content;

public sealed class UpdateProductRequestValidator : AppValidator<UpdateProductRequest>
{
    public UpdateProductRequestValidator()
    {
        RuleFor(x => x.Name)
            .Must(v => !string.IsNullOrWhiteSpace(v)).WithMessage("Nhập tên sản phẩm")
            .Must(v => v.Trim().Length <= Product.NameMax).WithMessage("Tên sản phẩm tối đa 150 ký tự");
        RuleFor(x => x.ShortName)
            .Must(v => !string.IsNullOrWhiteSpace(v)).WithMessage("Nhập tên ngắn")
            .Must(v => v.Trim().Length <= Product.ShortNameMax).WithMessage("Tên ngắn tối đa 50 ký tự");
        RuleFor(x => x.Volume)
            .Must(v => !string.IsNullOrWhiteSpace(v)).WithMessage("Nhập dung tích")
            .Must(v => v.Trim().Length <= Product.VolumeMax).WithMessage("Dung tích tối đa 30 ký tự");
        RuleFor(x => x.Unit)
            .Must(v => !string.IsNullOrWhiteSpace(v)).WithMessage("Nhập đơn vị tính")
            .Must(v => v.Trim().Length <= Product.UnitMax).WithMessage("Đơn vị tính tối đa 20 ký tự");
        RuleFor(x => x.ShortDescription)
            .Must(v => !string.IsNullOrWhiteSpace(v)).WithMessage("Nhập mô tả ngắn")
            .Must(v => v.Trim().Length <= Product.ShortDescriptionMax).WithMessage("Mô tả ngắn tối đa 500 ký tự");
        RuleFor(x => x.ImageUrl).MaximumLength(Product.ImageUrlMax).WithMessage("Đường dẫn ảnh tối đa 500 ký tự");
    }
}

/// <summary>Kiểm chung của khối; kiểm theo loại khối (Faq, BeforeAfter) làm ở service vì cần biết loại khối.</summary>
public sealed class UpdateLandingBlockRequestValidator : AppValidator<UpdateLandingBlockRequest>
{
    public UpdateLandingBlockRequestValidator()
    {
        RuleFor(x => x.Title)
            .Must(v => !string.IsNullOrWhiteSpace(v)).WithMessage("Nhập tiêu đề")
            .Must(v => v.Trim().Length <= LandingBlock.TitleMax).WithMessage("Tiêu đề tối đa 150 ký tự");
        RuleFor(x => x.Subtitle).MaximumLength(LandingBlock.SubtitleMax).WithMessage("Phụ đề tối đa 300 ký tự");
        RuleFor(x => x.Body).MaximumLength(SalesRules.BlockBodyMax).WithMessage("Nội dung tối đa 2.000 ký tự");
        RuleFor(x => x.ImageUrl).MaximumLength(LandingBlock.ImageUrlMax).WithMessage("Đường dẫn ảnh tối đa 500 ký tự");
        RuleFor(x => x.CtaText).MaximumLength(LandingBlock.CtaTextMax).WithMessage("Chữ nút tối đa 50 ký tự");
        RuleFor(x => x.Items).Must(items => items is null || items.Count <= SalesRules.MaxBlockItems).WithMessage("Tối đa 12 mục");
        RuleForEach(x => x.Items).ChildRules(item =>
            item.RuleFor(i => i.Icon)
                .Must(icon => string.IsNullOrWhiteSpace(icon) || SalesRules.LandingIconNames.Contains(icon.Trim()))
                .WithMessage("Biểu tượng không hợp lệ"));
    }
}

public sealed class SaveReviewRequestValidator : AppValidator<SaveReviewRequest>
{
    public SaveReviewRequestValidator()
    {
        RuleFor(x => x.CustomerName)
            .Must(v => !string.IsNullOrWhiteSpace(v)).WithMessage("Nhập tên khách")
            .Must(v => v.Trim().Length <= Review.CustomerNameMax).WithMessage("Tên khách tối đa 50 ký tự");
        RuleFor(x => x.Province).Must(v => SalesRules.IsProvince(v?.Trim())).WithMessage("Chọn tỉnh/thành trong danh sách");
        RuleFor(x => x.Rating).InclusiveBetween(1, 5).WithMessage("Chọn số sao từ 1 đến 5");
        RuleFor(x => x.Content)
            .Must(v => !string.IsNullOrWhiteSpace(v)).WithMessage("Nhập nội dung đánh giá")
            .Must(v => v.Trim().Length <= Review.ContentMax).WithMessage("Nội dung đánh giá tối đa 1.000 ký tự");
        RuleFor(x => x.AvatarUrl).MaximumLength(Review.UrlMax).WithMessage("Đường dẫn ảnh tối đa 500 ký tự");
        RuleFor(x => x.PhotoUrl).MaximumLength(Review.UrlMax).WithMessage("Đường dẫn ảnh tối đa 500 ký tự");
    }
}
