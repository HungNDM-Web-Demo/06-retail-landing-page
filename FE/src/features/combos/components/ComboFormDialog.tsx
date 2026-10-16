'use client'

import { useEffect } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Info, Loader2 } from 'lucide-react'
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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { salesRules } from '@/config/sales-rules'
import { applyFieldErrors, getErrorMessage } from '@/lib/api-error'
import { formatVnd } from '@/lib/format'
import type { ComboDto } from '@/types/landing'
import { useSaveCombo } from '../hooks/use-combos'
import {
  comboFormSchema,
  comboToForm,
  emptyComboForm,
  formToComboRequest,
  parseMoney,
  type ComboFormValues,
} from '../schemas/combo.schema'

type ComboFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Có combo là sửa, không có là thêm */
  combo: ComboDto | null
  /** Số combo đang hiện, để báo trước combo mới sẽ ẩn (07 §5 quyết định 35) */
  visibleCount: number
}

/** Giá mỗi chai xem trước: floor(giá / số chai / 1.000) × 1.000 (07 §3.1) */
function perBottleHint(priceText: string, bottlesText: string): string | undefined {
  const price = parseMoney(priceText)
  const bottles = Number(bottlesText)
  if (!Number.isFinite(price) || price <= 0 || !Number.isInteger(bottles) || bottles < 1)
    return undefined
  const step = salesRules.priceStep
  return `${formatVnd(price)} · ${formatVnd(Math.floor(price / bottles / step) * step)}/chai`
}

/** Thêm, sửa combo (FR-15, UC-11, BR-01, TC-34) */
export function ComboFormDialog({ open, onOpenChange, combo, visibleCount }: ComboFormDialogProps) {
  const save = useSaveCombo()
  const form = useForm<ComboFormValues>({
    resolver: zodResolver(comboFormSchema),
    defaultValues: emptyComboForm,
  })
  const { errors } = form.formState
  const [promo, regular, bottles] = useWatch({
    control: form.control,
    name: ['promoPrice', 'regularPrice', 'bottleCount'],
  })

  useEffect(() => {
    if (open) form.reset(combo ? comboToForm(combo) : emptyComboForm)
  }, [open, combo, form])

  const onSubmit = form.handleSubmit((values) => {
    save.mutate(
      { id: combo?.id, input: formToComboRequest(values) },
      {
        onSuccess: (saved) => {
          toast.success(
            combo
              ? `Đã lưu combo ${saved.code}`
              : `Đã thêm combo ${saved.code}${saved.isVisible ? '' : ' (đang ẩn)'}`
          )
          onOpenChange(false)
        },
        onError: (error) => {
          if (!applyFieldErrors(form.setError, error)) toast.error(getErrorMessage(error))
        },
      }
    )
  })

  return (
    <Dialog open={open} onOpenChange={(next) => !save.isPending && onOpenChange(next)}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b px-6 py-5">
          <DialogTitle>{combo ? `Sửa combo ${combo.code}` : 'Thêm combo'}</DialogTitle>
          <DialogDescription>
            {combo
              ? 'Đơn đã đặt giữ nguyên giá lúc đặt; giá mới áp cho đơn đặt sau khi lưu.'
              : 'Mã combo cấp tự động, combo mới nằm cuối danh sách.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-col">
          <div className="grid max-h-[calc(100dvh-14rem)] gap-4 overflow-y-auto px-6 py-5 sm:grid-cols-2">
            {!combo && visibleCount >= salesRules.maxVisibleCombos && (
              <p
                role="note"
                className="bg-info/10 text-info flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm sm:col-span-2"
              >
                <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                Đang có 4 combo hiển thị nên combo mới sẽ ở trạng thái ẩn.
              </p>
            )}
            <FormField label="Tên combo" required error={errors.name?.message}>
              <Input autoComplete="off" placeholder="vd: Mua 2 tặng 1" {...form.register('name')} />
            </FormField>
            <FormField
              label="Số chai"
              required
              error={errors.bottleCount?.message}
              hint="Dùng tính giá mỗi chai, từ 1 đến 10."
            >
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={10}
                {...form.register('bottleCount')}
              />
            </FormField>
            <FormField
              label="Nội dung combo"
              required
              error={errors.description?.message}
              className="sm:col-span-2"
            >
              <Textarea rows={2} {...form.register('description')} />
            </FormField>
            <FormField
              label="Giá khuyến mãi (₫)"
              required
              error={errors.promoPrice?.message}
              hint={perBottleHint(promo, bottles) ?? 'Bội số 1.000 ₫, không lớn hơn giá thường.'}
            >
              <Input
                inputMode="numeric"
                autoComplete="off"
                placeholder="vd: 740000"
                {...form.register('promoPrice')}
              />
            </FormField>
            <FormField
              label="Giá thường (₫)"
              required
              error={errors.regularPrice?.message}
              hint={perBottleHint(regular, bottles) ?? 'Bội số 1.000 ₫.'}
            >
              <Input
                inputMode="numeric"
                autoComplete="off"
                placeholder="vd: 900000"
                {...form.register('regularPrice')}
              />
            </FormField>
            <FormField label="Quà tặng" error={errors.giftText?.message}>
              <Input
                autoComplete="off"
                placeholder="vd: 1 sữa rửa mặt Rau Má 100 ml"
                {...form.register('giftText')}
              />
            </FormField>
            <FormField label="Nhãn nổi bật" error={errors.badge?.message}>
              <Input
                autoComplete="off"
                placeholder="vd: Bán chạy nhất"
                {...form.register('badge')}
              />
            </FormField>
            <FormField
              label="Đường dẫn ảnh"
              error={errors.imageUrl?.message}
              className="sm:col-span-2"
            >
              <Input autoComplete="off" placeholder="/seed/..." {...form.register('imageUrl')} />
            </FormField>
            <label className="flex min-h-10 cursor-pointer items-center gap-3 text-sm font-medium sm:col-span-2">
              <Controller
                control={form.control}
                name="freeShipping"
                render={({ field }) => (
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
              Miễn phí vận chuyển
              <span className="text-muted-foreground font-normal">
                (không bật thì phí {formatVnd(salesRules.shippingFee)} khi tiền hàng dưới{' '}
                {formatVnd(salesRules.freeShippingThreshold)})
              </span>
            </label>
          </div>

          <DialogFooter className="bg-muted/30 border-t px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={save.isPending}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
              {combo ? 'Lưu thay đổi' : 'Thêm combo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
