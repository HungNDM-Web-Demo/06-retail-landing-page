using System.Text.RegularExpressions;

namespace Domain.Entities.Sales;

/// <summary>Chuẩn hóa, kiểm số điện thoại di động (07 §3.5, BR-04).</summary>
public static partial class PhoneNormalizer
{
    /// <summary>Bỏ dấu cách, ".", "-", "(", ")"; "+84…" → "0…"; "84…" dài 11 số → "0…".</summary>
    public static string Normalize(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return string.Empty;

        var s = new string(value.Where(c => !char.IsWhiteSpace(c) && c is not ('.' or '-' or '(' or ')')).ToArray());
        if (s.StartsWith("+84", StringComparison.Ordinal))
            s = "0" + s[3..];
        else if (s.StartsWith("84", StringComparison.Ordinal) && s.Length == 11)
            s = "0" + s[2..];
        return s;
    }

    /// <summary>Đúng mẫu <c>^0(3|5|7|8|9)\d{8}$</c> sau khi chuẩn hóa.</summary>
    public static bool IsValid(string? normalized) => normalized is not null && MobileRegex().IsMatch(normalized);

    [GeneratedRegex(@"^0(3|5|7|8|9)\d{8}$")]
    private static partial Regex MobileRegex();
}
