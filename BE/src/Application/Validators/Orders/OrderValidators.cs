using Application.DTOs.Orders;
using Application.DTOs.Public;
using Application.Validators.Common;
using Domain.Entities.Sales;
using FluentValidation;

namespace Application.Validators.Orders;

public sealed class AddNoteRequestValidator : AppValidator<AddNoteRequest>
{
    public AddNoteRequestValidator()
    {
        RuleFor(x => x.Content)
            .Must(v => !string.IsNullOrWhiteSpace(v)).WithMessage("Nhập nội dung ghi chú")
            .Must(v => (v ?? string.Empty).Trim().Length <= SalesRules.NoteMax).WithMessage(OrderInputRules.NoteLength);
    }
}

public sealed class HandoverRequestValidator : AppValidator<HandoverRequest>
{
    public HandoverRequestValidator()
    {
        RuleFor(x => x.Carrier).NotNull().WithMessage("Chọn đơn vị vận chuyển").IsInEnum().WithMessage("Chọn đơn vị vận chuyển");
        RuleFor(x => x.OrderIds)
            .Must(ids => ids is { Count: > 0 }).WithMessage("Chọn ít nhất 1 đơn")
            .Must(ids => ids.Distinct().Count() <= SalesRules.MaxHandoverOrders).WithMessage("Tối đa 100 đơn mỗi lần");
    }
}

public sealed class ReassignRequestValidator : AppValidator<ReassignRequest>
{
    public ReassignRequestValidator()
    {
        RuleFor(x => x.AssigneeId).NotEmpty().WithMessage("Chọn telesale");
        RuleFor(x => x.OrderIds)
            .Must(ids => ids is { Count: > 0 }).WithMessage("Chọn ít nhất 1 đơn")
            .Must(ids => ids.Distinct().Count() <= SalesRules.MaxHandoverOrders).WithMessage("Tối đa 100 đơn mỗi lần");
    }
}

/// <summary>Trường kỹ thuật của request công khai; dữ liệu form kiểm trong service theo đúng thứ tự 07 §2.1.</summary>
public sealed class PlaceOrderRequestValidator : AppValidator<PlaceOrderRequest>
{
    public PlaceOrderRequestValidator()
    {
        RuleFor(x => x.ClientRequestId).NotEmpty().WithMessage("Thiếu mã yêu cầu").MaximumLength(64).WithMessage("Mã yêu cầu tối đa 64 ký tự");
        RuleFor(x => x.VisitorId).NotEmpty().WithMessage("Thiếu mã trình duyệt").MaximumLength(64).WithMessage("Mã trình duyệt tối đa 64 ký tự");
    }
}

public sealed class RecordVisitRequestValidator : AppValidator<RecordVisitRequest>
{
    public RecordVisitRequestValidator()
    {
        RuleFor(x => x.VisitorId).NotEmpty().WithMessage("Thiếu mã trình duyệt").MaximumLength(64).WithMessage("Mã trình duyệt tối đa 64 ký tự");
        RuleFor(x => x.Device).IsInEnum().WithMessage("Thiết bị không hợp lệ");
    }
}

public sealed class TrackEventRequestValidator : AppValidator<TrackEventRequest>
{
    public TrackEventRequestValidator()
    {
        RuleFor(x => x.VisitorId).NotEmpty().WithMessage("Thiếu mã trình duyệt").MaximumLength(64).WithMessage("Mã trình duyệt tối đa 64 ký tự");
        RuleFor(x => x.Type)
            .Must(t => t is Domain.Enums.Sales.Tracking.ConversionEventType.PageView or Domain.Enums.Sales.Tracking.ConversionEventType.StartForm)
            .WithMessage("Loại sự kiện không hợp lệ");
    }
}
