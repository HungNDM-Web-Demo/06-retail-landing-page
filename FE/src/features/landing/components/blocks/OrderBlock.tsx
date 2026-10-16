'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Banknote, Check, Gift, Loader2, Minus, PackageCheck, Plus, ShieldCheck, Sparkles, Truck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { routePath } from '@/config/route-path'
import { salesMessages, salesRules } from '@/config/sales-rules'
import { detectDevice } from '@/features/sales/lib/attribution'
import { normalizePhone } from '@/features/sales/lib/phone'
import { amountsFromUnit, moneyText } from '@/features/sales/lib/pricing'
import { orderFormSchema, type OrderFormValues } from '@/features/sales/schemas/order-form.schema'
import { applyFieldErrors, getErrorMessage, isApiError } from '@/lib/api-error'
import { formatVnd } from '@/lib/format'
import { cn } from '@/lib/utils'
import { newId } from '@/mock/mock-helpers'
import type { PublicBlock, PublicCombo } from '@/types/landing'
import { publicKeys, trackStartForm, usePlaceOrder, useVisitStore } from '../../hooks/use-landing'
import {
  clearOrderDraft,
  getVisitorId,
  markOrderPlaced,
  orderCooldownLeft,
  readOrderDraft,
  saveOrderDraft,
  savePlacedOrder,
} from '../../lib/visitor'
import { Countdown } from '../Countdown'
import { ORDER_ANCHOR_ID, useLandingContext } from '../landing-context'
import { LandingImage, SectionHeader } from '../landing-ui'
import { ProvinceCombobox } from '../ProvinceCombobox'

/** Ô có trên form đặt hàng (khóa lỗi `errors` của BE và mock) */
const ORDER_FORM_FIELDS = ['customerName', 'phone', 'province', 'address', 'note', 'comboId', 'quantity'] as const

const errorCodeOf = (error: unknown): string | undefined =>
  isApiError(error) && typeof error.problem.code === 'string' ? error.problem.code : undefined

/**
 * Khối Order (SCR-02, FR-07, FR-09, FR-10, UC-02): thẻ combo dạng radio chọn sẵn combo mặc định, đếm ngược nhỏ,
 * form RHF + Zod (lỗi khi rời ô, đúng câu 07 §2.8), số điện thoại chuẩn hóa khi rời ô, tỉnh/thành tìm không dấu,
 * số lượng − / +, tổng tiền cập nhật ngay (07 §3.1). Gửi: kiểm 60 giây trước, khóa nút "Đang gửi…",
 * `clientRequestId` giữ khi thử lại, xử lý mọi mã lỗi (07 §4.3).
 */
