import demoData from '@/mock/seed/demo-data.json'
import { stableId } from '@/mock/mock-helpers'
import { addDaysKey, vnClock, vnDateKey } from '@/features/sales/lib/vn-time'
import type {
  BlockType,
  ComboRecord,
  ContentItem,
  LandingBlockRecord,
  ProductRecord,
  PromotionRecord,
  ReviewRecord,
} from '@/types/landing'

/**
 * Suy ra bản ghi sản phẩm, combo, khuyến mãi, khối nội dung, đánh giá từ `demo-data.json` (06 §5.2).
 * Hàm thuần, chạy được phía máy chủ (landing render sẵn ở chế độ mock) và trong trình duyệt (kho mock-db).
 * `anchor` = thời điểm nạp seed (ms, làm tròn phút) để mọi ngày tương đối khớp nhau.
 */

type RawCombo = {
  code: string
  name: string
  description: string
  bottleCount: number
  giftText: string | null
  promoPrice: number
  regularPrice: number
  freeShipping: boolean
  badge: string | null
  isDefault: boolean
  imageUrl: string | null
}
type RawBlock = {
  type: BlockType
  title: string
  subtitle: string | null
  body: string | null
  imageUrl: string | null
  ctaText: string | null
  items: ContentItem[]
}
type RawReview = {
  name: string
  province: string
  rating: number
  daysAgo: number
  avatarUrl: string | null
  photoUrl: string | null
  content: string
}
type RawData = {
  product: Omit<ProductRecord, 'id' | 'updatedAt'>
  promotion: { name: string; startDay: number; endDay: number; autoRenewDays: number | null }
  combos: RawCombo[]
  blocks: RawBlock[]
  reviews: RawReview[]
}

const raw = demoData as unknown as RawData

const opt = <T>(value: T | null | undefined): T | undefined => (value === null ? undefined : value)

const cleanItem = (item: ContentItem): ContentItem =>
  Object.fromEntries(Object.entries(item).filter(([, v]) => v !== null && v !== undefined && v !== '')) as ContentItem

export const productIdOf = (code: string) => stableId('product', code)
export const comboIdOf = (code: string) => stableId('combo', code)
export const blockIdOf = (type: BlockType) => stableId('block', type)
export const PROMOTION_ID = stableId('promotion', 1)

export type CatalogSeed = {
  product: ProductRecord
  combos: ComboRecord[]
  promotion: PromotionRecord
  blocks: LandingBlockRecord[]
  reviews: ReviewRecord[]
}

let cache: { anchor: number; data: CatalogSeed } | null = null

export function buildCatalogSeed(anchor: number): CatalogSeed {
  if (cache?.anchor === anchor) return cache.data
  const today = vnDateKey(anchor)
  const stamp = new Date(anchor).toISOString()
  const productId = productIdOf(raw.product.code)

  const product: ProductRecord = {
    id: productId,
    ...raw.product,
    imageUrl: opt(raw.product.imageUrl),
    updatedAt: stamp,
  }

  const combos: ComboRecord[] = raw.combos.map((c, i) => ({
    id: comboIdOf(c.code),
    productId,
    code: c.code,
    name: c.name,
    description: c.description,
    bottleCount: c.bottleCount,
    giftText: opt(c.giftText),
    promoPrice: c.promoPrice,
    regularPrice: c.regularPrice,
    freeShipping: c.freeShipping,
    badge: opt(c.badge),
    imageUrl: opt(c.imageUrl),
    sortOrder: (i + 1) * 10,
    isDefault: c.isDefault,
    isVisible: true,
    updatedAt: stamp,
  }))

  const promotion: PromotionRecord = {
    id: PROMOTION_ID,
    name: raw.promotion.name,
    startAt: new Date(vnClock(addDaysKey(today, raw.promotion.startDay), '00:00:00')).toISOString(),
    endAt: new Date(vnClock(addDaysKey(today, raw.promotion.endDay), '23:59:59')).toISOString(),
    autoRenewDays: opt(raw.promotion.autoRenewDays),
    version: 1,
  }

  const blocks: LandingBlockRecord[] = raw.blocks.map((b, i) => ({
    id: blockIdOf(b.type),
    type: b.type,
    title: b.title,
    subtitle: opt(b.subtitle),
    body: opt(b.body),
    imageUrl: opt(b.imageUrl),
    ctaText: opt(b.ctaText),
    items: (b.items ?? []).map(cleanItem),
    sortOrder: (i + 1) * 10,
    isVisible: true,
    updatedAt: stamp,
  }))

  const reviews: ReviewRecord[] = raw.reviews.map((r, i) => {
    const reviewedAt = new Date(vnClock(addDaysKey(today, -r.daysAgo), '10:00')).toISOString()
    return {
      id: stableId('review', i),
      customerName: r.name,
      province: r.province,
      rating: r.rating,
      content: r.content,
      avatarUrl: opt(r.avatarUrl),
      photoUrl: opt(r.photoUrl),
      reviewedAt,
      sortOrder: (i + 1) * 10,
      isVisible: true,
      isSample: true,
      createdAt: reviewedAt,
    }
  })

  const data = { product, combos, promotion, blocks, reviews }
  cache = { anchor, data }
  return data
}
