import { z } from 'zod'
import { landingIconNames, provinces } from '@/config/landing-labels'
import { fromVnLocalInput, toVnLocalInput } from '@/features/reports/lib/vn-date'
import type {
  BlockType,
  ContentItem,
  LandingBlockDto,
  ProductDto,
  ReviewDto,
  SaveReviewRequest,
  UpdateLandingBlockRequest,
  UpdateProductRequest,
} from '@/types/landing'
import {
  blockLimits,
  blockMessages,
  productMessages,
  reviewMessages,
} from '../lib/content-messages'

/** Form nội dung landing (07 §2.4; FR-17, FR-18), cùng câu lỗi với handler */

// ───────────────────────── Khối ─────────────────────────

const itemSchema = z.object({
  title: z.string(),
  text: z.string(),
  value: z.string(),
  icon: z.string(),
  imageUrl: z.string(),
  afterImageUrl: z.string(),
})
export type BlockItemValues = z.infer<typeof itemSchema>

export const emptyItem: BlockItemValues = {
  title: '',
  text: '',
  value: '',
  icon: '',
  imageUrl: '',
  afterImageUrl: '',
}

export function blockFormSchema(type: BlockType) {
  return z
    .object({
      title: z
        .string()
        .trim()
        .min(1, blockMessages.titleRequired)
        .max(blockLimits.title, blockMessages.titleMax),
      subtitle: z.string().trim().max(blockLimits.subtitle, blockMessages.subtitleMax),
      body: z.string().trim().max(blockLimits.body, blockMessages.bodyMax),
      imageUrl: z.string().trim().max(blockLimits.imageUrl, blockMessages.imageUrlMax),
      ctaText: z.string().trim().max(blockLimits.cta, blockMessages.ctaMax),
      items: z.array(itemSchema).max(blockLimits.items, blockMessages.itemsMax),
    })
    .superRefine((v, ctx) => {
      v.items.forEach((item, i) => {
        const issue = (field: keyof BlockItemValues, message: string) =>
          ctx.addIssue({ code: 'custom', path: ['items', i, field], message })
        if (item.icon && !(landingIconNames as readonly string[]).includes(item.icon))
          issue('icon', blockMessages.iconInvalid)
        if (type === 'Faq') {
          if (!item.title.trim()) issue('title', blockMessages.faqQuestion)
          if (!item.text.trim()) issue('text', blockMessages.faqAnswer)
        }
        if (type === 'BeforeAfter') {
          if (!item.imageUrl.trim()) issue('imageUrl', blockMessages.beforeImage)
          if (!item.afterImageUrl.trim()) issue('afterImageUrl', blockMessages.afterImage)
        }
      })
    })
}
export type BlockFormValues = z.infer<ReturnType<typeof blockFormSchema>>

export const blockToForm = (b: LandingBlockDto): BlockFormValues => ({
  title: b.title,
  subtitle: b.subtitle ?? '',
  body: b.body ?? '',
  imageUrl: b.imageUrl ?? '',
  ctaText: b.ctaText ?? '',
  // BE trả null cho trường trống (ContentItemDto), mock bỏ hẳn trường → chuẩn hóa về '' cho cả hai
  items: b.items.map((item) => {
    const values = { ...emptyItem }
    for (const key of Object.keys(emptyItem) as (keyof BlockItemValues)[]) values[key] = item[key] ?? ''
    return values
  }),
})

const opt = (value: string) => value.trim() || undefined

export const formToBlockRequest = (v: BlockFormValues): UpdateLandingBlockRequest => ({
  title: v.title.trim(),
  subtitle: opt(v.subtitle),
  body: opt(v.body),
  imageUrl: opt(v.imageUrl),
  ctaText: opt(v.ctaText),
  items: v.items.map((item) => {
    const result: ContentItem = {}
    for (const key of Object.keys(emptyItem) as (keyof BlockItemValues)[]) {
      const value = opt(item[key])
      if (value) result[key] = value
    }
    return result
  }),
})

// ───────────────────────── Sản phẩm ─────────────────────────

const required = (min: string, max: number, maxText: string) =>
  z.string().trim().min(1, min).max(max, maxText)

export const productFormSchema = z.object({
  name: required(productMessages.nameRequired, 150, productMessages.nameMax),
  shortName: required(productMessages.shortNameRequired, 50, productMessages.shortNameMax),
  volume: required(productMessages.volumeRequired, 30, productMessages.volumeMax),
  unit: required(productMessages.unitRequired, 20, productMessages.unitMax),
  shortDescription: required(
    productMessages.shortDescriptionRequired,
    500,
    productMessages.shortDescriptionMax
  ),
  imageUrl: z.string().trim().max(500, productMessages.imageUrlMax),
})
export type ProductFormValues = z.infer<typeof productFormSchema>

export const productToForm = (p: ProductDto): ProductFormValues => ({
  name: p.name,
  shortName: p.shortName,
  volume: p.volume,
  unit: p.unit,
  shortDescription: p.shortDescription,
  imageUrl: p.imageUrl ?? '',
})

export const formToProductRequest = (v: ProductFormValues): UpdateProductRequest => ({
  ...v,
  imageUrl: opt(v.imageUrl),
})

// ───────────────────────── Đánh giá ─────────────────────────

export const reviewFormSchema = z.object({
  customerName: required(reviewMessages.customerNameRequired, 50, reviewMessages.customerNameMax),
  province: z
    .string()
    .refine((v) => (provinces as readonly string[]).includes(v), reviewMessages.province),
  rating: z.number().int().min(1, reviewMessages.rating).max(5, reviewMessages.rating),
  content: required(reviewMessages.contentRequired, 1000, reviewMessages.contentMax),
  avatarUrl: z.string().trim().max(500, reviewMessages.urlMax),
  photoUrl: z.string().trim().max(500, reviewMessages.urlMax),
  reviewedAt: z.string().refine((v) => !v || !!fromVnLocalInput(v), reviewMessages.reviewedAt),
  isSample: z.boolean(),
})
export type ReviewFormValues = z.infer<typeof reviewFormSchema>

export const emptyReviewForm: ReviewFormValues = {
  customerName: '',
  province: '',
  rating: 5,
  content: '',
  avatarUrl: '',
  photoUrl: '',
  reviewedAt: '',
  isSample: false,
}

export const reviewToForm = (r: ReviewDto): ReviewFormValues => ({
  customerName: r.customerName,
  province: r.province,
  rating: r.rating,
  content: r.content,
  avatarUrl: r.avatarUrl ?? '',
  photoUrl: r.photoUrl ?? '',
  reviewedAt: toVnLocalInput(r.reviewedAt),
  isSample: r.isSample,
})

export const formToReviewRequest = (v: ReviewFormValues): SaveReviewRequest => ({
  customerName: v.customerName.trim(),
  province: v.province,
  rating: v.rating,
  content: v.content.trim(),
  avatarUrl: opt(v.avatarUrl),
  photoUrl: opt(v.photoUrl),
  reviewedAt: v.reviewedAt ? (fromVnLocalInput(v.reviewedAt) ?? undefined) : undefined,
  isSample: v.isSample,
})
