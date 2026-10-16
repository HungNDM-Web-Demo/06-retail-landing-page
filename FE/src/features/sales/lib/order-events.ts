import {
  callResultLabels,
  cancelReasonLabels,
  carrierLabels,
  returnReasonLabels,
  sourceLabel,
} from '@/config/landing-labels'
import { salesMessages } from '@/config/sales-rules'
import { newId } from '@/mock/mock-helpers'
import type {
  CallResult,
  CancelReason,
  Carrier,
  ConversionEventType,
  OrderEventRecord,
  OrderEventType,
  OrderStatus,
  ReturnReason,
} from '@/types/landing'
import { moneyText } from './pricing'
import { formatVnTime, formatVnTimeDay } from './vn-time'

/**
 * Dựng sự kiện dòng thời gian đơn đúng câu 07 §3.8 (BE `OrderEventTexts`) và câu lệnh pixel giả lập.
 * `actor` vắng = Hệ thống. Id sinh ngẫu nhiên; seed tự gán lại id cố định.
 */

export type Actor = { id: string; name: string }

type EventOptions = { at: string; actor?: Actor | null; from?: OrderStatus; to?: OrderStatus }

function makeEvent(type: OrderEventType, content: string, opts: EventOptions): OrderEventRecord {
  const event: OrderEventRecord = { id: newId(), type, content, occurredAt: opts.at }
  if (opts.actor) {
    event.actorId = opts.actor.id
    event.actorName = opts.actor.name
  }
  if (opts.from !== undefined && opts.to !== undefined && opts.from !== opts.to) {
    event.fromStatus = opts.from
    event.toStatus = opts.to
  }
  return event
}

// ───────────────────────── Câu ─────────────────────────

/** "Khách đặt hàng trên landing, nguồn Facebook, chiến dịch serum_t10" */
export const createdText = (source: string, campaign?: string | null): string =>
  `Khách đặt hàng trên landing, nguồn ${sourceLabel(source)}${campaign ? `, chiến dịch ${campaign}` : ''}`

/** "Hủy đơn: Khách đổi ý" (+ ": ghi chú") */
export const cancelText = (reason: CancelReason, note?: string | null): string =>
  `Hủy đơn: ${cancelReasonLabels[reason]}${note ? `: ${note}` : ''}`

/** "Hoàn hàng: Sai địa chỉ" (+ ": ghi chú") */
export const returnText = (reason: ReturnReason, note?: string | null): string =>
  `Hoàn hàng: ${returnReasonLabels[reason]}${note ? `: ${note}` : ''}`

/** "Bàn giao GHTK, mã vận đơn GHTK2610124587, thu hộ 740.000 ₫" */
export const handoverText = (carrier: Carrier, trackingCode: string, codAmount: number): string =>
  `Bàn giao ${carrierLabels[carrier]}, mã vận đơn ${trackingCode}, thu hộ ${moneyText(codAmount)}`

export type CallTextInput = {
  result: CallResult
  /** Lần không liên lạc được thứ mấy (KhongNgheMay, ThueBao) */
  attempt?: number
  /** Giờ hẹn gọi lại (tự đặt +2 giờ hoặc HenGoiLai) */
  callbackAt?: string
  cancelReason?: CancelReason
  note?: string | null
  upsell?: number
}

/** Câu sự kiện `CuocGoi` (07 §3.7); ghi chú nối " · {ghi chú}" (Khách hủy nối ": {ghi chú}") */
export function callText(input: CallTextInput): string {
  const note = input.note?.trim()
  let text: string
  switch (input.result) {
    case 'XacNhan':
      text = input.upsell && input.upsell > 0 ? `Xác nhận · Upsell +${moneyText(input.upsell)}` : 'Xác nhận'
      break
    case 'KhongNgheMay':
    case 'ThueBao': {
      const label = callResultLabels[input.result]
      text =
        (input.attempt ?? 1) >= 3
          ? `${label} (lần ${input.attempt}), hủy vì không liên lạc được`
          : `${label} (lần ${input.attempt ?? 1}), hẹn gọi lại ${input.callbackAt ? formatVnTime(input.callbackAt) : ''}`.trim()
      break
    }
    case 'HenGoiLai':
      text = `Hẹn gọi lại lúc ${input.callbackAt ? formatVnTimeDay(input.callbackAt) : ''}`.trim()
      break
    case 'SaiSo':
      text = 'Sai số điện thoại'
      break
    case 'KhachHuy':
      return `Khách hủy: ${input.cancelReason ? cancelReasonLabels[input.cancelReason] : ''}${note ? `: ${note}` : ''}`
  }
  return note ? `${text} · ${note}` : text
}

// ───────────────────────── Sự kiện ─────────────────────────

/** `TaoDon` (người = Hệ thống, ToStatus = Mới) */
export const evCreated = (at: string, source: string, campaign?: string | null): OrderEventRecord => ({
  ...makeEvent('TaoDon', createdText(source, campaign), { at }),
  toStatus: 'Moi',
})

