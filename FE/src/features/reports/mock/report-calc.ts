import { salesRules } from '@/config/sales-rules'
import { isDueCallback } from '@/features/sales/lib/order-rules'
import type {
  AdCostRecord,
  CancelReason,
  ComboRecord,
  ComboReport,
  ComboReportRow,
  DailyReport,
  DailyTotals,
  DateRangeQuery,
  ManagerDashboard,
  MetricCompare,
  OrderRecord,
  OrderStatus,
  ReturnReason,
  SourceMetrics,
  SourceReport,
  SourceReportRow,
  TelesaleReportRow,
  VisitStatRecord,
} from '@/types/landing'
import {
  addDaysKey,
  daysBetween,
  diffDaysKey,
  vnDayEndMs,
  vnDayStartMs,
  vnHourOf,
  vnKey,
} from '../lib/vn-date'

/**
 * Công thức số liệu báo cáo dùng chung cho handler mock (07 §3.11, BR-08, BR-14, BR-19, BR-22).
 * Hàm thuần: nhận mảng bản ghi, không đọc kho, không kiểm quyền (để đối chiếu số 06 §5.7 được bằng script).
 * BE `ISalesReportRepository` làm đúng các bước này.
 */

const DAY_MS = 86_400_000
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/

/** Trạng thái "đã từng xác nhận" (BR-19; xác nhận rồi hủy không tính) */
const EVER_CONFIRMED: OrderStatus[] = ['DaXacNhan', 'DangGiao', 'DaGiao', 'HoanHang']

/** "Đơn tính" = không bị hủy lý do Đơn trùng (BR-14) */
export const isCounted = (o: OrderRecord) =>
  !(o.status === 'DaHuy' && o.cancelReason === 'DonTrung')
export const isEverConfirmed = (o: OrderRecord) => EVER_CONFIRMED.includes(o.status)
export const isDelivered = (o: OrderRecord) => o.status === 'DaGiao'
export const isReturned = (o: OrderRecord) => o.status === 'HoanHang'

/** Làm tròn nửa lên (BE: MidpointRounding.AwayFromZero) */
export function round(value: number, digits = 0): number {
  const f = 10 ** digits
  return Math.round((value + Number.EPSILON * Math.sign(value)) * f) / f
}

/** num / den × 100; null khi mẫu = 0 */
export const percent = (num: number, den: number, digits: number): number | null =>
  den > 0 ? round((num / den) * 100, digits) : null

/** Khoảng thời gian [start, end] tính bằng ms UTC, gồm cả hai đầu */
export type MsWindow = { start: number; end: number }

const toMs = (iso: string | null | undefined) => (iso ? Date.parse(iso) : NaN)
export const inWindow = (iso: string | null | undefined, w: MsWindow) => {
  const ms = toMs(iso)
  return ms >= w.start && ms <= w.end
}
export const dayWindow = (from: string, to: string): MsWindow => ({
  start: vnDayStartMs(from),
  end: vnDayEndMs(to),
})

// ───────────────────────── Tham số ngày (07 §2) ─────────────────────────

/**
 * Đọc from/to: vắng → 7 ngày tới hôm nay (giờ VN); sai → `errors` đúng câu 07 §2.
 * Chỉ có một đầu: `to` vắng = hôm nay, `from` vắng = `to` − 6 ngày.
 */
export function checkRange(
  query: DateRangeQuery,
  now = Date.now()
): { from: string; to: string; errors?: Record<string, string> } {
  const to = query.to || vnKey(now)
  const from = query.from || addDaysKey(to, -(salesRules.defaultReportDays - 1))
  if (!DATE_KEY.test(from)) return { from, to, errors: { from: 'Ngày không hợp lệ' } }
  if (!DATE_KEY.test(to)) return { from, to, errors: { to: 'Ngày không hợp lệ' } }
  const days = diffDaysKey(from, to) + 1
  if (days < 1) return { from, to, errors: { to: 'Ngày kết thúc phải sau ngày bắt đầu' } }
  if (days > salesRules.maxReportDays) {
    return { from, to, errors: { from: `Khoảng ngày tối đa ${salesRules.maxReportDays} ngày` } }
  }
  return { from, to }
}

// ───────────────────────── Tổng quan quản lý (FR-01, FR-02) ─────────────────────────

export type ReportData = {
  orders: OrderRecord[]
  visitStats: VisitStatRecord[]
  adCosts: AdCostRecord[]
  combos: ComboRecord[]
}

