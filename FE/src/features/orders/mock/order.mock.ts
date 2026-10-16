import {
  callResultLabels,
  carrierLabels,
  customerCancelReasons,
  returnReasonLabels,
  userCancelReasons,
} from '@/config/landing-labels'
import { permissions } from '@/config/permissions'
import { salesRules } from '@/config/sales-rules'
import { mockDelay } from '@/lib/data-source'
import { normalizeVi } from '@/lib/normalize'
import { requirePermission, type MockSessionContext } from '@/mock/mock-auth'
import { paginate } from '@/mock/mock-helpers'
import { mockDb } from '@/mock/mock-db'
import type {
  AddNoteRequest,
  CancelOrderRequest,
  CancelReason,
  Carrier,
  ComboRecord,
  HandoverRequest,
  HandoverResult,
  OrderDetailDto,
  OrderExportRow,
  OrderListItem,
  OrderListResult,
  OrderQuery,
  OrderRecord,
  OrderStatus,
  OrderStatusCounts,
  OrderTag,
  ReassignRequest,
  ReassignResult,
  RecordCallRequest,
  RelatedOrder,
  ReturnOrderRequest,
  ReturnReason,
  OrderChanges,
  UpdateOrderRequest,
  VersionRequest,
} from '@/types/landing'
import { inVnRange } from '@/features/reports/lib/vn-date'
import { validateOrderChanges } from '../schemas/order.schema'
import { fieldErrors, salesProblem } from './sales-problems'
import {
  activeTelesales,
  applyCallResult,
  applyOrderChanges,
  assignOrder,
  cancelText,
  combosDb,
  ensureFreshDay,
  evHandover,
  evNote,
  evStatus,
  evTag,
  isWithinDuplicateWindow,
  orderTags,
  ordersDb,
  recomputeDuplicatesAfterCancel,
  returnText,
  returnedCountOf,
  tagTexts,
  trackingCode,
  type Actor,
} from './store-access'

/**
 * Handler mock đơn hàng `/api/orders/*` (07 §2.5; FR-19…FR-28, BR-09…BR-18; UC-03…UC-09).
 * Thứ tự kiểm tra và câu lỗi đúng 07 §2.5, §2.8; câu dòng thời gian đúng §3.7, §3.8.
 */

const CALLABLE: OrderStatus[] = ['Moi', 'ChoGoiLai']
const CANCELLABLE: OrderStatus[] = ['Moi', 'ChoGoiLai', 'DaXacNhan']
const SHIPPED: OrderStatus[] = ['DangGiao', 'DaGiao', 'HoanHang']
const ALL_STATUSES: OrderStatus[] = [
  'Moi',
  'ChoGoiLai',
  'DaXacNhan',
  'DangGiao',
  'DaGiao',
  'HoanHang',
  'DaHuy',
]

const actorOf = (ctx: MockSessionContext): Actor => ({ id: ctx.user.id, name: ctx.user.fullName })
const canViewAll = (ctx: MockSessionContext) =>
  ctx.isSuperAdmin || ctx.permissions.includes(permissions.orders.viewAll)
const inScope = (ctx: MockSessionContext, o: OrderRecord) =>
  canViewAll(ctx) || !o.assigneeId || o.assigneeId === ctx.user.id

// ───────── DTO ─────────

const tagsOf = (o: OrderRecord, now: number): OrderTag[] => orderTags(o, now)

function toListItem(o: OrderRecord, now = Date.now()): OrderListItem {
  return {
    id: o.id,
    code: o.code,
    placedAt: o.placedAt,
    customerName: o.customerName,
    phone: o.phone,
    province: o.province,
    comboId: o.comboId,
    comboCode: o.comboCode,
    comboName: o.comboName,
    quantity: o.quantity,
    total: o.total,
    source: o.source,
    campaign: o.campaign,
    assigneeId: o.assigneeId,
    assigneeName: o.assigneeName,
    status: o.status,
    tags: tagsOf(o, now),
    nextCallAt: o.status === 'ChoGoiLai' ? o.nextCallAt : undefined,
    failedCallCount: o.failedCallCount,
    upsellAmount: o.upsellAmount,
    version: o.version,
  }
}

