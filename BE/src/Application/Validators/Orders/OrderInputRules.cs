using System.Text.RegularExpressions;
using Application.DTOs.Orders;
using Domain.Entities.Sales;
using Domain.Enums.Sales.Orders;
using FluentValidation;
using FluentValidation.Results;

namespace Application.Validators.Orders;

/// <summary>
/// Kiểm form đặt hàng, sửa đơn (BR-04, 07 §3.5) với câu đúng 07 §2.8. Gọi từ service (không chạy tự động) vì thứ tự kiểm tra
/// của 07 §2.1, §2.5 đặt việc kiểm dữ liệu sau các bước khác (trùng <c>clientRequestId</c>, phạm vi, version, trạng thái).
/// </summary>
public static partial class OrderInputRules
{
    public const string NameRequired = "Nhập họ tên";
    public const string NameLength = "Họ tên từ 2 đến 50 ký tự";
    public const string NameDigits = "Họ tên không được chứa số";
    public const string PhoneRequired = "Nhập số điện thoại";
    public const string PhoneInvalid = "Số điện thoại di động gồm 10 số, bắt đầu bằng 03, 05, 07, 08 hoặc 09";
    public const string ProvinceRequired = "Chọn tỉnh/thành";
    public const string ProvinceInvalid = "Chọn tỉnh/thành trong danh sách";
    public const string AddressRequired = "Nhập địa chỉ chi tiết";
    public const string AddressLength = "Địa chỉ chi tiết từ 10 đến 200 ký tự";
    public const string QuantityRange = "Số lượng từ 1 đến 5";
    public const string NoteLength = "Ghi chú tối đa 300 ký tự";
    public const string ComboRequired = "Chọn combo";

    /// <summary>trim, gộp khoảng trắng.</summary>
    public static string CleanName(string? value) => Spaces().Replace((value ?? string.Empty).Trim(), " ");

    public static string CleanText(string? value) => (value ?? string.Empty).Trim();

    public static void CheckName(string? value, List<ValidationFailure> failures, string field = "customerName")
    {
        var name = CleanName(value);
        if (name.Length == 0)
            failures.Add(new ValidationFailure(field, NameRequired));
        else if (name.Length is < SalesRules.NameMin or > SalesRules.NameMax)
            failures.Add(new ValidationFailure(field, NameLength));
        else if (name.Any(char.IsDigit))
            failures.Add(new ValidationFailure(field, NameDigits));
    }

    public static void CheckPhone(string? value, List<ValidationFailure> failures)
    {
        if (string.IsNullOrWhiteSpace(value))
            failures.Add(new ValidationFailure("phone", PhoneRequired));
        else if (!PhoneNormalizer.IsValid(PhoneNormalizer.Normalize(value)))
            failures.Add(new ValidationFailure("phone", PhoneInvalid));
    }

    public static void CheckProvince(string? value, List<ValidationFailure> failures, string field = "province")
    {
        if (string.IsNullOrWhiteSpace(value))
            failures.Add(new ValidationFailure(field, ProvinceRequired));
        else if (!SalesRules.IsProvince(value.Trim()))
            failures.Add(new ValidationFailure(field, ProvinceInvalid));
    }

    public static void CheckAddress(string? value, List<ValidationFailure> failures, string field = "address")
    {
        var address = CleanText(value);
        if (address.Length == 0)
            failures.Add(new ValidationFailure(field, AddressRequired));
        else if (address.Length is < SalesRules.AddressMin or > SalesRules.AddressMax)
            failures.Add(new ValidationFailure(field, AddressLength));
    }

    public static void CheckQuantity(int quantity, List<ValidationFailure> failures, string field = "quantity")
    {
        if (quantity is < SalesRules.QuantityMin or > SalesRules.QuantityMax)
            failures.Add(new ValidationFailure(field, QuantityRange));
    }

    public static void CheckNote(string? value, List<ValidationFailure> failures, string field = "note")
    {
        if (CleanText(value).Length > SalesRules.NoteMax)
            failures.Add(new ValidationFailure(field, NoteLength));
    }

    public static void CheckCombo(Guid comboId, List<ValidationFailure> failures, string field = "comboId")
    {
        if (comboId == Guid.Empty)
            failures.Add(new ValidationFailure(field, ComboRequired));
    }

    /// <summary>Sửa đơn (PUT) hoặc <c>changes</c> khi xác nhận; khóa lỗi không tiền tố để FE gắn vào ô (07 §2.5, như PUT).</summary>
    public static List<ValidationFailure> CheckChanges(OrderChanges changes, string prefix = "")
    {
        var failures = new List<ValidationFailure>();
        CheckName(changes.CustomerName, failures, prefix + "customerName");
        CheckProvince(changes.Province, failures, prefix + "province");
        CheckAddress(changes.Address, failures, prefix + "address");
        CheckCombo(changes.ComboId, failures, prefix + "comboId");
        CheckQuantity(changes.Quantity, failures, prefix + "quantity");
        return failures;
    }

    /// <summary>Lý do người dùng chọn khi hủy (BR-16).</summary>
    public static readonly IReadOnlyList<CancelReason> UserCancelReasons =
        [CancelReason.KhachDoiY, CancelReason.CheGiaCao, CancelReason.DatNham, CancelReason.DaMuaNoiKhac, CancelReason.DonTrung, CancelReason.Khac];

    /// <summary>Lý do khi chọn kết quả gọi "Khách hủy" (không có Đơn trùng).</summary>
    public static readonly IReadOnlyList<CancelReason> CustomerCancelReasons =
        [CancelReason.KhachDoiY, CancelReason.CheGiaCao, CancelReason.DatNham, CancelReason.DaMuaNoiKhac, CancelReason.Khac];

    public static void ThrowIfAny(List<ValidationFailure> failures)
    {
        if (failures.Count > 0)
            throw new ValidationException(failures);
    }

    [GeneratedRegex(@"\s+")]
    private static partial Regex Spaces();
}
