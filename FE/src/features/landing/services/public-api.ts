import axios from 'axios'
import { apiRoutes } from '@/config/api-routes'
import { appConfig } from '@/config/app.config'
import { toApiError } from '@/lib/axios'
import { isMockMode } from '@/lib/data-source'
import { mockDb } from '@/mock/mock-db'
import type { PaginatedResult } from '@/types/api'
import type {
  LandingPageDto,
  PlaceOrderRequest,
  PlaceOrderResult,
  PublicPromotion,
  PublicReview,
  RecentOrderNotice,
  RecordVisitRequest,
  RecordVisitResult,
  TrackEventRequest,
} from '@/types/landing'

/**
 * API công khai `/api/public/*` (07 §2.1, §4.9): axios riêng KHÔNG gắn Authorization, không tự làm mới token.
 * Chỉ FE-Landing dùng. Ở chế độ mock, handler và dữ liệu mẫu nạp lười (`import()`) để trang landing tải lần đầu nhẹ
 * (NFR: ≤ 2 MB); trang đã render sẵn từ máy chủ nên không chờ.
 */
const publicHttp = axios.create({
  baseURL: appConfig.apiUrl,
  timeout: 20_000,
  headers: { 'Content-Type': 'application/json' },
})
publicHttp.interceptors.response.use(
  (r) => r,
  (error) => Promise.reject(toApiError(error))
)

const mock = () => import('../mock/public.mock').then((m) => m.publicMock)

/** Collection mock-db mà trang landing cần nghe (tab quản trị sửa combo, nội dung, khuyến mãi, cài đặt) */
const RELEVANT = ['products', 'combos', 'promotions', 'landing-blocks', 'reviews', 'system.settings', 'sales-meta']

export const publicApi = {
  landing: async (): Promise<LandingPageDto> =>
    isMockMode()
      ? (await mock()).landing()
      : (await publicHttp.get<LandingPageDto>(apiRoutes.public.landing)).data,

  promotion: async (): Promise<PublicPromotion> =>
    isMockMode()
      ? (await mock()).promotion()
      : (await publicHttp.get<PublicPromotion>(apiRoutes.public.promotion)).data,

  reviews: async (page: number, pageSize: number): Promise<PaginatedResult<PublicReview>> =>
    isMockMode()
      ? (await mock()).reviews(page, pageSize)
      : (await publicHttp.get<PaginatedResult<PublicReview>>(apiRoutes.public.reviews, { params: { page, pageSize } })).data,

  recordVisit: async (request: RecordVisitRequest): Promise<RecordVisitResult> =>
    isMockMode()
      ? (await mock()).recordVisit(request)
      : (await publicHttp.post<RecordVisitResult>(apiRoutes.public.visits, request)).data,

  trackEvent: async (request: TrackEventRequest): Promise<void> => {
    if (isMockMode()) return (await mock()).trackEvent(request)
    await publicHttp.post(apiRoutes.public.events, request)
  },

  placeOrder: async (request: PlaceOrderRequest): Promise<PlaceOrderResult> =>
    isMockMode()
      ? (await mock()).placeOrder(request)
      : (await publicHttp.post<PlaceOrderResult>(apiRoutes.public.orders, request)).data,

  recentOrders: async (): Promise<RecentOrderNotice[]> =>
    isMockMode()
      ? (await mock()).recentOrders()
      : (await publicHttp.get<RecentOrderNotice[]>(apiRoutes.public.recentOrders)).data,

  /** Chế độ mock: tab khác sửa dữ liệu landing → gọi lại (giao diện thấy ngay); chế độ api không có kênh đẩy */
  subscribeChanges: (listener: () => void): (() => void) =>
    isMockMode()
      ? mockDb.subscribe((event) => {
          if (event.reset || event.collections.length === 0 || event.collections.some((c) => RELEVANT.includes(c)))
            listener()
        })
      : () => {},
}
