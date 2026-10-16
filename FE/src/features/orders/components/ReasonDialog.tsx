'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { salesRules } from '@/config/sales-rules'
import { getFieldErrors } from '@/lib/api-error'

/**
 * Hộp chọn lý do + ghi chú (Hủy đơn UC-09, Hoàn hàng UC-08): nút xác nhận khóa khi chưa chọn lý do (UC-09 E1,
 * TC-28, TC-29); lý do "Khác" bắt buộc ghi chú (BR-16).
 */
export function ReasonDialog<T extends string>({
  open,
  onOpenChange,
  title,
  description,
  reasons,
  labels,
  confirmText,
  onConfirm,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: React.ReactNode
  reasons: T[]
  labels: Record<T, string>
  confirmText: string
  onConfirm: (reason: T, note?: string) => Promise<unknown>
  children?: React.ReactNode
}) {
  const [reason, setReason] = useState<T | ''>('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string>()
  const [pending, setPending] = useState(false)
  const noteRequired = reason === 'Khac'

  const close = (next: boolean) => {
    if (pending) return
    if (!next) {
      setReason('')
      setNote('')
      setError(undefined)
    }
    onOpenChange(next)
  }

  const submit = async () => {
    if (!reason) return
    setPending(true)
    setError(undefined)
    try {
      await onConfirm(reason, note.trim() || undefined)
      setPending(false)
      close(false)
    } catch (err) {
      const fields = getFieldErrors(err)
      setError(fields.note ?? fields.reason)
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium">
            Lý do <span className="text-destructive">*</span>
          </legend>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Lý do">
            {reasons.map((r) => (
              <Button
                key={r}
                type="button"
                size="sm"
                role="radio"
                aria-checked={reason === r}
                variant={reason === r ? 'default' : 'outline'}
                onClick={() => setReason(r)}
              >
                {labels[r]}
              </Button>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-1.5">
          <Label htmlFor="reason-note">
            Ghi chú{noteRequired ? <span className="text-destructive">*</span> : ' (tùy chọn)'}
          </Label>
          <Textarea
            id="reason-note"
            value={note}
            maxLength={salesRules.noteMax}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            aria-invalid={!!error || undefined}
          />
          {error && (
            <p role="alert" className="text-destructive text-[0.8125rem]">
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)} disabled={pending}>
            Đóng
          </Button>
          <Button
            variant="danger"
            onClick={submit}
            disabled={pending || !reason || (noteRequired && !note.trim())}
          >
            {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
