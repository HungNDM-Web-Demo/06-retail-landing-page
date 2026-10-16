import demoData from '@/mock/seed/demo-data.json'
import { mockDb } from '@/mock/mock-db'
import { floorMinute, vnDateKey } from '../lib/vn-time'

/**
 * Mốc nạp seed nghiệp vụ (07 §4.8): collection `sales-meta` lưu `seededAt` (thời điểm nạp, làm tròn phút) và
 * `seededDate` (ngày VN lúc nạp). Mọi collection nghiệp vụ tính ngày tương đối theo cùng mốc này, nên đơn,
 * khuyến mãi, lượt truy cập khớp nhau dù collection được nạp lười vào các thời điểm khác nhau.
 */

// Sửa demo-data.json là trình duyệt tự bỏ dữ liệu cũ (MockDb.registerSeed)
mockDb.registerSeed('demo-data', demoData)

export type SalesMetaRecord = { id: string; seededAt: string; seededDate: string }

const META_ID = 'meta'

export const salesMetaDb = mockDb.collection<SalesMetaRecord>('sales-meta', () => {
  const now = floorMinute(Date.now())
  return [{ id: META_ID, seededAt: new Date(now).toISOString(), seededDate: vnDateKey(now) }]
})

/** Mốc nạp seed (ms) */
export function seedAnchor(): number {
  const meta = salesMetaDb.get(META_ID)
  return meta ? new Date(meta.seededAt).getTime() : floorMinute(Date.now())
}

/** Ngày VN lúc nạp seed */
export const seededDate = (): string | undefined => salesMetaDb.get(META_ID)?.seededDate
