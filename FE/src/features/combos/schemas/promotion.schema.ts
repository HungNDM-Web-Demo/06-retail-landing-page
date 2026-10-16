import { z } from 'zod'
import { VN_OFFSET_MINUTES } from '@/config/sales-rules'
import { fromVnLocalInput } from '@/features/reports/lib/vn-date'
import type { PromotionDto, UpdatePromotionRequest } from '@/types/landing'
import { promotionMessages } from '../lib/combo-messages'

/** Giá trị datetime-local có giây theo giờ VN ("2026-10-17T23:59:59"), giữ đúng 23:59:59 của TC-03 */
export function toVnLocalSeconds(iso: string | null | undefined): string {
  const ms = iso ? Date.parse(iso) : NaN
  if (!Number.isFinite(ms)) return ''
  return new Date(ms + VN_OFFSET_MINUTES * 60_000).toISOString().slice(0, 19)
}

/** Form chương trình khuyến mãi; ngày giờ nhập theo giờ Việt Nam (07 §2.2, BR-20, FR-16) */
export const promotionFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, promotionMessages.nameRequired)
      .max(100, promotionMessages.nameMax),
    startAt: z.string().refine((v) => !!fromVnLocalInput(v), promotionMessages.startRequired),
    endAt: z.string().refine((v) => !!fromVnLocalInput(v), promotionMessages.endRequired),
    autoRenew: z.boolean(),
    autoRenewDays: z.string(),
  })
  .superRefine((v, ctx) => {
    const start = fromVnLocalInput(v.startAt)
    const end = fromVnLocalInput(v.endAt)
    if (start && end && Date.parse(end) <= Date.parse(start))
      ctx.addIssue({ code: 'custom', path: ['endAt'], message: promotionMessages.endAfterStart })
    if (v.autoRenew) {
      const n = Number(v.autoRenewDays)
      if (!v.autoRenewDays.trim() || !Number.isInteger(n) || n < 1 || n > 30)
        ctx.addIssue({
          code: 'custom',
          path: ['autoRenewDays'],
          message: promotionMessages.autoRenewDays,
        })
    }
  })

export type PromotionFormValues = z.infer<typeof promotionFormSchema>

export const promotionToForm = (p: PromotionDto): PromotionFormValues => ({
  name: p.name,
  startAt: toVnLocalSeconds(p.startAt),
  endAt: toVnLocalSeconds(p.endAt),
  autoRenew: p.autoRenewDays !== undefined && p.autoRenewDays !== null,
  autoRenewDays: p.autoRenewDays ? String(p.autoRenewDays) : '3',
})

export const formToPromotionRequest = (
  v: PromotionFormValues,
  version: number
): UpdatePromotionRequest => ({
  name: v.name.trim(),
  startAt: fromVnLocalInput(v.startAt)!,
  endAt: fromVnLocalInput(v.endAt)!,
  autoRenewDays: v.autoRenew ? Number(v.autoRenewDays) : undefined,
  version,
})
