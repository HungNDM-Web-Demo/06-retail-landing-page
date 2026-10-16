import { salesRules } from '@/config/sales-rules'
import type { PriceType, PromotionStatus, PublicCombo } from '@/types/landing'

/**
 * Tiền combo, phí vận chuyển, giá mỗi chai, upsell (07 §3.1; BR-01, BR-02, BR-03, BR-12; BE `OrderPricing`).
 * Mọi số tiền là số nguyên đồng.
 */

export type PriceSource = { promoPrice: number; regularPrice: number; freeShipping: boolean }

export type OrderAmounts = { unitPrice: number; subtotal: number; shippingFee: number; total: number }

/** Giá combo theo loại giá đã chốt */
export function unitPrice(combo: Pick<PriceSource, 'promoPrice' | 'regularPrice'>, priceType: PriceType): number {
  return priceType === 'KhuyenMai' ? combo.promoPrice : combo.regularPrice
}

/** Phí vận chuyển: miễn khi combo miễn phí hoặc tiền hàng ≥ 500.000 (BR-03) */
export function shippingFeeFor(subtotal: number, freeShipping: boolean): number {
  return freeShipping || subtotal >= salesRules.freeShippingThreshold ? 0 : salesRules.shippingFee
}

/** Tiền hàng, phí ship, tổng (tiền thu hộ) của combo × số lượng */
export function orderAmounts(combo: PriceSource, priceType: PriceType, quantity: number): OrderAmounts {
  const price = unitPrice(combo, priceType)
  return amountsFromUnit(price, quantity, combo.freeShipping)
}

/** Như `orderAmounts` khi đã có đơn giá chụp sẵn (sửa đơn giữ nguyên `UnitPrice`) */
export function amountsFromUnit(price: number, quantity: number, freeShipping: boolean): OrderAmounts {
  const subtotal = price * quantity
  const shippingFee = shippingFeeFor(subtotal, freeShipping)
  return { unitPrice: price, subtotal, shippingFee, total: subtotal + shippingFee }
}

/** floor(price / bottles / 1.000) × 1.000 (BR-01) */
export function pricePerBottle(price: number, bottles: number): number {
  if (!bottles || bottles <= 0) return price
  return Math.floor(price / bottles / salesRules.priceStep) * salesRules.priceStep
}

/** Giá trị upsell lúc xác nhận = max(0, tiền hàng hiện tại − tiền hàng lúc đặt) (BR-12) */
export function upsellAmount(placedSubtotal: number, subtotal: number): number {
  return Math.max(0, subtotal - placedSubtotal)
}

/** Loại giá theo trạng thái khuyến mãi */
export const priceTypeOf = (status: PromotionStatus): PriceType =>
  status === 'DangChay' ? 'KhuyenMai' : 'GiaThuong'

/** Combo → dạng công khai theo loại giá đang áp dụng (07 §2.1 `PublicCombo`) */
export function toPublicCombo(
  combo: PriceSource & {
    id: string
    code: string
    name: string
    description: string
    bottleCount: number
    giftText?: string | null
    imageUrl?: string | null
    badge?: string | null
    isDefault: boolean
  },
  priceType: PriceType
): PublicCombo {
  const price = unitPrice(combo, priceType)
  return {
    id: combo.id,
    code: combo.code,
    name: combo.name,
    description: combo.description,
    bottleCount: combo.bottleCount,
    giftText: combo.giftText ?? undefined,
    imageUrl: combo.imageUrl ?? undefined,
    badge: combo.badge ?? undefined,
    isDefault: combo.isDefault,
    priceType,
    price,
    compareAtPrice:
      priceType === 'KhuyenMai' && combo.regularPrice > price ? combo.regularPrice : undefined,
    pricePerBottle: pricePerBottle(price, combo.bottleCount),
    freeShipping: combo.freeShipping,
    shippingFeeForOne: shippingFeeFor(price, combo.freeShipping),
  }
}

/** Giá mỗi chai nhỏ nhất trong các combo đang hiện (UC-01 bước 2); không có combo → 0 */
export function minPricePerBottle(combos: Pick<PublicCombo, 'pricePerBottle'>[]): number {
  return combos.length ? Math.min(...combos.map((c) => c.pricePerBottle)) : 0
}

const moneyFormatter = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 })

/**
 * Số tiền trong câu sự kiện, thông báo: "350.000 ₫" (khoảng trắng thường trước ₫, giống BE).
 * Hiển thị trong giao diện dùng `formatVnd` của nền.
 */
export function moneyText(value: number): string {
  return `${moneyFormatter.format(Math.round(value))} ₫`
}
