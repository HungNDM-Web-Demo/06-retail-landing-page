/**
 * Hợp đồng dữ liệu nghiệp vụ Landing Page Bán hàng, chép đúng docs/07-DANH-SACH-API.md §2 (07 là nguồn;
 * đổi DTO thì sửa 07 trước rồi sửa file này). BE `Application/DTOs/*` khớp từng trường.
 * Dùng chung cho FE-Landing và FE-Quản trị (07 §4.9): không tách bản sao trong features/*.
 * Quy ước: `?` là có thể null hoặc vắng; ngày giờ chuỗi ISO UTC; tiền là số nguyên đồng.
 */

import type { PaginatedResult, PaginationQuery } from '@/types/api'

// ============================================================ Enum (06 §4, 07 §2)

/** Loại khối nội dung, mỗi loại đúng một khối (FR-04) */
export type BlockType =
  | 'Hero'
  | 'Problems'
  | 'Benefits'
  | 'Ingredients'
  | 'Specs'
  | 'BeforeAfter'
  | 'Reviews'
  | 'Certificates'
  | 'Commitments'
  | 'Faq'
  | 'Order'
  | 'Footer'
export type PromotionStatus = 'SapChay' | 'DangChay' | 'DaKetThuc'
export type PriceType = 'KhuyenMai' | 'GiaThuong'
export type OrderStatus =
  'Moi' | 'ChoGoiLai' | 'DaXacNhan' | 'DangGiao' | 'DaGiao' | 'HoanHang' | 'DaHuy'
export type CallResult = 'XacNhan' | 'KhongNgheMay' | 'ThueBao' | 'SaiSo' | 'HenGoiLai' | 'KhachHuy'
/** Hai lý do cuối do hệ thống tự gán (BR-10), người dùng không chọn được */
export type CancelReason =
  | 'KhachDoiY'
  | 'CheGiaCao'
  | 'DatNham'
  | 'DaMuaNoiKhac'
  | 'DonTrung'
  | 'Khac'
  | 'SaiSoDienThoai'
  | 'KhongLienLacDuoc'
export type ReturnReason = 'KhachKhongNgheMay' | 'KhachTuChoiNhan' | 'SaiDiaChi' | 'Khac'
export type Carrier = 'GHN' | 'GHTK' | 'VTP' | 'JT'
export type DeviceType = 'DienThoai' | 'MayTinhBang' | 'MayTinh'
export type OrderEventType =
  | 'TaoDon'
  | 'ChiaDon'
  | 'CuocGoi'
  | 'DoiTrangThai'
  | 'SuaDon'
  | 'TinNhan'
  | 'Nhan'
  | 'BanGiao'
  | 'GhiChu'
/** Nhãn đơn: Trung, RuiRoHoan lưu ở đơn; DenGioGoiLai suy ra lúc đọc (BR-11) */
export type OrderTag = 'Trung' | 'RuiRoHoan' | 'DenGioGoiLai'
export type ConversionEventType = 'PageView' | 'StartForm' | 'Purchase'

/** Nguồn đã chuẩn hóa (BR-07). Giá trị khác giữ nguyên chữ thường, vd "demo_test"; không có nguồn = "direct" */
export type KnownSource = 'facebook' | 'tiktok' | 'google' | 'zalo' | 'direct'

// ============================================================ Nội dung landing (07 §2.1, §2.4)

/** Một mục trong khối; trường nào dùng tùy loại khối (06 §4 Cms_LandingBlocks) */
export type ContentItem = {
  title?: string
  text?: string
  value?: string
  /** Tên icon lucide trong `landingIconNames` (config/landing-labels.ts) */
  icon?: string
  imageUrl?: string
  /** Chỉ khối BeforeAfter: ảnh "sau" */
  afterImageUrl?: string
}

