import {
  blockTypeLabels,
  landingIconNames,
  provinces,
  requiredBlockTypes,
} from '@/config/landing-labels'
import { permissions } from '@/config/permissions'
import { fieldErrors, salesProblem } from '@/features/orders/mock/sales-problems'
import { mockDelay } from '@/lib/data-source'
import { requirePermission } from '@/mock/mock-auth'
import { mockBlobs } from '@/mock/mock-blobs'
import { mockDb } from '@/mock/mock-db'
import { notFound } from '@/mock/mock-errors'
import { newId, paginate, search } from '@/mock/mock-helpers'
import type { PaginatedResult } from '@/types/api'
import type {
  ContentItem,
  LandingBlockDto,
  LandingBlockRecord,
  ProductDto,
  ReorderRequest,
  ReviewDto,
  ReviewQuery,
  ReviewRecord,
  SaveReviewRequest,
  SetVisibilityRequest,
  UpdateLandingBlockRequest,
  UpdateProductRequest,
} from '@/types/landing'
import {
  IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  blockLimits,
  blockMessages,
  blockProblems,
  imageMessages,
  productMessages,
  reviewMessages,
} from '../lib/content-messages'
import {
  blocksDb,
  ensureFreshDay,
  getProduct,
  productDb,
  reviewsDb,
  sortedBlocks,
  sortedReviews,
} from './store-access'

/**
 * Handler mock nội dung landing (07 §2.4; SCR-09, FR-04, FR-08, FR-17, FR-18; quyết định 6):
 * sản phẩm, 12 khối nội dung, đánh giá, tải ảnh.
 */

const now = () => new Date().toISOString()
const clean = (value: string | null | undefined) => value?.trim() || undefined
const tooLong = (value: string | null | undefined, max: number) => (value?.trim().length ?? 0) > max

/** Đúng đủ mọi id, không trùng (ReorderRequest) */
const isComplete = (ids: string[] | undefined, all: string[]) =>
  !!ids &&
  ids.length === all.length &&
  new Set(ids).size === ids.length &&
  all.every((id) => ids.includes(id))

// ───────────────────────── Sản phẩm ─────────────────────────

function currentProduct(): ProductDto {
  const product = getProduct()
  if (!product) throw notFound('Chưa có sản phẩm')
  return product
}

// ───────────────────────── Khối nội dung ─────────────────────────

const toBlockDto = (b: LandingBlockRecord): LandingBlockDto => ({
  ...b,
  items: b.items ?? [],
  isRequired: requiredBlockTypes.includes(b.type),
})

function getBlock(id: string): LandingBlockRecord {
  const block = blocksDb.get(id)
  if (!block) throw notFound(blockMessages.notFound)
  return block
}

/** Mục sạch: bỏ trường rỗng */
function cleanItem(item: ContentItem): ContentItem {
  const result: ContentItem = {}
  for (const key of ['title', 'text', 'value', 'icon', 'imageUrl', 'afterImageUrl'] as const) {
    const value = clean(item[key])
    if (value) result[key] = value
  }
  return result
}

/** Kiểm tra UpdateLandingBlockRequest đúng câu 07 §2.4 */
function validateBlock(block: LandingBlockRecord, input: UpdateLandingBlockRequest) {
  const errors: Record<string, string> = {}
  const title = input.title?.trim() ?? ''
  if (!title) errors.title = blockMessages.titleRequired
  else if (title.length > blockLimits.title) errors.title = blockMessages.titleMax
  if (tooLong(input.subtitle, blockLimits.subtitle)) errors.subtitle = blockMessages.subtitleMax
  if (tooLong(input.body, blockLimits.body)) errors.body = blockMessages.bodyMax
  if (tooLong(input.imageUrl, blockLimits.imageUrl)) errors.imageUrl = blockMessages.imageUrlMax
  if (tooLong(input.ctaText, blockLimits.cta)) errors.ctaText = blockMessages.ctaMax

  const items = input.items ?? []
  if (items.length > blockLimits.items) errors.items = blockMessages.itemsMax
  items.forEach((raw, i) => {
    const item = cleanItem(raw)
    if (item.icon && !(landingIconNames as readonly string[]).includes(item.icon))
      errors[`items[${i}].icon`] = blockMessages.iconInvalid
    if (block.type === 'Faq') {
      if (!item.title) errors[`items[${i}].title`] = blockMessages.faqQuestion
      if (!item.text) errors[`items[${i}].text`] = blockMessages.faqAnswer
    }
    if (block.type === 'BeforeAfter') {
      if (!item.imageUrl) errors[`items[${i}].imageUrl`] = blockMessages.beforeImage
      if (!item.afterImageUrl) errors[`items[${i}].afterImageUrl`] = blockMessages.afterImage
    }
  })
  if (Object.keys(errors).length) throw fieldErrors(errors)
}

