using System.Globalization;

namespace Domain.Entities.Sales;

/// <summary>
/// Hằng số quy tắc nghiệp vụ (07 §3), cùng giá trị với FE <c>src/config/sales-rules.ts</c>; danh mục tỉnh/thành, icon khối
/// chép nguyên từ FE <c>src/config/landing-labels.ts</c>.
/// </summary>
public static class SalesRules
{
    /// <summary>Giờ Việt Nam cố định UTC+7 (06 §3).</summary>
    public static readonly TimeSpan VietnamOffset = TimeSpan.FromHours(7);

    // BR-03
    public const decimal ShippingFee = 30_000m;
    public const decimal FreeShippingThreshold = 500_000m;

    // BR-01
    public const decimal PriceStep = 1_000m;
    public const int MaxVisibleCombos = 4;
    public const int MaxBottleCount = 10;
    public const int SortOrderStep = 10;

    // BR-04
    public const int NameMin = 2;
    public const int NameMax = 50;
    public const int AddressMin = 10;
    public const int AddressMax = 200;
    public const int QuantityMin = 1;
    public const int QuantityMax = 5;
    public const int NoteMax = 300;

    // BR-05, 07 §3.6
    public const int OrderCooldownSeconds = 60;
    public const int MaxOrdersPerPhonePer24h = 5;

    // BR-14, BR-15
    public const int DuplicateWindowHours = 24;
    public const int ReturnRiskThreshold = 2;

    // BR-10
    public const int AutoCallbackMinutes = 120;
    public const int MaxFailedCalls = 3;
    public const int MaxCallbackDays = 7;

    // UC-02 4a (giờ Việt Nam)
    public const int WorkingHourStart = 8;
    public const int WorkingHourEnd = 21;

    // BR-08
    public const int VisitTimeoutMinutes = 30;

    // FR-13, BR-21
    public const int RecentOrderHours = 48;
    public const int RecentOrderMax = 10;

    // FR-08
    public const int ReviewPageSize = 6;
    public const int LandingReviewCount = 6;

    // Báo cáo (UC-12)
    public const int MaxReportDays = 366;
    public const int DefaultReportDays = 7;

    // Bàn giao, chia lại, xuất Excel
    public const int MaxHandoverOrders = 100;
    public const int MaxExportRows = 5_000;

    // Khối nội dung
    public const int MaxBlockItems = 12;
    public const int BlockBodyMax = 2_000;

    public const string DirectSource = "direct";

    /// <summary>Danh mục 34 tỉnh/thành (SRS §2.4), đúng chuỗi FE <c>provinces</c>.</summary>
    public static readonly IReadOnlyList<string> Provinces =
    [
        "Hà Nội", "TP. Hồ Chí Minh", "Hải Phòng", "Đà Nẵng", "Cần Thơ", "Huế", "An Giang", "Bắc Ninh", "Cà Mau", "Cao Bằng",
        "Đắk Lắk", "Điện Biên", "Đồng Nai", "Đồng Tháp", "Gia Lai", "Hà Tĩnh", "Hưng Yên", "Khánh Hòa", "Lai Châu", "Lâm Đồng",
        "Lạng Sơn", "Lào Cai", "Nghệ An", "Ninh Bình", "Phú Thọ", "Quảng Ngãi", "Quảng Ninh", "Quảng Trị", "Sơn La", "Tây Ninh",
        "Thái Nguyên", "Thanh Hóa", "Tuyên Quang", "Vĩnh Long"
    ];

    /// <summary>Icon dùng được trong <c>ContentItem.icon</c>, đúng FE <c>landingIconNames</c>.</summary>
    public static readonly IReadOnlyList<string> LandingIconNames =
    [
        "Leaf", "Truck", "PackageCheck", "ThermometerSun", "Droplets", "Droplet", "ScanFace", "Layers", "Sparkles", "ShieldCheck",
        "Sun", "Feather", "FileCheck", "FlaskConical", "BadgeCheck", "RefreshCcw", "Banknote", "Heart", "Clock", "Gift"
    ];

    public static bool IsProvince(string? value) => value is not null && Provinces.Contains(value);

    /// <summary>Giờ Việt Nam của một thời điểm UTC.</summary>
    public static DateTime ToVietnam(DateTime utc) => DateTime.SpecifyKind(utc, DateTimeKind.Unspecified) + VietnamOffset;

    /// <summary>Ngày Việt Nam của một thời điểm UTC.</summary>
    public static DateOnly VietnamDate(DateTime utc) => DateOnly.FromDateTime(ToVietnam(utc));

    /// <summary>00:00 giờ Việt Nam của ngày <paramref name="date"/>, đổi ra UTC.</summary>
    public static DateTime StartOfDayUtc(DateOnly date) =>
        DateTime.SpecifyKind(date.ToDateTime(TimeOnly.MinValue) - VietnamOffset, DateTimeKind.Utc);

    /// <summary>Số tiền định dạng "350.000 ₫" (07 §2.8); không phụ thuộc culture của máy chủ.</summary>
    public static string FormatMoney(decimal amount) =>
        decimal.Round(amount).ToString("#,##0", CultureInfo.InvariantCulture).Replace(',', '.') + " ₫";

    /// <summary>Giờ "HH:mm" theo giờ Việt Nam.</summary>
    public static string FormatTime(DateTime utc) => ToVietnam(utc).ToString("HH:mm", CultureInfo.InvariantCulture);

    /// <summary>Giờ "HH:mm dd/MM" theo giờ Việt Nam.</summary>
    public static string FormatTimeDay(DateTime utc) => ToVietnam(utc).ToString("HH:mm dd/MM", CultureInfo.InvariantCulture);
}
