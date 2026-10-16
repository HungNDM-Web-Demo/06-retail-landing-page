'use client'

import { useEffect, useState } from 'react'
import { ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatVnd } from '@/lib/format'
import { ORDER_ANCHOR_ID } from './landing-context'

/**
 * Thanh "Đặt hàng ngay" cố định cuối màn hình (FR-05, TC-02): ẩn khi khối Order đang trong màn hình
 * (IntersectionObserver), bấm cuộn mượt tới khối combo. Vùng chạm ≥ 44 px, chừa vùng an toàn đáy máy.
 */
export function StickyOrderBar({
  minPrice,
  unit,
  label,
  onClick,
}: {
  minPrice: number
  unit: string
  label: string
  onClick: () => void
}) {
  const [orderVisible, setOrderVisible] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const target = document.getElementById(ORDER_ANCHOR_ID)
    if (!target) return
    const observer = new IntersectionObserver(([entry]) => setOrderVisible(entry.isIntersecting), { threshold: 0.05 })
    observer.observe(target)
    const onScroll = () => setScrolled(window.scrollY > 360)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  const hidden = orderVisible || !scrolled
  return (
    <div
      className={
        'fixed inset-x-0 bottom-0 z-40 transition-transform duration-200 ' + (hidden ? 'translate-y-full' : 'translate-y-0')
      }
      aria-hidden={hidden}
    >
      <div className="mx-auto flex max-w-[480px] items-center gap-3 border-t border-[var(--landing-soft)] bg-[var(--landing-surface)]/95 px-4 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-12px_color-mix(in_oklab,var(--landing-ink)_30%,transparent)] backdrop-blur">
        {minPrice > 0 ? (
          <p className="min-w-0 shrink text-xs leading-tight text-[var(--landing-ink)]">
            Chỉ từ
            <span className="block text-base font-bold text-[var(--landing-price)] tabular-nums">
              {formatVnd(minPrice)}/{unit}
            </span>
          </p>
        ) : null}
        <Button
          variant="cta"
          className="h-12 flex-1 rounded-xl text-base font-bold"
          onClick={onClick}
          tabIndex={hidden ? -1 : 0}
        >
          <ShoppingBag className="size-5" aria-hidden="true" />
          {label}
        </Button>
      </div>
    </div>
  )
}