// ───────────────────────── Đánh giá ─────────────────────────

const toReviewDto = (r: ReviewRecord): ReviewDto => ({
  id: r.id,
  customerName: r.customerName,
  province: r.province,
  rating: r.rating,
  content: r.content,
  avatarUrl: r.avatarUrl || undefined,
  photoUrl: r.photoUrl || undefined,
  reviewedAt: r.reviewedAt,
  sortOrder: r.sortOrder,
  isVisible: r.isVisible,
  isSample: r.isSample,
})

function getReview(id: string): ReviewRecord {
  const review = reviewsDb.get(id)
  if (!review) throw notFound(reviewMessages.notFound)
  return review
}

function validateReview(input: SaveReviewRequest) {
  const errors: Record<string, string> = {}
  const name = input.customerName?.trim() ?? ''
  if (!name) errors.customerName = reviewMessages.customerNameRequired
  else if (name.length > 50) errors.customerName = reviewMessages.customerNameMax
  if (!(provinces as readonly string[]).includes(input.province ?? ''))
    errors.province = reviewMessages.province
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5)
    errors.rating = reviewMessages.rating
  const content = input.content?.trim() ?? ''
  if (!content) errors.content = reviewMessages.contentRequired
  else if (content.length > 1000) errors.content = reviewMessages.contentMax
  if (tooLong(input.avatarUrl, 500)) errors.avatarUrl = reviewMessages.urlMax
  if (tooLong(input.photoUrl, 500)) errors.photoUrl = reviewMessages.urlMax
  if (input.reviewedAt && !Number.isFinite(Date.parse(input.reviewedAt)))
    errors.reviewedAt = reviewMessages.reviewedAt
  if (Object.keys(errors).length) throw fieldErrors(errors)
}

const reviewFields = (input: SaveReviewRequest) => ({
  customerName: input.customerName.trim(),
  province: input.province,
  rating: input.rating,
  content: input.content.trim(),
  avatarUrl: clean(input.avatarUrl),
  photoUrl: clean(input.photoUrl),
  isSample: !!input.isSample,
})

// ───────────────────────── Handler ─────────────────────────