/** `TinNhan`: lúc đặt "Đã gửi SMS xác nhận (giả lập)", lúc xác nhận "Đơn đã được xác nhận (SMS giả lập)" */
export const evSms = (at: string, kind: 'placed' | 'confirmed'): OrderEventRecord =>
  makeEvent('TinNhan', kind === 'placed' ? salesMessages.smsSent : salesMessages.orderConfirmedSms, { at })

/**
 * `ChiaDon`: tự chia, chia lại "Chia cho {họ tên}" (actor = quản lý khi chia lại, vắng khi tự chia);
 * nhận đơn "{họ tên} nhận đơn" (actor = người nhận).
 */
export const evAssigned = (
  at: string,
  assigneeName: string,
  mode: 'auto' | 'reassign' | 'claim',
  actor?: Actor | null
): OrderEventRecord =>
  makeEvent('ChiaDon', mode === 'claim' ? `${assigneeName} nhận đơn` : `Chia cho ${assigneeName}`, {
    at,
    actor: mode === 'auto' ? null : actor,
  })

/** `CuocGoi` với câu đã dựng bằng `callText` */
export const evCall = (
  at: string,
  content: string,
  actor: Actor,
  from?: OrderStatus,
  to?: OrderStatus
): OrderEventRecord => makeEvent('CuocGoi', content, { at, actor, from, to })

/** `SuaDon`: "Sửa đơn: " + các phần nối "; " */
export const evEdited = (at: string, parts: string[], actor?: Actor | null): OrderEventRecord =>
  makeEvent('SuaDon', `Sửa đơn: ${parts.join('; ')}`, { at, actor })

/** `DoiTrangThai`: "Hủy đơn: …", "Giao thành công", "Hoàn hàng: …" */
export const evStatus = (
  at: string,
  content: string,
  actor: Actor | null | undefined,
  from: OrderStatus,
  to: OrderStatus
): OrderEventRecord => makeEvent('DoiTrangThai', content, { at, actor, from, to })

/** `BanGiao` (Đã xác nhận → Đang giao) */
export const evHandover = (
  at: string,
  carrier: Carrier,
  trackingCode: string,
  codAmount: number,
  actor: Actor | null | undefined,
  from: OrderStatus = 'DaXacNhan'
): OrderEventRecord =>
  makeEvent('BanGiao', handoverText(carrier, trackingCode, codAmount), { at, actor, from, to: 'DangGiao' })

/** Câu nhãn (07 §3.8) */
export const tagTexts = {
  addDuplicate: 'Gắn nhãn Trùng',
  addReturnRisk: 'Gắn nhãn Rủi ro hoàn',
  removeDuplicate: 'Bỏ nhãn Trùng',
  notDuplicate: 'Bỏ nhãn Trùng: không phải đơn trùng',
} as const

/** `Nhan` */
export const evTag = (at: string, text: string, actor?: Actor | null): OrderEventRecord =>
  makeEvent('Nhan', text, { at, actor })

/** `GhiChu` */
export const evNote = (at: string, content: string, actor: Actor): OrderEventRecord =>
  makeEvent('GhiChu', content, { at, actor })

// ───────────────────────── Pixel giả lập ─────────────────────────

const PIXEL_NAMES: Record<'tiktok' | 'google' | 'facebook', Record<ConversionEventType, string>> = {
  tiktok: { PageView: 'ViewContent', StartForm: 'InitiateCheckout', Purchase: 'CompletePayment' },
  google: { PageView: 'page_view', StartForm: 'begin_checkout', Purchase: 'purchase' },
  facebook: { PageView: 'PageView', StartForm: 'InitiateCheckout', Purchase: 'Purchase' },
}

/**
 * Câu mô phỏng lệnh pixel theo nguồn của lượt (07 §3.8): tiktok → ttq.track, google → gtag, khác → fbq.
 * `value` (tổng tiền) chỉ với đặt hàng; google kèm `transaction_id` = mã đơn.
 */
export function pixelCall(type: ConversionEventType, source: string, value?: number, orderCode?: string): string {
  const params: string[] = []
  if (value !== undefined) params.push(`value: ${Math.round(value)}`, "currency: 'VND'")
  if (source === 'tiktok') {
    const name = PIXEL_NAMES.tiktok[type]
    return params.length ? `ttq.track('${name}', { ${params.join(', ')} })` : `ttq.track('${name}')`
  }
  if (source === 'google') {
    const name = PIXEL_NAMES.google[type]
    if (orderCode && value !== undefined) params.push(`transaction_id: '${orderCode}'`)
    return params.length ? `gtag('event', '${name}', { ${params.join(', ')} })` : `gtag('event', '${name}')`
  }
  const name = PIXEL_NAMES.facebook[type]
  return params.length ? `fbq('track', '${name}', { ${params.join(', ')} })` : `fbq('track', '${name}')`
}
