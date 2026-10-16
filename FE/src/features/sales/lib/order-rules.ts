import { salesRules } from '@/config/sales-rules'
import { newId } from '@/mock/mock-helpers'
import type {
  CallResult,
  CancelReason,
  Carrier,
  OrderChanges,
  OrderRecord,
  OrderStatus,
  OrderTag,
  TelesaleStateRecord,
} from '@/types/landing'
import { type Actor, callText, evAssigned, evCall, evEdited, evSms, evTag, tagTexts } from './order-events'
import { amountsFromUnit, moneyText, unitPrice, upsellAmount } from './pricing'
import { type DateInput, vnYyMMdd } from './vn-time'

/**
 * Quy tắc đơn hàng dùng chung cho handler mock (FE-Landing tạo đơn, FE-Quản trị xử lý đơn) và seed:
 * mã đơn, mã vận đơn (07 §3.4), chia đơn (§3.9), nhãn Trùng, Rủi ro hoàn (§3.10), kết quả gọi (§3.7),
 * sửa đơn (BR-13). Hàm thuần: nhận bản ghi, trả bản ghi mới; không đọc/ghi mock-db.
 */

const HOUR_MS = 3_600_000
const MINUTE_MS = 60_000

const toMs = (value: DateInput) => new Date(value).getTime()
const iso = (ms: number) => new Date(ms).toISOString()

// ───────────────────────── Mã ─────────────────────────

/** Mã đơn kế tiếp `LP` + yyMMdd (ngày đặt giờ VN) + 4 số, nối tiếp số lớn nhất đã có trong ngày (BR-06) */
export function nextOrderCode(day: DateInput, existingCodes: Iterable<string>): string {
  const prefix = `LP${vnYyMMdd(day)}`
  let max = 0
  for (const code of existingCodes) {
    if (!code.startsWith(prefix)) continue
    const n = Number(code.slice(prefix.length))
    if (Number.isFinite(n) && n > max) max = n
  }
  return `${prefix}${String(max + 1).padStart(4, '0')}`
}

/** Mã vận đơn khi bàn giao: mã đơn vị + yyMMdd (ngày bàn giao) + 4 số ngẫu nhiên, không trùng (BR-17) */
export function trackingCode(carrier: Carrier, day: DateInput, existingCodes: Iterable<string>): string {
  const used = new Set(existingCodes)
  const prefix = `${carrier}${vnYyMMdd(day)}`
  for (let i = 0; i < 200; i++) {
    const code = `${prefix}${String(Math.floor(Math.random() * 10_000)).padStart(4, '0')}`
    if (!used.has(code)) return code
  }
  // Hết số ngẫu nhiên (gần như không xảy ra): dùng số tăng dần
  for (let n = 0; n < 10_000; n++) {
    const code = `${prefix}${String(n).padStart(4, '0')}`
    if (!used.has(code)) return code
  }
  return `${prefix}${Date.now() % 10_000}`
}

/** Mã vận đơn của dữ liệu mẫu: mã đơn vị + 10 số cuối của mã đơn (06 §5.4) */
export const seedTrackingCode = (carrier: Carrier, orderCode: string): string => `${carrier}${orderCode.slice(-10)}`

// ───────────────────────── Chia đơn (BR-09) ─────────────────────────

export type StaffCandidate = { userId: string; username: string; fullName: string }

export type AssigneePick = {
  userId: string
  fullName: string
  /** true: theo đơn đang mở cùng số điện thoại (không đổi LastAssignedAt); false: theo vòng xoay */
  bySamePhone: boolean
}

const OPEN_FOR_SAME_PHONE: OrderStatus[] = ['Moi', 'ChoGoiLai', 'DaXacNhan']

/**
 * Chọn người nhận đơn mới (07 §3.9):
 * 1. Có đơn cùng số trạng thái Mới / Chờ gọi lại / Đã xác nhận đang có người phụ trách → người đó.
 * 2. Không: telesale (`staff` = tài khoản STAFF đang hoạt động) đang bật Nhận đơn, LastAssignedAt nhỏ nhất
 *    (null trước), bằng nhau theo username. Người gọi hàm đặt LastAssignedAt = now khi `bySamePhone = false`.
 * 3. Không có ứng viên → undefined (đơn chưa chia).
 */