export const contentMock = {
  async getProduct(): Promise<ProductDto> {
    await mockDelay()
    ensureFreshDay()
    requirePermission(permissions.landingContents.view)
    return currentProduct()
  },

  async updateProduct(input: UpdateProductRequest): Promise<ProductDto> {
    await mockDelay()
    ensureFreshDay()
    requirePermission(permissions.landingContents.update)
    const before = currentProduct()
    const errors: Record<string, string> = {}
    const check = (
      key: keyof UpdateProductRequest,
      max: number,
      required: string,
      maxText: string
    ) => {
      const value = input[key]?.trim() ?? ''
      if (!value) errors[key] = required
      else if (value.length > max) errors[key] = maxText
    }
    check('name', 150, productMessages.nameRequired, productMessages.nameMax)
    check('shortName', 50, productMessages.shortNameRequired, productMessages.shortNameMax)
    check('volume', 30, productMessages.volumeRequired, productMessages.volumeMax)
    check('unit', 20, productMessages.unitRequired, productMessages.unitMax)
    check(
      'shortDescription',
      500,
      productMessages.shortDescriptionRequired,
      productMessages.shortDescriptionMax
    )
    if (tooLong(input.imageUrl, 500)) errors.imageUrl = productMessages.imageUrlMax
    if (Object.keys(errors).length) throw fieldErrors(errors)

    return productDb.update(before.id, {
      name: input.name.trim(),
      shortName: input.shortName.trim(),
      volume: input.volume.trim(),
      unit: input.unit.trim(),
      shortDescription: input.shortDescription.trim(),
      imageUrl: clean(input.imageUrl),
      updatedAt: now(),
    })!
  },

  /** 12 khối theo sortOrder; isRequired = Hero, Order, Footer */
  async getBlocks(): Promise<LandingBlockDto[]> {
    await mockDelay()
    ensureFreshDay()
    requirePermission(permissions.landingContents.view)
    return sortedBlocks().map(toBlockDto)
  },

  async updateBlock(id: string, input: UpdateLandingBlockRequest): Promise<LandingBlockDto> {
    await mockDelay()
    ensureFreshDay()
    requirePermission(permissions.landingContents.update)
    const block = getBlock(id)
    validateBlock(block, input)
    const after = blocksDb.update(id, {
      title: input.title.trim(),
      subtitle: clean(input.subtitle),
      body: clean(input.body),
      imageUrl: clean(input.imageUrl),
      ctaText: clean(input.ctaText),
      items: (input.items ?? []).map(cleanItem),
      updatedAt: now(),
    })!
    return toBlockDto(after)
  },

  /** Ẩn Hero, Order, Footer → KhoiBatBuoc (quyết định 6) */
  async setBlockVisibility(id: string, input: SetVisibilityRequest): Promise<void> {
    await mockDelay()
    ensureFreshDay()
    requirePermission(permissions.landingContents.update)
    const block = getBlock(id)
    if (!input.isVisible && requiredBlockTypes.includes(block.type))
      throw salesProblem(400, 'KhoiBatBuoc', blockProblems.KhoiBatBuoc(blockTypeLabels[block.type]))
    blocksDb.update(id, { isVisible: input.isVisible, updatedAt: now() })
  },

  /** Đủ 12 khối; Hero đầu, Footer cuối (quyết định 6); đánh lại 10, 20… */
  async reorderBlocks(input: ReorderRequest): Promise<void> {
    await mockDelay()
    ensureFreshDay()
    requirePermission(permissions.landingContents.update)
    const all = blocksDb.all()
    if (
      !isComplete(
        input.ids,
        all.map((b) => b.id)
      )
    )
      throw fieldErrors({ ids: blockMessages.idsIncomplete })
    const typeOf = new Map(all.map((b) => [b.id, b.type]))
    if (typeOf.get(input.ids[0]) !== 'Hero' || typeOf.get(input.ids.at(-1)!) !== 'Footer')
      throw salesProblem(400, 'ThuTuKhoiKhongHopLe', blockProblems.ThuTuKhoiKhongHopLe)
    mockDb.batch(() =>
      input.ids.forEach((id, i) => blocksDb.update(id, { sortOrder: (i + 1) * 10 }))
    )
  },

  /** Theo sortOrder, tìm tên/tỉnh/nội dung, lọc isVisible (FR-18) */
  async getReviews(query: ReviewQuery): Promise<PaginatedResult<ReviewDto>> {
    await mockDelay()
    ensureFreshDay()
    requirePermission(permissions.landingContents.view)
    let reviews = sortedReviews()
    if (query.isVisible !== undefined) {
      const visible = String(query.isVisible) === 'true'
      reviews = reviews.filter((r) => r.isVisible === visible)
    }
    const found = search(reviews, query.search, ['customerName', 'province', 'content'])
    const page = paginate(found, query)
    return { ...page, items: page.items.map(toReviewDto) }
  },

  /** Thêm cuối danh sách, đang hiện */
  async createReview(input: SaveReviewRequest): Promise<ReviewDto> {
    await mockDelay()
    ensureFreshDay()
    requirePermission(permissions.landingContents.update)
    validateReview(input)
    const at = now()
    const record: ReviewRecord = {
      id: newId(),
      ...reviewFields(input),
      reviewedAt: input.reviewedAt ? new Date(input.reviewedAt).toISOString() : at,
      sortOrder: (sortedReviews().at(-1)?.sortOrder ?? 0) + 10,
      isVisible: true,
      createdAt: at,
    }
    reviewsDb.insert(record)
    return toReviewDto(record)
  },

  async updateReview(id: string, input: SaveReviewRequest): Promise<ReviewDto> {
    await mockDelay()
    ensureFreshDay()
    requirePermission(permissions.landingContents.update)
    const before = getReview(id)
    validateReview(input)
    const after = reviewsDb.update(id, {
      ...reviewFields(input),
      reviewedAt: input.reviewedAt ? new Date(input.reviewedAt).toISOString() : before.reviewedAt,
    })!
    return toReviewDto(after)
  },

  async setReviewVisibility(id: string, input: SetVisibilityRequest): Promise<void> {
    await mockDelay()
    ensureFreshDay()
    requirePermission(permissions.landingContents.update)
    getReview(id)
    reviewsDb.update(id, { isVisible: input.isVisible })
  },

  async reorderReviews(input: ReorderRequest): Promise<void> {
    await mockDelay()
    ensureFreshDay()
    requirePermission(permissions.landingContents.update)
    if (
      !isComplete(
        input.ids,
        reviewsDb.all().map((r) => r.id)
      )
    )
      throw fieldErrors({ ids: blockMessages.idsIncomplete })
    mockDb.batch(() =>
      input.ids.forEach((id, i) => reviewsDb.update(id, { sortOrder: (i + 1) * 10 }))
    )
  },

  /** POST /api/uploads/images ở mock: JPG/PNG/WebP/SVG ≤ 2 MB, lưu IndexedDB, trả `idb://…` */
  async uploadImage(file: File): Promise<{ url: string }> {
    await mockDelay(300, 600)
    ensureFreshDay()
    requirePermission(permissions.landingContents.update)
    if (!IMAGE_TYPES.includes(file.type)) throw fieldErrors({ file: imageMessages.type })
    if (file.size > MAX_IMAGE_BYTES) throw fieldErrors({ file: imageMessages.size })
    const stored = await mockBlobs.put(file, file.name)
    return { url: stored.url }
  },
}