const sumVisits = (stats: VisitStatRecord[], w: MsWindow) =>
  stats.reduce((s, v) => (inWindow(v.hourStart, w) ? s + v.visits : s), 0)

/** So sánh với kỳ trước: % 1 chữ số với số lượng, tiền; điểm phần trăm với tỉ lệ (07 §3.11) */
function compare(
  value: number | null,
  previous: number | null,
  kind: 'amount' | 'rate',
  digits = 1
): MetricCompare {
  let change: number | null = null
  if (value !== null && previous !== null) {
    if (kind === 'rate') change = round(value - previous, digits)
    else if (previous !== 0) change = round(((value - previous) / previous) * 100, 1)
  }
  return { value, previous, change }
}

const comboNameOf = (combos: ComboRecord[], o: OrderRecord) =>
  combos.find((c) => c.id === o.comboId)?.name ?? o.comboName

/**
 * Tổng quan quản lý: hôm nay 00:00 giờ VN → now, so với hôm qua cùng khung giờ (07 §5 quyết định 19).
 * `pendingCalls`, `dueCallbacks` là số hiện tại toàn shop. Ghép trend 14 ngày, tỉ trọng combo, nguồn hôm nay.
 */
export function managerDashboard(data: ReportData, now = Date.now()): ManagerDashboard {
  const today = vnKey(now)
  const cur: MsWindow = { start: vnDayStartMs(today), end: now }
  const prev: MsWindow = { start: cur.start - DAY_MS, end: now - DAY_MS }
  const counted = data.orders.filter(isCounted)

  const snapshot = (w: MsWindow) => {
    const placed = counted.filter((o) => inWindow(o.placedAt, w))
    const visits = sumVisits(data.visitStats, w)
    return {
      visits,
      orders: placed.length,
      conversionRate: percent(placed.length, visits, 2),
      confirmRate: percent(placed.filter(isEverConfirmed).length, placed.length, 1),
      confirmedValue: data.orders
        .filter((o) => isEverConfirmed(o) && inWindow(o.confirmedAt, w))
        .reduce((s, o) => s + o.total, 0),
    }
  }
  const a = snapshot(cur)
  const b = snapshot(prev)

  const todayOrders = counted.filter((o) => inWindow(o.placedAt, cur))
  const ordersByHour = Array.from({ length: 24 }, (_, hour) => ({ hour, orders: 0 }))
  for (const o of todayOrders) ordersByHour[vnHourOf(o.placedAt)].orders += 1

  const trend14Days = daysBetween(addDaysKey(today, -13), today).map((date) => {
    const placed = counted.filter((o) => inWindow(o.placedAt, dayWindow(date, date)))
    const confirmed = placed.filter(isEverConfirmed).length
    return {
      date,
      orders: placed.length,
      confirmed,
      confirmRate: percent(confirmed, placed.length, 1),
    }
  })

  const total = todayOrders.length
  const comboShare = groupCount(todayOrders, (o) => o.comboId).map(([comboId, list]) => ({
    comboId,
    comboName: comboNameOf(data.combos, list[0]),
    orders: list.length,
    share: percent(list.length, total, 1) ?? 0,
  }))
  const sourceShare = groupCount(todayOrders, (o) => o.source).map(([source, list]) => ({
    source,
    orders: list.length,
    share: percent(list.length, total, 1) ?? 0,
  }))

  return {
    date: today,
    asOf: new Date(now).toISOString(),
    visits: compare(a.visits, b.visits, 'amount'),
    orders: compare(a.orders, b.orders, 'amount'),
    conversionRate: compare(a.conversionRate, b.conversionRate, 'rate', 2),
    pendingCalls: data.orders.filter((o) => o.status === 'Moi' || o.status === 'ChoGoiLai').length,
    dueCallbacks: data.orders.filter((o) => isDueCallback(o, now)).length,
    confirmRate: compare(a.confirmRate, b.confirmRate, 'rate', 1),
    confirmedValue: compare(a.confirmedValue, b.confirmedValue, 'amount'),
    ordersByHour,
    trend14Days,
    comboShare,
    sourceShare,
  }
}

