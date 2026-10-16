import { salesRules } from '@/config/sales-rules'
import { addDaysKey, diffDaysKey, vnKey } from './vn-date'

/**
 * Chọn nhanh khoảng ngày của báo cáo (07 §4.7): Hôm nay, 7 ngày, 30 ngày, Tháng này, Tùy chọn.
 * Ngày theo giờ Việt Nam, dạng "yyyy-MM-dd". Chặn > 366 ngày trước khi gọi API (07 §2).
 */
export type RangePreset = 'today' | '7d' | '30d' | 'thisMonth' | 'custom'
export type DateRange = { from: string; to: string }

export const RANGE_PRESETS: { value: RangePreset; label: string }[] = [
  { value: 'today', label: 'Hôm nay' },
  { value: '7d', label: '7 ngày' },
  { value: '30d', label: '30 ngày' },
  { value: 'thisMonth', label: 'Tháng này' },
  { value: 'custom', label: 'Tùy chọn' },
]

export const MAX_RANGE_DAYS = salesRules.maxReportDays
export const DEFAULT_PRESET: Exclude<RangePreset, 'custom'> = '7d'

export function presetRange(
  preset: Exclude<RangePreset, 'custom'>,
  now: number = Date.now()
): DateRange {
  const today = vnKey(now)
  switch (preset) {
    case 'today':
      return { from: today, to: today }
    case '7d':
      return { from: addDaysKey(today, -(salesRules.defaultReportDays - 1)), to: today }
    case '30d':
      return { from: addDaysKey(today, -29), to: today }
    case 'thisMonth':
      return { from: `${today.slice(0, 8)}01`, to: today }
  }
}

/** Nhận ra preset từ khoảng ngày (đọc lại từ query string) */
export function detectPreset(range: DateRange): RangePreset {
  for (const p of ['today', '7d', '30d', 'thisMonth'] as const) {
    const r = presetRange(p)
    if (r.from === range.from && r.to === range.to) return p
  }
  return 'custom'
}

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/
export const isDateKey = (v: string | null | undefined): v is string => !!v && DATE_KEY.test(v)

/** Số ngày tính cả hai đầu; null khi sai định dạng */
export function rangeDays(from: string, to: string): number | null {
  if (!isDateKey(from) || !isDateKey(to)) return null
  return diffDaysKey(from, to) + 1
}

/** Lỗi khoảng ngày, đúng câu 07 §2; null là hợp lệ */
export function rangeError(from: string, to: string): string | null {
  const days = rangeDays(from, to)
  if (days === null) return 'Chọn đủ ngày bắt đầu và kết thúc'
  if (days < 1) return 'Ngày kết thúc phải sau ngày bắt đầu'
  if (days > MAX_RANGE_DAYS) return `Khoảng ngày tối đa ${MAX_RANGE_DAYS} ngày`
  return null
}

export { displayDateKey, shortDateKey } from './vn-date'
