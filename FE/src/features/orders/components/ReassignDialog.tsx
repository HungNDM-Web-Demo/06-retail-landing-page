'use client'

import { useState } from 'react'
import { Loader2, UserRoundCog } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getErrorMessage } from '@/lib/api-error'
import { cn } from '@/lib/utils'
import type { TelesaleDto } from '@/types/landing'
import { useReassign } from '../hooks/use-orders'

/** Chia lại đơn cho telesale khác (FR-20, UC-06, TC-24). Đơn Đã giao, Hoàn hàng, Đã hủy bị bỏ qua. */
export function ReassignDialog({
  open,
  onOpenChange,
  orderIds,
  telesales,
  onDone,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderIds: string[]
  telesales: TelesaleDto[]
  onDone?: () => void
}) {
  const [assigneeId, setAssigneeId] = useState('')
  const reassign = useReassign()

  const close = (next: boolean) => {
    if (reassign.isPending) return
    if (!next) setAssigneeId('')
    onOpenChange(next)
  }

  const submit = async () => {
    try {
      await reassign.mutateAsync({ orderIds, assigneeId })
      onDone?.()
      close(false)
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Chia lại đơn</DialogTitle>
          <DialogDescription>
            {orderIds.length} đơn đã chọn sẽ chuyển cho telesale được chọn.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2" role="radiogroup" aria-label="Telesale nhận đơn">
          {telesales.map((t) => (
            <button
              key={t.userId}
              type="button"
              role="radio"
              aria-checked={assigneeId === t.userId}
              onClick={() => setAssigneeId(t.userId)}
              className={cn(
                'focus-visible:ring-ring/50 flex min-h-12 items-center justify-between gap-3 rounded-lg border px-3 text-left outline-none focus-visible:ring-3',
                assigneeId === t.userId ? 'border-primary bg-primary/5' : 'hover:bg-muted'
              )}
            >
              <span>
                <span className="block font-medium">{t.fullName}</span>
                <span className="text-muted-foreground text-xs">
                  {t.isReceiving ? 'Đang nhận đơn' : 'Đang tắt nhận đơn'} · {t.openOrders} đơn đang
                  xử lý
                </span>
              </span>
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)} disabled={reassign.isPending}>
            Đóng
          </Button>
          <Button onClick={submit} disabled={!assigneeId || reassign.isPending}>
            {reassign.isPending ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <UserRoundCog aria-hidden="true" />
            )}
            Chia lại
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
