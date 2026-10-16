/**
 * Cổng DUY NHẤT từ handler nội dung landing tới kho mock của FE-Landing (07 §4.8, §4.9).
 * Handler chỉ import file này; kho đổi tên thì chỉ sửa ở đây.
 */

// Collection `products` (một dòng), `landing-blocks` (12 khối), `reviews`
export {
  blocksDb,
  getProduct,
  productDb,
  reviewsDb,
  sortedBlocks,
  sortedReviews,
} from '@/features/landing/mock/landing.store'
/** Làm mới theo ngày (07 §4.8): gọi đầu mỗi handler, sau mockDelay, trước requirePermission */
export { ensureFreshDay } from '@/features/sales/mock/sales.store'
