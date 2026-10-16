import {
  ArrowRightLeft,
  MessageSquareText,
  PackageCheck,
  Pencil,
  Phone,
  ShoppingBag,
  StickyNote,
  Tag,
  Truck,
  UserRoundCheck,
  type LucideIcon,
} from 'lucide-react'
import { callResultLabels, cancelReasonLabels, orderStatusLabels } from '@/config/landing-labels'
import { formatRelativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { OrderCallDto, OrderEventDto, OrderEventType } from '@/types/landing'
import { vnDateTimeText, vnTimeDateText } from '@/features/reports/lib/vn-date'

const EVENT_ICONS: Record<OrderEventType, LucideIcon> = {
  TaoDon: ShoppingBag,
  ChiaDon: UserRoundCheck,
  CuocGoi: Phone,
  DoiTrangThai: ArrowRightLeft,
  SuaDon: Pencil,
  TinNhan: MessageSquareText,
  Nhan: Tag,
  BanGiao: Truck,
  GhiChu: StickyNote,
}

/** Dòng thời gian đơn, mới nhất trước (FR-21, BR-16: đổi trạng thái có từ → đến) */
export function OrderTimeline({ events }: { events: OrderEventDto[] }) {
  return (
    <ol className="relative space-y-4 border-l pl-5" aria-label="Dòng thời gian đơn">
      {events.map((e) => {
        const Icon =
          e.type === 'DoiTrangThai' && e.toStatus === 'DaGiao' ? PackageCheck : EVENT_ICONS[e.type]
        return (
          <li key={e.id} className="relative">
            <span
              className={cn(
                'bg-background absolute top-0 -left-[31px] flex size-6 items-center justify-center rounded-full border',
                e.type === 'GhiChu' && 'border-primary text-primary'
              )}
              aria-hidden="true"
            >
              <Icon className="size-3.5" />
            </span>
            <p className="text-sm text-pretty">{e.content}</p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {vnDateTimeText(e.occurredAt)} · {e.actorName ?? 'Hệ thống'}
              {e.fromStatus && e.toStatus && (
                <>
                  {' '}
                  · {orderStatusLabels[e.fromStatus]} → {orderStatusLabels[e.toStatus]}
                </>
              )}
            </p>
          </li>
        )
      })}
    </ol>
  )
}

/** Lịch sử cuộc gọi, mới nhất trước (FR-22) */
export function CallHistory({ calls }: { calls: OrderCallDto[] }) {
  if (!calls.length) return <p className="text-muted-foreground text-sm">Chưa có cuộc gọi.</p>
  return (
    <ul className="divide-y rounded-lg border">
      {calls.map((c) => (
        <li key={c.id} className="flex items-start justify-between gap-3 px-3 py-2 text-sm">
          <span>
            <span className="font-medium">{callResultLabels[c.result]}</span>
            {c.cancelReason && <span>: {cancelReasonLabels[c.cancelReason]}</span>}
            {c.callbackAt && (
              <span className="text-muted-foreground"> · hẹn {vnTimeDateText(c.callbackAt)}</span>
            )}
            {c.note && <span className="text-muted-foreground block text-xs">{c.note}</span>}
          </span>
          <span className="text-muted-foreground shrink-0 text-right text-xs">
            {c.callerName}
            <br />
            <span title={vnDateTimeText(c.calledAt)}>{formatRelativeTime(c.calledAt)}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}
