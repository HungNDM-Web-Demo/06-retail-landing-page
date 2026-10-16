import { salesRules } from '@/config/sales-rules'
import type {
  ComboRecord,
  LandingBlockRecord,
  LandingPageDto,
  ProductRecord,
  PromotionRecord,
  PublicBlock,
  PublicReview,
  PublicStoreInfo,
  ReviewRecord,
  ReviewSummary,
} from '@/types/landing'
import { minPricePerBottle, toPublicCombo } from '@/features/sales/lib/pricing'
import { priceTypeAt, toPublicPromotion } from '@/features/sales/lib/promotion'

/**
 * Dựng `LandingPageDto` (07 §2.1) từ bản ghi: dùng cho máy chủ (seed), handler mock (localStorage) và
 * khung xem trước của màn Nội dung landing (`LandingPreview`, dữ liệu đang sửa). Hàm thuần.
 */

export type LandingSource = {
  product: ProductRecord
  combos: ComboRecord[]
  promotion: PromotionRecord
  blocks: LandingBlockRecord[]
  reviews: ReviewRecord[]
  /** Cài đặt (khóa → giá trị): Store.*, Brand.LogoUrl, Brand.PrimaryColor */
  settings: Record<string, string>
}

export function storeInfoFrom(settings: Record<string, string>): PublicStoreInfo {
  const v = (key: string) => settings[key]?.trim() || undefined
  return {
    name: v('Store.Name') ?? v('Brand.AppName') ?? '',
    tagline: v('Store.Tagline'),
    hotline: v('Store.Hotline') ?? '',
    email: v('Store.Email'),
    address: v('Store.Address') ?? '',
    workingHours: v('Store.WorkingHours') ?? '',
    businessInfo: v('Store.BusinessInfo'),
    logoUrl: v('Brand.LogoUrl') ?? '/logo/logo-mark.svg',
    primaryColor: v('Brand.PrimaryColor') ?? '#0F766E',
  }
}

export const toPublicReview = (r: ReviewRecord): PublicReview => ({
  id: r.id,
  customerName: r.customerName,
  province: r.province,
  rating: r.rating,
  content: r.content,
  avatarUrl: r.avatarUrl || undefined,
  photoUrl: r.photoUrl || undefined,
  reviewedAt: r.reviewedAt,
  isSample: r.isSample,
})

export function reviewSummaryOf(reviews: Pick<ReviewRecord, 'rating'>[]): ReviewSummary {
  if (reviews.length === 0) return { average: 0, total: 0 }
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0)
  return { average: Math.round((sum / reviews.length) * 10) / 10, total: reviews.length }
}

const toPublicBlock = (b: LandingBlockRecord): PublicBlock => ({
  id: b.id,
  type: b.type,
  title: b.title,
  subtitle: b.subtitle || undefined,
  body: b.body || undefined,
  imageUrl: b.imageUrl || undefined,
  ctaText: b.ctaText || undefined,
  items: b.items ?? [],
  sortOrder: b.sortOrder,
})

export function buildLandingPage(source: LandingSource, now: number = Date.now()): LandingPageDto {
  const priceType = priceTypeAt(source.promotion, now)
  const combos = source.combos
    .filter((c) => !c.isDeleted && c.isVisible)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((c) => toPublicCombo(c, priceType))
  const visibleReviews = source.reviews.filter((r) => r.isVisible).sort((a, b) => a.sortOrder - b.sortOrder)
  const blocks = source.blocks
    .filter((b) => b.isVisible && !(b.type === 'Reviews' && visibleReviews.length === 0))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(toPublicBlock)
  const { updatedAt: _updatedAt, ...product } = source.product
  void _updatedAt
  return {
    store: storeInfoFrom(source.settings),
    product: { ...product, imageUrl: product.imageUrl || undefined },
    blocks,
    combos,
    promotion: toPublicPromotion(source.promotion, now),
    minPricePerBottle: minPricePerBottle(combos),
    reviewSummary: reviewSummaryOf(visibleReviews),
    reviews: visibleReviews.slice(0, salesRules.reviewPageSize).map(toPublicReview),
    shippingFee: salesRules.shippingFee,
    freeShippingThreshold: salesRules.freeShippingThreshold,
    asOf: new Date(now).toISOString(),
  }
}