/** Nhóm và sắp theo số phần tử giảm dần, bằng nhau theo khóa */
function groupCount<T>(items: T[], key: (item: T) => string): [string, T[]][] {
  const map = new Map<string, T[]>()
  for (const item of items) {
    const k = key(item)
    const list = map.get(k)
    if (list) list.push(item)
    else map.set(k, [item])
  }
  return [...map.entries()].sort((x, y) => y[1].length - x[1].length || x[0].localeCompare(y[0]))
}

// ───────────────────────── Theo nguồn (FR-29, FR-33) ─────────────────────────

type SourceBucket = {
  visits: number
  placed: OrderRecord[]
  deliveredRevenue: number
  adCost: number
}
const emptyBucket = (): SourceBucket => ({ visits: 0, placed: [], deliveredRevenue: 0, adCost: 0 })

function sourceMetrics(b: SourceBucket): SourceMetrics {
  const orders = b.placed.length
  const confirmed = b.placed.filter(isEverConfirmed).length
  const delivered = b.placed.filter(isDelivered).length
  const returned = b.placed.filter(isReturned).length
  return {
    visits: b.visits,
    orders,
    conversionRate: percent(orders, b.visits, 2),
    confirmed,
    confirmRate: percent(confirmed, orders, 1),
    delivered,
    returned,
    returnRate: percent(returned, delivered + returned, 1),
    deliveredRevenue: b.deliveredRevenue,
    adCost: b.adCost,
    // Làm tròn tới 1.000 ₫ (BR-22); không có chi phí (vd Trực tiếp) hoặc chưa có đơn xác nhận → null như BE
    costPerConfirmed: b.adCost > 0 && confirmed > 0 ? round(b.adCost / confirmed / 1000) * 1000 : null,
    roas: b.adCost > 0 ? round(b.deliveredRevenue / b.adCost, 2) : null,
  }
}

/** Sắp dòng: số đơn giảm dần, rồi lượt giảm dần, rồi tên */
const byOrders =
  <T extends SourceMetrics>(key: (r: T) => string) =>
  (x: T, y: T) =>
    y.orders - x.orders || y.visits - x.visits || key(x).localeCompare(key(y))

/**
 * Báo cáo theo nguồn, mở xuống chiến dịch (07 §3.11 "Theo nguồn", quyết định 18):
 * lượt theo HourStart, đơn/xác nhận/giao/hoàn theo nhóm đơn đặt trong kỳ, doanh thu theo DeliveredAt,
 * chi phí theo Date; chi phí chiến dịch '' chỉ cộng vào dòng nguồn.
 */
export function sourceReport(
  data: ReportData,
  from: string,
  to: string,
  filter: { source?: string; campaign?: string } = {}
): SourceReport {
  const w = dayWindow(from, to)
  const matchSource = (s: string) => !filter.source || s === filter.source
  const matchCampaign = (c: string) => filter.campaign === undefined || c === filter.campaign

  const sources = new Map<string, { bucket: SourceBucket; campaigns: Map<string, SourceBucket> }>()
  const total = emptyBucket()
  const at = (source: string, campaign: string | null) => {
    let s = sources.get(source)
    if (!s) {
      s = { bucket: emptyBucket(), campaigns: new Map() }
      sources.set(source, s)
    }
    if (campaign === null) return [s.bucket]
    let c = s.campaigns.get(campaign)
    if (!c) {
      c = emptyBucket()
      s.campaigns.set(campaign, c)
    }
    return [s.bucket, c]
  }

  for (const v of data.visitStats) {
    const campaign = v.campaign ?? ''
    if (v.visits <= 0 || !matchSource(v.source) || !matchCampaign(campaign)) continue
    if (!inWindow(v.hourStart, w)) continue
    for (const b of [...at(v.source, campaign), total]) b.visits += v.visits
  }
  for (const o of data.orders) {
    const campaign = o.campaign ?? ''
    if (!matchSource(o.source) || !matchCampaign(campaign)) continue
    if (isCounted(o) && inWindow(o.placedAt, w)) {
      for (const b of [...at(o.source, campaign), total]) b.placed.push(o)
    }
    if (isDelivered(o) && inWindow(o.shipment?.deliveredAt, w)) {
      for (const b of [...at(o.source, campaign), total]) b.deliveredRevenue += o.subtotal
    }
  }
  for (const c of data.adCosts) {
    if (c.amount <= 0 || !matchSource(c.source) || !matchCampaign(c.campaign)) continue
    if (c.date < from || c.date > to) continue
    // Chi phí không chiến dịch chỉ vào dòng nguồn (07 §3.11)
    for (const b of [...at(c.source, c.campaign ? c.campaign : null), total]) b.adCost += c.amount
  }

  const rows: SourceReportRow[] = [...sources.entries()]
    .map(([source, s]) => ({
      source,
      ...sourceMetrics(s.bucket),
      campaigns: [...s.campaigns.entries()]
        .map(([campaign, b]) => ({ campaign, ...sourceMetrics(b) }))
        .sort(byOrders((r) => r.campaign)),
    }))
    .sort(byOrders((r) => r.source))

  return { from, to, rows, totals: sourceMetrics(total) }
}