export function pickAssignee(
  phone: string,
  orders: Pick<OrderRecord, 'phone' | 'status' | 'assigneeId' | 'assigneeName' | 'placedAt'>[],
  states: TelesaleStateRecord[],
  staff: StaffCandidate[]
): AssigneePick | undefined {
  const samePhone = orders
    .filter((o) => o.phone === phone && o.assigneeId && OPEN_FOR_SAME_PHONE.includes(o.status))
    .sort((a, b) => b.placedAt.localeCompare(a.placedAt))[0]
  if (samePhone?.assigneeId) {
    const person = staff.find((s) => s.userId === samePhone.assigneeId)
    return {
      userId: samePhone.assigneeId,
      fullName: person?.fullName ?? samePhone.assigneeName ?? '',
      bySamePhone: true,
    }
  }
  const candidates = staff
    .map((s) => ({ ...s, state: states.find((t) => t.userId === s.userId) }))
    .filter((s) => s.state?.isReceiving)
    .sort((a, b) => {
      const la = a.state?.lastAssignedAt ?? ''
      const lb = b.state?.lastAssignedAt ?? ''
      if (la !== lb) return la < lb ? -1 : 1 // '' (null) đứng trước
      return a.username.localeCompare(b.username)
    })
  const chosen = candidates[0]
  return chosen ? { userId: chosen.userId, fullName: chosen.fullName, bySamePhone: false } : undefined
}

/** Giao đơn cho người phụ trách kèm sự kiện `ChiaDon` */
export function assignOrder(
  order: OrderRecord,
  assignee: { userId: string; fullName: string },
  mode: 'auto' | 'reassign' | 'claim',
  at: string,
  actor?: Actor | null
): OrderRecord {
  return {
    ...order,
    assigneeId: assignee.userId,
    assigneeName: assignee.fullName,
    assignedAt: at,
    events: [...order.events, evAssigned(at, assignee.fullName, mode, actor)],
  }
}

// ───────────────────────── Nhãn Trùng, Rủi ro hoàn (BR-14, BR-15) ─────────────────────────

const withinDuplicateWindow = (a: string, b: string) =>
  Math.abs(toMs(a) - toMs(b)) <= salesRules.duplicateWindowHours * HOUR_MS

/** Số đơn Hoàn hàng của số điện thoại ≥ 2 → đơn mới mang nhãn Rủi ro hoàn */
export function isReturnRisk(phone: string, orders: Pick<OrderRecord, 'phone' | 'status'>[]): boolean {
  return returnedCountOf(phone, orders) >= salesRules.returnRiskThreshold
}

export const returnedCountOf = (phone: string, orders: Pick<OrderRecord, 'phone' | 'status'>[]): number =>
  orders.filter((o) => o.phone === phone && o.status === 'HoanHang').length

/**
 * Khi tạo đơn N: đơn khác cùng số, khác Đã hủy, |PlacedAt − N.PlacedAt| ≤ 24 giờ → N và các đơn đó mang nhãn Trùng
 * (sự kiện "Gắn nhãn Trùng" ở đơn chưa có nhãn, Version + 1 ở đơn cũ đổi). Trả đơn mới và các đơn cũ đã đổi.
 */
export function applyDuplicateTagsOnCreate(
  order: OrderRecord,
  existing: OrderRecord[],
  at: string = order.placedAt
): { order: OrderRecord; changed: OrderRecord[] } {
  const others = existing.filter(
    (o) => o.id !== order.id && o.phone === order.phone && o.status !== 'DaHuy' && withinDuplicateWindow(o.placedAt, order.placedAt)
  )
  if (others.length === 0) return { order, changed: [] }
  const tagged: OrderRecord = {
    ...order,
    isDuplicate: true,
    duplicateCleared: false,
    events: [...order.events, evTag(at, tagTexts.addDuplicate)],
  }
  const changed = others
    .filter((o) => !o.isDuplicate || o.duplicateCleared)
    .map((o) => ({
      ...o,
      isDuplicate: true,
      duplicateCleared: false,
      version: o.version + 1,
      events: [...o.events, evTag(at, tagTexts.addDuplicate)],
    }))
  return { order: tagged, changed }
}

/**
 * Sau khi một đơn cùng số chuyển Đã hủy (mọi lý do): mỗi đơn M khác Đã hủy đang mang nhãn Trùng mà không còn
 * đơn nào khác Đã hủy (≠ M) trong 24 giờ của M → bỏ nhãn, sự kiện "Bỏ nhãn Trùng". Đơn bị hủy giữ nhãn.
 * `samePhoneOrders`: mọi đơn cùng số (kể cả đơn vừa hủy, đã ở trạng thái mới). Trả các đơn đã đổi.
 */
