/**
 * Cửa duy nhất từ handler đơn hàng tới kho mock và lõi `features/sales` của FE-Landing (07 §4.9).
 * Handler chỉ import file này; kho đổi chữ ký thì sửa ở đây.
 */
export {
  activeTelesales,
  ensureFreshDay,
  ordersDb,
  telesaleStateOf,
  telesaleStatesDb,
} from '@/features/sales/mock/sales.store'
export { combosDb } from '@/features/landing/mock/landing.store'
export { type Actor } from '@/features/sales/lib/order-events'
export {
  cancelText,
  evAssigned,
  evHandover,
  evNote,
  evStatus,
  evTag,
  returnText,
  tagTexts,
} from '@/features/sales/lib/order-events'
export {
  applyCallResult,
  applyOrderChanges,
  assignOrder,
  orderTags,
  recomputeDuplicatesAfterCancel,
  returnedCountOf,
  trackingCode,
} from '@/features/sales/lib/order-rules'

import { salesRules } from '@/config/sales-rules'

/** |a − b| ≤ 24 giờ (BR-14) */
export const isWithinDuplicateWindow = (a: string, b: string) =>
  Math.abs(Date.parse(a) - Date.parse(b)) <= salesRules.duplicateWindowHours * 3_600_000