// ───────────────────────── Theo combo (FR-30) ─────────────────────────

/** Nhóm theo combo hiện tại của đơn tính đặt trong kỳ; doanh thu theo DeliveredAt (07 §3.11) */
export function comboReport(
  data: ReportData,
  from: string,
  to: string,
  source?: string
): ComboReport {
  const w = dayWindow(from, to)
  const orders = data.orders.filter((o) => !source || o.source === source)
  const placed = orders.filter((o) => isCounted(o) && inWindow(o.placedAt, w))
  const delivered = orders.filter((o) => isDelivered(o) && inWindow(o.shipment?.deliveredAt, w))
  const ids = [...new Set([...placed, ...delivered].map((o) => o.comboId))]

  const rows: ComboReportRow[] = ids.map((comboId) => {
    const list = placed.filter((o) => o.comboId === comboId)
    const confirmed = list.filter(isEverConfirmed)
    const sample = list[0] ?? delivered.find((o) => o.comboId === comboId)!
    const combo = data.combos.find((c) => c.id === comboId)
    return {
      comboId,
      comboCode: combo?.code ?? sample.comboCode,
      comboName: combo?.name ?? sample.comboName,
      orders: list.length,
      share: percent(list.length, placed.length, 1) ?? 0,
      bottles: confirmed.reduce((s, o) => s + o.bottleCount * o.quantity, 0),
      confirmed: confirmed.length,
      deliveredRevenue: delivered
        .filter((o) => o.comboId === comboId)
        .reduce((s, o) => s + o.subtotal, 0),
      averageOrderValue: confirmed.length
        ? round(confirmed.reduce((s, o) => s + o.total, 0) / confirmed.length)
        : null,
    }
  })
  rows.sort((x, y) => y.orders - x.orders || x.comboCode.localeCompare(y.comboCode))

  return { from, to, ...(source ? { source } : {}), rows, totalOrders: placed.length }
}

// ───────────────────────── Theo telesale (FR-31) ─────────────────────────

export type TelesalePerson = { userId: string; fullName: string }

/**
 * Nhóm đơn tính đặt trong kỳ theo từng người (07 §3.11 "Theo telesale"). `staff` = tài khoản STAFF đang hoạt
 * động (luôn có dòng, kể cả 0); người khác có đơn (phụ trách, xác nhận, gọi) trong kỳ được thêm vào.
 */
export function telesaleRows(
  orders: OrderRecord[],
  from: string,
  to: string,
  staff: TelesalePerson[],
  nameOf: (userId: string) => string | undefined
): TelesaleReportRow[] {
  const w = dayWindow(from, to)
  const placed = orders.filter((o) => isCounted(o) && inWindow(o.placedAt, w))

  const people = new Map<string, string>(staff.map((p) => [p.userId, p.fullName]))
  const add = (id: string | undefined, name: string | undefined) => {
    if (id && !people.has(id)) people.set(id, nameOf(id) ?? name ?? id)
  }
  for (const o of placed) {
    add(o.assigneeId, o.assigneeName)
    if (isEverConfirmed(o)) add(o.confirmedById, o.confirmedByName)
    for (const c of o.calls) add(c.callerId, c.callerName)
  }

  return [...people.entries()]
    .map(([userId, fullName]) => {
      const assigned = placed.filter((o) => o.assigneeId === userId).length
      const confirmed = placed.filter((o) => o.confirmedById === userId && isEverConfirmed(o))
      const upsell = confirmed.filter((o) => o.upsellAmount > 0)
      const delivered = confirmed.filter(isDelivered).length
      const returned = confirmed.filter(isReturned).length
      return {
        userId,
        fullName,
        assigned,
        called: placed.filter((o) => o.calls.some((c) => c.callerId === userId)).length,
        confirmed: confirmed.length,
        confirmRate: percent(confirmed.length, assigned, 1),
        upsellCount: upsell.length,
        upsellValue: upsell.reduce((s, o) => s + o.upsellAmount, 0),
        delivered,
        returned,
        returnRate: percent(returned, delivered + returned, 1),
      }
    })
    .sort((x, y) => y.assigned - x.assigned || x.fullName.localeCompare(y.fullName, 'vi'))
}