export function recomputeDuplicatesAfterCancel(samePhoneOrders: OrderRecord[], at: string): OrderRecord[] {
  const alive = samePhoneOrders.filter((o) => o.status !== 'DaHuy')
  const changed: OrderRecord[] = []
  for (const m of alive) {
    if (!m.isDuplicate) continue
    const stillDuplicate = alive.some((o) => o.id !== m.id && withinDuplicateWindow(o.placedAt, m.placedAt))
    if (stillDuplicate) continue
    changed.push({
      ...m,
      isDuplicate: false,
      version: m.version + 1,
      events: [...m.events, evTag(at, tagTexts.removeDuplicate)],
    })
  }
  return changed
}

/** Nhãn hiển thị: Trùng, Rủi ro hoàn (lưu), Đến giờ gọi lại (suy ra: Chờ gọi lại và NextCallAt ≤ now, BR-11) */
export function orderTags(
  order: Pick<OrderRecord, 'isDuplicate' | 'isReturnRisk' | 'status' | 'nextCallAt'>,
  now: number = Date.now()
): OrderTag[] {
  const tags: OrderTag[] = []
  if (order.isDuplicate) tags.push('Trung')
  if (order.isReturnRisk) tags.push('RuiRoHoan')
  if (isDueCallback(order, now)) tags.push('DenGioGoiLai')
  return tags
}

export const isDueCallback = (order: Pick<OrderRecord, 'status' | 'nextCallAt'>, now: number = Date.now()): boolean =>
  order.status === 'ChoGoiLai' && !!order.nextCallAt && toMs(order.nextCallAt) <= now

// ───────────────────────── Sửa đơn (BR-13, FR-23) ─────────────────────────

export type ComboForOrder = {
  id: string
  code: string
  name: string
  bottleCount: number
  promoPrice: number
  regularPrice: number
  freeShipping: boolean
}

/**
 * Áp thay đổi của telesale (họ tên, tỉnh, địa chỉ, combo, số lượng). Đổi combo hoặc số lượng thì tính lại theo
 * `PriceType` đã chốt và giá hiện tại của combo mới; không đổi thì giữ `UnitPrice` đã chụp. Sự kiện `SuaDon`
 * "{combo cũ} × {sl} → {combo mới} × {sl}, tiền hàng {cũ} → {mới}; đổi họ tên; đổi địa chỉ; đổi tỉnh/thành".
 * Không có gì đổi → trả nguyên bản ghi. Không tăng Version (handler tăng một lần cho cả thao tác).
 */
export function applyOrderChanges(
  order: OrderRecord,
  changes: OrderChanges,
  newCombo: ComboForOrder,
  actor: Actor | null,
  at: string
): OrderRecord {
  const parts: string[] = []
  let next: OrderRecord = { ...order }
  const comboChanged = changes.comboId !== order.comboId || changes.quantity !== order.quantity
  if (comboChanged) {
    const price = changes.comboId === order.comboId ? order.unitPrice : unitPrice(newCombo, order.priceType)
    const amounts = amountsFromUnit(price, changes.quantity, newCombo.freeShipping)
    parts.push(
      `${order.comboName} × ${order.quantity} → ${newCombo.name} × ${changes.quantity}, tiền hàng ${moneyText(order.subtotal)} → ${moneyText(amounts.subtotal)}`
    )
    next = {
      ...next,
      comboId: newCombo.id,
      comboCode: newCombo.code,
      comboName: newCombo.name,
      bottleCount: newCombo.bottleCount,
      quantity: changes.quantity,
      ...amounts,
    }
  }
  const name = changes.customerName.trim().replace(/\s+/g, ' ')
  if (name !== order.customerName) {
    parts.push('đổi họ tên')
    next.customerName = name
  }
  const address = changes.address.trim()
  if (address !== order.address) {
    parts.push('đổi địa chỉ')
    next.address = address
  }
  if (changes.province !== order.province) {
    parts.push('đổi tỉnh/thành')
    next.province = changes.province
  }
  if (parts.length === 0) return order
  next.events = [...order.events, evEdited(at, parts, actor)]
  return next
}

// ───────────────────────── Kết quả cuộc gọi (BR-10) ─────────────────────────