export type LandingBlockDto = {
  id: string
  type: BlockType
  title: string
  subtitle?: string
  body?: string
  imageUrl?: string
  ctaText?: string
  items: ContentItem[]
  sortOrder: number
  isVisible: boolean
  /** Hero, Order, Footer không ẩn được; Hero luôn đầu, Footer luôn cuối */
  isRequired: boolean
  updatedAt: string
}
export type UpdateLandingBlockRequest = {
  title: string
  subtitle?: string
  body?: string
  imageUrl?: string
  ctaText?: string
  items: ContentItem[]
}
export type SetVisibilityRequest = { isVisible: boolean }
export type ReorderRequest = { ids: string[] }

export type ProductDto = {
  id: string
  code: string
  name: string
  shortName: string
  volume: string
  unit: string
  shortDescription: string
  imageUrl?: string
  updatedAt: string
}
export type UpdateProductRequest = {
  name: string
  shortName: string
  volume: string
  unit: string
  shortDescription: string
  imageUrl?: string
}

export type ReviewDto = {
  id: string
  customerName: string
  province: string
  rating: number // 1–5
  content: string
  avatarUrl?: string
  photoUrl?: string
  reviewedAt: string
  sortOrder: number
  isVisible: boolean
  /** Dữ liệu minh họa: landing hiện chữ "Minh họa" (NFR-06) */
  isSample: boolean
}
export type SaveReviewRequest = {
  customerName: string
  province: string
  rating: number
  content: string
  avatarUrl?: string
  photoUrl?: string
  reviewedAt?: string // vắng = bây giờ
  isSample: boolean
}
export type ReviewQuery = PaginationQuery & { isVisible?: boolean }

// ============================================================ Combo, khuyến mãi (07 §2.2, §2.3)

export type ComboDto = {
  id: string
  code: string // C01
  name: string
  description: string
  bottleCount: number
  giftText?: string
  promoPrice: number
  regularPrice: number
  freeShipping: boolean
  badge?: string
  imageUrl?: string
  sortOrder: number
  isDefault: boolean
  isVisible: boolean
  /** Giá mỗi chai theo giá khuyến mãi và giá thường, làm tròn xuống 1.000 (BR-01) */
  promoPricePerBottle: number
  regularPricePerBottle: number
  /** Số đơn đã đặt combo này (mọi trạng thái); > 0 thì không xóa được */
  orderCount: number
  updatedAt: string
}
export type SaveComboRequest = {
  name: string
  description: string
  bottleCount: number // 1–10
  giftText?: string
  promoPrice: number
  regularPrice: number
  freeShipping: boolean
  badge?: string
  imageUrl?: string
}

export type PromotionDto = {
  id: string
  name: string
  startAt: string
  /** Thời điểm kết thúc đã lưu */
  endAt: string
  /** Thời điểm kết thúc đang hiệu lực sau khi tự gia hạn (07 §3.3); landing đếm ngược theo trường này */
  effectiveEndAt: string
  /** null = không tự gia hạn */
  autoRenewDays?: number
  status: PromotionStatus
  version: number
  asOf: string // giờ máy chủ (BR-20)
}
export type UpdatePromotionRequest = {
  name: string
  startAt: string
  endAt: string
  autoRenewDays?: number // 1–30 hoặc vắng
  version: number
}

// ============================================================ API công khai (07 §2.1)

