import { mockDb } from '@/mock/mock-db'
import { stableId } from '@/mock/mock-helpers'
import { liveUsers, roleIdOf, usersDb } from '@/mock/system-data'
import type {
  AdCostRecord,
  ConversionEventRecord,
  OrderRecord,
  TelesaleStateRecord,
  VisitRecord,
  VisitStatRecord,
} from '@/types/landing'
import { blocksDb, combosDb, productDb, promotionDb, reviewsDb } from '@/features/landing/mock/landing.store'
import type { Actor } from '../lib/order-events'
import type { StaffCandidate } from '../lib/order-rules'
import { hourStartIso, vnDateKey } from '../lib/vn-time'
import { buildSalesSeed, buildVisitStatSeed } from './sales.seed'
import { salesMetaDb, seedAnchor, seededDate } from './seed-anchor'

/**
 * Collection bán hàng ở chế độ mock (07 §4.8, scope `business`). FE-Landing khai báo và nạp seed; handler
 * FE-Quản trị đọc, ghi qua các collection và hàm dưới đây. Đơn lồng cuộc gọi, sự kiện, vận đơn (`OrderRecord`).
 * Lượt truy cập lịch sử giữ trong bộ nhớ (`allVisitStats()` hợp với collection `visit-stats`).
 */

export { seedAnchor } from './seed-anchor'

export const ordersDb = mockDb.collection<OrderRecord>('orders', () => buildSalesSeed(seedAnchor()).orders)
/** Lượt truy cập thô (gom phiên 30 phút, BR-08); seed rỗng */
export const visitsDb = mockDb.collection<VisitRecord>('visits', () => [])
/** Lượt truy cập gộp theo giờ phát sinh khi demo (lịch sử ở bộ nhớ) */
export const visitStatsDb = mockDb.collection<VisitStatRecord>('visit-stats', () => [])
export const telesaleStatesDb = mockDb.collection<TelesaleStateRecord>(
  'telesale-states',
  () => buildSalesSeed(seedAnchor()).telesaleStates
)
export const adCostsDb = mockDb.collection<AdCostRecord>('ad-costs', () => buildSalesSeed(seedAnchor()).adCosts)
/** Nhật ký pixel giả lập (giữ 500 bản ghi mới nhất); seed rỗng */
export const conversionEventsDb = mockDb.collection<ConversionEventRecord>('conversion-events', () => [])

/** Mọi collection nghiệp vụ của dự án (đặt lại theo ngày, nghe thay đổi) */
export const businessCollections = [
  'products',
  'combos',
  'promotions',
  'landing-blocks',
  'reviews',
  'orders',
  'visits',
  'visit-stats',
  'telesale-states',
  'ad-costs',
  'conversion-events',
  'sales-meta',
] as const

const allCollections = [
  productDb,
  combosDb,
  promotionDb,
  blocksDb,
  reviewsDb,
  ordersDb,
  visitsDb,
  visitStatsDb,
  telesaleStatesDb,
  adCostsDb,
  conversionEventsDb,
  salesMetaDb,
]

/**
 * Làm mới theo ngày (07 §4.8, 06 §5.3): ngày VN lúc nạp khác hôm nay → nạp lại mọi collection nghiệp vụ.
 * Gọi ở đầu mỗi handler mock (rẻ: chỉ đọc một bản ghi).
 */
export function ensureFreshDay(now: number = Date.now()): void {
  if (typeof window === 'undefined') return
  const date = seededDate()
  if (!date || date === vnDateKey(now)) return
  mockDb.batch(() => allCollections.forEach((c) => c.reseed()))
}

// ───────────────────────── Lượt truy cập gộp ─────────────────────────

/** Lượt gộp theo giờ: lịch sử trong bộ nhớ + lượt phát sinh khi demo (cộng theo khóa giờ, nguồn, chiến dịch) */
export function allVisitStats(): VisitStatRecord[] {
  const map = new Map<string, VisitStatRecord>()
  for (const row of buildVisitStatSeed(seedAnchor())) map.set(row.id, { ...row })
  for (const row of visitStatsDb.all()) {
    const existing = map.get(row.id)
    if (existing) existing.visits += row.visits
    else map.set(row.id, { ...row })
  }
  return [...map.values()]
}

/** Cộng 1 lượt mới vào giờ hiện tại của (nguồn, chiến dịch) — upsert `Sales_VisitStats` */
export function bumpVisitStat(at: number | string, source: string, campaign?: string | null): void {
  const hourStart = hourStartIso(at)
  const c = campaign ?? ''
  const id = stableId('visit-stat', hourStart, source, c)
  if (!visitStatsDb.update(id, (row) => ({ ...row, visits: row.visits + 1 }))) {
    visitStatsDb.insert({ id, hourStart, source, campaign: c, visits: 1 })
  }
}

// ───────────────────────── Sự kiện pixel ─────────────────────────

const MAX_CONVERSION_EVENTS = 500

/** Ghi sự kiện pixel, giữ 500 bản ghi mới nhất */
export function addConversionEvent(event: ConversionEventRecord): void {
  const items = [...conversionEventsDb.all(), event]
  if (items.length <= MAX_CONVERSION_EVENTS) {
    conversionEventsDb.insert(event)
    return
  }
  items.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
  conversionEventsDb.replaceAll(items.slice(0, MAX_CONVERSION_EVENTS))
}

// ───────────────────────── Người dùng ─────────────────────────

/** Họ tên tài khoản (rỗng khi không thấy) */
export const userName = (id: string | null | undefined): string => (id ? (usersDb.get(id)?.fullName ?? '') : '')

/** Người thao tác dạng `Actor` cho sự kiện đơn */
export function actorFor(userId: string): Actor {
  return { id: userId, name: userName(userId) }
}

/** Tài khoản vai trò STAFF (Telesale) đang hoạt động, theo username */
export function activeTelesales(): StaffCandidate[] {
  const staffRole = roleIdOf('STAFF')
  return liveUsers()
    .filter((u) => u.isActive && u.roleIds.includes(staffRole))
    .sort((a, b) => a.username.localeCompare(b.username))
    .map((u) => ({ userId: u.id, username: u.username, fullName: u.fullName }))
}

/** Trạng thái nhận đơn của một người (undefined khi chưa từng bật) */
export const telesaleStateOf = (userId: string): TelesaleStateRecord | undefined =>
  telesaleStatesDb.find((s) => s.userId === userId)
