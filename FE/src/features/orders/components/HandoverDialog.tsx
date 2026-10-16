'use client'

import { useState } from 'react'
import { Loader2, Truck } from 'lucide-react'
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
import { carrierLabels } from '@/config/landing-labels'
import { getErrorMessage } from '@/lib/api-error'
import type { Carrier } from '@/types/landing'
import { useHandover } from '../hooks/use-orders'

/**
 * Bàn giao vận chuyển một hoặc nhiều đơn (UC-07, FR-25, BR-17): chọn đơn vị, nút khóa khi chưa chọn (UC-07 E2);
 * hiện `message` trả về (TC-25).
 */
export function HandoverDialog({
  open,
  onOpenChange,
  orderIds,
  onDone,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderIds: string[]
  onDone?: () => void
}) {
  const [carrier, setCarrier] = useState<Carrier | ''>('')
  const handover = useHandover()

  const close = (next: boolean) => {
    if (handover.isPending) return
    if (!next) setCarrier('')
    onOpenChange(next)
  }

  const submit = async () => {
    if (!carrier) return
    try {
      await handover.mutateAsync({ orderIds, carrier })
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
          <DialogTitle>Bàn giao vận chuyển</DialogTitle>
          <DialogDescription>
            {orderIds.length} đơn đã chọn. Chỉ đơn Đã xác nhận được bàn giao; đơn khác bị bỏ qua.
          </DialogDescription>
        </DialogHeader>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">
            Đơn vị vận chuyển <span className="text-destructive">*</span>
          </legend>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Đơn vị vận chuyển">
            {(Object.keys(carrierLabels) as Carrier[]).map((c) => (
              <Button
                key={c}
                type="button"
                role="radio"
                aria-checked={carrier === c}
                variant={carrier === c ? 'default' : 'outline'}
                className="h-11"
                onClick={() => setCarrier(c)}
              >
                {carrierLabels[c]}
              </Button>
            ))}
          </div>
        </fieldset>
        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)} disabled={handover.isPending}>
            Đóng
          </Button>
          <Button onClick={submit} disabled={!carrier || handover.isPending}>
            {handover.isPending ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <Truck aria-hidden="true" />
            )}
            Bàn giao
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
