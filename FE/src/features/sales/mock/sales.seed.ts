import demoData from '@/mock/seed/demo-data.json'
import { stableId } from '@/mock/mock-helpers'
import { systemSeed } from '@/mock/system-seed'
import { buildCatalogSeed } from '@/features/landing/mock/landing.seed'
import { sourceFromHost } from '../lib/attribution'
import { type Actor, cancelText, evCreated, evHandover, evSms, evStatus, evTag, returnText, tagTexts } from '../lib/order-events'
import { applyCallResult, applyOrderChanges, assignOrder, nextOrderCode, seedTrackingCode } from '../lib/order-rules'
import { orderAmounts } from '../lib/pricing'
import { addDaysKey, hourStartIso, vnClock, vnDateKey } from '../lib/vn-time'
import type {
  AdCostRecord,
  CallResult,
  CancelReason,
  Carrier,
  ComboRecord,
  DeviceType,
  OrderRecord,
  ReturnReason,
  TelesaleStateRecord,
  VisitStatRecord,
} from '@/types/landing'

/**
 * Suy ra đơn, cuộc gọi, sự kiện, vận đơn, trạng thái telesale, chi phí quảng cáo, lượt truy cập gộp từ
 * `demo-data.json` theo đúng quy tắc 06 §5.3–§5.5 (giống seeder BE). Hàm thuần, cache theo `anchor`.
 */

type RawCall = [number, 'XN' | 'KNM' | 'TB' | 'SS' | 'HGL' | 'KH', (number | string)?, string?]
type RawOrder = {
  d?: number
  t: string | number
  n: string
  p: string
  pv: string
  a: string
  nt?: string
  cb: string
  q: number
  pt?: 'T'
  u?: (string | null)[]
  rf?: string
  dv?: 'B' | 'M'
  as?: string
  cl?: RawCall[]
  ch?: [string, number]
  x?: [CancelReason, number, string?]
  sh?: [Carrier, number]
  dl?: number
  rt?: [ReturnReason, number, string?]
  tg?: ('T' | 'R')[]
}
type RawVisitHistory = { d: number; s: string; c: string; h: number[] }
type RawVisitToday = { s: string; c: string; r: number[] }
type RawData = {
  telesales: { username: string; isReceiving: boolean }[]
  orders: RawOrder[]
  visitStats: (RawVisitHistory | RawVisitToday)[]
  adCosts: [number, string, string, number][]
}

const raw = demoData as unknown as RawData

const MINUTE_MS = 60_000
const CALL_CODES: Record<RawCall[1], CallResult> = {
  XN: 'XacNhan',
  KNM: 'KhongNgheMay',
  TB: 'ThueBao',
  SS: 'SaiSo',
  HGL: 'HenGoiLai',
  KH: 'KhachHuy',
}
const DEVICES: Record<string, DeviceType> = { B: 'MayTinhBang', M: 'MayTinh' }

export const userIdOf = (username: string) => stableId('user', username)
export const telesaleStateIdOf = (username: string) => stableId('telesale', username)

const fullNameOf = (username: string): string =>
  systemSeed.users.find((u) => u.username === username)?.fullName ?? username

export const actorOf = (username: string): Actor => ({ id: userIdOf(username), name: fullNameOf(username) })

export type SalesSeed = {
  orders: OrderRecord[]
  telesaleStates: TelesaleStateRecord[]
  adCosts: AdCostRecord[]
}

let cache: { anchor: number; data: SalesSeed } | null = null