export type PublicStoreInfo = {
  name: string
  tagline?: string
  hotline: string
  email?: string
  address: string
  workingHours: string
  businessInfo?: string
  logoUrl: string
  primaryColor: string
}
export type PublicCombo = {
  id: string
  code: string
  name: string
  description: string
  bottleCount: number
  giftText?: string
  imageUrl?: string
  badge?: string
  isDefault: boolean
  /** Giá đang áp dụng theo trạng thái khuyến mãi lúc đọc */
  priceType: PriceType
  price: number
  /** Giá thường, chỉ có khi đang khuyến mãi (hiện gạch ngang) */
  compareAtPrice?: number
  pricePerBottle: number
  freeShipping: boolean
  /** Phí vận chuyển khi mua 1 suất (0 hoặc 30.000) */
  shippingFeeForOne: number
}
export type PublicPromotion = {
  name: string
  status: PromotionStatus
  startAt: string
  endAt: string // = effectiveEndAt
  asOf: string
}
export type PublicReview = {
  id: string
  customerName: string
  province: string
  rating: number
  content: string
  avatarUrl?: string
  photoUrl?: string
  reviewedAt: string
  isSample: boolean
}
export type ReviewSummary = { average: number; total: number } // average 1 chữ số thập phân
export type PublicBlock = Omit<LandingBlockDto, 'isVisible' | 'isRequired' | 'updatedAt'>
export type LandingPageDto = {
  store: PublicStoreInfo
  product: Omit<ProductDto, 'updatedAt'>
  blocks: PublicBlock[] // khối đang hiện, theo sortOrder
  combos: PublicCombo[] // combo đang hiện, theo sortOrder
  promotion: PublicPromotion
  /** Giá mỗi chai nhỏ nhất trong các combo đang hiện ("chỉ từ 330.000 ₫/chai") */
  minPricePerBottle: number
  reviewSummary: ReviewSummary
  reviews: PublicReview[] // 6 đánh giá đầu (FR-08)
  shippingFee: number // 30.000
  freeShippingThreshold: number // 500.000
  asOf: string
}

export type Attribution = {
  source: string // đã chuẩn hóa (BR-07)
  medium?: string
  campaign?: string
  content?: string
  referrer?: string // tên miền trang giới thiệu
}
export type RecordVisitRequest = {
  visitorId: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmContent?: string
  /** Nguồn đã lưu trên trình duyệt từ lần có UTM gần nhất trong 7 ngày (BR-07); vắng khi không có */
  storedAttribution?: Attribution
  referrer?: string // document.referrer đầy đủ, BE tự lấy tên miền
  device: DeviceType
  path: string
}
export type RecordVisitResult = {
  visitId: string
  isNewVisit: boolean
  attribution: Attribution
  /** Có UTM mới → FE ghi đè nguồn lưu trên trình duyệt */
  saveAttribution: boolean
}
export type TrackEventRequest = {
  visitorId: string
  visitId?: string
  type: Exclude<ConversionEventType, 'Purchase'>
}

export type PlaceOrderRequest = {
  clientRequestId: string
  visitorId: string
  visitId?: string
  customerName: string
  phone: string
  province: string
  address: string
  note?: string
  comboId: string
  quantity: number // 1–5
  /** Giá combo khách đang thấy (BR-02); lệch giá hiện tại → 409 GiaDaThayDoi */
  expectedPrice: number
  attribution: Attribution
  device: DeviceType
}
export type PlacedOrderSummary = {
  code: string
  placedAt: string
  customerName: string
  phone: string
  province: string
  address: string
  comboName: string
  quantity: number
  priceType: PriceType
  unitPrice: number
  subtotal: number
  shippingFee: number
  total: number
  /** Đặt ngoài 8:00–21:00 giờ Việt Nam (UC-02 4a) */
  outsideWorkingHours: boolean
}
export type PlaceOrderResult = { order: PlacedOrderSummary; duplicate: boolean }

export type RecentOrderNotice = {
  displayName: string
  province: string
  comboName: string
  placedAt: string
}

// ============================================================ Đơn hàng (07 §2.5)

export type OrderListItem = {
  id: string
  code: string
  placedAt: string
  customerName: string
  phone: string
  province: string
  comboId: string
  comboCode: string
  comboName: string
  quantity: number
  total: number
  source: string
  campaign?: string
  assigneeId?: string
  assigneeName?: string
  status: OrderStatus
  tags: OrderTag[]
  nextCallAt?: string
  failedCallCount: number
  upsellAmount: number
  version: number
}

