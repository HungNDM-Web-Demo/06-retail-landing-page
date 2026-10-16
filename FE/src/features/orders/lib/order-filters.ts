import type { OrderQuery, OrderStatus, OrderTag } from '@/types/landing'
import { orderStatusTabs, orderTagLabels } from '@/config/landing-labels'

/**
 * Bộ lọc danh sách đơn đọc/ghi query string (07 §4.5, `ordersUrl()`): thẻ Tổng quan, ô upsell báo cáo telesale
 * mở sẵn bộ lọc. Không có tham số nào → tab Mới; có bộ lọc mà vắng `status` → tab Tất cả.
 */
export type OrderTab = OrderStatus | 'TatCa'
export type OrderFilters = Omit<OrderQuery, 'page' | 'pageSize' | 'sortBy' | 'sortDir' | 'status'>

const FILTER_KEYS = [
  'search',
  'from',
  'to',
  'comboId',
  'source',
  'assigneeId',
  'tag',
  'confirmedById',
  'upsellOnly',
] as const

export function parseOrderParams(params: URLSearchParams): {
  tab: OrderTab
  filters: OrderFilters
} {
  const filters: OrderFilters = {}
  for (const key of FILTER_KEYS) {
    const value = params.get(key)
    if (!value) continue
    if (key === 'upsellOnly') filters.upsellOnly = value === 'true'
    else if (key === 'tag') {
      if (value in orderTagLabels) filters.tag = value as OrderTag
    } else filters[key] = value
  }
  if (filters.upsellOnly === false) delete filters.upsellOnly
  const status = params.get('status')
  const hasAny = Object.keys(filters).length > 0
  const tab: OrderTab =
    status && (orderStatusTabs as string[]).includes(status)
      ? (status as OrderTab)
      : hasAny
        ? 'TatCa'
        : 'Moi'
  return { tab, filters }
}

export function toOrderParams(tab: OrderTab, filters: OrderFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (tab !== 'Moi') params.set('status', tab)
  for (const key of FILTER_KEYS) {
    const value = filters[key]
    if (value !== undefined && value !== '' && value !== false) params.set(key, String(value))
  }
  return params
}

/** Số bộ lọc đang bật (không tính ô tìm) */
export const activeFilterCount = (f: OrderFilters) =>
  FILTER_KEYS.filter((k) => k !== 'search' && f[k] !== undefined && f[k] !== '' && f[k] !== false)
    .length

export const toQueryStatus = (tab: OrderTab): OrderStatus | undefined =>
  tab === 'TatCa' ? undefined : tab
