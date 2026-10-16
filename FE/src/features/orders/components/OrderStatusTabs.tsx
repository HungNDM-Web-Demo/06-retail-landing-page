'use client'

import { useRef } from 'react'
import { orderStatusLabels, orderStatusTabs } from '@/config/landing-labels'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { OrderStatusCounts } from '@/types/landing'
import type { OrderTab } from '../lib/order-filters'

const tabLabel = (tab: OrderTab) => (tab === 'TatCa' ? 'Tất cả' : orderStatusLabels[tab])

/**
 * Tab trạng thái kèm số đơn (UC-05 bước 1, TC-22: số trên tab bằng số dòng). Số đếm theo cùng bộ lọc trừ trạng thái.
 * Điều hướng bằng phím mũi tên trái/phải.
 */
export function OrderStatusTabs({
  value,
  counts,
  onChange,
}: {
  value: OrderTab
  counts?: OrderStatusCounts
  onChange: (tab: OrderTab) => void
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  const onKey = (e: React.KeyboardEvent, index: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const next =
      (index + (e.key === 'ArrowRight' ? 1 : -1) + orderStatusTabs.length) % orderStatusTabs.length
    refs.current[next]?.focus()
    onChange(orderStatusTabs[next])
  }

  return (
    <div className="overflow-x-auto">
      <div role="tablist" aria-label="Trạng thái đơn" className="flex w-max gap-1 border-b">
        {orderStatusTabs.map((tab, i) => {
          const active = tab === value
          const count = counts?.[tab]
          return (
            <button
              key={tab}
              ref={(el) => {
                refs.current[i] = el
              }}
              type="button"
              role="tab"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(tab)}
              onKeyDown={(e) => onKey(e, i)}
              className={cn(
                'focus-visible:ring-ring/50 relative -mb-px flex h-11 items-center gap-2 border-b-2 px-3.5 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3',
                active
                  ? 'border-primary text-foreground'
                  : 'text-muted-foreground hover:text-foreground border-transparent'
              )}
            >
              {tabLabel(tab)}
              <span
                className={cn(
                  'min-w-6 rounded-full px-1.5 py-0.5 text-center text-xs tabular-nums',
                  active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                )}
              >
                {count === undefined ? '…' : formatNumber(count, 0)}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
