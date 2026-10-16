/**
 * Cửa duy nhất tới kho mock của FE-Landing (07 §4.8, §4.9). Mọi handler trong features/reports/mock chỉ import
 * kho từ file này; kho đổi tên, đổi chữ ký thì sửa một chỗ.
 */
export {
  activeTelesales,
  adCostsDb,
  allVisitStats,
  conversionEventsDb,
  ensureFreshDay,
  ordersDb,
  telesaleStateOf,
  userName,
} from '@/features/sales/mock/sales.store'
export { combosDb, liveCombos } from '@/features/landing/mock/landing.store'
/** Chuẩn hóa nguồn BR-07 (07 §3.2), dùng chung với lõi */
export { normalizeSource } from '@/features/sales/lib/attribution'
