import { z } from 'zod'
import { salesRules } from '@/config/sales-rules'

/** Nguồn chọn nhanh khi nhập chi phí; nguồn khác nhập tay (BE chuẩn hóa như BR-07) */
export const AD_COST_SOURCES = ['facebook', 'tiktok', 'google', 'zalo'] as const
export const OTHER_SOURCE = 'other'

/**
 * Form chi phí quảng cáo (FR-33, UC-14): câu lỗi đúng 07 §2.7 để form và API báo giống nhau.
 * `today` là ngày VN hiện tại (không cho nhập ngày tương lai).
 */
export function adCostSchema(today: string) {
  return z
    .object({
      date: z
        .string()
        .min(1, 'Chọn ngày')
        .refine((v) => v <= today, 'Ngày không được ở tương lai'),
      source: z.string().min(1, 'Nhập nguồn'),
      sourceOther: z.string(),
      campaign: z.string().trim().max(100, 'Chiến dịch tối đa 100 ký tự'),
      amount: z.number().nullable(),
    })
    .superRefine((v, ctx) => {
      if (v.source === OTHER_SOURCE && !v.sourceOther.trim()) {
        ctx.addIssue({ code: 'custom', path: ['sourceOther'], message: 'Nhập nguồn' })
      }
      if (v.amount === null || !(v.amount > 0)) {
        ctx.addIssue({ code: 'custom', path: ['amount'], message: 'Số tiền phải lớn hơn 0' })
      } else if (v.amount % salesRules.priceStep !== 0) {
        ctx.addIssue({ code: 'custom', path: ['amount'], message: 'Số tiền là bội số 1.000 ₫' })
      }
    })
}

export type AdCostFormValues = z.infer<ReturnType<typeof adCostSchema>>