export function buildSalesSeed(anchor: number): SalesSeed {
  if (cache?.anchor === anchor) return cache.data
  const today = vnDateKey(anchor)
  const combos = new Map<string, ComboRecord>(buildCatalogSeed(anchor).combos.map((c) => [c.code, c]))

  // 1. Giờ đặt, rồi mã đơn theo (PlacedAt, chỉ số trong file), đánh số trong từng ngày giờ VN
  const placed = raw.orders.map((o, index) => {
    const ms = o.d !== undefined ? vnClock(addDaysKey(today, o.d), String(o.t)) : anchor + Number(o.t) * MINUTE_MS
    return { raw: o, index, ms }
  })
  const codes = new Map<number, string>()
  const used: string[] = []
  ;[...placed]
    .sort((a, b) => a.ms - b.ms || a.index - b.index)
    .forEach((p) => {
      const code = nextOrderCode(p.ms, used)
      used.push(code)
      codes.set(p.index, code)
    })

  const orders = placed.map((p) => buildOrder(p.raw, p.index, p.ms, codes.get(p.index)!, combos))

  // 2. Trạng thái telesale: LastAssignedAt = AssignedAt lớn nhất của đơn người đó phụ trách
  const telesaleStates: TelesaleStateRecord[] = raw.telesales.map((t) => {
    const userId = userIdOf(t.username)
    const last = orders
      .filter((o) => o.assigneeId === userId && o.assignedAt)
      .reduce<string | undefined>((max, o) => (!max || o.assignedAt! > max ? o.assignedAt : max), undefined)
    return { id: telesaleStateIdOf(t.username), userId, isReceiving: t.isReceiving, lastAssignedAt: last }
  })

  // 3. Chi phí quảng cáo
  const stamp = new Date(anchor).toISOString()
  const adCosts: AdCostRecord[] = raw.adCosts.map(([d, source, campaign, amount]) => ({
    id: stableId('ad-cost', d, source, campaign),
    date: addDaysKey(today, d),
    source,
    campaign: campaign ?? '',
    amount,
    updatedAt: stamp,
  }))

  const data = { orders, telesaleStates, adCosts }
  cache = { anchor, data }
  return data
}

function buildOrder(o: RawOrder, index: number, placedMs: number, code: string, combos: Map<string, ComboRecord>): OrderRecord {
  const placedAt = new Date(placedMs).toISOString()
  const at = (minutes: number) => new Date(placedMs + minutes * MINUTE_MS).toISOString()
  const placedCombo = combos.get(o.cb)!
  const priceType = o.pt === 'T' ? 'GiaThuong' : 'KhuyenMai'
  const amounts = orderAmounts(placedCombo, priceType, o.q)
  const u = o.u ?? []
  const source = u[0] ? String(u[0]) : o.rf ? sourceFromHost(o.rf) : 'direct'
  const campaign = u[2] ?? undefined
  const actor = o.as ? actorOf(o.as) : null

  let order: OrderRecord = {
    id: stableId('order', index),
    code,
    placedAt,
    customerName: o.n,
    phone: o.p,
    province: o.pv,
    address: o.a,
    note: o.nt,
    comboId: placedCombo.id,
    comboCode: placedCombo.code,
    comboName: placedCombo.name,
    bottleCount: placedCombo.bottleCount,
    quantity: o.q,
    placedComboId: placedCombo.id,
    placedComboName: placedCombo.name,
    placedQuantity: o.q,
    priceType,
    ...amounts,
    placedSubtotal: amounts.subtotal,
    upsellAmount: 0,
    source,
    medium: u[1] ?? undefined,
    campaign,
    adContent: u[3] ?? undefined,
    referrer: u.length ? undefined : o.rf,
    device: (o.dv && DEVICES[o.dv]) || 'DienThoai',
    status: 'Moi',
    failedCallCount: 0,
    isDuplicate: (o.tg ?? []).includes('T'),
    duplicateCleared: false,
    isReturnRisk: (o.tg ?? []).includes('R'),
    version: 1,
    calls: [],
    events: [evCreated(placedAt, source, campaign), evSms(placedAt, 'placed')],
  }
  for (const tag of o.tg ?? []) {
    order.events.push(evTag(placedAt, tag === 'T' ? tagTexts.addDuplicate : tagTexts.addReturnRisk))
  }
  if (actor) order = assignOrder(order, { userId: actor.id, fullName: actor.name }, 'auto', placedAt)

  // Việc sau khi đặt, theo thứ tự phút (cuộc gọi trước khi trùng phút)
  type Step = { minute: number; rank: number; run: () => void }
  const steps: Step[] = []
  ;(o.cl ?? []).forEach((call, k) => {
    steps.push({
      minute: call[0],
      rank: k,
      run: () => {
        const result = CALL_CODES[call[1]]
        const now = placedMs + call[0] * MINUTE_MS
        const caller = actor ?? actorOf('nhanvien')
        if (result === 'XacNhan' && o.ch) {
          const combo = combos.get(o.ch[0])!
          order = applyOrderChanges(
            order,
            { customerName: order.customerName, province: order.province, address: order.address, comboId: combo.id, quantity: o.ch[1] },
            combo,
            caller,
            new Date(now).toISOString()
          )
        }
        const outcome = applyCallResult(
          order,
          {
            result,
            callbackAt: result === 'HenGoiLai' ? at(Number(call[2])) : undefined,
            cancelReason: result === 'KhachHuy' ? (call[2] as CancelReason) : undefined,
            note: call[3],
          },
          caller,
          now
        )
        order = outcome.order
      },
    })
  })
  if (o.x) {
    const [reason, minute, note] = o.x
    steps.push({
      minute,
      rank: 100,
      run: () => {
        const from = order.status
        order = {
          ...order,
          status: 'DaHuy',
          cancelReason: reason,
          cancelNote: note,
          cancelledAt: at(minute),
          cancelledById: actor?.id,
          cancelledByName: actor?.name,
          nextCallAt: undefined,
          events: [...order.events, evStatus(at(minute), cancelText(reason, note), actor, from, 'DaHuy')],
        }
      },
    })
  }
  if (o.sh) {
    const [carrier, minute] = o.sh
    steps.push({
      minute,
      rank: 101,
      run: () => {
        const trackingCode = seedTrackingCode(carrier, order.code)
        order = {
          ...order,
          status: 'DangGiao',
          shipment: {
            carrier,
            trackingCode,
            codAmount: order.total,
            handedOverAt: at(minute),
            handedOverById: actor?.id ?? '',
            handedOverByName: actor?.name ?? '',
          },
          events: [...order.events, evHandover(at(minute), carrier, trackingCode, order.total, actor, order.status)],
        }
      },
    })
  }
  if (o.dl !== undefined) {
    const minute = o.dl
    steps.push({
      minute,
      rank: 102,
      run: () => {
        order = {
          ...order,
          status: 'DaGiao',
          shipment: order.shipment ? { ...order.shipment, deliveredAt: at(minute) } : order.shipment,
          events: [...order.events, evStatus(at(minute), 'Giao thành công', actor, order.status, 'DaGiao')],
        }
      },
    })
  }
  if (o.rt) {
    const [reason, minute, note] = o.rt
    steps.push({
      minute,
      rank: 103,
      run: () => {
        order = {
          ...order,
          status: 'HoanHang',
          returnReason: reason,
          returnNote: note,
          shipment: order.shipment ? { ...order.shipment, returnedAt: at(minute) } : order.shipment,
          events: [...order.events, evStatus(at(minute), returnText(reason, note), actor, order.status, 'HoanHang')],
        }
      },
    })
  }
  steps.sort((a, b) => a.minute - b.minute || a.rank - b.rank).forEach((s) => s.run())

  // Id cố định cho cuộc gọi, sự kiện; seed luôn Version = 1
  return {
    ...order,
    version: 1,
    calls: order.calls.map((c, k) => ({ ...c, id: stableId('call', index, k) })),
    events: order.events.map((e, k) => ({ ...e, id: stableId('event', index, k) })),
  }
}