export type CallInput = {
  result: CallResult
  callbackAt?: string
  cancelReason?: CancelReason
  note?: string
  /** Chỉ với XacNhan: sửa đơn trước khi xác nhận (UC-03 3a upsell) */
  changes?: OrderChanges
  /** Combo mới của `changes` (bắt buộc khi có `changes`) */
  newCombo?: ComboForOrder
}

export type CallOutcome = {
  order: OrderRecord
  /** Đơn vừa chuyển Đã hủy: handler gọi `recomputeDuplicatesAfterCancel` cho các đơn cùng số */
  cancelled: boolean
}

/**
 * Ghi một cuộc gọi (07 §2.5 "Ghi cuộc gọi", §3.7). Handler đã kiểm phạm vi, version, trạng thái, dữ liệu.
 * Thứ tự: đơn chưa chia thì giao cho người gọi ("{tên} nhận đơn") → áp `changes` (XacNhan) → lưu cuộc gọi,
 * chuyển trạng thái, sự kiện `CuocGoi` (+ `TinNhan` khi xác nhận) → Version + 1.
 */
export function applyCallResult(order: OrderRecord, input: CallInput, actor: Actor, now: number = Date.now()): CallOutcome {
  const at = iso(now)
  let next: OrderRecord = { ...order, calls: [...order.calls], events: [...order.events] }
  if (!next.assigneeId) next = assignOrder(next, { userId: actor.id, fullName: actor.name }, 'claim', at, actor)
  if (input.result === 'XacNhan' && input.changes && input.newCombo) {
    next = applyOrderChanges(next, input.changes, input.newCombo, actor, at)
  }

  const from = next.status
  const note = input.note?.trim() || undefined
  let content: string
  let cancelled = false

  switch (input.result) {
    case 'XacNhan': {
      const upsell = upsellAmount(next.placedSubtotal, next.subtotal)
      next = {
        ...next,
        status: 'DaXacNhan',
        confirmedAt: at,
        confirmedById: actor.id,
        confirmedByName: actor.name,
        upsellAmount: upsell,
        nextCallAt: undefined,
      }
      content = callText({ result: 'XacNhan', upsell, note })
      break
    }
    case 'KhongNgheMay':
    case 'ThueBao': {
      const attempt = next.failedCallCount + 1
      if (attempt >= salesRules.maxFailedCalls) {
        next = {
          ...next,
          failedCallCount: attempt,
          status: 'DaHuy',
          cancelReason: 'KhongLienLacDuoc',
          cancelledAt: at,
          cancelledById: undefined,
          cancelledByName: undefined,
          nextCallAt: undefined,
        }
        cancelled = true
        content = callText({ result: input.result, attempt, note })
      } else {
        const callbackAt = iso(now + salesRules.autoCallbackMinutes * MINUTE_MS)
        next = { ...next, failedCallCount: attempt, status: 'ChoGoiLai', nextCallAt: callbackAt }
        content = callText({ result: input.result, attempt, callbackAt, note })
      }
      break
    }
    case 'HenGoiLai':
      next = { ...next, status: 'ChoGoiLai', nextCallAt: input.callbackAt }
      content = callText({ result: 'HenGoiLai', callbackAt: input.callbackAt, note })
      break
    case 'SaiSo':
      next = {
        ...next,
        status: 'DaHuy',
        cancelReason: 'SaiSoDienThoai',
        cancelledAt: at,
        cancelledById: actor.id,
        cancelledByName: actor.name,
        nextCallAt: undefined,
      }
      cancelled = true
      content = callText({ result: 'SaiSo', note })
      break
    case 'KhachHuy':
      next = {
        ...next,
        status: 'DaHuy',
        cancelReason: input.cancelReason,
        cancelNote: note,
        cancelledAt: at,
        cancelledById: actor.id,
        cancelledByName: actor.name,
        nextCallAt: undefined,
      }
      cancelled = true
      content = callText({ result: 'KhachHuy', cancelReason: input.cancelReason, note })
      break
  }

  next.calls.push({
    id: newId(),
    calledAt: at,
    callerId: actor.id,
    callerName: actor.name,
    result: input.result,
    callbackAt: input.result === 'HenGoiLai' ? input.callbackAt : undefined,
    cancelReason: input.result === 'KhachHuy' ? input.cancelReason : undefined,
    note,
  })
  next.events = [...next.events, evCall(at, content, actor, from, next.status)]
  if (input.result === 'XacNhan') next.events.push(evSms(at, 'confirmed'))
  next.version = order.version + 1
  return { order: next, cancelled }
}
