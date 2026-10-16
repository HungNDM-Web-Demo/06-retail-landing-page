namespace Domain.Entities.Sales;

/// <summary>Chuẩn hóa nguồn, tên miền giới thiệu, UTM (07 §3.2, BR-07). Cùng thuật toán FE <c>lib/attribution.ts</c>.</summary>
public static class SourceNormalizer
{
    public const int SourceMax = 50;
    public const int UtmMax = 100;

    /// <summary>trim, chữ thường; rỗng → <c>direct</c>; fb/tt/gg/zl gộp tên; khác giữ nguyên, cắt 50 ký tự.</summary>
    public static string NormalizeSource(string? value)
    {
        var s = (value ?? string.Empty).Trim().ToLowerInvariant();
        return s switch
        {
            "" => SalesRules.DirectSource,
            "fb" or "facebook" => "facebook",
            "tt" or "tiktok" => "tiktok",
            "gg" or "google" => "google",
            "zl" or "zalo" => "zalo",
            _ => s.Length > SourceMax ? s[..SourceMax] : s
        };
    }

    /// <summary>Tên miền (đã bỏ <c>www.</c>, chữ thường) của chuỗi referrer; null khi không đọc được.</summary>
    public static string? HostOf(string? referrer)
    {
        if (string.IsNullOrWhiteSpace(referrer))
            return null;

        var value = referrer.Trim();
        string host;
        if (Uri.TryCreate(value, UriKind.Absolute, out var uri) && !string.IsNullOrEmpty(uri.Host))
            host = uri.Host;
        else
        {
            host = value.Split('/', '?', '#')[0];
            var colon = host.IndexOf(':');
            if (colon >= 0)
                host = host[..colon];
        }

        host = host.Trim().ToLowerInvariant();
        if (host.StartsWith("www.", StringComparison.Ordinal))
            host = host[4..];
        return host.Length == 0 ? null : host.Length > 200 ? host[..200] : host;
    }

    /// <summary>Nguồn từ tên miền giới thiệu: facebook, tiktok, google, zalo hoặc chính tên miền.</summary>
    public static string SourceFromHost(string host)
    {
        var h = host.Trim().ToLowerInvariant();
        if (h.StartsWith("www.", StringComparison.Ordinal))
            h = h[4..];

        if (h is "facebook.com" or "fb.com" or "fb.me" or "m.me" or "messenger.com" || h.EndsWith(".facebook.com", StringComparison.Ordinal))
            return "facebook";
        if (h == "tiktok.com" || h.EndsWith(".tiktok.com", StringComparison.Ordinal))
            return "tiktok";
        if (IsGoogle(h))
            return "google";
        if (h is "zalo.me" or "zalo.vn" || h.EndsWith(".zalo.me", StringComparison.Ordinal) || h.EndsWith(".zalo.vn", StringComparison.Ordinal))
            return "zalo";
        return h.Length > SourceMax ? h[..SourceMax] : h;
    }

    /// <summary>medium, campaign, content: trim, cắt 100 ký tự, rỗng → null.</summary>
    public static string? NormalizeUtm(string? value)
    {
        var s = value?.Trim();
        if (string.IsNullOrEmpty(s))
            return null;
        return s.Length > UtmMax ? s[..UtmMax] : s;
    }

    /// <summary>Tên hiển thị nguồn (FE <c>sourceLabel</c>): direct → "Trực tiếp".</summary>
    public static string DisplayName(string? source) => source switch
    {
        null or "" or SalesRules.DirectSource => "Trực tiếp",
        "facebook" => "Facebook",
        "tiktok" => "TikTok",
        "google" => "Google",
        "zalo" => "Zalo",
        _ => source
    };

    /// <summary><c>google.&lt;tld&gt;</c> hoặc <c>*.google.&lt;tld&gt;</c> (vd google.com, google.com.vn, www.google.co.uk).</summary>
    private static bool IsGoogle(string host)
    {
        var parts = host.Split('.');
        for (var i = 0; i < parts.Length - 1; i++)
        {
            if (parts[i] != "google")
                continue;
            var tld = parts[(i + 1)..];
            if (tld.Length is >= 1 and <= 2 && tld.All(p => p.Length is >= 2 and <= 3))
                return true;
        }

        return false;
    }
}