function toDetail(o: OrderRecord): OrderDetailDto {
  const now = Date.now()
  const samePhone = ordersDb.filter((x) => x.phone === o.phone)
  const related: RelatedOrder[] = samePhone
    .filter((x) => x.id !== o.id)
    .sort((a, b) => Date.parse(b.placedAt) - Date.parse(a.placedAt))
    .map((x) => ({
      id: x.id,
      code: x.code,
      placedAt: x.placedAt,
      comboName: x.comboName,
      quantity: x.quantity,
      total: x.total,
      status: x.status,
      cancelReason: x.cancelReason,
      returnReason: x.returnReason,
      assigneeName: x.assigneeName,
      isDuplicate: x.isDuplicate,
      canCancel: CANCELLABLE.includes(x.status),
    }))
  return {
    ...toListItem(o, now),
    address: o.address,
    note: o.note,
    priceType: o.priceType,
    unitPrice: o.unitPrice,
    bottleCount: o.bottleCount,
    placedComboName: o.placedComboName,
    placedQuantity: o.placedQuantity,
    placedSubtotal: o.placedSubtotal,
    subtotal: o.subtotal,
    shippingFee: o.shippingFee,
    medium: o.medium,
    adContent: o.adContent,
    referrer: o.referrer,
    device: o.device,
    assignedAt: o.assignedAt,
    confirmedAt: o.confirmedAt,
    confirmedByName: o.confirmedByName,
    cancelReason: o.cancelReason,
    cancelNote: o.cancelNote,
    cancelledAt: o.cancelledAt,
    cancelledByName: o.cancelledByName,
    returnReason: o.returnReason,
    returnNote: o.returnNote,
    shipment: o.shipment
      ? {
          carrier: o.shipment.carrier,
          trackingCode: o.shipment.trackingCode,
          codAmount: o.shipment.codAmount,
          handedOverAt: o.shipment.handedOverAt,
          handedOverByName: o.shipment.handedOverByName,
          deliveredAt: o.shipment.deliveredAt,
          returnedAt: o.shipment.returnedAt,
        }
      : undefined,
    calls: [...o.calls].reverse(),
    events: [...o.events].reverse().map((e) => ({
      id: e.id,
      type: e.type,
      fromStatus: e.fromStatus,
      toStatus: e.toStatus,
      content: e.content,
      actorName: e.actorName,
      occurredAt: e.occurredAt,
    })),
    relatedOrders: related,
    returnedCount: returnedCountOf(o.phone, samePhone),
    asOf: new Date(now).toISOString(),
  }
}

// ───────── Kiểm tra chung ─────────

function load(ctx: MockSessionContext, id: string): OrderRecord {
  const order = ordersDb.get(id)
  if (!order) throw salesProblem(404, 'KhongTimThayDon', 'Không tìm thấy đơn hàng')
  if (!inScope(ctx, order)) {
    throw salesProblem(
      403,
      'DonCuaNguoiKhac',
      `Đơn đang do ${order.assigneeName ?? 'người khác'} phụ trách`
    )
  }
  return order
}

function checkVersion(order: OrderRecord, version: number | undefined) {
  if (version !== order.version) {
    throw salesProblem(409, 'DonDaThayDoi', 'Đơn đã thay đổi, vui lòng tải lại', {
      order: toDetail(order),
    })
  }
}

function save(order: OrderRecord): OrderDetailDto {
  ordersDb.update(order.id, () => order)
  return toDetail(order)
}

/** Lưu đơn đã hủy và tính lại nhãn Trùng các đơn cùng số (§3.10, quyết định 15) */
function saveCancelled(order: OrderRecord, at: string): OrderDetailDto {
  return mockDb.batch(() => {
    ordersDb.update(order.id, () => order)
    const samePhone = ordersDb.filter((x) => x.phone === order.phone)
    for (const changed of recomputeDuplicatesAfterCancel(samePhone, at)) {
      ordersDb.update(changed.id, () => changed)
    }
    return toDetail(ordersDb.get(order.id)!)
  })
}

