import { salesRules } from '@/config/sales-rules'

/**
 * Chuẩn hóa số điện thoại (07 §3.5, BR-04; BE `PhoneNormalizer`): bỏ dấu cách, ".", "-", "(", ")";
 * "+84…" → "0…"; "84…" dài 11 số → "0…". TC-08 bước 5: "+84912345678" → "0912345678".
 */
export function normalizePhone(value: string | null | undefined): string {
  let s = (value ?? '').replace(/[\s.\-()]/g, '')
  if (s.startsWith('+84')) s = `0${s.slice(3)}`
  else if (s.startsWith('84') && s.length === 11 && /^\d+$/.test(s)) s = `0${s.slice(2)}`
  return s
}

/** Số di động hợp lệ sau chuẩn hóa: ^0(3|5|7|8|9)\d{8}$ */
export const isValidPhone = (value: string | null | undefined): boolean =>
  salesRules.phonePattern.test(normalizePhone(value))

/** Che bớt số điện thoại khi cần hiển thị công khai: "0912 *** 111" */
export function maskPhone(value: string): string {
  const s = normalizePhone(value)
  return s.length === 10 ? `${s.slice(0, 4)} *** ${s.slice(7)}` : s
}