// ───────────────────────── Lượt truy cập gộp (06 §5.5) ─────────────────────────

let visitCache: { anchor: number; data: VisitStatRecord[] } | null = null

/**
 * Lượt truy cập lịch sử và hôm nay từ seed (≈ 9.700 dòng giờ), giữ trong bộ nhớ, không ghi localStorage
 * (07 §4.8). Hôm nay: `r[i]` là giờ thứ i tính lùi từ giờ của `anchor`; trùng khóa với lịch sử thì cộng dồn.
 */
export function buildVisitStatSeed(anchor: number): VisitStatRecord[] {
  if (visitCache?.anchor === anchor) return visitCache.data
  const today = vnDateKey(anchor)
  const map = new Map<string, VisitStatRecord>()
  const add = (hourStart: string, source: string, campaign: string, visits: number) => {
    if (visits <= 0) return
    const key = `${hourStart}|${source}|${campaign}`
    const existing = map.get(key)
    if (existing) existing.visits += visits
    else map.set(key, { id: stableId('visit-stat', hourStart, source, campaign), hourStart, source, campaign, visits })
  }
  const currentHour = new Date(hourStartIso(anchor)).getTime()
  for (const row of raw.visitStats) {
    if ('h' in row) {
      const day = addDaysKey(today, row.d)
      row.h.forEach((visits, hour) =>
        add(new Date(vnClock(day, `${hour}:00`)).toISOString(), row.s, row.c ?? '', visits)
      )
    } else {
      row.r.forEach((visits, i) => add(new Date(currentHour - i * 3_600_000).toISOString(), row.s, row.c ?? '', visits))
    }
  }
  const data = [...map.values()]
  visitCache = { anchor, data }
  return data
}