function activeCombo(id: string): ComboRecord | undefined {
  const combo = combosDb.get(id)
  return combo && !combo.isDeleted ? combo : undefined
}

/**
 * Áp sửa đơn (BR-13; 07 §2.5 Sửa đơn): đổi combo, số lượng thì tính lại theo PriceType đã chốt và giá hiện tại;
 * không đổi thì giữ UnitPrice đã chụp. Trả bản ghi mới (chưa lưu) kèm sự kiện SuaDon nếu có thay đổi.
 */
function applyChanges(
  order: OrderRecord,
  changes: OrderChanges,
  actor: Actor,
  at: string
): OrderRecord {
  return applyOrderChanges(order, changes, checkChanges(order, changes), actor, at)
}

/** Kiểm dữ liệu sửa đơn, trả combo mới (07 §2.5 Sửa đơn): combo đang ẩn chỉ giữ được nếu là combo hiện tại */
function checkChanges(order: OrderRecord, changes: OrderChanges): ComboRecord {
  const errors = validateOrderChanges(changes)
  const combo = changes.comboId ? activeCombo(changes.comboId) : undefined
  if (!errors.comboId && (!combo || (!combo.isVisible && combo.id !== order.comboId))) {
    errors.comboId = 'Combo không còn bán'
  }
  if (Object.keys(errors).length) throw fieldErrors(errors)
  return combo!
}

// ───────── Danh sách ─────────

type Filters = Omit<OrderQuery, 'page' | 'pageSize' | 'sortBy' | 'sortDir' | 'status'>

const truthy = (v: unknown) => v === true || v === 'true'

function matchFilters(o: OrderRecord, f: Filters, now: number): boolean {
  if ((f.from || f.to) && !inVnRange(o.placedAt, f.from, f.to)) return false
  if (f.comboId && o.comboId !== f.comboId) return false
  if (f.source && o.source !== f.source) return false
  if (f.assigneeId) {
    if (f.assigneeId === 'unassigned' ? !!o.assigneeId : o.assigneeId !== f.assigneeId) return false
  }
  if (f.tag && !tagsOf(o, now).includes(f.tag)) return false
  if (f.confirmedById && o.confirmedById !== f.confirmedById) return false
  if (truthy(f.upsellOnly) && !(o.upsellAmount > 0)) return false
  if (f.search) {
    const raw = f.search.trim()
    const digits = raw.replace(/[\s.\-()]/g, '')
    const key = normalizeVi(raw)
    const hit =
      (/^\+?\d+$/.test(digits) && o.phone.includes(digits.replace(/^\+?84/, '0'))) ||
      o.code.toLowerCase().includes(raw.toLowerCase()) ||
      normalizeVi(o.customerName).includes(key)
    if (!hit) return false
  }
  return true
}

function filtered(ctx: MockSessionContext, query: OrderQuery) {
  const now = Date.now()
  const { status, ...rest } = query
  const base = ordersDb.filter((o) => inScope(ctx, o) && matchFilters(o, rest, now))
  return { now, base, rows: status ? base.filter((o) => o.status === status) : base }
}

function sortOrders(rows: OrderRecord[], query: OrderQuery, now: number): OrderRecord[] {
  const dir = query.sortDir === 'asc' ? 1 : -1
  if (query.sortBy === 'total') return [...rows].sort((a, b) => (a.total - b.total) * dir)
  if (query.sortBy === 'nextCallAt') {
    return [...rows].sort((a, b) => {
      const va = a.status === 'ChoGoiLai' && a.nextCallAt ? Date.parse(a.nextCallAt) : null
      const vb = b.status === 'ChoGoiLai' && b.nextCallAt ? Date.parse(b.nextCallAt) : null
      if (va === null) return 1
      if (vb === null) return -1
      return (va - vb) * dir
    })
  }
  if (query.sortBy === 'placedAt') {
    return [...rows].sort((a, b) => (Date.parse(a.placedAt) - Date.parse(b.placedAt)) * dir)
  }
  // Mặc định BR-11: đến giờ gọi lại lên đầu (nextCallAt tăng), rồi đặt mới nhất trước
  const due = (o: OrderRecord) =>
    o.status === 'ChoGoiLai' && o.nextCallAt && Date.parse(o.nextCallAt) <= now
      ? Date.parse(o.nextCallAt)
      : null
  return [...rows].sort((a, b) => {
    const da = due(a)
    const db = due(b)
    if (da !== null && db !== null) return da - db
    if (da !== null) return -1
    if (db !== null) return 1
    return Date.parse(b.placedAt) - Date.parse(a.placedAt)
  })
}