export type OrderCallDto = {
  id: string
  calledAt: string
  callerId?: string // null khi người gọi đã bị xóa (BE Guid?)
  callerName: string
  result: CallResult
  callbackAt?: string
  cancelReason?: CancelReason
  note?: string
}
export type OrderEventDto = {
  id: string
  type: OrderEventType
  fromStatus?: OrderStatus
  toStatus?: OrderStatus
  content: string // câu hiển thị, vd "Chia cho Phạm Thu Hằng", "Đã gửi SMS xác nhận (giả lập)"
  actorName?: string // vắng = Hệ thống
  occurredAt: string
}
export type ShipmentDto = {
  carrier: Carrier
  trackingCode: string
  codAmount: number
  handedOverAt: string
  handedOverByName: string
  deliveredAt?: string
  returnedAt?: string
}
export type RelatedOrder = {
  id: string
  code: string
  placedAt: string
  comboName: string
  quantity: number
  total: number
  status: OrderStatus
  cancelReason?: CancelReason
  returnReason?: ReturnReason
  assigneeName?: string
  isDuplicate: boolean
  /** Còn hủy được bằng "Hủy đơn trùng" (Mới, Chờ gọi lại, Đã xác nhận) */
  canCancel: boolean
}
export type OrderDetailDto = OrderListItem & {
  address: string
  note?: string
  priceType: PriceType
  unitPrice: number
  bottleCount: number
  placedComboName: string
  placedQuantity: number
  placedSubtotal: number
  subtotal: number
  shippingFee: number
  medium?: string
  adContent?: string
  referrer?: string
  device: DeviceType
  assignedAt?: string
  confirmedAt?: string
  confirmedByName?: string
  cancelReason?: CancelReason
  cancelNote?: string
  cancelledAt?: string
  cancelledByName?: string
  returnReason?: ReturnReason
  returnNote?: string
  shipment?: ShipmentDto
  calls: OrderCallDto[] // mới nhất trước
  events: OrderEventDto[] // mới nhất trước
  /** Đơn khác cùng số điện thoại, mới nhất trước (FR-21) */
  relatedOrders: RelatedOrder[]
  /** Số đơn Hoàn hàng của số điện thoại (BR-15) */
  returnedCount: number
  asOf: string
}

export type OrderQuery = PaginationQuery & {
  /** Vắng = Tất cả */
  status?: OrderStatus
  from?: string // yyyy-MM-dd, theo ngày đặt
  to?: string
  comboId?: string
  source?: string
  /** "unassigned" = chưa chia */
  assigneeId?: string
  tag?: OrderTag
  confirmedById?: string
  upsellOnly?: boolean
}
export type OrderStatusCounts = Record<OrderStatus | 'TatCa', number>
export type OrderListResult = PaginatedResult<OrderListItem> & {
  /** Số đơn mỗi tab theo cùng bộ lọc (trừ status) */
  statusCounts: OrderStatusCounts
}

export type OrderChanges = {
  customerName: string
  province: string
  address: string
  comboId: string
  quantity: number
}
export type UpdateOrderRequest = OrderChanges & { version: number }
export type RecordCallRequest = {
  result: CallResult
  callbackAt?: string // bắt buộc với HenGoiLai
  cancelReason?: CancelReason // bắt buộc với KhachHuy
  note?: string // ≤ 300; bắt buộc khi cancelReason = Khac
  /** Chỉ với XacNhan: sửa đơn trước khi xác nhận (FR-23) */
  changes?: OrderChanges
  version: number
}
export type CancelOrderRequest = { reason: CancelReason; note?: string; version: number }
export type ReturnOrderRequest = { reason: ReturnReason; note?: string; version: number }
export type VersionRequest = { version: number }
export type AddNoteRequest = { content: string }
export type HandoverRequest = { orderIds: string[]; carrier: Carrier }
export type HandoverResult = {
  handedOver: number
  skipped: number
  skippedOrderIds: string[]
  message: string // "Đã bàn giao 2 đơn, bỏ qua 1 đơn không ở trạng thái Đã xác nhận"
}
export type ReassignRequest = { orderIds: string[]; assigneeId: string }
export type ReassignResult = { reassigned: number; skipped: number; message: string }
/** Dòng xuất Excel theo mẫu đơn vị vận chuyển (FR-28) */
export type OrderExportRow = {
  code: string
  customerName: string
  phone: string
  address: string
  province: string
  goods: string // "Mua 2 tặng 1 × 1 (2 chai serum, tặng 1 sữa rửa mặt Rau Má 100 ml)"
  codAmount: number
  note?: string
}

