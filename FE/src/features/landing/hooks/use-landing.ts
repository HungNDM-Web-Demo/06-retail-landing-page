'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { create } from 'zustand'
import { salesRules } from '@/config/sales-rules'
import { detectDevice } from '@/features/sales/lib/attribution'
import type { Attribution, LandingPageDto, PlaceOrderRequest, PublicPromotion } from '@/types/landing'
import {
  getVisitorId,
  initVisitorIndex,
  readStoredAttribution,
  saveAttribution,
  visitorIndex,
} from '../lib/visitor'
import { publicApi } from '../services/public-api'

/** Query key công khai (07 §4.9) */
export const publicKeys = {
  landing: ['public', 'landing'] as const,
  promotion: ['public', 'promotion'] as const,
  reviews: ['public', 'reviews'] as const,
  recentOrders: ['public', 'recent-orders'] as const,
}

/**
 * Landing: máy chủ render sẵn (`initialData`), trình duyệt gọi lại ngay để thấy sửa đổi (07 §4.1);
 * ở mock nghe tab quản trị sửa combo, nội dung, khuyến mãi để làm mới.
 */
export function useLandingPage(initialData: LandingPageDto) {
  const queryClient = useQueryClient()
  useEffect(
    () => publicApi.subscribeChanges(() => void queryClient.invalidateQueries({ queryKey: publicKeys.landing })),
    [queryClient]
  )
  return useQuery({
    queryKey: publicKeys.landing,
    queryFn: publicApi.landing,
    initialData,
    initialDataUpdatedAt: 0,
    refetchOnMount: 'always',
    staleTime: 60_000,
  })
}

// ───────────────────────── Đồng hồ máy chủ, đếm ngược ─────────────────────────

type ClockState = { offset: number; setAsOf: (asOf: string | undefined) => void }

/** now = Date.now() + (asOf − giờ máy lúc nhận) (BR-20, 07 §3.3) */
export const useServerClock = create<ClockState>((set) => ({
  offset: 0,
  setAsOf: (asOf) => {
    if (!asOf) return
    const t = new Date(asOf).getTime()
    if (Number.isFinite(t)) set({ offset: t - Date.now() })
  },
}))

const subscribeNoop = () => () => {}
/** true sau khi hydrate (tránh lệch giữa máy chủ và trình duyệt khi hiện giờ) */
export const useHydrated = () =>
  useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  )

/** Giờ máy chủ (ms), tự cập nhật mỗi `intervalMs` */
export function useServerNow(intervalMs = 1000): number {
  const offset = useServerClock((s) => s.offset)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now + offset
}

/**
 * Trạng thái khuyến mãi mới nhất: gọi lại `GET /api/public/promotion` mỗi 5 phút và khi đồng hồ về 0;
 * khuyến mãi vừa đổi trạng thái thì làm mới landing (giá combo đổi sang giá thường, UC-01 E1).
 */
export function usePromotion(initial: PublicPromotion) {
  const queryClient = useQueryClient()
  const setAsOf = useServerClock((s) => s.setAsOf)
  const query = useQuery({
    queryKey: publicKeys.promotion,
    queryFn: publicApi.promotion,
    initialData: initial,
    initialDataUpdatedAt: 0,
    refetchInterval: 5 * 60_000,
    staleTime: 0,
  })
  const promotion = query.data ?? initial
  useEffect(() => setAsOf(promotion.asOf), [promotion.asOf, setAsOf])

  const lastStatus = useRef(promotion.status)
  useEffect(() => {
    if (lastStatus.current !== promotion.status) {
      lastStatus.current = promotion.status
      void queryClient.invalidateQueries({ queryKey: publicKeys.landing })
    }
  }, [promotion.status, queryClient])

  return { promotion, refetch: query.refetch }
}

// ───────────────────────── Đánh giá ─────────────────────────

/** "Xem thêm" đánh giá: trang 2 trở đi (trang 1 đã có trong landing, FR-08) */
export function useMoreReviews(enabled: boolean) {
  return useInfiniteQuery({
    queryKey: publicKeys.reviews,
    queryFn: ({ pageParam }) => publicApi.reviews(pageParam, salesRules.reviewPageSize),
    initialPageParam: 2,
    getNextPageParam: (last) => (last.hasNextPage ? last.page + 1 : undefined),
    enabled,
    staleTime: 60_000,
  })
}

export function useRecentOrders(enabled: boolean) {
  return useQuery({
    queryKey: publicKeys.recentOrders,
    queryFn: publicApi.recentOrders,
    enabled,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })
}

// ───────────────────────── Lượt truy cập, nguồn (07 §4.3) ─────────────────────────

type VisitState = {
  visitorId?: string
  visitId?: string
  attribution: Attribution
  startFormSent: boolean
  visitor: number
  set: (patch: Partial<Omit<VisitState, 'set'>>) => void
}

export const useVisitStore = create<VisitState>((set) => ({
  attribution: { source: 'direct' },
  startFormSent: false,
  visitor: 1,
  set: (patch) => set(patch),
}))

/** Ghi nhận lượt khi tải trang: UTM trên URL, nguồn lưu 7 ngày, referrer khác tên miền, thiết bị */
export function useVisitTracking(enabled = true) {
  const started = useRef(false)
  useEffect(() => {
    if (!enabled || started.current) return
    started.current = true
    const params = new URLSearchParams(window.location.search)
    const visitor = initVisitorIndex(params)
    const visitorId = getVisitorId()
    const stored = readStoredAttribution()
    let referrer: string | undefined
    try {
      if (document.referrer && new URL(document.referrer).host !== window.location.host) referrer = document.referrer
    } catch {
      referrer = undefined
    }
    const pick = (key: string) => params.get(key)?.trim() || undefined
    const store = useVisitStore.getState()
    store.set({ visitorId, visitor, attribution: stored ?? store.attribution })
    publicApi
      .recordVisit({
        visitorId,
        utmSource: pick('utm_source'),
        utmMedium: pick('utm_medium'),
        utmCampaign: pick('utm_campaign'),
        utmContent: pick('utm_content'),
        storedAttribution: stored,
        referrer,
        device: detectDevice(navigator.userAgent),
        path: window.location.pathname,
      })
      .then((result) => {
        if (result.saveAttribution) saveAttribution(result.attribution)
        useVisitStore.getState().set({ visitId: result.visitId, attribution: result.attribution })
      })
      .catch(() => {
        // Không chặn khách: đơn vẫn gửi được với nguồn đã lưu hoặc "direct"
      })
  }, [enabled])
}

/** Lần đầu chạm vào ô form mỗi lượt → `POST events` StartForm (FR-14) */
export function trackStartForm() {
  const state = useVisitStore.getState()
  if (state.startFormSent || !state.visitorId) return
  state.set({ startFormSent: true })
  void publicApi.trackEvent({ visitorId: state.visitorId, visitId: state.visitId, type: 'StartForm' }).catch(() => {})
}

/** Số "trình duyệt" hiện tại (07 §4.2 `?visitor=N`) */
export const currentVisitor = () => visitorIndex()

// ───────────────────────── Đặt hàng ─────────────────────────

export function usePlaceOrder() {
  return useMutation({
    mutationFn: (request: PlaceOrderRequest) => publicApi.placeOrder(request),
  })
}
