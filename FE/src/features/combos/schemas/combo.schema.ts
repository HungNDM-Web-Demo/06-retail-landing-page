import { z } from 'zod'
import { salesRules } from '@/config/sales-rules'
import type { ComboDto, SaveComboRequest } from '@/types/landing'
import { comboLimits, comboMessages } from '../lib/combo-messages'

/** Ô tiền nhập chữ số, cho phép dấu chấm, phẩy, khoảng trắng, "₫" phân cách: "390.000" → 390000 */
export function parseMoney(text: string): number {
  const cleaned = text.replace(/[.,\s₫]/g, '')
  return /^\d+$/.test(cleaned) ? Number(cleaned) : NaN
}

function moneyIssue(text: string): string | undefined {
  const value = parseMoney(text)
  if (!Number.isFinite(value) || value <= 0) return comboMessages.pricePositive
  if (value % salesRules.priceStep !== 0) return comboMessages.priceStep // TC-34 bước 2: 389.500
  return undefined
}

/** Form thêm/sửa combo, cùng câu lỗi với handler (07 §2.3, BR-01, TC-34) */
export const comboFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, comboMessages.nameRequired)
      .max(comboLimits.name, comboMessages.nameMax),
    description: z
      .string()
      .trim()
      .min(1, comboMessages.descriptionRequired)
      .max(comboLimits.description, comboMessages.descriptionMax),
    bottleCount: z.string().refine((v) => {
      const n = Number(v)
      return Number.isInteger(n) && n >= 1 && n <= salesRules.maxBottleCount
    }, comboMessages.bottleCount),
    giftText: z.string().trim().max(comboLimits.gift, comboMessages.giftMax),
    promoPrice: z.string(),
    regularPrice: z.string(),
    freeShipping: z.boolean(),
    badge: z.string().trim().max(comboLimits.badge, comboMessages.badgeMax),
    imageUrl: z.string().trim().max(comboLimits.imageUrl, comboMessages.imageUrlMax),
  })
  .superRefine((v, ctx) => {
    const promoIssue = moneyIssue(v.promoPrice)
    const regularIssue = moneyIssue(v.regularPrice)
    if (promoIssue) ctx.addIssue({ code: 'custom', path: ['promoPrice'], message: promoIssue })
    if (regularIssue)
      ctx.addIssue({ code: 'custom', path: ['regularPrice'], message: regularIssue })
    if (!promoIssue && !regularIssue && parseMoney(v.promoPrice) > parseMoney(v.regularPrice))
      ctx.addIssue({
        code: 'custom',
        path: ['promoPrice'],
        message: comboMessages.promoNotAboveRegular,
      })
  })

export type ComboFormValues = z.infer<typeof comboFormSchema>

export const emptyComboForm: ComboFormValues = {
  name: '',
  description: '',
  bottleCount: '1',
  giftText: '',
  promoPrice: '',
  regularPrice: '',
  freeShipping: false,
  badge: '',
  imageUrl: '',
}

export const comboToForm = (c: ComboDto): ComboFormValues => ({
  name: c.name,
  description: c.description,
  bottleCount: String(c.bottleCount),
  giftText: c.giftText ?? '',
  promoPrice: String(c.promoPrice),
  regularPrice: String(c.regularPrice),
  freeShipping: c.freeShipping,
  badge: c.badge ?? '',
  imageUrl: c.imageUrl ?? '',
})

export const formToComboRequest = (v: ComboFormValues): SaveComboRequest => ({
  name: v.name.trim(),
  description: v.description.trim(),
  bottleCount: Number(v.bottleCount),
  giftText: v.giftText.trim() || undefined,
  promoPrice: parseMoney(v.promoPrice),
  regularPrice: parseMoney(v.regularPrice),
  freeShipping: v.freeShipping,
  badge: v.badge.trim() || undefined,
  imageUrl: v.imageUrl.trim() || undefined,
})