/** Người nhận đơn và trạng thái "Nhận đơn" (FR-20) */
export type TelesaleDto = {
  userId: string
  username: string
  fullName: string
  isReceiving: boolean
  lastAssignedAt?: string
  openOrders: number // Mới + Chờ gọi lại đang phụ trách (chưa gọi xong)
}
export type SetReceivingRequest = { isReceiving: boolean }

// ============================================================ Tổng quan, báo cáo (07 §2.6, §2.7)

export type MetricCompare = {
  value: number | null // null = không tính được (hiện "—")
  previous: number | null
  /** % thay đổi với số lượng, tiền; điểm phần trăm với tỉ lệ; null khi không so được */
  change: number | null
}
export type ManagerDashboard = {
  date: string // yyyy-MM-dd giờ Việt Nam
  asOf: string
  visits: MetricCompare
  orders: MetricCompare
  conversionRate: MetricCompare // %, 2 chữ số thập phân
  pendingCalls: number // Mới + Chờ gọi lại hiện tại
  dueCallbacks: number
  confirmRate: MetricCompare // %, 1 chữ số
  confirmedValue: MetricCompare
  ordersByHour: { hour: number; orders: number }[] // 0–23 hôm nay
  trend14Days: { date: string; orders: number; confirmed: number; confirmRate: number | null }[]
  comboShare: { comboId: string; comboName: string; orders: number; share: number }[]
  sourceShare: { source: string; orders: number; share: number }[]
}
export type TelesaleDashboard = {
  date: string
  asOf: string
  isReceiving: boolean
  myNew: number
  unassignedNew: number
  myDueCallbacks: number
  myLaterCallbacks: number
  myConfirmedToday: number
  myUpsellCountToday: number
  myUpsellValueToday: number
}

export type DateRangeQuery = { from?: string; to?: string } // yyyy-MM-dd; vắng = 7 ngày tới hôm nay

export type SourceMetrics = {
  visits: number
  orders: number
  conversionRate: number | null
  confirmed: number
  confirmRate: number | null
  delivered: number
  returned: number
  returnRate: number | null
  deliveredRevenue: number
  adCost: number
  costPerConfirmed: number | null
  roas: number | null
}
export type SourceReportRow = SourceMetrics & {
  source: string
  campaigns: (SourceMetrics & { campaign: string })[] // "" = không có chiến dịch
}
export type SourceReport = {
  from: string
  to: string
  rows: SourceReportRow[]
  totals: SourceMetrics
}

export type ComboReportRow = {
  comboId: string
  comboCode: string
  comboName: string
  orders: number
  share: number
  bottles: number
  confirmed: number
  deliveredRevenue: number
  averageOrderValue: number | null
}
export type ComboReport = {
  from: string
  to: string
  source?: string
  rows: ComboReportRow[]
  totalOrders: number
}

export type TelesaleReportRow = {
  userId: string
  fullName: string
  assigned: number
  called: number
  confirmed: number
  confirmRate: number | null
  upsellCount: number
  upsellValue: number
  delivered: number
  returned: number
  returnRate: number | null
}
export type TelesaleReport = { from: string; to: string; rows: TelesaleReportRow[] }

export type DailyTotals = {
  orders: number
  confirmed: number
  cancelled: number
  returned: number
  delivered: number
  deliveredRevenue: number
  cancelRate: number | null
}
export type DailyReport = {
  from: string
  to: string
  totals: DailyTotals
  previous: DailyTotals & { from: string; to: string }
  days: (DailyTotals & { date: string })[] // đủ mọi ngày
  cancelReasons: { reason: CancelReason; count: number }[] // không gồm DonTrung
  duplicateCancelled: number // số đơn hủy "Đơn trùng" (để ghi chú)
  returnReasons: { reason: ReturnReason; count: number }[]
}

