import { VN_OFFSET_MINUTES } from '@/config/sales-rules'

/**
 * Tiện ích ngày giờ Việt Nam cho màn quản trị (khoảng ngày báo cáo, lọc đơn, thống kê mock).
 * Hàm thuần, không phụ thuộc múi giờ máy. "Khóa ngày" là chuỗi "yyyy-MM-dd" theo giờ VN (07 §2 tham số ngày).
 */

const OFFSET_MS = VN_OFFSET_MINUTES * 60_000
const DAY_MS = 86_400_000

type TimeInput = string | number | Date

const toMs = (value: TimeInput) =>
  typeof value === 'number'
    ? value
    : typeof value === 'string'
      ? Date.parse(value)
      : value.getTime()

/** Khóa ngày VN của một thời điểm: "2026-10-15" */
export function vnKey(value: TimeInput = Date.now()): string {
  return new Date(toMs(value) + OFFSET_MS).toISOString().slice(0, 10)
}

/** Giờ VN (0–23) của một thời điểm */
export function vnHourOf(value: TimeInput): number {
  return new Date(toMs(value) + OFFSET_MS).getUTCHours()
}

/** Mốc 00:00 giờ VN của khóa ngày, tính bằng ms UTC */
export function vnDayStartMs(key: string): number {
  return Date.parse(`${key}T00:00:00Z`) - OFFSET_MS
}

/** Mốc cuối ngày (23:59:59.999 giờ VN) của khóa ngày, ms UTC */
export function vnDayEndMs(key: string): number {
  return vnDayStartMs(key) + DAY_MS - 1
}

/** Cộng n ngày vào khóa ngày */
export function addDaysKey(key: string, n: number): string {
  return new Date(Date.parse(`${key}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10)
}

/** Số ngày từ `from` tới `to` (to − from) */
export function diffDaysKey(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS)
}

/** Mọi khóa ngày từ `from` tới `to`, tính cả hai đầu */
export function daysBetween(from: string, to: string): string[] {
  const n = diffDaysKey(from, to)
  return Array.from({ length: Math.max(0, n + 1) }, (_, i) => addDaysKey(from, i))
}

/** Thời điểm có nằm trong [from 00:00, to 23:59:59] giờ VN không */
export function inVnRange(
  value: TimeInput | null | undefined,
  from?: string,
  to?: string
): boolean {
  if (value === null || value === undefined || value === '') return !from && !to
  const ms = toMs(value)
  if (from && ms < vnDayStartMs(from)) return false
  if (to && ms > vnDayEndMs(to)) return false
  return true
}

/** "2026-10-14" → "14/10/2026" */
export const displayDateKey = (key: string) => key.split('-').reverse().join('/')

/** "2026-10-14" → "14/10" (trục biểu đồ) */
export const shortDateKey = (key: string) => `${key.slice(8, 10)}/${key.slice(5, 7)}`

/** "HH:mm" giờ VN của một thời điểm */
export function vnTimeText(value: TimeInput): string {
  return new Date(toMs(value) + OFFSET_MS).toISOString().slice(11, 16)
}

/** "HH:mm dd/MM" giờ VN */
export function vnTimeDateText(value: TimeInput): string {
  const iso = new Date(toMs(value) + OFFSET_MS).toISOString()
  return `${iso.slice(11, 16)} ${iso.slice(8, 10)}/${iso.slice(5, 7)}`
}

/** "dd/MM/yyyy HH:mm" giờ VN */
export function vnDateTimeText(value: TimeInput | null | undefined, fallback = '—'): string {
  if (value === null || value === undefined || value === '') return fallback
  const iso = new Date(toMs(value) + OFFSET_MS).toISOString()
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)} ${iso.slice(11, 16)}`
}

/** Giá trị cho <input type="datetime-local"> theo giờ VN: "2026-10-15T14:30" */
export function toVnLocalInput(value: TimeInput | null | undefined): string {
  if (value === null || value === undefined || value === '') return ''
  return new Date(toMs(value) + OFFSET_MS).toISOString().slice(0, 16)
}

/** Đọc "2026-10-15T14:30" (giờ VN) → ISO UTC; sai định dạng → null */
export function fromVnLocalInput(text: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(text)) return null
  const ms = Date.parse(`${text.length === 16 ? `${text}:00` : text}Z`) - OFFSET_MS
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null
}
