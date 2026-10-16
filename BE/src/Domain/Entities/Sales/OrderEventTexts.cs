using Domain.Enums.Sales.Orders;

namespace Domain.Entities.Sales;

/// <summary>
/// Câu trên dòng thời gian đơn (07 §3.7, §3.8), chữ hiển thị enum (FE <c>landing-labels.ts</c>), câu pixel giả lập.
/// Seeder và service dùng chung để dữ liệu mẫu và thao tác thật ra cùng câu.
/// </summary>
public static class OrderEventTexts
{
    public const string SmsSent = "Đã gửi SMS xác nhận (giả lập)";
    public const string SmsConfirmed = "Đơn đã được xác nhận (SMS giả lập)";
    public const string TagDuplicate = "Gắn nhãn Trùng";
    public const string TagReturnRisk = "Gắn nhãn Rủi ro hoàn";
    public const string UntagDuplicate = "Bỏ nhãn Trùng";
    public const string NotDuplicate = "Bỏ nhãn Trùng: không phải đơn trùng";
    public const string Delivered = "Giao thành công";

    public static string CancelReasonLabel(CancelReason reason) => reason switch
    {
        CancelReason.KhachDoiY => "Khách đổi ý",
        CancelReason.CheGiaCao => "Chê giá cao",
        CancelReason.DatNham => "Đặt nhầm",
        CancelReason.DaMuaNoiKhac => "Đã mua nơi khác",
        CancelReason.DonTrung => "Đơn trùng",
        CancelReason.Khac => "Khác",
        CancelReason.SaiSoDienThoai => "Sai số điện thoại",
        CancelReason.KhongLienLacDuoc => "Không liên lạc được",
        _ => reason.ToString()
    };

    public static string ReturnReasonLabel(ReturnReason reason) => reason switch
    {
        ReturnReason.KhachKhongNgheMay => "Khách không nghe máy",
        ReturnReason.KhachTuChoiNhan => "Khách từ chối nhận",
        ReturnReason.SaiDiaChi => "Sai địa chỉ",
        ReturnReason.Khac => "Khác",
        _ => reason.ToString()
    };

    public static string CarrierLabel(Carrier carrier) => carrier switch
    {
        Carrier.GHN => "GHN",
        Carrier.GHTK => "GHTK",
        Carrier.VTP => "Viettel Post",
        Carrier.JT => "J&T Express",
        _ => carrier.ToString()
    };

    /// <summary>"Khách đặt hàng trên landing, nguồn Facebook, chiến dịch serum_t10".</summary>
    public static string Created(string source, string? campaign) =>
        $"Khách đặt hàng trên landing, nguồn {SourceNormalizer.DisplayName(source)}" + (string.IsNullOrEmpty(campaign) ? string.Empty : $", chiến dịch {campaign}");

    public static string AssignedTo(string fullName) => $"Chia cho {fullName}";

    public static string Claimed(string fullName) => $"{fullName} nhận đơn";

    /// <summary>"Hủy đơn: Khách đổi ý" (+ ": ghi chú").</summary>
    public static string Cancelled(CancelReason reason, string? note) => $"Hủy đơn: {CancelReasonLabel(reason)}" + Suffix(note);

    /// <summary>"Hoàn hàng: Sai địa chỉ" (+ ": ghi chú").</summary>
    public static string Returned(ReturnReason reason, string? note) => $"Hoàn hàng: {ReturnReasonLabel(reason)}" + Suffix(note);

    /// <summary>"Bàn giao GHTK, mã vận đơn GHTK2610124587, thu hộ 740.000 ₫".</summary>
    public static string HandedOver(Carrier carrier, string trackingCode, decimal codAmount) =>
        $"Bàn giao {CarrierLabel(carrier)}, mã vận đơn {trackingCode}, thu hộ {SalesRules.FormatMoney(codAmount)}";

    /// <summary>"Mua 1 × 1 → Mua 2 tặng 1 × 1, tiền hàng 390.000 ₫ → 740.000 ₫".</summary>
    public static string ItemsChanged(string oldCombo, int oldQuantity, string newCombo, int newQuantity, decimal oldSubtotal, decimal newSubtotal) =>
        $"{oldCombo} × {oldQuantity} → {newCombo} × {newQuantity}, tiền hàng {SalesRules.FormatMoney(oldSubtotal)} → {SalesRules.FormatMoney(newSubtotal)}";

