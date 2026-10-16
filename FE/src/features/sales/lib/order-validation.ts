import { provinces } from '@/config/landing-labels'
import { salesRules } from '@/config/sales-rules'
import { normalizePhone } from './phone'

/**
 * Kiểm tra dữ liệu đơn (BR-04, 07 §3.5) với đúng câu ở 07 §2.8. Dùng chung: form đặt hàng (khi rời ô),
 * handler `POST /api/public/orders`, sửa đơn của telesale (`PUT /api/orders/{id}`, `changes`).
 */

export const orderFieldMessages = {
  nameRequired: 'Nhập họ tên',
  nameLength: 'Họ tên từ 2 đến 50 ký tự',
  nameDigit: 'Họ tên không được chứa số',
  phoneRequired: 'Nhập số điện thoại',
  phoneInvalid: 'Số điện thoại di động gồm 10 số, bắt đầu bằng 03, 05, 07, 08 hoặc 09',
  provinceRequired: 'Chọn tỉnh/thành',
  provinceInvalid: 'Chọn tỉnh/thành trong danh sách',
  addressRequired: 'Nhập địa chỉ chi tiết',
  addressLength: 'Địa chỉ chi tiết từ 10 đến 200 ký tự',
  quantity: 'Số lượng từ 1 đến 5',
  note: 'Ghi chú tối đa 300 ký tự',
  comboRequired: 'Chọn combo',
} as const

export type OrderField = 'customerName' | 'phone' | 'province' | 'address' | 'quantity' | 'note' | 'comboId'

export type OrderInput = {
  customerName?: string | null
  phone?: string | null
  province?: string | null
  address?: string | null
  quantity?: number | null
  note?: string | null
  comboId?: string | null
}

/** Họ tên: trim, gộp khoảng trắng */
export const normalizeName = (value: string | null | undefined): string =>
  (value ?? '').trim().replace(/\s+/g, ' ')

const provinceSet = new Set<string>(provinces)
export const isKnownProvince = (value: string | null | undefined): boolean =>
  provinceSet.has((value ?? '').trim())

export function validateName(value: string | null | undefined): string | undefined {
  const name = normalizeName(value)
  if (!name) return orderFieldMessages.nameRequired
  if (name.length < salesRules.nameMin || name.length > salesRules.nameMax) return orderFieldMessages.nameLength
  if (/\d/.test(name)) return orderFieldMessages.nameDigit
  return undefined
}

export function validatePhone(value: string | null | undefined): string | undefined {
  const phone = normalizePhone(value)
  if (!phone) return orderFieldMessages.phoneRequired
  if (!salesRules.phonePattern.test(phone)) return orderFieldMessages.phoneInvalid
  return undefined
}

export function validateProvince(value: string | null | undefined): string | undefined {
  const province = (value ?? '').trim()
  if (!province) return orderFieldMessages.provinceRequired
  if (!provinceSet.has(province)) return orderFieldMessages.provinceInvalid
  return undefined
}

export function validateAddress(value: string | null | undefined): string | undefined {
  const address = (value ?? '').trim()
  if (!address) return orderFieldMessages.addressRequired
  if (address.length < salesRules.addressMin || address.length > salesRules.addressMax)
    return orderFieldMessages.addressLength
  return undefined
}

export function validateQuantity(value: number | null | undefined): string | undefined {
  const q = Number(value)
  if (!Number.isInteger(q) || q < salesRules.quantityMin || q > salesRules.quantityMax)
    return orderFieldMessages.quantity
  return undefined
}

export function validateNote(value: string | null | undefined): string | undefined {
  return (value ?? '').trim().length > salesRules.noteMax ? orderFieldMessages.note : undefined
}

/**
 * Kiểm tra mọi trường có trong `fields` (mặc định đủ 7 trường của form đặt hàng).
 * Trả `{ trường: câu lỗi }`, rỗng là hợp lệ. Số điện thoại kiểm sau khi chuẩn hóa.
 */
export function validateOrderInput(
  input: OrderInput,
  fields: readonly OrderField[] = ['customerName', 'phone', 'province', 'address', 'quantity', 'note', 'comboId']
): Partial<Record<OrderField, string>> {
  const errors: Partial<Record<OrderField, string>> = {}
  const check: Record<OrderField, () => string | undefined> = {
    customerName: () => validateName(input.customerName),
    phone: () => validatePhone(input.phone),
    province: () => validateProvince(input.province),
    address: () => validateAddress(input.address),
    quantity: () => validateQuantity(input.quantity),
    note: () => validateNote(input.note),
    comboId: () => (input.comboId ? undefined : orderFieldMessages.comboRequired),
  }
  for (const field of fields) {
    const message = check[field]()
    if (message) errors[field] = message
  }
  return errors
}