function goodsText(o: OrderRecord): string {
  const gift = combosDb.get(o.comboId)?.giftText
  return `${o.comboName} × ${o.quantity} (${o.bottleCount * o.quantity} chai serum${gift ? `, tặng ${gift}` : ''})`
}

// ───────── Handler ─────────

/** Mỗi handler: làm mới theo ngày (07 §4.8) rồi kiểm quyền */
async function begin(...codes: string[]): Promise<MockSessionContext> {
  await mockDelay()
  ensureFreshDay()
  return requirePermission(...codes)
}

const nowIso = () => new Date().toISOString()

export const orderMock = {
  async getList(query: OrderQuery): Promise<OrderListResult> {
    const ctx = await begin(permissions.orders.view)
    const { now, base, rows } = filtered(ctx, query)
    const statusCounts = Object.fromEntries([
      ...ALL_STATUSES.map((s) => [s, base.filter((o) => o.status === s).length]),
      ['TatCa', base.length],
    ]) as OrderStatusCounts
    const page = paginate(sortOrders(rows, query, now), query)
    return { ...page, items: page.items.map((o) => toListItem(o, now)), statusCounts }
  },

  async getById(id: string): Promise<OrderDetailDto> {
    const ctx = await begin(permissions.orders.view)
    return toDetail(load(ctx, id))
  },

  async update(id: string, input: UpdateOrderRequest): Promise<OrderDetailDto> {
    const ctx = await begin(permissions.orders.call)
    const order = load(ctx, id)
    checkVersion(order, input.version)
    if (!CALLABLE.includes(order.status)) {
      throw salesProblem(400, 'KhongSuaDonDaXacNhan', 'Từ Đã xác nhận trở đi chỉ thêm được ghi chú')
    }
    const next = applyChanges(order, input, actorOf(ctx), nowIso())
    if (next === order) return toDetail(order)
    return save({ ...next, version: order.version + 1 })
  },

  /** Ghi kết quả gọi (FR-22, FR-23, BR-10): kiểm theo thứ tự 07 §2.5, áp bằng `applyCallResult` của lõi */
  async recordCall(id: string, input: RecordCallRequest): Promise<OrderDetailDto> {
    const ctx = await begin(permissions.orders.call)
    const order = load(ctx, id)
    checkVersion(order, input.version)
    if (!CALLABLE.includes(order.status)) {
      throw salesProblem(400, 'DonKhongChoGoi', 'Chỉ ghi cuộc gọi cho đơn Mới hoặc Chờ gọi lại')
    }

    const nowMs = Date.now()
    const note = input.note?.trim() || undefined
    const errors: Record<string, string> = {}
    if (!callResultLabels[input.result]) errors.result = 'Chọn kết quả cuộc gọi'
    if (input.result === 'HenGoiLai') {
      const t = input.callbackAt ? Date.parse(input.callbackAt) : NaN
      if (!input.callbackAt) errors.callbackAt = 'Chọn giờ gọi lại'
      else if (!(t > nowMs && t <= nowMs + salesRules.maxCallbackDays * 86_400_000))
        errors.callbackAt = 'Giờ gọi lại phải sau hiện tại và trong 7 ngày tới'
    }
    if (input.result === 'KhachHuy') {
      if (!input.cancelReason) errors.cancelReason = 'Chọn lý do hủy'
      else if (!customerCancelReasons.includes(input.cancelReason))
        errors.cancelReason = 'Lý do không hợp lệ'
      else if (input.cancelReason === 'Khac' && !note) errors.note = 'Nhập ghi chú cho lý do Khác'
    }
    if (note && note.length > salesRules.noteMax) errors.note = 'Ghi chú tối đa 300 ký tự'
    if (input.changes && input.result !== 'XacNhan') errors.changes = 'Chỉ sửa đơn khi xác nhận'
    if (Object.keys(errors).length) throw fieldErrors(errors)
    const newCombo = input.changes ? checkChanges(order, input.changes) : undefined

    const outcome = applyCallResult(
      order,
      {
        result: input.result,
        callbackAt: input.callbackAt,
        cancelReason: input.cancelReason,
        note,
        changes: input.changes,
        newCombo,
      },
      actorOf(ctx),
      nowMs
    )
    return outcome.cancelled
      ? saveCancelled(outcome.order, new Date(nowMs).toISOString())
      : save(outcome.order)
  },

  /** Nhận đơn chưa chia (BR-09); người không phải STAFF vẫn nhận được (quản lý gọi hộ) */
  async claim(id: string): Promise<OrderDetailDto> {
    const ctx = await begin(permissions.orders.call)
    const order = ordersDb.get(id)
    if (!order) throw salesProblem(404, 'KhongTimThayDon', 'Không tìm thấy đơn hàng')
    if (order.assigneeId) {
      if (order.assigneeId === ctx.user.id) return toDetail(order)
      throw salesProblem(409, 'DonDaCoNguoiNhan', `Đơn đã được chia cho ${order.assigneeName}`, {
        order: inScope(ctx, order) ? toDetail(order) : undefined,
      })
    }
    const actor = actorOf(ctx)
    const next = assignOrder(
      order,
      { userId: actor.id, fullName: actor.name },
      'claim',
      nowIso(),
      actor
    )
    return save({ ...next, version: order.version + 1 })
  },

  async cancel(id: string, input: CancelOrderRequest): Promise<OrderDetailDto> {
    const ctx = await begin(permissions.orders.cancel)
    const order = load(ctx, id)
    checkVersion(order, input.version)
    if (SHIPPED.includes(order.status)) {
      throw salesProblem(400, 'KhongHuyDonDaBanGiao', 'Không thể hủy đơn đã bàn giao vận chuyển')
    }
    if (order.status === 'DaHuy') throw salesProblem(400, 'DonDaHuy', 'Đơn đã hủy')
    const note = input.note?.trim() || undefined
    const errors: Record<string, string> = {}
    if (!input.reason) errors.reason = 'Chọn lý do hủy'
    else if (!userCancelReasons.includes(input.reason)) errors.reason = 'Lý do không hợp lệ'
    else if (input.reason === 'Khac' && !note) errors.note = 'Nhập ghi chú cho lý do Khác'
    if (note && note.length > salesRules.noteMax) errors.note = 'Ghi chú tối đa 300 ký tự'
    if (Object.keys(errors).length) throw fieldErrors(errors)
    if (input.reason === 'DonTrung' && !order.isDuplicate) {
      throw salesProblem(400, 'KhongPhaiDonTrung', 'Đơn không có nhãn Trùng')
    }
    const actor = actorOf(ctx)
    const at = nowIso()
    return saveCancelled(
      {
        ...order,
        status: 'DaHuy',
        cancelReason: input.reason as CancelReason,
        cancelNote: note,
        cancelledAt: at,
        cancelledById: actor.id,
        cancelledByName: actor.name,
        nextCallAt: undefined,
        version: order.version + 1,
        events: [
          ...order.events,
          evStatus(at, cancelText(input.reason, note), actor, order.status, 'DaHuy'),
        ],
      },
      at
    )
  },

  /** "Không phải trùng" (FR-24, TC-21): bỏ nhãn ở đơn này và mọi đơn cùng số đang mang nhãn trong 24 giờ */
  async notDuplicate(id: string, input: VersionRequest): Promise<OrderDetailDto> {
    const ctx = await begin(permissions.orders.call)
    const order = load(ctx, id)
    checkVersion(order, input.version)
    if (!order.isDuplicate) throw salesProblem(400, 'KhongPhaiDonTrung', 'Đơn không có nhãn Trùng')
    const actor = actorOf(ctx)
    const at = nowIso()
    return mockDb.batch(() => {
      const targets = ordersDb.filter(
        (o) =>
          o.phone === order.phone &&
          o.isDuplicate &&
          (o.id === order.id || isWithinDuplicateWindow(o.placedAt, order.placedAt))
      )
      for (const t of targets) {
        ordersDb.update(t.id, (cur) => ({
          ...cur,
          isDuplicate: false,
          duplicateCleared: true,
          version: cur.version + 1,
          events: [...cur.events, evTag(at, tagTexts.notDuplicate, actor)],
        }))
      }
      return toDetail(ordersDb.get(order.id)!)
    })
  },

  /** Đã giao (FR-26, BR-19: doanh thu tính ngày giao) */
  async deliver(id: string, input: VersionRequest): Promise<OrderDetailDto> {
    const ctx = await begin(permissions.orders.ship)
    const order = load(ctx, id)
    checkVersion(order, input.version)
    if (order.status !== 'DangGiao' || !order.shipment) {
      throw salesProblem(400, 'DonChuaBanGiao', 'Đơn chưa ở trạng thái Đang giao')
    }
    const at = nowIso()
    return save({
      ...order,
      status: 'DaGiao',
      shipment: { ...order.shipment, deliveredAt: at },
      version: order.version + 1,
      events: [
        ...order.events,
        evStatus(at, 'Giao thành công', actorOf(ctx), 'DangGiao', 'DaGiao'),
      ],
    })
  },

  /** Hoàn hàng (FR-26, BR-18) */
  async returnOrder(id: string, input: ReturnOrderRequest): Promise<OrderDetailDto> {
    const ctx = await begin(permissions.orders.ship)
    const order = load(ctx, id)
    checkVersion(order, input.version)
    if (order.status !== 'DangGiao' || !order.shipment) {
      throw salesProblem(400, 'DonChuaBanGiao', 'Đơn chưa ở trạng thái Đang giao')
    }
    const note = input.note?.trim() || undefined
    const errors: Record<string, string> = {}
    if (!input.reason || !returnReasonLabels[input.reason]) errors.reason = 'Chọn lý do hoàn hàng'
    else if (input.reason === 'Khac' && !note) errors.note = 'Nhập ghi chú cho lý do Khác'
    if (note && note.length > salesRules.noteMax) errors.note = 'Ghi chú tối đa 300 ký tự'
    if (Object.keys(errors).length) throw fieldErrors(errors)
    const at = nowIso()
    return save({
      ...order,
      status: 'HoanHang',
      returnReason: input.reason as ReturnReason,
      returnNote: note,
      shipment: { ...order.shipment, returnedAt: at },
      version: order.version + 1,
      events: [
        ...order.events,
        evStatus(at, returnText(input.reason, note), actorOf(ctx), 'DangGiao', 'HoanHang'),
      ],
    })
  },

  /** Ghi chú mọi trạng thái (BR-13, quyết định 34) */
  async addNote(id: string, input: AddNoteRequest): Promise<OrderDetailDto> {
    const ctx = await begin(permissions.orders.view)
    const order = load(ctx, id)
    const content = input.content?.trim() ?? ''
    if (!content) throw fieldErrors({ content: 'Nhập nội dung ghi chú' })
    if (content.length > salesRules.noteMax)
      throw fieldErrors({ content: 'Ghi chú tối đa 300 ký tự' })
    // Ghi chú không đổi dữ liệu đơn nên không tăng version (thao tác khác đang mở vẫn lưu được)
    return save({ ...order, events: [...order.events, evNote(nowIso(), content, actorOf(ctx))] })
  },

  /** Bàn giao vận chuyển (FR-25, BR-17; UC-07) */
  async handover(input: HandoverRequest): Promise<HandoverResult> {
    const ctx = await begin(permissions.orders.ship)
    const errors: Record<string, string> = {}
    if (!input.carrier || !carrierLabels[input.carrier as Carrier])
      errors.carrier = 'Chọn đơn vị vận chuyển'
    const ids = [...new Set(input.orderIds ?? [])]
    if (!ids.length) errors.orderIds = 'Chọn ít nhất 1 đơn'
    else if (ids.length > 100) errors.orderIds = 'Tối đa 100 đơn mỗi lần'
    if (Object.keys(errors).length) throw fieldErrors(errors)

    const targets = ids
      .map((id) => ordersDb.get(id))
      .filter((o): o is OrderRecord => !!o && inScope(ctx, o) && o.status === 'DaXacNhan')
    if (!targets.length) {
      throw salesProblem(400, 'KhongCoDonBanGiao', 'Không có đơn nào ở trạng thái Đã xác nhận')
    }
    const actor = actorOf(ctx)
    const nowMs = Date.now()
    const at = new Date(nowMs).toISOString()
    const codes = ordersDb.filter((o) => !!o.shipment).map((o) => o.shipment!.trackingCode)
    mockDb.batch(() => {
      for (const o of targets) {
        const code = trackingCode(input.carrier, nowMs, codes)
        codes.push(code)
        ordersDb.update(o.id, (cur) => ({
          ...cur,
          status: 'DangGiao',
          shipment: {
            carrier: input.carrier,
            trackingCode: code,
            codAmount: cur.total,
            handedOverAt: at,
            handedOverById: actor.id,
            handedOverByName: actor.name,
          },
          version: cur.version + 1,
          events: [...cur.events, evHandover(at, input.carrier, code, cur.total, actor)],
        }))
      }
    })
    const skippedOrderIds = ids.filter((id) => !targets.some((t) => t.id === id))
    const n = targets.length
    const m = skippedOrderIds.length
    return {
      handedOver: n,
      skipped: m,
      skippedOrderIds,
      message: m
        ? `Đã bàn giao ${n} đơn, bỏ qua ${m} đơn không ở trạng thái Đã xác nhận`
        : `Đã bàn giao ${n} đơn`,
    }
  },

  /** Chia lại (FR-20, TC-24): không đổi LastAssignedAt (quyết định 23) */
  async reassign(input: ReassignRequest): Promise<ReassignResult> {
    const ctx = await begin(permissions.orders.assign)
    const errors: Record<string, string> = {}
    const target = activeTelesales().find((t) => t.userId === input.assigneeId)
    if (!target) errors.assigneeId = 'Chọn telesale'
    const ids = [...new Set(input.orderIds ?? [])]
    if (!ids.length) errors.orderIds = 'Chọn ít nhất 1 đơn'
    if (Object.keys(errors).length) throw fieldErrors(errors)

    const actor = actorOf(ctx)
    const at = nowIso()
    let reassigned = 0
    mockDb.batch(() => {
      for (const id of ids) {
        const o = ordersDb.get(id)
        if (
          !o ||
          ['DaGiao', 'HoanHang', 'DaHuy'].includes(o.status) ||
          o.assigneeId === target!.userId
        )
          continue
        reassigned++
        ordersDb.update(id, (cur) => ({
          ...assignOrder(cur, target!, 'reassign', at, actor),
          version: cur.version + 1,
        }))
      }
    })
    const skipped = ids.length - reassigned
    return {
      reassigned,
      skipped,
      message: `Đã chia lại ${reassigned} đơn cho ${target!.fullName}${skipped ? `, bỏ qua ${skipped} đơn` : ''}`,
    }
  },

  async exportRows(query: OrderQuery): Promise<OrderExportRow[]> {
    const ctx = await begin(permissions.orders.export)
    const { now, rows } = filtered(ctx, query)
    return sortOrders(rows, query, now)
      .slice(0, 5000)
      .map((o) => ({
        code: o.code,
        customerName: o.customerName,
        phone: o.phone,
        address: o.address,
        province: o.province,
        goods: goodsText(o),
        codAmount: o.shipment?.codAmount ?? o.total,
        note: o.note,
      }))
  },
}