export type AdCostDto = {
  id: string
  date: string // yyyy-MM-dd
  source: string
  campaign: string // "" = cả nguồn
  amount: number
  updatedAt: string
}
export type SaveAdCostRequest = { date: string; source: string; campaign?: string; amount: number }
export type AdCostQuery = { from?: string; to?: string; source?: string }

export type ConversionEventDto = {
  id: string
  type: ConversionEventType
  occurredAt: string
  source: string
  campaign?: string
  orderCode?: string
  value?: number
  /** Câu mô phỏng lệnh pixel, vd "fbq('track', 'Purchase', { value: 740000, currency: 'VND' })" */
  pixelCall: string
}

// ============================================================ Bản ghi mock (07 §4.8)
// Ngày giờ ISO UTC. Id cố định theo 06 §5.2 (stableId). FE-Landing khai báo collection, FE-Quản trị chỉ đọc/ghi qua store.

export type ProductRecord = ProductDto
export type ComboRecord = Omit<
  ComboDto,
  'promoPricePerBottle' | 'regularPricePerBottle' | 'orderCount'
> & {
  productId: string
  isDeleted?: boolean
}
export type PromotionRecord = Omit<PromotionDto, 'effectiveEndAt' | 'status' | 'asOf'>
export type LandingBlockRecord = Omit<LandingBlockDto, 'isRequired'>
export type ReviewRecord = ReviewDto & { createdAt: string }

export type OrderCallRecord = OrderCallDto
export type OrderEventRecord = Omit<OrderEventDto, 'actorName'> & {
  actorId?: string
  actorName?: string
}
export type ShipmentRecord = ShipmentDto & { handedOverById: string }

/** Đơn kèm cuộc gọi, sự kiện, vận đơn lồng trong bản ghi (collection `orders`) */
export type OrderRecord = {
  id: string
  code: string
  placedAt: string
  customerName: string
  phone: string
  province: string
  address: string
  note?: string
  comboId: string
  comboCode: string
  comboName: string
  bottleCount: number
  quantity: number
  placedComboId: string
  placedComboName: string
  placedQuantity: number
  priceType: PriceType
  unitPrice: number
  placedSubtotal: number
  subtotal: number
  shippingFee: number
  total: number
  upsellAmount: number
  visitorId?: string
  visitId?: string
  source: string
  medium?: string
  campaign?: string
  adContent?: string
  referrer?: string
  device: DeviceType
  assigneeId?: string
  assigneeName?: string
  assignedAt?: string
  status: OrderStatus
  failedCallCount: number
  nextCallAt?: string
  confirmedAt?: string
  confirmedById?: string
  confirmedByName?: string
  cancelReason?: CancelReason
  cancelNote?: string
  cancelledAt?: string
  cancelledById?: string
  cancelledByName?: string
  returnReason?: ReturnReason
  returnNote?: string
  isDuplicate: boolean
  duplicateCleared: boolean
  isReturnRisk: boolean
  clientRequestId?: string
  version: number
  calls: OrderCallRecord[] // cũ trước
  events: OrderEventRecord[] // cũ trước
  shipment?: ShipmentRecord
}

export type VisitRecord = {
  id: string
  visitorId: string
  startedAt: string
  lastSeenAt: string
  source: string
  medium?: string
  campaign?: string
  adContent?: string
  referrer?: string
  device: DeviceType
  path: string
}
/** Lượt truy cập gộp theo giờ; id = stableId('visit-stat', hourStart, source, campaign) */
export type VisitStatRecord = {
  id: string
  hourStart: string
  source: string
  campaign: string
  visits: number
}
export type TelesaleStateRecord = {
  id: string
  userId: string
  isReceiving: boolean
  lastAssignedAt?: string
}
export type AdCostRecord = AdCostDto
export type ConversionEventRecord = ConversionEventDto & {
  visitorId?: string
  visitId?: string
  orderId?: string
}
