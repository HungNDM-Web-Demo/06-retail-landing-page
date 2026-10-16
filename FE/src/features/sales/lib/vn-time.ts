/**
 * Giờ Việt Nam (UTC+7 cố định) cho mã đơn, giờ làm việc, đếm ngược, báo cáo (06 §3, 07 §3; BE `VietnamTime`).
 * Không phụ thuộc múi giờ của máy người xem. Chép từ demo Menu QR, thêm hàm riêng của dự án.
 */

const OFFSET_MS = 7 * 60 * 60_000
const DAY_MS = 86_400_000

export type DateInput = Date | number | string

export type VnParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

const pad = (n: number, len = 2) => String(n).padStart(len, '0')
const toMs = (date: DateInput) => new Date(date).getTime()

/** Thời điểm hiện tại (ms). Một chỗ để mock và giao diện dùng chung. */
export const vnNow = (): number => Date.now()

/** Tách ngày giờ Việt Nam của một thời điểm */
export function vnParts(date: DateInput): VnParts {
  const d = new Date(toMs(date) + OFFSET_MS)
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    second: d.getUTCSeconds(),
  }
}

/** Khóa ngày "yyyy-MM-dd" theo giờ Việt Nam */
export function vnDateKey(date: DateInput): string {
  const p = vnParts(date)
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`
}

/** "yyMMdd" theo giờ Việt Nam (mã đơn LP, mã vận đơn) */
export function vnYyMMdd(date: DateInput): string {
  return vnDateKey(date).slice(2).replace(/-/g, '')
}

/** Thời điểm UTC (ms) của 00:00 ngày "yyyy-MM-dd" giờ Việt Nam */
export function vnStartOfDay(dateKey: string): number {
  const [y, m, d] = dateKey.split('-').map(Number)
  return Date.UTC(y, m - 1, d) - OFFSET_MS
}

/** Thời điểm (ms) của "HH:mm" hoặc "HH:mm:ss" giờ Việt Nam ngày dateKey */
export function vnClock(dateKey: string, hhmm: string): number {
  const [h, m, s] = hhmm.split(':').map(Number)
  return vnStartOfDay(dateKey) + ((h || 0) * 3600 + (m || 0) * 60 + (s || 0)) * 1000
}

/** Giờ (0–23) theo giờ Việt Nam */
export function vnHour(date: DateInput): number {
  return vnParts(date).hour
}

/** Đầu giờ (UTC, phút = 0) chứa thời điểm, ISO — khóa `Sales_VisitStats.HourStart` */
export function hourStartIso(date: DateInput): string {
  const ms = toMs(date)
  return new Date(ms - (ms % 3_600_000)).toISOString()
}

/** Cộng n ngày vào khóa ngày */
export function addDaysKey(dateKey: string, days: number): string {
  return vnDateKey(vnStartOfDay(dateKey) + days * DAY_MS + 12 * 3_600_000)
}

/** Số ngày giữa hai khóa ngày (to − from) */
export function diffDaysKey(from: string, to: string): number {
  return Math.round((vnStartOfDay(to) - vnStartOfDay(from)) / DAY_MS)
}

/** "HH:mm" giờ Việt Nam, vd "16:30" (câu sự kiện, thông báo) */
export function formatVnTime(date: DateInput): string {
  const p = vnParts(date)
  return `${pad(p.hour)}:${pad(p.minute)}`
}

/** "HH:mm dd/MM" giờ Việt Nam, vd "16:30 15/10" (câu "Hẹn gọi lại lúc …") */
export function formatVnTimeDay(date: DateInput): string {
  const p = vnParts(date)
  return `${pad(p.hour)}:${pad(p.minute)} ${pad(p.day)}/${pad(p.month)}`
}

/** "dd/MM/yyyy HH:mm" giờ Việt Nam */
export function formatVnDateTime(date: DateInput): string {
  const p = vnParts(date)
  return `${pad(p.day)}/${pad(p.month)}/${p.year} ${pad(p.hour)}:${pad(p.minute)}`
}

/** Đặt ngoài giờ làm việc 8:00–21:00 giờ Việt Nam (UC-02 4a) */
export function isOutsideWorkingHours(date: DateInput, start = 8, end = 21): boolean {
  const hour = vnHour(date)
  return hour < start || hour >= end
}

/** Làm tròn xuống tới phút (ms) */
export const floorMinute = (ms: number): number => ms - (ms % 60_000)
