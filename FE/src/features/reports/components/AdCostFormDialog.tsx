'use client'

import { useEffect, useMemo } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { FormField } from '@/components/shared/FormField'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { sourceLabel } from '@/config/landing-labels'
import { applyFieldErrors, getErrorMessage } from '@/lib/api-error'
import { formatNumber } from '@/lib/format'
import type { AdCostDto } from '@/types/landing'
import { useCreateAdCost, useUpdateAdCost } from '../hooks/use-reports'
import { vnKey } from '../lib/vn-date'
import {
  AD_COST_SOURCES,
  OTHER_SOURCE,
  adCostSchema,
  type AdCostFormValues,
} from '../schemas/ad-cost.schema'

const isPreset = (s: string) => (AD_COST_SOURCES as readonly string[]).includes(s)

/** Thêm/sửa chi phí quảng cáo một ngày cho một nguồn, chiến dịch (FR-33, UC-14) */
export function AdCostFormDialog({
  open,
  onOpenChange,
  cost,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Có là sửa, không có là thêm */
  cost?: AdCostDto | null
}) {
  const create = useCreateAdCost()
  const update = useUpdateAdCost()
  const pending = create.isPending || update.isPending
  const today = useMemo(() => (open ? vnKey() : ''), [open])

  const form = useForm<AdCostFormValues>({
    resolver: zodResolver(adCostSchema(today)),
    defaultValues: { date: '', source: 'facebook', sourceOther: '', campaign: '', amount: null },
  })
  const { errors } = form.formState
  const source = useWatch({ control: form.control, name: 'source' })

  useEffect(() => {
    if (!open) return
    form.reset(
      cost
        ? {
            date: cost.date,
            source: isPreset(cost.source) ? cost.source : OTHER_SOURCE,
            sourceOther: isPreset(cost.source) ? '' : cost.source,
            campaign: cost.campaign,
            amount: cost.amount,
          }
        : { date: today, source: 'facebook', sourceOther: '', campaign: '', amount: null }
    )
  }, [open, cost, today, form])

  const onError = (error: unknown) => {
    if (!applyFieldErrors(form.setError, error)) toast.error(getErrorMessage(error))
  }

  const onSubmit = form.handleSubmit((v) => {
    const input = {
      date: v.date,
      source: v.source === OTHER_SOURCE ? v.sourceOther.trim() : v.source,
      campaign: v.campaign.trim() || undefined,
      amount: v.amount ?? 0,
    }
    const done = (message: string) => () => {
      toast.success(message)
      onOpenChange(false)
    }
    if (cost) {
      update.mutate(
        { id: cost.id, input },
        { onSuccess: done('Đã cập nhật chi phí quảng cáo'), onError }
      )
    } else {
      create.mutate(input, { onSuccess: done('Đã thêm chi phí quảng cáo'), onError })
    }
  })

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="border-b px-6 py-5">
          <DialogTitle>{cost ? 'Sửa chi phí quảng cáo' : 'Thêm chi phí quảng cáo'}</DialogTitle>
          <DialogDescription>
            Chi phí một ngày cho một nguồn; để trống chiến dịch khi nhập chung cả nguồn.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate>
          <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
            <FormField label="Ngày" required error={errors.date?.message}>
              <Input type="date" max={today} {...form.register('date')} />
            </FormField>
            <FormField
              label="Số tiền"
              htmlFor="ad-cost-amount"
              required
              error={errors.amount?.message}
              hint="Bội số 1.000 ₫"
            >
              <Controller
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <div className="relative">
                    <Input
                      id="ad-cost-amount"
                      aria-invalid={errors.amount ? true : undefined}
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="vd: 350.000"
                      className="pr-8 text-right tabular-nums"
                      value={field.value === null ? '' : formatNumber(field.value, 0)}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 12)
                        field.onChange(digits ? Number(digits) : null)
                      }}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                    <span
                      className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm"
                      aria-hidden="true"
                    >
                      ₫
                    </span>
                  </div>
                )}
              />
            </FormField>
            <FormField
              label="Nguồn"
              htmlFor="ad-cost-source"
              required
              error={errors.source?.message}
            >
              <Controller
                control={form.control}
                name="source"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="ad-cost-source" className="w-full" ref={field.ref}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AD_COST_SOURCES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {sourceLabel(s)}
                        </SelectItem>
                      ))}
                      <SelectItem value={OTHER_SOURCE}>Nguồn khác…</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            {source === OTHER_SOURCE ? (
              <FormField
                label="Tên nguồn"
                required
                error={errors.sourceOther?.message}
                hint="Chữ thường, vd coccoc"
              >
                <Input
                  autoComplete="off"
                  placeholder="vd: coccoc"
                  {...form.register('sourceOther')}
                />
              </FormField>
            ) : (
              <div className="hidden sm:block" aria-hidden="true" />
            )}
            <FormField
              label="Chiến dịch"
              error={errors.campaign?.message}
              hint="Đúng giá trị utm_campaign, vd serum_t10"
              className="sm:col-span-2"
            >
              <Input
                autoComplete="off"
                placeholder="Để trống = cả nguồn"
                {...form.register('campaign')}
              />
            </FormField>
          </div>
          <DialogFooter className="bg-muted/30 border-t px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
              {cost ? 'Lưu thay đổi' : 'Thêm chi phí'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
