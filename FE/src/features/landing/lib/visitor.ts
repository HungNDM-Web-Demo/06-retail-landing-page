import { salesRules } from '@/config/sales-rules'
import { newId } from '@/mock/mock-helpers'
import { readJson, removeKey, storageKey, writeJson } from '@/lib/storage'
import type { Attribution, PlacedOrderSummary } from '@/types/landing'

/**
 * Danh tính trình duyệt của khách trên landing (07 §4.2 bước 4, §4.3):
 * - `?visitor=N` (N ≥ 2) cho tab một "trình duyệt" riêng: khóa có hậu tố `:v{N}`; N giữ trong sessionStorage
 *   của tab nên sang `/cam-on` không mất. Không có tham số = trình duyệt 1.
 * - Khóa: `visitor` (visitorId), `attribution` (nguồn lưu 7 ngày), `last-order-at` ở localStorage;
 *   `placed-order`, `order-draft` ở sessionStorage.
 */

const VISITOR_INDEX_KEY = storageKey('visitor-index')

/** Đọc `?visitor=N` (gọi một lần khi tải trang) và nhớ trong tab */
export function initVisitorIndex(search: string | URLSearchParams): number {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search
  const n = Number(params.get('visitor'))
  if (Number.isInteger(n) && n >= 2 && n <= 999) {
    writeJson('session', VISITOR_INDEX_KEY, n)
    return n
  }
  if (params.has('visitor')) removeKey('session', VISITOR_INDEX_KEY)
  return visitorIndex()
}

/** Số "trình duyệt" của tab (1 = mặc định) */
export function visitorIndex(): number {
  const n = readJson<number>('session', VISITOR_INDEX_KEY)
  return typeof n === 'number' && n >= 2 ? n : 1
}

/** Khóa trình duyệt kèm hậu tố `:v{N}` khi N ≥ 2 */
export function visitorKey(name: string): string {
  const n = visitorIndex()
  return storageKey(n >= 2 ? `${name}:v${n}` : name)
}

/** visitorId: sinh `crypto.randomUUID()` một lần, lưu localStorage */
export function getVisitorId(): string {
  const key = visitorKey(salesRules.storage.visitor)
  const existing = readJson<string>('local', key)
  if (existing) return existing
  const id = newId()
  writeJson('local', key, id)
  return id
}

type StoredAttribution = Attribution & { savedAt: string }

/** Nguồn lưu còn trong 7 ngày (BR-07); quá hạn thì bỏ */
export function readStoredAttribution(now: number = Date.now()): Attribution | undefined {
  const key = visitorKey(salesRules.storage.attribution)
  const stored = readJson<StoredAttribution>('local', key)
  if (!stored?.source || !stored.savedAt) return undefined
  if (now - new Date(stored.savedAt).getTime() > salesRules.attributionDays * 86_400_000) {
    removeKey('local', key)
    return undefined
  }
  const { savedAt: _savedAt, ...attribution } = stored
  void _savedAt
  return attribution
}

export function saveAttribution(attribution: Attribution, now: number = Date.now()): void {
  writeJson('local', visitorKey(salesRules.storage.attribution), {
    ...attribution,
    savedAt: new Date(now).toISOString(),
  })
}

/** Giây còn phải chờ trước khi đặt đơn kế tiếp từ trình duyệt này (BR-05); 0 = được đặt */
export function orderCooldownLeft(now: number = Date.now()): number {
  const last = readJson<string>('local', visitorKey(salesRules.storage.lastOrderAt))
  if (!last) return 0
  const elapsed = (now - new Date(last).getTime()) / 1000
  return elapsed >= 0 && elapsed < salesRules.orderCooldownSeconds
    ? Math.ceil(salesRules.orderCooldownSeconds - elapsed)
    : 0
}

export function markOrderPlaced(at: string = new Date().toISOString()): void {
  writeJson('local', visitorKey(salesRules.storage.lastOrderAt), at)
}

export function savePlacedOrder(order: PlacedOrderSummary): void {
  writeJson('session', visitorKey(salesRules.storage.placedOrder), order)
}

export function readPlacedOrder(): PlacedOrderSummary | null {
  return readJson<PlacedOrderSummary>('session', visitorKey(salesRules.storage.placedOrder))
}

/** Nháp form khi gửi lỗi mạng (giữ `clientRequestId` để gửi lại, NFR-03) */
export type OrderDraft = {
  clientRequestId: string
  comboId?: string
  quantity?: number
  customerName?: string
  phone?: string
  province?: string
  address?: string
  note?: string
}

export function readOrderDraft(): OrderDraft | null {
  return readJson<OrderDraft>('session', visitorKey(salesRules.storage.orderDraft))
}

export function saveOrderDraft(draft: OrderDraft): void {
  writeJson('session', visitorKey(salesRules.storage.orderDraft), draft)
}

export function clearOrderDraft(): void {
  removeKey('session', visitorKey(salesRules.storage.orderDraft))
}
