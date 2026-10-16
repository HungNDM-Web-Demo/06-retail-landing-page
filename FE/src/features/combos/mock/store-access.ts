/**
 * Cổng DUY NHẤT từ handler combo, khuyến mãi tới kho mock và lõi `features/sales` của FE-Landing (07 §4.8, §4.9).
 * Handler chỉ import file này; kho đổi tên, đổi chữ ký thì chỉ sửa ở đây.
 */

import { ordersDb } from '@/features/sales/mock/sales.store'

// Kho mock (collection `products`, `combos`, `promotions`; scope business)
export {
  combosDb,
  getProduct,
  getPromotion,
  liveCombos,
  promotionDb,
} from '@/features/landing/mock/landing.store'
/** Làm mới theo ngày (07 §4.8): gọi đầu mỗi handler, sau mockDelay, trước requirePermission */
export { ensureFreshDay, ordersDb } from '@/features/sales/mock/sales.store'

// Lõi quy tắc dùng chung (07 §3.1, §3.3)
export { toPromotionDto } from '@/features/sales/lib/promotion'
export { pricePerBottle } from '@/features/sales/lib/pricing'

/** Số đơn mỗi combo: đơn có ComboId hoặc PlacedComboId là combo đó (07 §2.3 orderCount) */
export function orderCountsByCombo(): Map<string, number> {
  const counts = new Map<string, number>()
  for (const order of ordersDb.all()) {
    for (const id of new Set([order.comboId, order.placedComboId]))
      if (id) counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  return counts
}
