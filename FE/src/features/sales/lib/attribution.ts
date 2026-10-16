import type { Attribution, DeviceType } from '@/types/landing'

/**
 * Nguồn, lượt truy cập, thiết bị (07 §3.2, §3.5; BR-07; BE `SourceNormalizer`).
 */

const SOURCE_ALIASES: Record<string, string> = {
  fb: 'facebook',
  facebook: 'facebook',
  tt: 'tiktok',
  tiktok: 'tiktok',
  gg: 'google',
  google: 'google',
  zl: 'zalo',
  zalo: 'zalo',
}

/** utm_source → nguồn chuẩn: rỗng → "direct"; fb/tt/gg/zl → tên đầy đủ; khác giữ nguyên (chữ thường, ≤ 50) */
export function normalizeSource(value: string | null | undefined): string {
  const s = (value ?? '').trim().toLowerCase()
  if (!s) return 'direct'
  return SOURCE_ALIASES[s] ?? s.slice(0, 50)
}

const endsWithDomain = (host: string, domain: string) => host === domain || host.endsWith(`.${domain}`)

/** Tên miền trang giới thiệu → nguồn (facebook, tiktok, google, zalo hoặc chính tên miền) */
export function sourceFromHost(value: string | null | undefined): string {
  const host = (value ?? '').trim().toLowerCase().replace(/^www\./, '')
  if (!host) return 'direct'
  if (['facebook.com', 'fb.com', 'fb.me', 'm.me', 'messenger.com'].some((d) => d === host) || endsWithDomain(host, 'facebook.com'))
    return 'facebook'
  if (endsWithDomain(host, 'tiktok.com')) return 'tiktok'
  if (/^(?:[a-z0-9-]+\.)*google\.[a-z]{2,3}(?:\.[a-z]{2})?$/.test(host)) return 'google'
  if (endsWithDomain(host, 'zalo.me') || endsWithDomain(host, 'zalo.vn')) return 'zalo'
  return host.slice(0, 50)
}

/** Lấy tên miền từ URL hoặc tên miền (bỏ "www."); không đọc được → undefined */
export function hostOf(value: string | null | undefined): string | undefined {
  const raw = (value ?? '').trim()
  if (!raw) return undefined
  try {
    const url = new URL(raw.includes('://') ? raw : `https://${raw}`)
    return url.hostname.toLowerCase().replace(/^www\./, '') || undefined
  } catch {
    return undefined
  }
}

/** medium, campaign, content: trim, cắt 100 ký tự, rỗng → undefined */
export function cleanUtm(value: string | null | undefined): string | undefined {
  const s = (value ?? '').trim()
  return s ? s.slice(0, 100) : undefined
}

export type AttributionInput = {
  utmSource?: string | null
  utmMedium?: string | null
  utmCampaign?: string | null
  utmContent?: string | null
  storedAttribution?: Attribution | null
  referrer?: string | null
  /** Tên miền landing: referrer cùng tên miền thì bỏ qua */
  landingHost?: string | null
}

/**
 * Nguồn của một lượt (07 §3.2): có utm_source → UTM; không có mà còn nguồn lưu (≤ 7 ngày, FE tự lọc) → dùng lại;
 * không có mà có referrer khác tên miền landing → nguồn theo tên miền; còn lại "direct".
 */
export function resolveAttribution(input: AttributionInput): Attribution {
  if ((input.utmSource ?? '').trim()) {
    return compact({
      source: normalizeSource(input.utmSource),
      medium: cleanUtm(input.utmMedium),
      campaign: cleanUtm(input.utmCampaign),
      content: cleanUtm(input.utmContent),
    })
  }
  const stored = input.storedAttribution
  if (stored?.source) {
    return compact({
      source: normalizeSource(stored.source),
      medium: cleanUtm(stored.medium),
      campaign: cleanUtm(stored.campaign),
      content: cleanUtm(stored.content),
      referrer: hostOf(stored.referrer),
    })
  }
  const host = hostOf(input.referrer)
  const landing = hostOf(input.landingHost)
  if (host && host !== landing) return { source: sourceFromHost(host), referrer: host.slice(0, 200) }
  return { source: 'direct' }
}

/** Chuẩn hóa lại attribution FE gửi kèm đơn (BE làm cùng bước) */
export function normalizeAttribution(value: Attribution | null | undefined): Attribution {
  if (!value?.source) return { source: 'direct' }
  return compact({
    source: normalizeSource(value.source),
    medium: cleanUtm(value.medium),
    campaign: cleanUtm(value.campaign),
    content: cleanUtm(value.content),
    referrer: hostOf(value.referrer),
  })
}

/** Hai attribution cùng nguồn và chiến dịch (gom lượt BR-08) */
export const sameSourceCampaign = (a: Attribution, b: Pick<Attribution, 'source' | 'campaign'>): boolean =>
  a.source === b.source && (a.campaign ?? '') === (b.campaign ?? '')

/** UA có iPad/Tablet → máy tính bảng; Mobi/Android → điện thoại; còn lại máy tính */
export function detectDevice(userAgent: string | null | undefined): DeviceType {
  const ua = userAgent ?? ''
  if (/iPad|Tablet/i.test(ua)) return 'MayTinhBang'
  if (/Mobi|Android/i.test(ua)) return 'DienThoai'
  return 'MayTinh'
}

function compact(value: Attribution): Attribution {
  const result: Attribution = { source: value.source }
  if (value.medium) result.medium = value.medium
  if (value.campaign) result.campaign = value.campaign
  if (value.content) result.content = value.content
  if (value.referrer) result.referrer = value.referrer
  return result
}
