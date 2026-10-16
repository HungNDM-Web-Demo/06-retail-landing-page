import { mockDb } from '@/mock/mock-db'
import type {
  ComboRecord,
  LandingBlockRecord,
  ProductRecord,
  PromotionRecord,
  ReviewRecord,
} from '@/types/landing'
import { seedAnchor } from '@/features/sales/mock/seed-anchor'
import { buildCatalogSeed, PROMOTION_ID } from './landing.seed'

/**
 * Collection nội dung landing ở chế độ mock (07 §4.8, scope `business`). FE-Landing khai báo, nạp seed;
 * handler FE-Quản trị (combo, khuyến mãi, sản phẩm, khối, đánh giá) đọc, ghi qua các collection này.
 * Combo xóa mềm (`isDeleted`). Gọi `ensureFreshDay()` (sales.store) ở đầu mỗi handler.
 */

export const productDb = mockDb.collection<ProductRecord>('products', () => [buildCatalogSeed(seedAnchor()).product])
export const combosDb = mockDb.collection<ComboRecord>('combos', () => buildCatalogSeed(seedAnchor()).combos)
export const promotionDb = mockDb.collection<PromotionRecord>('promotions', () => [
  buildCatalogSeed(seedAnchor()).promotion,
])
export const blocksDb = mockDb.collection<LandingBlockRecord>('landing-blocks', () => buildCatalogSeed(seedAnchor()).blocks)
export const reviewsDb = mockDb.collection<ReviewRecord>('reviews', () => buildCatalogSeed(seedAnchor()).reviews)

/** Tên collection nội dung (để nghe thay đổi, đặt lại theo ngày) */
export const landingCollections = ['products', 'combos', 'promotions', 'landing-blocks', 'reviews'] as const

/** Chương trình khuyến mãi (một dòng) */
export function getPromotion(): PromotionRecord {
  return promotionDb.get(PROMOTION_ID) ?? promotionDb.all()[0]
}

/** Sản phẩm (một dòng) */
export const getProduct = (): ProductRecord => productDb.all()[0]

/** Combo chưa xóa theo sortOrder (kể cả ẩn) */
export const liveCombos = (): ComboRecord[] =>
  combosDb.filter((c) => !c.isDeleted).sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code))

/** Combo đang hiện trên landing */
export const visibleCombos = (): ComboRecord[] => liveCombos().filter((c) => c.isVisible)

/** Khối theo sortOrder (cả ẩn) */
export const sortedBlocks = (): LandingBlockRecord[] => blocksDb.all().sort((a, b) => a.sortOrder - b.sortOrder)

/** Đánh giá theo sortOrder (cả ẩn) */
export const sortedReviews = (): ReviewRecord[] => reviewsDb.all().sort((a, b) => a.sortOrder - b.sortOrder)
