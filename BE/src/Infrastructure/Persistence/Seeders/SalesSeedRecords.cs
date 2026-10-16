using System.Globalization;
using System.Text.Json;
using Application.DTOs.Content;
using Domain.Enums.Cms.Content;

namespace Infrastructure.Persistence.Seeders;

// Hình dạng FE/src/mock/seed/demo-data.json (06 §5.2). Đơn dùng khóa gọn (06 §5.4), mảng trộn kiểu nên đọc bằng JsonElement.

internal sealed class SalesSeedFile
{
    public ProductSeed? Product { get; init; }
    public PromotionSeed? Promotion { get; init; }
    public List<ComboSeed>? Combos { get; init; }
    public List<BlockSeed>? Blocks { get; init; }
    public List<ReviewSeed>? Reviews { get; init; }
    public List<TelesaleSeed>? Telesales { get; init; }
    public List<JsonElement>? Orders { get; init; }
    public List<VisitStatSeed>? VisitStats { get; init; }
    public List<JsonElement>? AdCosts { get; init; }
}

internal sealed class ProductSeed
{
    public string Code { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string ShortName { get; init; } = string.Empty;
    public string Volume { get; init; } = string.Empty;
    public string Unit { get; init; } = string.Empty;
    public string ShortDescription { get; init; } = string.Empty;
    public string? ImageUrl { get; init; }
}

internal sealed class PromotionSeed
{
    public string Name { get; init; } = string.Empty;
    public int StartDay { get; init; }
    public int EndDay { get; init; }
    public int? AutoRenewDays { get; init; }
}

internal sealed class ComboSeed
{
    public string Code { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public int BottleCount { get; init; }
    public string? GiftText { get; init; }
    public decimal PromoPrice { get; init; }
    public decimal RegularPrice { get; init; }
    public bool FreeShipping { get; init; }
    public string? Badge { get; init; }
    public bool IsDefault { get; init; }
    public string? ImageUrl { get; init; }
}

internal sealed class BlockSeed
{
    public BlockType Type { get; init; }
    public string Title { get; init; } = string.Empty;
    public string? Subtitle { get; init; }
    public string? Body { get; init; }
    public string? ImageUrl { get; init; }
    public string? CtaText { get; init; }
    public List<ContentItemDto>? Items { get; init; }
}

internal sealed class ReviewSeed
{
    public string Name { get; init; } = string.Empty;
    public string Province { get; init; } = string.Empty;
    public int Rating { get; init; }
    public int DaysAgo { get; init; }
    public string? AvatarUrl { get; init; }
    public string? PhotoUrl { get; init; }
    public string Content { get; init; } = string.Empty;
}

internal sealed class TelesaleSeed
{
    public string Username { get; init; } = string.Empty;
    public bool IsReceiving { get; init; }
}

/// <summary>Lịch sử <c>{ d, s, c, h[24] }</c> hoặc hôm nay <c>{ s, c, r[12] }</c> (06 §5.5).</summary>
internal sealed class VisitStatSeed
{
    public int? D { get; init; }
    public string S { get; init; } = string.Empty;
    public string? C { get; init; }
    public List<int>? H { get; init; }
    public List<int>? R { get; init; }
}

/// <summary>Một cuộc gọi <c>[phút, mã, phụ?, ghi chú?]</c>.</summary>
internal sealed record CallSeed(int Minute, string Code, JsonElement? Extra, string? Note);

/// <summary>Một đơn đã đọc từ khóa gọn (06 §5.4).</summary>
internal sealed class OrderSeed
{
    public int Index { get; init; }
    public int? Day { get; init; }
    public string? Clock { get; init; }
    public int? Minutes { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Phone { get; init; } = string.Empty;
    public string Province { get; init; } = string.Empty;
    public string Address { get; init; } = string.Empty;
    public string? Note { get; init; }
    public string Combo { get; init; } = string.Empty;
    public int Quantity { get; init; }
    public bool RegularPrice { get; init; }
    public List<string?>? Utm { get; init; }
    public string? Referrer { get; init; }
    public string? Device { get; init; }
    public string? Assignee { get; init; }
    public List<CallSeed> Calls { get; init; } = [];
    public (string Combo, int Quantity)? Change { get; init; }
    public (string Reason, int Minute, string? Note)? Cancel { get; init; }
    public (string Carrier, int Minute)? Ship { get; init; }
    public int? Delivered { get; init; }
    public (string Reason, int Minute, string? Note)? Return { get; init; }
    public List<string> Tags { get; init; } = [];

    public static OrderSeed Parse(JsonElement e, int index)
    {
        static string? Str(JsonElement e, string key) =>
            e.TryGetProperty(key, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() : null;
        static int? Int(JsonElement e, string key) =>
            e.TryGetProperty(key, out var v) && v.ValueKind == JsonValueKind.Number ? v.GetInt32() : null;
        static JsonElement[]? Arr(JsonElement e, string key) =>
            e.TryGetProperty(key, out var v) && v.ValueKind == JsonValueKind.Array ? v.EnumerateArray().ToArray() : null;
        static string? At(JsonElement[] a, int i) => a.Length > i && a[i].ValueKind == JsonValueKind.String ? a[i].GetString() : null;

        var t = e.GetProperty("t");
        var calls = (Arr(e, "cl") ?? []).Select(c =>
        {
            var a = c.EnumerateArray().ToArray();
            return new CallSeed(a[0].GetInt32(), a[1].GetString()!, a.Length > 2 ? a[2] : null, At(a, 3));
        }).ToList();
        var ch = Arr(e, "ch");
        var x = Arr(e, "x");
        var sh = Arr(e, "sh");
        var rt = Arr(e, "rt");

        return new OrderSeed
        {
            Index = index,
            Day = Int(e, "d"),
            Clock = t.ValueKind == JsonValueKind.String ? t.GetString() : null,
            Minutes = t.ValueKind == JsonValueKind.Number ? t.GetInt32() : null,
            Name = Str(e, "n") ?? string.Empty,
            Phone = Str(e, "p") ?? string.Empty,
            Province = Str(e, "pv") ?? string.Empty,
            Address = Str(e, "a") ?? string.Empty,
            Note = Str(e, "nt"),
            Combo = Str(e, "cb") ?? string.Empty,
            Quantity = Int(e, "q") ?? 1,
            RegularPrice = Str(e, "pt") == "T",
            Utm = Arr(e, "u")?.Select(v => v.ValueKind == JsonValueKind.String ? v.GetString() : null).ToList(),
            Referrer = Str(e, "rf"),
            Device = Str(e, "dv"),
            Assignee = Str(e, "as"),
            Calls = calls,
            Change = ch is null ? null : (ch[0].GetString()!, ch[1].GetInt32()),
            Cancel = x is null ? null : (x[0].GetString()!, x[1].GetInt32(), At(x, 2)),
            Ship = sh is null ? null : (sh[0].GetString()!, sh[1].GetInt32()),
            Delivered = Int(e, "dl"),
            Return = rt is null ? null : (rt[0].GetString()!, rt[1].GetInt32(), At(rt, 2)),
            Tags = (Arr(e, "tg") ?? []).Select(v => v.GetString() ?? string.Empty).ToList()
        };
    }

    /// <summary>Giờ đặt (06 §5.3): có <c>d</c> → "HH:mm" giờ Việt Nam của ngày hôm nay + d; không có → now + t phút.</summary>
    public DateTime PlacedAt(DateOnly today, DateTime now)
    {
        if (Day is { } d && Clock is { } clock)
        {
            var time = TimeOnly.ParseExact(clock, "HH:mm", CultureInfo.InvariantCulture);
            return Domain.Entities.Sales.SalesRules.StartOfDayUtc(today.AddDays(d)).Add(time.ToTimeSpan());
        }

        return now.AddMinutes(Minutes ?? 0);
    }
}
