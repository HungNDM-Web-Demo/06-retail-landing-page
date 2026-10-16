'use client'

import { useEffect, useRef } from 'react'
import { Timer } from 'lucide-react'
import { countdownParts, formatCountdown } from '@/features/sales/lib/promotion'
import { cn } from '@/lib/utils'
import type { PublicPromotion } from '@/types/landing'
import { useHydrated, useServerNow } from '../hooks/use-landing'

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * Đồng hồ đếm ngược tới `promotion.endAt` theo giờ máy chủ (BR-20, 07 §3.3): ≥ 24 giờ "N ngày hh:mm:ss",
 * dưới 24 giờ "hh:mm:ss"; hết hoặc chưa chạy → ẩn. Về 0 thì gọi `onExpire` để tải lại trạng thái khuyến mãi.
 */
export function Countdown({
  promotion,
  variant = 'hero',
  onExpire,
  className,
}: {
  promotion: PublicPromotion
  variant?: 'hero' | 'compact'
  onExpire?: () => void
  className?: string
}) {
  const hydrated = useHydrated()
  const now = useServerNow(1000)
  const remaining = new Date(promotion.endAt).getTime() - now
  const expiredFired = useRef(false)

  useEffect(() => {
    if (promotion.status !== 'DangChay') return
    if (remaining <= 0 && !expiredFired.current) {
      expiredFired.current = true
      onExpire?.()
    }
    if (remaining > 0) expiredFired.current = false
  }, [remaining, promotion.status, onExpire])

  if (promotion.status !== 'DangChay' || (hydrated && remaining <= 0)) return null

  const parts = countdownParts(hydrated ? remaining : 0)
  const label = hydrated ? formatCountdown(remaining) : ''

  if (variant === 'compact') {
    return (
      <p
        className={cn(
          'flex items-center justify-center gap-2 rounded-lg bg-[var(--landing-urgent)] px-3 py-2 text-sm font-medium text-[var(--landing-urgent-foreground)]',
          className
        )}
      >
        <Timer className="size-4 shrink-0" aria-hidden="true" />
        <span>
          Ưu đãi kết thúc sau{' '}
          <span className="font-bold tabular-nums" suppressHydrationWarning>
            {hydrated ? label : '--:--:--'}
          </span>
        </span>
      </p>
    )
  }

  const cells: { value: string; unit: string }[] = [
    ...(parts.days > 0 ? [{ value: String(parts.days), unit: 'ngày' }] : []),
    { value: pad(parts.hours), unit: 'giờ' },
    { value: pad(parts.minutes), unit: 'phút' },
    { value: pad(parts.seconds), unit: 'giây' },
  ]

  return (
    <div className={cn('space-y-2', className)} role="timer" aria-label={hydrated ? `Ưu đãi kết thúc sau ${label}` : undefined}>
      <p className="flex items-center justify-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
        <Timer className="size-3.5" aria-hidden="true" />
        Ưu đãi kết thúc sau
      </p>
      <div className="flex items-stretch justify-center gap-1.5" aria-hidden="true">
        {cells.map((cell) => (
          <span
            key={cell.unit}
            className="flex min-w-[3.25rem] flex-col items-center rounded-lg bg-[var(--landing-surface)] px-2 py-1.5 text-[var(--landing-ink)] shadow-sm"
          >
            <span className="text-xl leading-none font-bold tabular-nums" suppressHydrationWarning>
              {hydrated ? cell.value : '--'}
            </span>
            <span className="mt-1 text-[0.6875rem] font-medium text-[var(--landing-ink)]/70">{cell.unit}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