// ───────────────────────── Theo ngày (FR-32) ─────────────────────────

const emptyTotals = (): Omit<DailyTotals, 'cancelRate'> => ({
  orders: 0,
  confirmed: 0,
  cancelled: 0,
  returned: 0,
  delivered: 0,
  deliveredRevenue: 0,
})
const withRate = (t: Omit<DailyTotals, 'cancelRate'>): DailyTotals => ({
  ...t,
  cancelRate: percent(t.cancelled, t.orders, 1),
})

/** Cộng chỉ số theo ngày VN của từng mốc (07 §3.11 "Theo ngày") */
function dailyBuckets(orders: OrderRecord[], from: string, to: string) {
  const days = new Map(daysBetween(from, to).map((d) => [d, emptyTotals()]))
  const bump = (
    iso: string | null | undefined,
    apply: (t: ReturnType<typeof emptyTotals>) => void
  ) => {
    if (!iso) return
    const t = days.get(vnKey(iso))
    if (t) apply(t)
  }
  for (const o of orders) {
    if (isCounted(o)) bump(o.placedAt, (t) => (t.orders += 1))
    if (isEverConfirmed(o)) bump(o.confirmedAt, (t) => (t.confirmed += 1))
    if (o.status === 'DaHuy' && o.cancelReason !== 'DonTrung')
      bump(o.cancelledAt, (t) => (t.cancelled += 1))
    if (isReturned(o)) bump(o.shipment?.returnedAt, (t) => (t.returned += 1))
    if (isDelivered(o)) {
      bump(o.shipment?.deliveredAt, (t) => {
        t.delivered += 1
        t.deliveredRevenue += o.subtotal
      })
    }
  }
  return days
}

const sumTotals = (list: Omit<DailyTotals, 'cancelRate'>[]) =>
  list.reduce((s, t) => {
    s.orders += t.orders
    s.confirmed += t.confirmed
    s.cancelled += t.cancelled
    s.returned += t.returned
    s.delivered += t.delivered
    s.deliveredRevenue += t.deliveredRevenue
    return s
  }, emptyTotals())

/** Theo ngày + kỳ liền trước cùng số ngày + lý do hủy (không gồm Đơn trùng), lý do hoàn */
export function dailyReport(orders: OrderRecord[], from: string, to: string): DailyReport {
  const n = diffDaysKey(from, to) + 1
  const prevTo = addDaysKey(from, -1)
  const prevFrom = addDaysKey(from, -n)
  const days = dailyBuckets(orders, from, to)
  const prevDays = dailyBuckets(orders, prevFrom, prevTo)

  const w = dayWindow(from, to)
  const cancelled = orders.filter((o) => o.status === 'DaHuy' && inWindow(o.cancelledAt, w))
  const cancelCounts = new Map<CancelReason, number>()
  let duplicateCancelled = 0
  for (const o of cancelled) {
    if (o.cancelReason === 'DonTrung') duplicateCancelled += 1
    else if (o.cancelReason)
      cancelCounts.set(o.cancelReason, (cancelCounts.get(o.cancelReason) ?? 0) + 1)
  }
  const returnCounts = new Map<ReturnReason, number>()
  for (const o of orders) {
    if (isReturned(o) && o.returnReason && inWindow(o.shipment?.returnedAt, w)) {
      returnCounts.set(o.returnReason, (returnCounts.get(o.returnReason) ?? 0) + 1)
    }
  }
  const sorted = <K extends string>(m: Map<K, number>) =>
    [...m.entries()]
      .map(([reason, count]) => ({ reason, count }))
      .sort((x, y) => y.count - x.count || x.reason.localeCompare(y.reason))

  return {
    from,
    to,
    totals: withRate(sumTotals([...days.values()])),
    previous: { ...withRate(sumTotals([...prevDays.values()])), from: prevFrom, to: prevTo },
    days: [...days.entries()].map(([date, t]) => ({ date, ...withRate(t) })),
    cancelReasons: sorted(cancelCounts),
    duplicateCancelled,
    returnReasons: sorted(returnCounts),
  }
}
