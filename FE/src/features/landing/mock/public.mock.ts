import { salesMessages, salesRules } from '@/config/sales-rules'
import { ApiError } from '@/lib/api-error'
import { mockDelay } from '@/lib/data-source'
import { mockDb } from '@/mock/mock-db'
import { validation } from '@/mock/mock-errors'
import { newId, paginate } from '@/mock/mock-helpers'
import { getSettingsMap } from '@/mock/system-data'
import type {
  ConversionEventType,
  LandingPageDto,
  OrderRecord,
  PlacedOrderSummary,
  PlaceOrderRequest,
  PlaceOrderResult,
  PublicPromotion,
  PublicReview,
  RecentOrderNotice,
  RecordVisitRequest,
  RecordVisitResult,
  TrackEventRequest,
  VisitRecord,
} from '@/types/landing'
import type { PaginatedResult } from '@/types/api'
import { normalizeAttribution, resolveAttribution, sameSourceCampaign } from '@/features/sales/lib/attribution'
import { evCreated, evSms, evTag, pixelCall, tagTexts } from '@/features/sales/lib/order-events'
import { applyDuplicateTagsOnCreate, assignOrder, isReturnRisk, nextOrderCode, pickAssignee } from '@/features/sales/lib/order-rules'
import { orderAmounts } from '@/features/sales/lib/pricing'
import { normalizePhone } from '@/features/sales/lib/phone'
import { normalizeName, validateOrderInput } from '@/features/sales/lib/order-validation'
import { priceTypeAt, toPublicPromotion } from '@/features/sales/lib/promotion'
import { isOutsideWorkingHours } from '@/features/sales/lib/vn-time'
import {
  activeTelesales,
  addConversionEvent,
  bumpVisitStat,
  ensureFreshDay,
  ordersDb,
  telesaleStatesDb,
  visitsDb,
} from '@/features/sales/mock/sales.store'
import { buildLandingPage, toPublicReview } from '../lib/landing-mapper'
import { serverNow, syncServerClock } from '../lib/server-clock'
import { combosDb, getProduct, getPromotion, blocksDb, reviewsDb, sortedReviews } from './landing.store'

/**
 * Handler mock của API công khai `/api/public/*` (07 §2.1, §4.8): không kiểm quyền, không đọc phiên đăng nhập;
 * áp đúng thứ tự kiểm tra đặt hàng, câu lỗi 07 §2.8. "Giờ máy chủ" = route `/server-time` của Next.
 * Không giả lập 429 `QuaNhieuYeuCau` (chỉ BE).
 */

async function prepare(): Promise<number> {
  await syncServerClock()
  const now = serverNow()
  ensureFreshDay(now)
  return now
}

const iso = (ms: number) => new Date(ms).toISOString()

function problem(status: number, code: string, detail: string, extra: Record<string, unknown> = {}): ApiError {
  return ApiError.fromStatus(status, detail, { code, ...extra })
}

function toSummary(order: OrderRecord): PlacedOrderSummary {
  return {
    code: order.code,
    placedAt: order.placedAt,
    customerName: order.customerName,
    phone: order.phone,
    province: order.province,
    address: order.address,
    comboName: order.comboName,
    quantity: order.quantity,
    priceType: order.priceType,
    unitPrice: order.unitPrice,
    subtotal: order.subtotal,
    shippingFee: order.shippingFee,
    total: order.total,
    outsideWorkingHours: isOutsideWorkingHours(order.placedAt, salesRules.workingHourStart, salesRules.workingHourEnd),
  }
}

/** Lượt còn hiệu lực (LastSeenAt trong 30 phút) gần nhất của visitorId */
function activeVisit(visitorId: string, now: number): VisitRecord | undefined {
  const since = now - salesRules.visitTimeoutMinutes * 60_000
  return visitsDb
    .filter((v) => v.visitorId === visitorId && new Date(v.lastSeenAt).getTime() >= since)
    .sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt))[0]
}

function recordConversion(type: ConversionEventType, visit: VisitRecord | undefined, at: string, extra: Partial<{ orderId: string; orderCode: string; value: number; visitorId: string; source: string; campaign: string }> = {}) {
  const source = visit?.source ?? extra.source ?? 'direct'
  addConversionEvent({
    id: newId(),
    type,
    occurredAt: at,
    source,
    campaign: visit?.campaign ?? extra.campaign,
    orderCode: extra.orderCode,
    value: extra.value,
    pixelCall: pixelCall(type, source, extra.value, extra.orderCode),
    visitorId: visit?.visitorId ?? extra.visitorId,
    visitId: visit?.id,
    orderId: extra.orderId,
  })
}