export function OrderBlock({ block }: { block: PublicBlock }) {
  const { page, promotion, preview, onPromotionExpire } = useLandingContext()
  const combos = page.combos
  const router = useRouter()
  const queryClient = useQueryClient()
  const placeOrder = usePlaceOrder()
  const [notice, setNotice] = useState<{ title: string; message: string } | null>(null)
  // clientRequestId: sinh khi mở form, giữ khi thử lại (nháp lỗi mạng), đổi mới sau khi đặt thành công (07 §3.6)
  const [requestId, setRequestId] = useState<string>(() => readOrderDraft()?.clientRequestId ?? newId())
  const [comboPicked, setComboPicked] = useState(() => !!readOrderDraft()?.comboId)
  const defaultComboId = (combos.find((c) => c.isDefault) ?? combos[0])?.id ?? ''

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    mode: 'onTouched',
    defaultValues: {
      comboId: defaultComboId,
      quantity: 1,
      customerName: '',
      phone: '',
      province: '',
      address: '',
      note: '',
    },
  })
  const { register, control, handleSubmit, setValue, formState, setError, getValues } = form

  // Khôi phục nháp sau lỗi mạng (giữ clientRequestId, NFR-03)
  useEffect(() => {
    if (preview) return
    const draft = readOrderDraft()
    if (draft) {
      const { clientRequestId: _id, ...values } = draft
      void _id
      form.reset({ ...getValues(), ...Object.fromEntries(Object.entries(values).filter(([, v]) => v !== undefined)) })
    }
  }, [preview, form, getValues])

  // Combo mặc định theo dữ liệu mới nhất (máy chủ render từ seed, trình duyệt nạp lại từ API/localStorage, TC-34):
  // khách chưa tự chọn thì theo combo mặc định mới; combo đang chọn bị ẩn/xóa thì về combo mặc định
  const comboId = useWatch({ control: form.control, name: 'comboId' })
  useEffect(() => {
    if (!defaultComboId) return
    const stillVisible = combos.some((c) => c.id === comboId)
    if ((!comboPicked || !stillVisible) && comboId !== defaultComboId) {
      setValue('comboId', defaultComboId, { shouldDirty: false })
    }
  }, [combos, comboId, defaultComboId, setValue, comboPicked])

  const pickCombo = (id: string) => {
    setComboPicked(true)
    setValue('comboId', id, { shouldValidate: true, shouldDirty: true })
  }

  const combo = combos.find((c) => c.id === comboId)
  const quantity = useWatch({ control: form.control, name: 'quantity' })
  const amounts = useMemo(
    () => (combo ? amountsFromUnit(combo.price, quantity || 1, combo.freeShipping) : null),
    [combo, quantity]
  )

  const onFieldFocus = () => {
    if (!preview) trackStartForm()
  }

  const showNotice = (message: string, title = 'Chưa đặt được hàng') => setNotice({ title, message })

  const onSubmit = async (values: OrderFormValues) => {
    if (preview || !combo) return
    const wait = orderCooldownLeft()
    if (wait > 0) {
      showNotice(salesMessages.orderCooldown)
      return
    }
    const visit = useVisitStore.getState()
    const request = {
      clientRequestId: requestId,
      visitorId: visit.visitorId ?? getVisitorId(),
      visitId: visit.visitId,
      customerName: values.customerName,
      phone: normalizePhone(values.phone),
      province: values.province,
      address: values.address,
      note: values.note?.trim() || undefined,
      comboId: values.comboId,
      quantity: values.quantity,
      expectedPrice: combo.price,
      attribution: visit.attribution,
      device: detectDevice(navigator.userAgent),
    }
    try {
      const result = await placeOrder.mutateAsync(request)
      savePlacedOrder(result.order)
      markOrderPlaced(new Date().toISOString())
      clearOrderDraft()
      setRequestId(newId())
      router.push(routePath.thankYou)
    } catch (error) {
      const code = errorCodeOf(error)
      if (isApiError(error) && error.status === 0) {
        saveOrderDraft({ clientRequestId: request.clientRequestId, ...values })
        showNotice(salesMessages.networkError)
        return
      }
      // Chỉ gắn lỗi vào ô có trên form; khóa khác (vd expectedPrice, visitorId) rơi xuống thông báo theo detail
      if (applyFieldErrors(setError, error, ORDER_FORM_FIELDS)) return
      const detail = getErrorMessage(error)
      switch (code) {
        case 'ComboDaThayDoi':
          toast.error(detail)
          await queryClient.refetchQueries({ queryKey: publicKeys.landing })
          document.getElementById(ORDER_ANCHOR_ID)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          return
        case 'GiaDaThayDoi':
          await queryClient.refetchQueries({ queryKey: publicKeys.landing })
          await queryClient.refetchQueries({ queryKey: publicKeys.promotion })
          showNotice(detail, 'Giá vừa thay đổi')
          return
        default:
          showNotice(detail)
      }
    }
  }

  const submitting = placeOrder.isPending || formState.isSubmitting

  return (
    <section id={ORDER_ANCHOR_ID} aria-label={block.title} className="scroll-mt-2 bg-[var(--landing-surface)] px-4 py-10">
      <SectionHeader title={block.title} subtitle={block.subtitle} eyebrow="Đặt hàng, thanh toán khi nhận" />

      {combos.length === 0 ? (
        <p className="text-muted-foreground rounded-2xl bg-[var(--landing-soft)] px-4 py-8 text-center font-medium">
          Sản phẩm tạm hết, vui lòng quay lại sau
        </p>
      ) : (
        <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Countdown promotion={promotion} variant="compact" onExpire={onPromotionExpire} />

          <fieldset>
            <legend className="mb-3 text-[0.9375rem] font-semibold text-[var(--landing-ink)]">1. Chọn combo</legend>
            <div role="radiogroup" aria-label="Chọn combo" className="space-y-3">
              {combos.map((c) => (
                <ComboCard
                  key={c.id}
                  combo={c}
                  unit={page.product.unit}
                  selected={c.id === comboId}
                  onSelect={() => pickCombo(c.id)}
                />
              ))}
            </div>
            <UpsellHint combos={combos} current={combo} onPick={pickCombo} />
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="mb-3 text-[0.9375rem] font-semibold text-[var(--landing-ink)]">2. Thông tin nhận hàng</legend>

            <Field label="Họ tên" htmlFor="customerName" error={formState.errors.customerName?.message}>
              <input
                id="customerName"
                autoComplete="name"
                placeholder="Nguyễn Thị Hoa"
                aria-invalid={!!formState.errors.customerName || undefined}
                aria-describedby={formState.errors.customerName ? 'customerName-error' : undefined}
                className={inputClass}
                onFocus={onFieldFocus}
                {...register('customerName')}
              />
            </Field>

            <Field label="Số điện thoại" htmlFor="phone" error={formState.errors.phone?.message} hint="Nhân viên gọi số này để xác nhận đơn">
              <input
                id="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="0912 345 678"
                aria-invalid={!!formState.errors.phone || undefined}
                aria-describedby={formState.errors.phone ? 'phone-error' : 'phone-hint'}
                className={inputClass}
                onFocus={onFieldFocus}
                {...register('phone', {
                  onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
                    const normalized = normalizePhone(e.target.value)
                    if (normalized !== e.target.value) setValue('phone', normalized, { shouldValidate: true })
                  },
                })}
              />
            </Field>

            <Field label="Tỉnh/thành" htmlFor="province" error={formState.errors.province?.message}>
              <Controller
                control={control}
                name="province"
                render={({ field, fieldState }) => (
                  <ProvinceCombobox
                    id="province"
                    value={field.value}
                    onChange={(v) => field.onChange(v)}
                    onBlur={field.onBlur}
                    onFocus={onFieldFocus}
                    invalid={!!fieldState.error}
                    describedBy={fieldState.error ? 'province-error' : undefined}
                  />
                )}
              />
            </Field>

            <Field label="Địa chỉ chi tiết" htmlFor="address" error={formState.errors.address?.message}>
              <input
                id="address"
                autoComplete="street-address"
                placeholder="Số nhà, đường, phường/xã"
                aria-invalid={!!formState.errors.address || undefined}
                aria-describedby={formState.errors.address ? 'address-error' : undefined}
                className={inputClass}
                onFocus={onFieldFocus}
                {...register('address')}
              />
            </Field>

            <Field label="Số lượng" htmlFor="quantity" error={formState.errors.quantity?.message}>
              <Controller
                control={control}
                name="quantity"
                render={({ field }) => (
                  <div className="flex items-center gap-3">
                    <div className="border-input flex items-center overflow-hidden rounded-xl border">
                      <button
                        type="button"
                        className="hover:bg-muted flex size-12 items-center justify-center disabled:opacity-40"
                        onClick={() => field.onChange(Math.max(salesRules.quantityMin, field.value - 1))}
                        disabled={field.value <= salesRules.quantityMin}
                        aria-label="Giảm số lượng"
                      >
                        <Minus className="size-4" aria-hidden="true" />
                      </button>
                      <output id="quantity" aria-live="polite" className="w-12 text-center text-lg font-semibold tabular-nums">
                        {field.value}
                      </output>
                      <button
                        type="button"
                        className="hover:bg-muted flex size-12 items-center justify-center disabled:opacity-40"
                        onClick={() => {
                          onFieldFocus()
                          field.onChange(Math.min(salesRules.quantityMax, field.value + 1))
                        }}
                        disabled={field.value >= salesRules.quantityMax}
                        aria-label="Tăng số lượng"
                      >
                        <Plus className="size-4" aria-hidden="true" />
                      </button>
                    </div>
                    <span className="text-muted-foreground text-sm">suất (tối đa {salesRules.quantityMax})</span>
                  </div>
                )}
              />
            </Field>

            <Field label="Ghi chú (không bắt buộc)" htmlFor="note" error={formState.errors.note?.message}>
              <textarea
                id="note"
                rows={2}
                placeholder="Vd: giao giờ hành chính"
                aria-invalid={!!formState.errors.note || undefined}
                className={cn(inputClass, 'h-auto min-h-20 py-3')}
                onFocus={onFieldFocus}
                {...register('note')}
              />
            </Field>
          </fieldset>

          {amounts && combo ? (
            <div className="space-y-2 rounded-2xl bg-[var(--landing-soft)] p-4 text-[0.9375rem]">
              <p className="flex justify-between gap-3">
                <span className="text-muted-foreground">
                  {combo.name} × {quantity}
                </span>
                <span className="font-medium tabular-nums">{formatVnd(amounts.subtotal)}</span>
              </p>
              <p className="flex justify-between gap-3">
                <span className="text-muted-foreground">Phí vận chuyển</span>
                <span className="font-medium tabular-nums">
                  {amounts.shippingFee === 0 ? <span className="text-success">Miễn phí</span> : formatVnd(amounts.shippingFee)}
                </span>
              </p>
              <p className="border-border flex items-baseline justify-between gap-3 border-t pt-2">
                <span className="font-semibold text-[var(--landing-ink)]">Tổng thanh toán khi nhận hàng</span>
                <span className="text-xl font-bold text-[var(--landing-price)] tabular-nums">{formatVnd(amounts.total)}</span>
              </p>
              {amounts.shippingFee > 0 ? (
                <p className="text-muted-foreground text-xs">
                  Mua thêm {moneyText(page.freeShippingThreshold - amounts.subtotal)} để được miễn phí vận chuyển
                </p>
              ) : null}
            </div>
          ) : null}

          <Button
            type="submit"
            variant="cta"
            className="h-14 w-full rounded-xl text-base font-bold shadow-md"
            disabled={submitting || preview}
            aria-disabled={submitting || preview}
          >
            {submitting ? (
              <>
                <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                Đang gửi…
              </>
            ) : (
              <>
                {block.ctaText || 'Đặt hàng'}
                {amounts ? <span className="font-semibold opacity-90">· {formatVnd(amounts.total)}</span> : null}
              </>
            )}
          </Button>

          <ul className="text-muted-foreground grid grid-cols-3 gap-2 text-center text-xs">
            <li className="flex flex-col items-center gap-1">
              <Banknote className="text-primary size-5" aria-hidden="true" />
              Thanh toán khi nhận
            </li>
            <li className="flex flex-col items-center gap-1">
              <PackageCheck className="text-primary size-5" aria-hidden="true" />
              Kiểm hàng trước
            </li>
            <li className="flex flex-col items-center gap-1">
              <ShieldCheck className="text-primary size-5" aria-hidden="true" />
              Đổi trả 7 ngày
            </li>
          </ul>
          {block.body ? <p className="text-muted-foreground text-center text-sm">{block.body}</p> : null}
        </form>
      )}

      <AlertDialog open={!!notice} onOpenChange={(open) => !open && setNotice(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="text-warning size-5" aria-hidden="true" />
              {notice?.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-foreground text-base">{notice?.message}</AlertDialogDescription>
          </AlertDialogHeader>
          {page.store.hotline ? (
            <p className="text-muted-foreground text-sm">
              Cần hỗ trợ? Gọi hotline{' '}
              <a className="text-primary font-semibold" href={`tel:${page.store.hotline.replace(/[^\d+]/g, '')}`}>
                {page.store.hotline}
              </a>
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogAction className="h-11">Đã hiểu</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}

const inputClass = cn(
  'border-input h-12 w-full rounded-xl border bg-[var(--landing-surface)] px-3.5 text-base outline-none transition-[box-shadow,border-color]',
  'placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-3',
  'aria-invalid:border-destructive aria-invalid:ring-destructive/20 aria-invalid:ring-3'
)

function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string
  htmlFor: string
  error?: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-[var(--landing-ink)]">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="text-destructive flex items-start gap-1 text-sm">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-muted-foreground text-xs">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

function ComboCard({
  combo,
  unit,
  selected,
  onSelect,
}: {
  combo: PublicCombo
  unit: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        'relative flex w-full gap-3 rounded-2xl border-2 bg-[var(--landing-surface)] p-3 text-left transition-[border-color,box-shadow]',
        selected ? 'border-primary shadow-md' : 'border-border hover:border-primary/50'
      )}
    >
      {combo.badge ? (
        <span className="bg-cta text-cta-foreground absolute -top-2.5 right-3 rounded-full px-2.5 py-0.5 text-[0.6875rem] font-bold shadow-sm">
          {combo.badge}
        </span>
      ) : null}
      <LandingImage src={combo.imageUrl} alt="" width={600} height={600} className="w-20 shrink-0 self-start rounded-xl" />
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className="text-base leading-snug font-bold text-[var(--landing-ink)]">{combo.name}</span>
          <span
            className={cn(
              'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2',
              selected ? 'border-primary bg-primary text-primary-foreground' : 'border-input'
            )}
            aria-hidden="true"
          >
            {selected ? <Check className="size-3" strokeWidth={3} /> : null}
          </span>
        </span>
        <span className="text-muted-foreground mt-0.5 block text-[0.8125rem] leading-snug">{combo.description}</span>
        {combo.giftText ? (
          <span className="text-primary mt-1 flex items-center gap-1 text-[0.8125rem] font-medium">
            <Gift className="size-3.5 shrink-0" aria-hidden="true" />
            Tặng {combo.giftText}
          </span>
        ) : null}
        <span className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
          <span className="text-lg font-bold text-[var(--landing-price)] tabular-nums">{formatVnd(combo.price)}</span>
          {combo.compareAtPrice ? (
            <span className="text-muted-foreground text-sm line-through tabular-nums">{formatVnd(combo.compareAtPrice)}</span>
          ) : null}
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
          <span className="font-medium text-[var(--landing-ink)]">
            {formatVnd(combo.pricePerBottle)}/{unit}
          </span>
          <span className={cn('inline-flex items-center gap-1', combo.freeShipping ? 'text-success' : 'text-muted-foreground')}>
            <Truck className="size-3.5" aria-hidden="true" />
            {combo.freeShipping ? 'Miễn phí vận chuyển' : `Phí vận chuyển ${formatVnd(combo.shippingFeeForOne)}`}
          </span>
        </span>
      </span>
    </button>
  )
}

/** Gợi ý nâng combo khi khách đang chọn combo 1 chai (tăng giá trị đơn) */
function UpsellHint({
  combos,
  current,
  onPick,
}: {
  combos: PublicCombo[]
  current?: PublicCombo
  onPick: (id: string) => void
}) {
  if (!current || current.bottleCount > 1) return null
  const better = combos
    .filter((c) => c.bottleCount > current.bottleCount && c.pricePerBottle < current.pricePerBottle)
    .sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0) || a.price - b.price)[0]
  if (!better) return null
  return (
    <button
      type="button"
      onClick={() => onPick(better.id)}
      className="mt-3 flex w-full items-center gap-2.5 rounded-xl bg-[var(--landing-urgent)] px-3.5 py-3 text-left text-sm text-[var(--landing-urgent-foreground)]"
    >
      <Sparkles className="size-4 shrink-0" aria-hidden="true" />
      <span>
        Thêm <strong>{moneyText(better.price - current.price)}</strong> để lấy <strong>{better.name}</strong>: chỉ{' '}
        {moneyText(better.pricePerBottle)}/chai{better.giftText ? ', có quà tặng' : ''}
        {better.freeShipping ? ', miễn phí vận chuyển' : ''}.
      </span>
    </button>
  )
}
