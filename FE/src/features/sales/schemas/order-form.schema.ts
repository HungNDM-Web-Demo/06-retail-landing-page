import { z } from 'zod'
import {
  orderFieldMessages,
  validateAddress,
  validateName,
  validateNote,
  validatePhone,
  validateProvince,
  validateQuantity,
} from '../lib/order-validation'

/**
 * Form đặt hàng trên landing (SCR-02, BR-04): dùng chính hàm kiểm tra của handler để câu lỗi đúng 07 §2.8.
 */
const rule = (check: (value: string) => string | undefined) =>
  z.string().superRefine((value, ctx) => {
    const message = check(value)
    if (message) ctx.addIssue({ code: 'custom', message })
  })

export const orderFormSchema = z.object({
  comboId: z.string().min(1, orderFieldMessages.comboRequired),
  quantity: z.number().superRefine((value, ctx) => {
    const message = validateQuantity(value)
    if (message) ctx.addIssue({ code: 'custom', message })
  }),
  customerName: rule(validateName),
  phone: rule(validatePhone),
  province: rule(validateProvince),
  address: rule(validateAddress),
  note: rule(validateNote),
})

export type OrderFormValues = z.infer<typeof orderFormSchema>

export const orderFormFields = ['comboId', 'quantity', 'customerName', 'phone', 'province', 'address', 'note'] as const
