'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { LayoutDashboard, Phone, UserRound } from 'lucide-react'
import { appConfig } from '@/config/app.config'
import { routePath } from '@/config/route-path'
import { useAssetUrl } from '@/hooks/use-asset-url'
import { brandCssVariables } from '@/lib/brand-color'
import type { LandingPageDto, PublicPromotion } from '@/types/landing'
import { currentVisitor, useLandingPage, usePromotion, useVisitTracking } from '../hooks/use-landing'
import { LandingBlocks } from './LandingBlocks'
import { LandingProvider, ORDER_ANCHOR_ID, type LandingContextValue } from './landing-context'
import { RecentOrderToast } from './RecentOrderToast'
import { StickyOrderBar } from './StickyOrderBar'

const newer = (a: PublicPromotion, b: PublicPromotion) => (a.asOf >= b.asOf ? a : b)

/**
 * Landing `/` (SCR-01, SCR-02): khung 480 px giữa màn rộng, màu theo `store.primaryColor`, khối theo `sortOrder`,
 * thanh Đặt hàng cố định, thông báo đơn gần đây, nút "Khu quản trị" khi bật demo (07 §4.2 bước 3).
 */
export function LandingView({ initialData }: { initialData: LandingPageDto }) {
  const { data } = useLandingPage(initialData)
  const page = data ?? initialData
  const { promotion: polled, refetch } = usePromotion(page.promotion)
  const promotion = newer(polled, page.promotion)
  useVisitTracking()

  const scrollToOrder = useCallback(() => {
    document.getElementById(ORDER_ANCHOR_ID)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const context = useMemo<LandingContextValue>(
    () => ({ page, promotion, preview: false, onPromotionExpire: () => void refetch(), scrollToOrder }),
    [page, promotion, refetch, scrollToOrder]
  )
  const brandStyle = useMemo(() => brandCssVariables(page.store.primaryColor) as React.CSSProperties, [page.store.primaryColor])
  const hero = page.blocks.find((b) => b.type === 'Hero')

  return (
    <LandingProvider value={context}>
      <div className="brand-scope min-h-svh bg-[var(--landing-bg)]" style={brandStyle}>
        <div className="relative mx-auto max-w-[480px] bg-[var(--landing-bg)] shadow-[0_0_40px_-20px_color-mix(in_oklab,var(--landing-ink)_40%,transparent)]">
          <LandingHeader page={page} />
          <main>
            <LandingBlocks blocks={page.blocks} />
          </main>
        </div>
        <StickyOrderBar
          minPrice={page.minPricePerBottle}
          unit={page.product.unit}
          label={hero?.ctaText || 'Đặt hàng ngay'}
          onClick={scrollToOrder}
        />
        <RecentOrderToast enabled />
        {appConfig.demoToolbar ? <DemoCorner /> : null}
      </div>
    </LandingProvider>
  )
}

function LandingHeader({ page }: { page: LandingPageDto }) {
  const logo = useAssetUrl(page.store.logoUrl)
  const tel = page.store.hotline.replace(/[^\d+]/g, '')
  return (
    <header className="flex items-center justify-between gap-3 bg-[var(--landing-surface)] px-4 py-2.5 pr-16">
      <span className="flex min-w-0 items-center gap-2">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- logo SVG nhỏ
          <img src={logo} alt="" width={32} height={32} className="size-8 shrink-0" />
        ) : null}
        <span className="truncate text-base font-bold text-[var(--landing-ink)]">{page.store.name}</span>
      </span>
      {page.store.hotline ? (
        <a
          href={`tel:${tel}`}
          className="text-primary inline-flex min-h-11 shrink-0 items-center gap-1.5 text-sm font-semibold"
          aria-label={`Gọi hotline ${page.store.hotline}`}
        >
          <Phone className="size-4" aria-hidden="true" />
          {page.store.hotline}
        </a>
      ) : null}
    </header>
  )
}

/** Nút tròn "Khu quản trị" góc trên phải (mở /login tab mới) + nhãn "Khách N" khi đang giả lập trình duyệt khác */
function DemoCorner() {
  const [visitor, setVisitor] = useState(1)
  useEffect(() => {
    const id = setTimeout(() => setVisitor(currentVisitor()), 0)
    return () => clearTimeout(id)
  }, [])
  return (
    <div className="fixed top-2 right-[max(0.5rem,calc(50vw-232px))] z-40 flex flex-col-reverse items-end gap-1.5">
      {visitor > 1 ? (
        <span className="bg-cta text-cta-foreground inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold shadow">
          <UserRound className="size-3.5" aria-hidden="true" />
          Khách {visitor}
        </span>
      ) : null}
      <a
        href={routePath.login}
        target="_blank"
        rel="noopener"
        className="bg-primary text-primary-foreground flex size-11 items-center justify-center rounded-full shadow-md ring-2 ring-[var(--landing-surface)]"
        aria-label="Khu quản trị (mở tab mới)"
        title="Khu quản trị"
      >
        <LayoutDashboard className="size-5" aria-hidden="true" />
      </a>
    </div>
  )
}
