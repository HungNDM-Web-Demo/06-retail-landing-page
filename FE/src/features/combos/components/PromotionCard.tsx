'use client'

import { useEffect } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarClock, Info, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { ErrorState } from '@/components/shared/ErrorState'
import { FormField } from '@/components/shared/FormField'
import { StatusBadge, type StatusTone } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { promotionStatusLabels } from '@/config/landing-labels'
import { problemCode } from '@/features/orders/lib/problem'
import { vnDateTimeText } from '@/features/reports/lib/vn-date'
import { applyFieldErrors, getErrorMessage } from '@/lib/api-error'
import type { PromotionStatus } from '@/types/landing'
import { usePromotion, useUpdatePromotion } from '../hooks/use-combos'
import {
  formToPromotionRequest,
  promotionFormSchema,
  promotionToForm,
  type PromotionFormValues,
} from '../schemas/promotion.schema'

const statusTones: Record<PromotionStatus, StatusTone> = {
  SapChay: 'info',
  DangChay: 'success',
  DaKetThuc: 'neutral',
}

const EMPTY: PromotionFormValues = {
  name: '',
  startAt: '',
  endAt: '',
  autoRenew: false,
  autoRenewDays: '3',
}

/** Khung chương trình khuyến mãi (SCR-07, FR-16, UC-11, BR-20; TC-03, TC-17) */
export function PromotionCard({ canEdit }: { canEdit: boolean }) {
  const promotion = usePromotion()
  const update = useUpdatePromotion()
  const data = promotion.data

  const form = useForm<PromotionFormValues>({
    resolver: zodResolver(promotionFormSchema),
    defaultValues: EMPTY,
  })
  const { errors, isDirty } = form.formState
  const autoRenew = useWatch({ control: form.control, name: 'autoRenew' })

  // Nạp lại form khi có bản mới (lần đầu, sau khi lưu, sau 409)
  useEffect(() => {
    if (data) form.reset(promotionToForm(data))
  }, [data?.id, data?.version]) // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = form.handleSubmit((values) => {
    if (!data) return
    update.mutate(formToPromotionRequest(values, data.version), {
      onSuccess: () => toast.success('Đã lưu chương trình khuyến mãi'),
      onError: async (error) => {
        // 409 DuLieuCu: báo đúng câu, tải lại bản mới nhất rồi đặt lại form (07 §2.8)
        if (problemCode(error) === 'DuLieuCu') {
          toast.error(getErrorMessage(error))
          const fresh = await promotion.refetch()
          if (fresh.data) form.reset(promotionToForm(fresh.data))
          return
        }
        if (!applyFieldErrors(form.setError, error)) toast.error(getErrorMessage(error))
      },
    })
  })

  return (
    <section
      aria-labelledby="promotion-title"
      className="bg-card text-card-foreground rounded-xl border shadow-xs"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg">
            <CalendarClock className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 id="promotion-title" className="font-semibold">
              Chương trình khuyến mãi
            </h2>
            <p className="text-muted-foreground text-sm">
              Áp cho mọi combo; hết thời gian thì landing hiện giá thường (BR-02).
            </p>
          </div>
        </div>
        {data && (
          <StatusBadge tone={statusTones[data.status]}>
            {promotionStatusLabels[data.status]}
          </StatusBadge>
        )}
      </header>

      {promotion.error ? (
        <ErrorState error={promotion.error} onRetry={() => void promotion.refetch()} />
      ) : promotion.isLoading || !data ? (
        <div className="grid gap-4 p-5 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="p-5">
          <fieldset disabled={!canEdit || update.isPending} className="grid gap-4 lg:grid-cols-12">
            <FormField
              label="Tên chương trình"
              required
              error={errors.name?.message}
              className="lg:col-span-4"
            >
              <Input autoComplete="off" {...form.register('name')} />
            </FormField>
            <FormField
              label="Bắt đầu (giờ Việt Nam)"
              required
              error={errors.startAt?.message}
              className="lg:col-span-4"
            >
              <Input type="datetime-local" step={1} {...form.register('startAt')} />
            </FormField>
            <FormField
              label="Kết thúc (giờ Việt Nam)"
              required
              error={errors.endAt?.message}
              className="lg:col-span-4"
            >
              <Input type="datetime-local" step={1} {...form.register('endAt')} />
            </FormField>

            <div className="flex flex-wrap items-start gap-x-6 gap-y-3 lg:col-span-8">
              <label className="flex min-h-10 cursor-pointer items-center gap-3 text-sm font-medium">
                <Controller
                  control={form.control}
                  name="autoRenew"
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={!canEdit}
                    />
                  )}
                />
                Tự gia hạn khi hết hạn (bản demo)
              </label>
              {autoRenew && (
                <FormField
                  label="Số ngày mỗi chu kỳ"
                  required
                  error={errors.autoRenewDays?.message}
                  hint="Từ 1 đến 30 ngày; gia hạn từ ngày hôm sau ngày kết thúc."
                  className="w-64"
                >
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={30}
                    {...form.register('autoRenewDays')}
                  />
                </FormField>
              )}
            </div>

            <div className="flex items-end justify-end lg:col-span-4">
              {canEdit && (
                <Button type="submit" disabled={!isDirty || update.isPending}>
                  {update.isPending ? (
                    <Loader2 className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Save aria-hidden="true" />
                  )}
                  Lưu khuyến mãi
                </Button>
              )}
            </div>
          </fieldset>

          {data.effectiveEndAt !== data.endAt && (
            <p className="bg-info/10 text-info mt-4 flex items-start gap-2 rounded-lg px-3 py-2 text-sm">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              Kết thúc sau khi tự gia hạn: {vnDateTimeText(data.effectiveEndAt)}
            </p>
          )}
        </form>
      )}
    </section>
  )
}
