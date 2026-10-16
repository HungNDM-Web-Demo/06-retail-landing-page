'use client'

import { cancelReasonLabels, returnReasonLabels } from '@/config/landing-labels'
import { Button } from '@/components/ui/button'
import { formatVnd } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { RelatedOrder } from '@/types/landing'
import { vnDateTimeText } from '@/features/reports/lib/vn-date'
import { OrderStatusBadge } from './OrderBadges'

/**
 * Đơn cùng số điện thoại (FR-21, UC-04): đơn đang mang nhãn Trùng có nút "Hủy đơn trùng" khi còn hủy được
 * (`canCancel`, TC-31: đơn Đang giao không có nút). Bấm mã đơn để mở đơn đó.
 */
export function RelatedOrders({
  orders,
  canCancel,
  onCancelDuplicate,
  onOpen,
  highlightReturns,
}: {
  orders: RelatedOrder[]
  canCancel: boolean
  onCancelDuplicate: (order: RelatedOrder) => void
  onOpen: (id: string) => void
  highlightReturns?: boolean
}) {
  return (
    <ul className="divide-y rounded-lg border">
      {orders.map((o) => (
        <li
          key={o.id}
          className={cn(
            'flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm',
            highlightReturns && o.status === 'HoanHang' && 'bg-destructive/5'
          )}
        >
          <button
            type="button"
            onClick={() => onOpen(o.id)}
            className="text-primary font-mono font-medium underline-offset-4 hover:underline"
          >
            {o.code}
          </button>
          <OrderStatusBadge status={o.status} />
          {o.isDuplicate && <span className="text-warning text-xs font-medium">Trùng</span>}
          <span className="text-muted-foreground ml-auto text-xs">
            {vnDateTimeText(o.placedAt)}
          </span>
          <span className="basis-full">
            {o.comboName} × {o.quantity} · {formatVnd(o.total)}
            {o.assigneeName && <span className="text-muted-foreground"> · {o.assigneeName}</span>}
            {o.cancelReason && (
              <span className="text-muted-foreground"> · {cancelReasonLabels[o.cancelReason]}</span>
            )}
            {o.returnReason && (
              <span className="text-destructive">
                {' '}
                · Hoàn: {returnReasonLabels[o.returnReason]}
              </span>
            )}
          </span>
          {canCancel && o.isDuplicate && o.canCancel && (
            <Button
              size="sm"
              variant="destructive"
              className="ml-auto"
              onClick={() => onCancelDuplicate(o)}
            >
              Hủy đơn trùng
            </Button>
          )}
        </li>
      ))}
    </ul>
  )
}