    /// <summary>"Sửa đơn: " + các phần nối bằng "; ".</summary>
    public static string Edited(IEnumerable<string> parts) => "Sửa đơn: " + string.Join("; ", parts);

    public const string EditedName = "đổi họ tên";
    public const string EditedAddress = "đổi địa chỉ";
    public const string EditedProvince = "đổi tỉnh/thành";

    /// <summary>
    /// Câu sự kiện <c>CuocGoi</c> (07 §3.7). Ghi chú của cuộc gọi nối " · {ghi chú}"; riêng Khách hủy, ghi chú là ghi chú lý do
    /// (<c>CancelNote</c>) nên nối ": {ghi chú}" như câu hủy đơn.
    /// </summary>
    public static string Call(CallResult result, int failedCount, DateTime? nextCallAt, CancelReason? cancelReason, decimal upsell, string? note)
    {
        var text = result switch
        {
            CallResult.XacNhan => upsell > 0 ? $"Xác nhận · Upsell +{SalesRules.FormatMoney(upsell)}" : "Xác nhận",
            CallResult.KhongNgheMay or CallResult.ThueBao => FailedCall(result, failedCount, nextCallAt),
            CallResult.HenGoiLai => $"Hẹn gọi lại lúc {SalesRules.FormatTimeDay(nextCallAt ?? DateTime.UtcNow)}",
            CallResult.SaiSo => "Sai số điện thoại",
            CallResult.KhachHuy => $"Khách hủy: {CancelReasonLabel(cancelReason ?? CancelReason.Khac)}" + Suffix(note),
            _ => result.ToString()
        };

        return result == CallResult.KhachHuy || string.IsNullOrWhiteSpace(note) ? text : $"{text} · {note.Trim()}";
    }

    /// <summary>Câu pixel giả lập theo nguồn (07 §3.8); <paramref name="value"/> chỉ với đặt hàng.</summary>
    public static string PixelCall(string source, Enums.Sales.Tracking.ConversionEventType type, decimal? value, string? orderCode)
    {
        var v = value is { } amount ? decimal.Round(amount).ToString(global::System.Globalization.CultureInfo.InvariantCulture) : null;
        return source switch
        {
            "tiktok" => type switch
            {
                Enums.Sales.Tracking.ConversionEventType.PageView => "ttq.track('ViewContent')",
                Enums.Sales.Tracking.ConversionEventType.StartForm => "ttq.track('InitiateCheckout')",
                _ => $"ttq.track('CompletePayment', {{ value: {v}, currency: 'VND' }})"
            },
            "google" => type switch
            {
                Enums.Sales.Tracking.ConversionEventType.PageView => "gtag('event', 'page_view')",
                Enums.Sales.Tracking.ConversionEventType.StartForm => "gtag('event', 'begin_checkout')",
                _ => $"gtag('event', 'purchase', {{ value: {v}, currency: 'VND', transaction_id: '{orderCode}' }})"
            },
            _ => type switch
            {
                Enums.Sales.Tracking.ConversionEventType.PageView => "fbq('track', 'PageView')",
                Enums.Sales.Tracking.ConversionEventType.StartForm => "fbq('track', 'InitiateCheckout')",
                _ => $"fbq('track', 'Purchase', {{ value: {v}, currency: 'VND' }})"
            }
        };
    }

    private static string FailedCall(CallResult result, int failedCount, DateTime? nextCallAt)
    {
        var label = result == CallResult.KhongNgheMay ? "Không nghe máy" : "Thuê bao không liên lạc được";
        return failedCount >= SalesRules.MaxFailedCalls
            ? $"{label} (lần {failedCount}), hủy vì không liên lạc được"
            : $"{label} (lần {failedCount}), hẹn gọi lại {SalesRules.FormatTime(nextCallAt ?? DateTime.UtcNow)}";
    }

    private static string Suffix(string? note) => string.IsNullOrWhiteSpace(note) ? string.Empty : $": {note.Trim()}";
}
