'use client'

import { useMemo, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  CalendarClock,
  Check,
  Loader2,
  Minus,
  PhoneMissed,
  PhoneOff,
  Plus,
  Save,
  UserX,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { FormField } from '@/components/shared/FormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  callResultLabels,
  callResultOrder,
  cancelReasonLabels,
  customerCancelReasons,
  provinces,
} from '@/config/landing-labels'
import { salesRules } from '@/config/sales-rules'
import { applyFieldErrors } from '@/lib/api-error'
import { formatVnd } from '@/lib/format'
import { cn } from '@/lib/utils'
import type {
  CallResult,
  CancelReason,
  ComboDto,
  OrderChanges,
  OrderDetailDto,
} from '@/types/landing'
import { fromVnLocalInput, toVnLocalInput, vnKey } from '@/features/reports/lib/vn-date'
import { useOrderAction } from '../hooks/use-orders'
import { orderChangesSchema, type OrderChangesForm } from '../schemas/order.schema'
import { orderService } from '../services/order.service'

const RESULT_ICONS: Record<CallResult, LucideIcon> = {
  XacNhan: Check,
  KhongNgheMay: PhoneMissed,
  ThueBao: PhoneOff,
  HenGoiLai: CalendarClock,
  KhachHuy: XCircle,
  SaiSo: UserX,
}

/** Tiền xem trước theo 07 §3.1, giữ PriceType đã chốt; không đổi combo/số lượng thì giữ đơn giá đã chụp */
function previewAmounts(order: OrderDetailDto, combo: ComboDto | undefined, quantity: number) {
  const same = combo?.id === order.comboId && quantity === order.quantity
  const unit = same
    ? order.unitPrice
    : combo
      ? order.priceType === 'KhuyenMai'
        ? combo.promoPrice
        : combo.regularPrice
      : order.unitPrice
  const subtotal = unit * quantity
  const free = combo ? combo.freeShipping : order.shippingFee === 0
  const shippingFee =
    free || subtotal >= salesRules.freeShippingThreshold ? 0 : salesRules.shippingFee
  return {
    unit,
    subtotal,
    shippingFee,
    total: subtotal + shippingFee,
    upsell: Math.max(0, subtotal - order.placedSubtotal),
  }
}

/** Gợi ý giờ gọi lại (07 §4.5): +30 phút, +1 giờ, +2 giờ, 19:00 (hôm nay, đã qua thì mai) */
function callbackSuggestions(now = Date.now()) {
  const today = vnKey(now)
  let seven = Date.parse(`${today}T19:00:00+07:00`)
  if (seven <= now) seven += 86_400_000
  return [
    { label: '+30 phút', at: now + 30 * 60_000 },
    { label: '+1 giờ', at: now + 60 * 60_000 },
    { label: '+2 giờ', at: now + 120 * 60_000 },
    { label: vnKey(seven) === today ? '19:00' : '19:00 mai', at: seven },
  ]
}

const toForm = (o: OrderDetailDto): OrderChangesForm => ({
  customerName: o.customerName,
  province: o.province,
  address: o.address,
  comboId: o.comboId,
  quantity: o.quantity,
})

/**
 * Sửa đơn khi gọi và ghi kết quả gọi (SCR-06; UC-03, FR-22, FR-23, BR-10, NFR-05 ≤ 3 thao tác).
 * "Xác nhận" lưu ngay, kèm `changes` nếu đã sửa combo, số lượng, địa chỉ; "Hẹn gọi lại", "Khách hủy" mở thêm
 * lựa chọn và khóa nút lưu khi chưa chọn (UC-03 E2).
 */
