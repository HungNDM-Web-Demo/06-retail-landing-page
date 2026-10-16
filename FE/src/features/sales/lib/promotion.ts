import type {
  PriceType,
  PromotionDto,
  PromotionRecord,
  PromotionStatus,
  PublicPromotion,
} from '@/types/landing'
import { priceTypeOf } from './pricing'
import { vnDateKey } from './vn-time'

/**
 * Khuyến mãi, tự gia hạn, đếm ngược (07 §3.3; BR-02, BR-20; BE `PromotionClock`).
 * Không lưu kết quả gia hạn: tính lúc đọc, cùng một hàm cho BE và mock.
 */

export type PromotionLike = { startAt: string; endAt: string; autoRenewDays?: number | null }

const HOUR_MS = 3_600_000

/**
 * Thời điểm kết thúc đang hiệu lực (ISO). Chỉ gia hạn **từ ngày hôm sau** ngày kết thúc (giờ VN):
 * k nhỏ nhất ≥ 1 sao cho endAt + k × n > now, n = autoRenewDays × 24 giờ.
 */
export function effectiveEndAt(p: PromotionLike, now: number = Date.now()): string {
  const end = new Date(p.endAt).getTime()
  if (!p.autoRenewDays || p.autoRenewDays <= 0 || vnDateKey(now) <= vnDateKey(end)) return p.endAt
  const n = p.autoRenewDays * 24 * HOUR_MS
  const k = Math.max(1, Math.floor((now - end) / n) + 1)
  return new Date(end + k * n).toISOString()
}

/** SapChay khi now < startAt; DangChay khi startAt ≤ now < effectiveEndAt; còn lại DaKetThuc */
export function promotionStatus(p: PromotionLike, now: number = Date.now()): PromotionStatus {
  if (now < new Date(p.startAt).getTime()) return 'SapChay'
  return now < new Date(effectiveEndAt(p, now)).getTime() ? 'DangChay' : 'DaKetThuc'
}

/** Loại giá chốt cho đơn đặt lúc `now` (BR-02) */
export function priceTypeAt(p: PromotionLike, now: number = Date.now()): PriceType {
  return priceTypeOf(promotionStatus(p, now))
}

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * Chữ đồng hồ (BR-20): còn ≥ 24 giờ → "N ngày hh:mm:ss"; dưới 24 giờ → "hh:mm:ss"; hết → "00:00:00".
 */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const days = Math.floor(total / 86_400)
  const rest = total % 86_400
  const clock = `${pad(Math.floor(rest / 3600))}:${pad(Math.floor((rest % 3600) / 60))}:${pad(rest % 60)}`
  return days > 0 ? `${days} ngày ${clock}` : clock
}

/** Tách phần ngày, giờ, phút, giây để vẽ ô đồng hồ */
export function countdownParts(ms: number): { days: number; hours: number; minutes: number; seconds: number } {
  const total = Math.max(0, Math.floor(ms / 1000))
  return {
    days: Math.floor(total / 86_400),
    hours: Math.floor((total % 86_400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  }
}

/** Bản ghi → `PromotionDto` (07 §2.2) */
export function toPromotionDto(record: PromotionRecord, now: number = Date.now()): PromotionDto {
  return {
    ...record,
    autoRenewDays: record.autoRenewDays ?? undefined,
    effectiveEndAt: effectiveEndAt(record, now),
    status: promotionStatus(record, now),
    asOf: new Date(now).toISOString(),
  }
}

/** Bản ghi → `PublicPromotion` (07 §2.1); endAt = effectiveEndAt */
export function toPublicPromotion(record: PromotionRecord, now: number = Date.now()): PublicPromotion {
  return {
    name: record.name,
    status: promotionStatus(record, now),
    startAt: record.startAt,
    endAt: effectiveEndAt(record, now),
    asOf: new Date(now).toISOString(),
  }
}
