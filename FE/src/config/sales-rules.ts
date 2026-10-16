/**
 * Hằng số quy tắc nghiệp vụ (docs/07-DANH-SACH-API.md §3). BE `Domain/Entities/Sales/SalesRules.cs` cùng giá trị.
 * FE form, handler mock và BE dùng chung để hai chế độ ra cùng kết quả.
 */
export const salesRules = {
  /** BR-03 */
  shippingFee: 30_000,
  freeShippingThreshold: 500_000,
  /** BR-01 */
  priceStep: 1_000,
  maxVisibleCombos: 4,
  maxBottleCount: 10,
  /** BR-04 */
  nameMin: 2,
  nameMax: 50,
  phonePattern: /^0(3|5|7|8|9)\d{8}$/,
  addressMin: 10,
  addressMax: 200,
  quantityMin: 1,
  quantityMax: 5,
  noteMax: 300,
  /** BR-05: một trình duyệt (visitorId) một đơn mỗi 60 giây */
  orderCooldownSeconds: 60,
  /** Chống spam theo số điện thoại: tối đa 5 đơn (mọi trạng thái) trong 24 giờ (07 §3.6) */
  maxOrdersPerPhonePer24h: 5,
  /** BR-14 */
  duplicateWindowHours: 24,
  /** BR-15 */
  returnRiskThreshold: 2,
  /** BR-10 */
  autoCallbackMinutes: 120,
  maxFailedCalls: 3,
  /** Hẹn gọi lại tối đa 7 ngày tới */
  maxCallbackDays: 7,
  /** UC-02 4a, giờ Việt Nam */
  workingHourStart: 8,
  workingHourEnd: 21,
  /** BR-07 */
  attributionDays: 7,
  /** BR-08 */
  visitTimeoutMinutes: 30,
  /** FR-13, BR-21 */
  recentOrderHours: 48,
  recentOrderIntervalSeconds: 15,
  recentOrderMaxShows: 5,
  /** FR-08 */
  reviewPageSize: 6,
  /** Báo cáo (UC-12) */
  maxReportDays: 366,
  defaultReportDays: 7,
  /** Khóa trình duyệt (storageKey) */
  storage: {
    visitor: 'visitor',
    attribution: 'attribution',
    lastOrderAt: 'last-order-at',
    placedOrder: 'placed-order',
    orderDraft: 'order-draft',
  },
} as const

/** Múi giờ nghiệp vụ: mọi "ngày", "giờ" trong quy tắc và báo cáo tính theo giờ Việt Nam (UTC+7, không đổi giờ) */
export const VN_OFFSET_MINUTES = 7 * 60

/** Câu thông báo nguyên văn dùng ở FE trước khi gọi API (khớp 07 §2.8) */
export const salesMessages = {
  orderCooldown: 'Bạn vừa đặt hàng, vui lòng chờ 60 giây nếu muốn đặt thêm',
  networkError: 'Chưa gửi được đơn, vui lòng thử lại',
  comboChanged: 'Combo đã thay đổi, vui lòng chọn lại',
  callWithin15: 'Nhân viên sẽ gọi xác nhận trong 15 phút, vui lòng để ý điện thoại',
  callFrom8am: 'Nhân viên sẽ gọi xác nhận từ 8 giờ sáng',
  smsSent: 'Đã gửi SMS xác nhận (giả lập)',
  orderConfirmedSms: 'Đơn đã được xác nhận (SMS giả lập)',
} as const