export function CallResultPanel({ order, combos }: { order: OrderDetailDto; combos: ComboDto[] }) {
  // Đơn đổi phiên bản (lưu xong, tab khác sửa) thì nạp lại form theo dữ liệu mới
  const formValues = useMemo(() => toForm(order), [order])
  const form = useForm<OrderChangesForm>({
    resolver: zodResolver(orderChangesSchema),
    values: formValues,
  })
  const watched = useWatch({ control: form.control })
  const [mode, setMode] = useState<'HenGoiLai' | 'KhachHuy' | 'SaiSo' | null>(null)
  const [callbackAt, setCallbackAt] = useState('')
  const [cancelReason, setCancelReason] = useState<CancelReason | ''>('')
  const [note, setNote] = useState('')
  const [pending, setPending] = useState<CallResult | 'save' | null>(null)

  const comboOptions = useMemo(
    () => combos.filter((c) => c.isVisible || c.id === order.comboId),
    [combos, order.comboId]
  )
  const combo = combos.find((c) => c.id === watched.comboId)
  const quantity = watched.quantity ?? order.quantity
  const preview = previewAmounts(order, combo, quantity)
  const dirty = form.formState.isDirty

  const call = useOrderAction(
    order.id,
    (input: Parameters<typeof orderService.recordCall>[1]) =>
      orderService.recordCall(order.id, input),
    {
      success: (o) =>
        o.status === 'DaXacNhan'
          ? `Đã xác nhận đơn ${o.code}${o.upsellAmount > 0 ? ` · Upsell +${formatVnd(o.upsellAmount)}` : ''}`
          : `Đã ghi kết quả gọi đơn ${o.code}`,
    }
  )
  const update = useOrderAction(
    order.id,
    (changes: OrderChanges) =>
      orderService.update(order.id, { ...changes, version: order.version }),
    { success: 'Đã lưu thay đổi đơn' }
  )

  const resetPanel = () => {
    setMode(null)
    setCallbackAt('')
    setCancelReason('')
    setNote('')
  }

  const send = async (result: CallResult, extra: { changes?: OrderChanges } = {}) => {
    setPending(result)
    try {
      await call.mutateAsync({
        result,
        version: order.version,
        note: note.trim() || undefined,
        callbackAt:
          result === 'HenGoiLai' ? (fromVnLocalInput(callbackAt) ?? undefined) : undefined,
        cancelReason: result === 'KhachHuy' ? (cancelReason as CancelReason) : undefined,
        ...extra,
      })
      resetPanel()
    } catch (error) {
      applyFieldErrors(form.setError, error, [
        'customerName',
        'province',
        'address',
        'comboId',
        'quantity',
      ])
    } finally {
      setPending(null)
    }
  }

  const confirm = () => {
    if (!dirty) return void send('XacNhan')
    void form.handleSubmit((values) => send('XacNhan', { changes: values }))()
  }

  const saveChanges = form.handleSubmit(async (values) => {
    setPending('save')
    try {
      await update.mutateAsync(values)
    } catch (error) {
      applyFieldErrors(form.setError, error)
    } finally {
      setPending(null)
    }
  })

  const onResult = (result: CallResult) => {
    if (result === 'XacNhan') return confirm()
    if (result === 'HenGoiLai' || result === 'KhachHuy' || result === 'SaiSo') {
      setMode((m) => (m === result ? null : result))
      return
    }
    void send(result)
  }

  const busy = pending !== null
  const noteRequired = mode === 'KhachHuy' && cancelReason === 'Khac'
  const callbackValid = !!fromVnLocalInput(callbackAt)

  return (
    <section aria-labelledby="call-panel-title" className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 id="call-panel-title" className="font-semibold">
          Gọi xác nhận
        </h3>
        {order.failedCallCount > 0 && (
          <span className="text-warning text-xs font-medium">
            Đã {order.failedCallCount}/{salesRules.maxFailedCalls} lần không liên lạc được
          </span>
        )}
      </div>

      {/* Sửa đơn khi gọi (BR-13: chỉ Mới, Chờ gọi lại) */}
      <div className="bg-muted/40 grid gap-3 rounded-xl border p-3 sm:grid-cols-2">
        <FormField label="Họ tên" required error={form.formState.errors.customerName?.message}>
          <Input {...form.register('customerName')} autoComplete="off" />
        </FormField>
        <FormField label="Tỉnh/thành" required error={form.formState.errors.province?.message}>
          <Controller
            control={form.control}
            name="province"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Chọn tỉnh/thành" />
                </SelectTrigger>
                <SelectContent>
                  {provinces.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
        <FormField
          label="Địa chỉ chi tiết"
          required
          error={form.formState.errors.address?.message}
          className="sm:col-span-2"
        >
          <Input {...form.register('address')} autoComplete="off" />
        </FormField>
        <FormField label="Combo" required error={form.formState.errors.comboId?.message}>
          <Controller
            control={form.control}
            name="comboId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Chọn combo" />
                </SelectTrigger>
                <SelectContent>
                  {comboOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ·{' '}
                      {formatVnd(order.priceType === 'KhuyenMai' ? c.promoPrice : c.regularPrice)}
                      {!c.isVisible && ' (đang ẩn)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
        <FormField label="Số lượng" required error={form.formState.errors.quantity?.message}>
          <Controller
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-9"
                  onClick={() => field.onChange(Math.max(salesRules.quantityMin, field.value - 1))}
                  disabled={field.value <= salesRules.quantityMin}
                  aria-label="Giảm số lượng"
                >
                  <Minus aria-hidden="true" />
                </Button>
                <span className="w-10 text-center font-semibold tabular-nums" aria-live="polite">
                  {field.value}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-9"
                  onClick={() => field.onChange(Math.min(salesRules.quantityMax, field.value + 1))}
                  disabled={field.value >= salesRules.quantityMax}
                  aria-label="Tăng số lượng"
                >
                  <Plus aria-hidden="true" />
                </Button>
              </div>
            )}
          />
        </FormField>
        <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 text-sm sm:col-span-2">
          <dt className="text-muted-foreground">Tiền hàng</dt>
          <dd className="text-right tabular-nums">{formatVnd(preview.subtotal)}</dd>
          <dt className="text-muted-foreground">Phí vận chuyển</dt>
          <dd className="text-right tabular-nums">
            {preview.shippingFee ? formatVnd(preview.shippingFee) : 'Miễn phí'}
          </dd>
          <dt className="font-medium">Tổng thu hộ</dt>
          <dd className="text-right font-semibold tabular-nums">{formatVnd(preview.total)}</dd>
          {preview.upsell > 0 && (
            <dd className="text-success col-span-2 text-right font-semibold" aria-live="polite">
              Upsell +{formatVnd(preview.upsell)}
            </dd>
          )}
        </dl>
        {dirty && (
          <div className="flex flex-wrap items-center justify-end gap-2 sm:col-span-2">
            <span className="text-muted-foreground mr-auto text-xs">
              Bấm Xác nhận để lưu thay đổi cùng cuộc gọi
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => form.reset(toForm(order))}
            >
              Hoàn tác
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={saveChanges} disabled={busy}>
              {pending === 'save' ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Save aria-hidden="true" />
              )}
              Lưu sửa đơn
            </Button>
          </div>
        )}
      </div>

      {/* Kết quả gọi */}
      <div
        className="grid grid-cols-2 gap-2 sm:grid-cols-3"
        role="group"
        aria-label="Kết quả cuộc gọi"
      >
        {callResultOrder.map((result) => {
          const Icon = RESULT_ICONS[result]
          const active = mode === result
          const isConfirm = result === 'XacNhan'
          return (
            <Button
              key={result}
              type="button"
              variant={isConfirm ? 'default' : active ? 'secondary' : 'outline'}
              className={cn(
                'h-11 justify-start',
                active && 'ring-primary/40 ring-2',
                (result === 'KhachHuy' || result === 'SaiSo') && !active && 'text-destructive'
              )}
              aria-pressed={
                result === 'HenGoiLai' || result === 'KhachHuy' || result === 'SaiSo'
                  ? active
                  : undefined
              }
              disabled={busy}
              onClick={() => onResult(result)}
            >
              {pending === result ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <Icon aria-hidden="true" />
              )}
              <span className="truncate">
                {isConfirm && preview.upsell > 0 && dirty
                  ? 'Xác nhận + upsell'
                  : callResultLabels[result]}
              </span>
            </Button>
          )
        })}
      </div>

      {mode === 'HenGoiLai' && <CallbackPicker value={callbackAt} onChange={setCallbackAt} />}

      {mode === 'KhachHuy' && (
        <fieldset className="space-y-2 rounded-xl border p-3">
          <legend className="px-1 text-sm font-medium">Lý do khách hủy</legend>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Lý do khách hủy">
            {customerCancelReasons.map((r) => (
              <Button
                key={r}
                type="button"
                size="sm"
                role="radio"
                aria-checked={cancelReason === r}
                variant={cancelReason === r ? 'default' : 'outline'}
                onClick={() => setCancelReason(r)}
              >
                {cancelReasonLabels[r]}
              </Button>
            ))}
          </div>
        </fieldset>
      )}

      {mode === 'SaiSo' && (
        <p className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
          Đơn sẽ chuyển Đã hủy với lý do &quot;Sai số điện thoại&quot;.
        </p>
      )}

      <div className="grid gap-1.5">
        <Label htmlFor={`call-note-${order.id}`}>
          Ghi chú cuộc gọi
          {noteRequired ? <span className="text-destructive">*</span> : ' (tùy chọn)'}
        </Label>
        <Textarea
          id={`call-note-${order.id}`}
          value={note}
          maxLength={salesRules.noteMax}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Vd: khách hẹn gọi sau giờ làm"
          rows={2}
        />
      </div>

      {mode && (
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={resetPanel} disabled={busy}>
            Bỏ chọn
          </Button>
          <Button
            type="button"
            variant={mode === 'HenGoiLai' ? 'default' : 'danger'}
            disabled={
              busy ||
              (mode === 'HenGoiLai' && !callbackValid) ||
              (mode === 'KhachHuy' && (!cancelReason || (noteRequired && !note.trim())))
            }
            onClick={() => void send(mode)}
          >
            {pending === mode && <Loader2 className="animate-spin" aria-hidden="true" />}
            {mode === 'HenGoiLai'
              ? 'Lưu hẹn gọi lại'
              : mode === 'KhachHuy'
                ? 'Lưu khách hủy'
                : 'Xác nhận sai số'}
          </Button>
        </div>
      )}
    </section>
  )
}

/** Chọn giờ gọi lại: gợi ý nhanh + ô ngày giờ (giờ VN), trong 7 ngày tới (07 §2.5) */
function CallbackPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [now] = useState(() => Date.now())
  return (
    <div className="space-y-2 rounded-xl border p-3">
      <p className="text-sm font-medium">Chọn giờ gọi lại</p>
      <div className="flex flex-wrap gap-1.5">
        {callbackSuggestions(now).map((s) => {
          const v = toVnLocalInput(s.at)
          return (
            <Button
              key={s.label}
              type="button"
              size="sm"
              variant={value === v ? 'default' : 'outline'}
              onClick={() => onChange(v)}
            >
              {s.label}
            </Button>
          )
        })}
      </div>
      <Input
        type="datetime-local"
        value={value}
        min={toVnLocalInput(now)}
        max={toVnLocalInput(now + salesRules.maxCallbackDays * 86_400_000)}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Giờ gọi lại"
        className="w-60"
      />
    </div>
  )
}
