'use client'

import { useEffect, useState } from 'react'
import { ShoppingBag, X } from 'lucide-react'
import { salesRules } from '@/config/sales-rules'
import { formatRelativeTime } from '@/lib/format'
import { useRecentOrders } from '../hooks/use-landing'

/**
 * Thông báo đơn gần đây (FR-13, BR-21, P3): góc dưới trái, mỗi 15 giây một đơn, tối đa 5 lần mỗi lượt xem;
 * nằm trên thanh Đặt hàng để không che nút. Chỉ tên gọi, tỉnh, combo; không số điện thoại, địa chỉ.
 */
export function RecentOrderToast({ enabled }: { enabled: boolean }) {
  const { data } = useRecentOrders(enabled)
  const [index, setIndex] = useState(-1)
  const [shown, setShown] = useState(0)
  const [closed, setClosed] = useState(false)
  const notices = data ?? []

  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (!enabled || closed || notices.length === 0 || shown >= salesRules.recentOrderMaxShows) return
    const showDelay = setTimeout(
      () => {
        setIndex((i) => (i + 1) % notices.length)
        setShown((n) => n + 1)
        setVisible(true)
      },
      index < 0 ? 6_000 : salesRules.recentOrderIntervalSeconds * 1000
    )
    return () => clearTimeout(showDelay)
  }, [enabled, closed, notices.length, shown, index])

  // Mỗi thông báo hiện 5 giây
  useEffect(() => {
    if (!visible) return
    const hide = setTimeout(() => setVisible(false), 5_000)
    return () => clearTimeout(hide)
  }, [visible, shown])

  const notice = index >= 0 ? notices[index] : undefined
  if (!notice || closed) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className={
        'pointer-events-none fixed bottom-24 left-3 z-30 max-w-[calc(100vw-1.5rem)] transition-all duration-300 sm:left-[max(0.75rem,calc(50vw-228px))] ' +
        (visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0')
      }
    >
      <div className="pointer-events-auto flex w-[19rem] max-w-full items-center gap-3 rounded-2xl bg-[var(--landing-surface)] py-2.5 pr-2 pl-3 shadow-lg ring-1 ring-[var(--landing-soft)]">
        <span className="bg-primary text-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-full">
          <ShoppingBag className="size-4" aria-hidden="true" />
        </span>
        <p className="min-w-0 flex-1 text-[0.8125rem] leading-snug text-[var(--landing-ink)]">
          <strong>{notice.displayName}</strong> ở {notice.province} vừa đặt {notice.comboName}{' '}
          <span className="text-muted-foreground">– {formatRelativeTime(notice.placedAt)}</span>
        </p>
        <button
          type="button"
          onClick={() => setClosed(true)}
          className="text-muted-foreground hover:text-foreground flex size-8 shrink-0 items-center justify-center rounded-full"
          aria-label="Tắt thông báo đơn gần đây"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