function currentLanding(now: number): LandingPageDto {
  return buildLandingPage(
    {
      product: getProduct(),
      combos: combosDb.all(),
      promotion: getPromotion(),
      blocks: blocksDb.all(),
      reviews: reviewsDb.all(),
      settings: getSettingsMap(),
    },
    now
  )
}

export const publicMock = {
  async landing(): Promise<LandingPageDto> {
    const now = await prepare()
    await mockDelay(80, 160)
    return currentLanding(now)
  },

  async promotion(): Promise<PublicPromotion> {
    const now = await prepare()
    await mockDelay(60, 120)
    return toPublicPromotion(getPromotion(), now)
  },

  async reviews(page = 1, pageSize: number = salesRules.reviewPageSize): Promise<PaginatedResult<PublicReview>> {
    await prepare()
    await mockDelay(150, 300)
    return paginate(
      sortedReviews()
        .filter((r) => r.isVisible)
        .map(toPublicReview),
      { page, pageSize }
    )
  },

  /** Gom lượt (BR-08, 07 §3.2): cùng visitorId trong 30 phút và không có UTM mới khác nguồn/chiến dịch → cùng lượt */
  async recordVisit(request: RecordVisitRequest): Promise<RecordVisitResult> {
    const now = await prepare()
    const at = iso(now)
    const hasUtm = !!request.utmSource?.trim()
    const attribution = resolveAttribution({
      ...request,
      landingHost: typeof window !== 'undefined' ? window.location.host : undefined,
    })
    const current = activeVisit(request.visitorId, now)
    if (current && (!hasUtm || sameSourceCampaign(attribution, current))) {
      visitsDb.update(current.id, { lastSeenAt: at })
      return {
        visitId: current.id,
        isNewVisit: false,
        attribution: normalizeAttribution({
          source: current.source,
          medium: current.medium,
          campaign: current.campaign,
          content: current.adContent,
          referrer: current.referrer,
        }),
        saveAttribution: hasUtm,
      }
    }
    const visit: VisitRecord = {
      id: newId(),
      visitorId: request.visitorId,
      startedAt: at,
      lastSeenAt: at,
      source: attribution.source,
      medium: attribution.medium,
      campaign: attribution.campaign,
      adContent: attribution.content,
      referrer: attribution.referrer,
      device: request.device,
      path: (request.path || '/').split('?')[0].slice(0, 200),
    }
    mockDb.batch(() => {
      visitsDb.insert(visit)
      bumpVisitStat(now, visit.source, visit.campaign)
      recordConversion('PageView', visit, at)
    })
    return { visitId: visit.id, isNewVisit: true, attribution, saveAttribution: hasUtm }
  },

  /** "Bắt đầu điền form" (FR-14): ghi sự kiện pixel, cập nhật LastSeenAt của lượt → 204 */
  async trackEvent(request: TrackEventRequest): Promise<void> {
    const now = await prepare()
    const at = iso(now)
    const visit = (request.visitId && visitsDb.get(request.visitId)) || activeVisit(request.visitorId, now)
    mockDb.batch(() => {
      if (visit) visitsDb.update(visit.id, { lastSeenAt: at })
      recordConversion(request.type, visit, at, { visitorId: request.visitorId })
    })
  },

  /** Đặt hàng (07 §2.1 bảng kiểm tra 1–6, §3.1, §3.4, §3.9, §3.10) */
  async placeOrder(request: PlaceOrderRequest): Promise<PlaceOrderResult> {
    const now = await prepare()
    await mockDelay(300, 600)
    const at = iso(now)
    const orders = ordersDb.all()

    // 1. Gửi lại cùng clientRequestId → đơn cũ
    if (request.clientRequestId) {
      const existing = orders.find((o) => o.clientRequestId === request.clientRequestId)
      if (existing) return { order: toSummary(existing), duplicate: true }
    }

    // 2. Dữ liệu (sau khi chuẩn hóa số điện thoại)
    const phone = normalizePhone(request.phone)
    const errors = validateOrderInput({ ...request, phone })
    const messages = Object.values(errors)
    if (messages.length > 0) {
      throw validation(errors as Record<string, string>, messages.length === 1 ? messages[0] : 'Dữ liệu gửi lên không hợp lệ.')
    }

    // 3. Combo không có, đã xóa, đang ẩn
    const combo = combosDb.get(request.comboId)
    if (!combo || combo.isDeleted || !combo.isVisible) {
      throw problem(400, 'ComboDaThayDoi', salesMessages.comboChanged)
    }

    // 4. Cùng trình duyệt đã đặt trong 60 giây
    const cooldownMs = salesRules.orderCooldownSeconds * 1000
    const lastOfVisitor = orders
      .filter((o) => o.visitorId && o.visitorId === request.visitorId)
      .reduce((max, o) => Math.max(max, new Date(o.placedAt).getTime()), 0)
    if (lastOfVisitor && now - lastOfVisitor < cooldownMs) {
      throw problem(429, 'DatHangQuaNhanh', salesMessages.orderCooldown, {
        retryAfterSeconds: Math.ceil((cooldownMs - (now - lastOfVisitor)) / 1000),
      })
    }

    // 5. Số điện thoại đã có 5 đơn trong 24 giờ
    const dayAgo = now - 24 * 3_600_000
    const samePhone = orders.filter((o) => o.phone === phone)
    if (samePhone.filter((o) => new Date(o.placedAt).getTime() >= dayAgo).length >= salesRules.maxOrdersPerPhonePer24h) {
      throw problem(
        429,
        'QuaNhieuDonCungSo',
        'Số điện thoại này đã đặt nhiều đơn trong 24 giờ, vui lòng gọi hotline để được hỗ trợ'
      )
    }

    // 6. Giá đã đổi so với giá khách đang thấy
    const priceType = priceTypeAt(getPromotion(), now)
    const amounts = orderAmounts(combo, priceType, request.quantity)
    if (request.expectedPrice !== amounts.unitPrice) {
      throw problem(409, 'GiaDaThayDoi', 'Giá combo vừa thay đổi, vui lòng kiểm tra lại tổng tiền', {
        currentPrice: amounts.unitPrice,
        priceType,
      })
    }

    // Tạo đơn
    const attribution = normalizeAttribution(request.attribution)
    const visit = request.visitId ? visitsDb.get(request.visitId) : activeVisit(request.visitorId, now)
    let order: OrderRecord = {
      id: newId(),
      code: nextOrderCode(now, orders.map((o) => o.code)),
      placedAt: at,
      customerName: normalizeName(request.customerName),
      phone,
      province: request.province.trim(),
      address: request.address.trim(),
      note: request.note?.trim() || undefined,
      comboId: combo.id,
      comboCode: combo.code,
      comboName: combo.name,
      bottleCount: combo.bottleCount,
      quantity: request.quantity,
      placedComboId: combo.id,
      placedComboName: combo.name,
      placedQuantity: request.quantity,
      priceType,
      ...amounts,
      placedSubtotal: amounts.subtotal,
      upsellAmount: 0,
      visitorId: request.visitorId,
      visitId: visit?.id,
      source: attribution.source,
      medium: attribution.medium,
      campaign: attribution.campaign,
      adContent: attribution.content,
      referrer: attribution.referrer,
      device: request.device,
      status: 'Moi',
      failedCallCount: 0,
      isDuplicate: false,
      duplicateCleared: false,
      isReturnRisk: false,
      clientRequestId: request.clientRequestId,
      version: 1,
      calls: [],
      events: [evCreated(at, attribution.source, attribution.campaign), evSms(at, 'placed')],
    }

    // Nhãn Trùng, Rủi ro hoàn (§3.10)
    const tagged = applyDuplicateTagsOnCreate(order, samePhone, at)
    order = tagged.order
    if (isReturnRisk(phone, samePhone)) {
      order = { ...order, isReturnRisk: true, events: [...order.events, evTag(at, tagTexts.addReturnRisk)] }
    }

    // Chia đơn (§3.9)
    const states = telesaleStatesDb.all()
    const pick = pickAssignee(phone, samePhone, states, activeTelesales())
    if (pick) order = assignOrder(order, pick, 'auto', at)

    mockDb.batch(() => {
      ordersDb.insert(order)
      tagged.changed.forEach((o) => ordersDb.update(o.id, o))
      if (pick && !pick.bySamePhone) {
        const state = states.find((s) => s.userId === pick.userId)
        if (state) telesaleStatesDb.update(state.id, { lastAssignedAt: at })
      }
      if (visit) visitsDb.update(visit.id, { lastSeenAt: at })
      recordConversion('Purchase', visit, at, {
        orderId: order.id,
        orderCode: order.code,
        value: order.total,
        visitorId: request.visitorId,
        source: attribution.source,
        campaign: attribution.campaign,
      })
    })
    return { order: toSummary(order), duplicate: false }
  },

  /** Tối đa 10 đơn thật trong 48 giờ, khác Đã hủy, chỉ tên gọi (BR-21) */
  async recentOrders(): Promise<RecentOrderNotice[]> {
    const now = await prepare()
    const since = now - salesRules.recentOrderHours * 3_600_000
    return ordersDb
      .filter((o) => o.status !== 'DaHuy' && new Date(o.placedAt).getTime() >= since && new Date(o.placedAt).getTime() <= now)
      .sort((a, b) => b.placedAt.localeCompare(a.placedAt))
      .slice(0, 10)
      .map((o) => ({
        displayName: o.customerName.trim().split(/\s+/).pop() ?? o.customerName,
        province: o.province,
        comboName: o.comboName,
        placedAt: o.placedAt,
      }))
  },
}
