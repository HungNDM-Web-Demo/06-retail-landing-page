import { z } from 'zod'
import { salesRules } from '@/config/sales-rules'
import { validateOrderInput } from '@/features/sales/lib/order-validation'
import type { CancelReason, OrderChanges, ReturnReason } from '@/types/landing'

/**
 * Kiểm tra dữ liệu sửa đơn (BR-04, BR-13; câu đúng 07 §2.8) bằng lõi `validateOrderInput`.
 * Dùng chung cho form ngăn chi tiết và handler mock.
 */
export function validateOrderChanges(input: Partial<OrderChanges>): Record<string, string> {
  return validateOrderInput(input, EDIT_FIELDS) as Record<string, string>
}

const EDIT_FIELDS = ['customerName', 'province', 'address', 'comboId', 'quantity'] as const

/** Form sửa đơn trong ngăn chi tiết (UC-03 bước 3a) */
export const orderChangesSchema = z
  .object({
    customerName: z.string(),
    province: z.string(),
    address: z.string(),
    comboId: z.string(),
    quantity: z.number(),
  })
  .superRefine((value, ctx) => {
    for (const [path, message] of Object.entries(validateOrderChanges(value))) {
      ctx.addIssue({ code: 'custom', path: [path], message })
    }
  })
export type OrderChangesForm = z.infer<typeof orderChangesSchema>

export const NOTE_MAX = salesRules.noteMax

/** Hủy đơn (UC-09): lý do bắt buộc, "Khác" bắt buộc ghi chú */
export const cancelSchema = z
  .object({
    reason: z.string().min(1, 'Chọn lý do hủy'),
    note: z.string().max(NOTE_MAX, 'Ghi chú tối đa 300 ký tự').optional(),
  })
  .refine((v) => v.reason !== 'Khac' || !!v.note?.trim(), {
    path: ['note'],
    message: 'Nhập ghi chú cho lý do Khác',
  })
export type CancelForm = { reason: CancelReason | ''; note?: string }

/** Hoàn hàng (UC-08) */
export const returnSchema = z
  .object({
    reason: z.string().min(1, 'Chọn lý do hoàn hàng'),
    note: z.string().max(NOTE_MAX, 'Ghi chú tối đa 300 ký tự').optional(),
  })
  .refine((v) => v.reason !== 'Khac' || !!v.note?.trim(), {
    path: ['note'],
    message: 'Nhập ghi chú cho lý do Khác',
  })
export type ReturnForm = { reason: ReturnReason | ''; note?: string }
