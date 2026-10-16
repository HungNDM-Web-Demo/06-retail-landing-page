import { CalendarClock, Copy, ShieldAlert } from 'lucide-react'
import { StatusBadge } from '@/components/shared/StatusBadge'
import {
  orderStatusLabels,
  orderStatusTones,
  orderTagLabels,
  orderTagTones,
  sourceLabel,
} from '@/config/landing-labels'
import { cn } from '@/lib/utils'
import type { OrderStatus, OrderTag } from '@/types/landing'

/** Nhãn trạng thái đơn, luôn có chữ (không chỉ dựa màu) */
export function OrderStatusBadge({
  status,
  className,
}: {
  status: OrderStatus
  className?: string
}) {
  return (
    <StatusBadge tone={orderStatusTones[status]} className={className}>
      {orderStatusLabels[status]}
    </StatusBadge>
  )
}

const TAG_ICONS: Record<OrderTag, typeof Copy> = {
  Trung: Copy,
  RuiRoHoan: ShieldAlert,
  DenGioGoiLai: CalendarClock,
}

/** Nhãn Trùng, Rủi ro hoàn, Đến giờ gọi lại (BR-11, BR-14, BR-15) */
export function OrderTagBadges({ tags, className }: { tags: OrderTag[]; className?: string }) {
  if (!tags.length) return null
  return (
    <span className={cn('flex flex-wrap gap-1', className)}>
      {tags.map((tag) => {
        const Icon = TAG_ICONS[tag]
        return (
          <StatusBadge
            key={tag}
            tone={orderTagTones[tag]}
            icon={<Icon className="size-3" aria-hidden="true" />}
          >
            {orderTagLabels[tag]}
          </StatusBadge>
        )
      })}
    </span>
  )
}

/** Nguồn (+ chiến dịch) của đơn */
export function SourceText({ source, campaign }: { source: string; campaign?: string | null }) {
  return (
    <span className="flex min-w-0 flex-col leading-tight">
      <span className="font-medium">{sourceLabel(source)}</span>
      {campaign && <span className="text-muted-foreground truncate text-xs">{campaign}</span>}
    </span>
  )
}
