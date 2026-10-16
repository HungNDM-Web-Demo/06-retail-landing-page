'use client'

import { ArrowDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatNumber, formatVnd } from '@/lib/format'
import type { PublicBlock } from '@/types/landing'
import { Countdown } from '../Countdown'
import { useLandingContext } from '../landing-context'
import { LandingIcon, LandingImage, Stars } from '../landing-ui'

/** Banner chính (FR-04, UC-01 bước 2): ảnh, tiêu đề, "chỉ từ …/chai", đồng hồ đếm ngược, 3 ý ngắn, nút cuộn tới combo */
export function HeroBlock({ block }: { block: PublicBlock }) {
  const { page, promotion, onPromotionExpire, scrollToOrder } = useLandingContext()
  const { reviewSummary, minPricePerBottle, product } = page
  const promoRunning = promotion.status === 'DangChay'

  return (
    <section aria-labelledby="hero-title" className="relative bg-[var(--landing-surface)]">
      <div className="relative">
        <LandingImage
          src={block.imageUrl ?? product.imageUrl}
          alt={product.name}
          width={1080}
          height={1080}
          priority
        />
        <div className="absolute inset-x-0 top-0 px-5 pt-6 text-center">
          {promoRunning ? (
            <p className="bg-primary text-primary-foreground mx-auto mb-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold shadow-sm">
              {promotion.name}
            </p>
          ) : null}
          <h1
            id="hero-title"
            className="mx-auto max-w-[18ch] text-[1.875rem] leading-[1.15] font-bold tracking-tight text-balance text-[var(--landing-ink)]"
          >
            {block.title}
          </h1>
        </div>
      </div>

      <div className="relative z-10 -mt-10 px-4 pb-8">
        <div className="space-y-4 rounded-2xl bg-[var(--landing-surface)] p-5 shadow-[0_8px_30px_-12px_color-mix(in_oklab,var(--landing-ink)_35%,transparent)] ring-1 ring-[var(--landing-soft)]">
          {block.subtitle ? (
            <p className="text-muted-foreground text-center text-[0.9375rem] leading-relaxed text-pretty">{block.subtitle}</p>
          ) : null}

          {minPricePerBottle > 0 ? (
            <p className="text-center text-[var(--landing-ink)]">
              <span className="text-sm">Chỉ từ </span>
              <span className="text-[1.75rem] font-bold text-[var(--landing-price)] tabular-nums">
                {formatVnd(minPricePerBottle)}
              </span>
              <span className="text-sm">/{product.unit}</span>
            </p>
          ) : null}

          {promoRunning ? (
            <div className="bg-primary text-primary-foreground rounded-xl px-3 py-3">
              <Countdown promotion={promotion} onExpire={onPromotionExpire} />
            </div>
          ) : null}

          <Button
            variant="cta"
            className="h-14 w-full rounded-xl text-base font-bold shadow-md"
            onClick={scrollToOrder}
          >
            {block.ctaText || 'Đặt hàng ngay'}
            <ArrowDown className="size-5" aria-hidden="true" />
          </Button>

          {reviewSummary.total > 0 ? (
            <p className="text-muted-foreground flex items-center justify-center gap-2 text-sm">
              <Stars rating={reviewSummary.average} />
              <span>
                <span className="text-foreground font-semibold">{formatNumber(reviewSummary.average, 1)}/5</span> ·{' '}
                {reviewSummary.total} đánh giá
              </span>
            </p>
          ) : null}
        </div>

        {block.items.length > 0 ? (
          <ul className="mt-5 grid gap-2.5">
            {block.items.slice(0, 3).map((item, i) => (
              <li key={i} className="flex items-center gap-3 rounded-xl bg-[var(--landing-soft)] px-3.5 py-3">
                <span className="bg-primary text-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-full">
                  <LandingIcon name={item.icon} className="size-[18px]" />
                </span>
                <span className="text-sm font-medium text-[var(--landing-ink)]">{item.title || item.text}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  )
}
