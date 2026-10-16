'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  Ban,
  Copy,
  Hand,
  Loader2,
  PackageCheck,
  Phone,
  RotateCcw,
  Send,
  Truck,
} from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { ErrorState } from '@/components/shared/ErrorState'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  cancelReasonLabels,
  carrierLabels,
  deviceLabels,
  priceTypeLabels,
  returnReasonLabels,
  sourceLabel,
  userCancelReasons,
} from '@/config/landing-labels'
import { permissions } from '@/config/permissions'
import { salesRules } from '@/config/sales-rules'
import { usePermissions } from '@/hooks/use-permissions'
import { getErrorMessage, getFieldErrors } from '@/lib/api-error'
import { formatPhone, formatRelativeTime, formatVnd } from '@/lib/format'
import type {
  CancelReason,
  ComboDto,
  OrderDetailDto,
  OrderStatus,
  RelatedOrder,
  ReturnReason,
} from '@/types/landing'
import { vnDateTimeText } from '@/features/reports/lib/vn-date'
import { handleOrderError, useOrder, useOrderAction } from '../hooks/use-orders'
import { orderService } from '../services/order.service'
import { CallResultPanel } from './CallResultPanel'
import { HandoverDialog } from './HandoverDialog'
import { OrderStatusBadge, OrderTagBadges } from './OrderBadges'
import { CallHistory, OrderTimeline } from './OrderTimeline'
import { ReasonDialog } from './ReasonDialog'
import { RelatedOrders } from './RelatedOrders'

const CALLABLE: OrderStatus[] = ['Moi', 'ChoGoiLai']
const CANCELLABLE: OrderStatus[] = ['Moi', 'ChoGoiLai', 'DaXacNhan']
const returnReasons = Object.keys(returnReasonLabels) as ReturnReason[]

/** Ngăn chi tiết đơn bên phải (SCR-06; FR-21…FR-27; UC-03, UC-04, UC-07, UC-08, UC-09) */
export function OrderDetailSheet({
  orderId,
  onClose,
  onOpenOrder,
  combos,
}: {
  orderId: string | null
  onClose: () => void
  onOpenOrder: (id: string) => void
  combos: ComboDto[]
}) {
  const { data: order, error, isLoading, refetch } = useOrder(orderId)
  return (
    <Sheet open={!!orderId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 overflow-y-auto p-0 data-[side=right]:sm:max-w-[720px]">
        {order && order.id === orderId ? (
          <DetailBody key={order.id} order={order} combos={combos} onOpenOrder={onOpenOrder} />
        ) : (
          <>
            <SheetHeader className="border-b p-5">
              <SheetTitle>Chi tiết đơn</SheetTitle>
              <SheetDescription className="sr-only">Đang tải chi tiết đơn</SheetDescription>
            </SheetHeader>
            {error && !isLoading ? (
              <ErrorState error={error} onRetry={() => void refetch()} />
            ) : (
              <div className="space-y-3 p-5" aria-busy="true">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

function DetailBody({
  order,
  combos,
  onOpenOrder,
}: {
  order: OrderDetailDto
  combos: ComboDto[]
  onOpenOrder: (id: string) => void
}) {
  const { can } = usePermissions()
  const queryClient = useQueryClient()
  const [dialog, setDialog] = useState<
    'cancel' | 'cancelDup' | 'return' | 'deliver' | 'handover' | 'notDup' | null
  >(null)
  const [dupTarget, setDupTarget] = useState<RelatedOrder | null>(null)
  const [note, setNote] = useState('')
  const [noteError, setNoteError] = useState<string>()

  const canCall = can(permissions.orders.call)
  const canCancel = can(permissions.orders.cancel)
  const canShip = can(permissions.orders.ship)
  const isDup = order.tags.includes('Trung')
  const returned = order.relatedOrders.filter((o) => o.status === 'HoanHang')

  const claim = useOrderAction(order.id, () => orderService.claim(order.id), {
    success: (o) => `Đã nhận đơn ${o.code}`,
  })
  const cancel = useOrderAction(
    order.id,
    (v: { reason: CancelReason; note?: string }) =>
      orderService.cancel(order.id, { ...v, version: order.version }),
    { success: (o) => `Đã hủy đơn ${o.code}` }
  )
  const notDup = useOrderAction(
    order.id,
    () => orderService.notDuplicate(order.id, { version: order.version }),
    { success: 'Đã bỏ nhãn Trùng ở các đơn cùng số' }
  )
  const deliver = useOrderAction(
    order.id,
    () => orderService.deliver(order.id, { version: order.version }),
    { success: (o) => `Đơn ${o.code} đã giao thành công` }
  )
  const returnOrder = useOrderAction(
    order.id,
    (v: { reason: ReturnReason; note?: string }) =>
      orderService.returnOrder(order.id, { ...v, version: order.version }),
    { success: (o) => `Đơn ${o.code} chuyển Hoàn hàng` }
  )
  const addNote = useOrderAction(
    order.id,
    (content: string) => orderService.addNote(order.id, { content }),
    { success: 'Đã thêm ghi chú' }
  )
  const [dupPending, setDupPending] = useState(false)

  /** Hủy một đơn cùng số với lý do Đơn trùng: lấy phiên bản mới nhất của đơn đó trước */
  const cancelRelatedDuplicate = async () => {
    if (!dupTarget) return
    setDupPending(true)
    try {
      const target = await orderService.getById(dupTarget.id)
      const result = await orderService.cancel(target.id, {
        reason: 'DonTrung',
        version: target.version,
      })
      queryClient.setQueryData(['order', result.id], result)
      void queryClient.invalidateQueries({ queryKey: ['orders'] })
      void queryClient.invalidateQueries({ queryKey: ['order', order.id] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success(`Đã hủy đơn trùng ${result.code}`)
    } catch (err) {
      handleOrderError(queryClient, dupTarget.id, err)
      throw err
    } finally {
      setDupPending(false)
    }
  }

  const submitNote = async () => {
    setNoteError(undefined)
    try {
      await addNote.mutateAsync(note)
      setNote('')
    } catch (err) {
      setNoteError(getFieldErrors(err).content ?? getErrorMessage(err))
    }
  }

  const isUnassigned = !order.assigneeId

  return (
    <>
      <SheetHeader className="bg-card sticky top-0 z-10 gap-2 border-b p-5 pr-12">
        <div className="flex flex-wrap items-center gap-2">
          <SheetTitle className="font-mono text-lg">{order.code}</SheetTitle>
          <OrderStatusBadge status={order.status} />
          <OrderTagBadges tags={order.tags} />
        </div>
        <SheetDescription>
          Đặt {formatRelativeTime(order.placedAt)} ({vnDateTimeText(order.placedAt)}) ·{' '}
          {order.assigneeName ? `Phụ trách: ${order.assigneeName}` : 'Chưa chia'}
        </SheetDescription>
        {isUnassigned && canCall && CALLABLE.includes(order.status) && (
          <Button
            className="w-fit"
            onClick={() => claim.mutate(undefined)}
            disabled={claim.isPending}
          >
            {claim.isPending ? <Loader2 className="animate-spin" /> : <Hand aria-hidden="true" />}
            Nhận đơn
          </Button>
        )}
      </SheetHeader>

      <div className="space-y-6 p-5">
        {/* Cảnh báo rủi ro hoàn (BR-15, UC-03 E3, TC-18) */}
        {(order.tags.includes('RuiRoHoan') ||
          order.returnedCount >= salesRules.returnRiskThreshold) && (
          <div
            role="alert"
            className="border-destructive/40 bg-destructive/5 space-y-2 rounded-xl border p-3"
          >
            <p className="text-destructive flex items-center gap-2 font-semibold">
              <AlertTriangle className="size-4" aria-hidden="true" />
              Rủi ro hoàn: khách có {order.returnedCount} đơn hoàn hàng
            </p>
            <ul className="text-sm">
              {returned.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    className="font-mono underline-offset-4 hover:underline"
                    onClick={() => onOpenOrder(o.id)}
                  >
                    {o.code}
                  </button>{' '}
                  · {vnDateTimeText(o.placedAt)} · {o.comboName} × {o.quantity}
                  {o.returnReason && ` · ${returnReasonLabels[o.returnReason]}`}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Đơn trùng (UC-04, FR-24); đơn đã hủy giữ nhãn để biết lý do (07 §5 quyết định 16), không còn thao tác */}
        {isDup && canCall && order.status !== 'DaHuy' && (
          <div className="border-warning/40 bg-warning/5 flex flex-wrap items-center gap-2 rounded-xl border p-3">
            <p className="text-warning mr-auto flex items-center gap-2 text-sm font-semibold">
              <Copy className="size-4" aria-hidden="true" />
              Có đơn cùng số trong 24 giờ
            </p>
            {canCancel && CANCELLABLE.includes(order.status) && (
              <Button size="sm" variant="destructive" onClick={() => setDialog('cancelDup')}>
                Hủy đơn này (Đơn trùng)
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setDialog('notDup')}>
              Không phải trùng
            </Button>
          </div>
        )}

        {/* Khách, đơn */}
        <section className="grid gap-4 sm:grid-cols-2" aria-label="Thông tin khách và đơn">
          <dl className="space-y-1.5 text-sm">
            <dt className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              Khách hàng
            </dt>
            <dd className="text-base font-semibold">{order.customerName}</dd>
            <dd>
              <a
                href={`tel:${order.phone}`}
                className="text-primary inline-flex items-center gap-1.5 font-medium tabular-nums underline-offset-4 hover:underline"
              >
                <Phone className="size-4" aria-hidden="true" />
                {formatPhone(order.phone)}
              </a>
            </dd>
            <dd>
              {order.address}, {order.province}
            </dd>
            {order.note && (
              <dd className="text-muted-foreground italic">Ghi chú khách: {order.note}</dd>
            )}
          </dl>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <dt className="text-muted-foreground">Nguồn</dt>
            <dd>
              {sourceLabel(order.source)}
              {order.medium && ` · ${order.medium}`}
            </dd>
            {order.campaign && (
              <>
                <dt className="text-muted-foreground">Chiến dịch</dt>
                <dd>{order.campaign}</dd>
              </>
            )}
            {order.adContent && (
              <>
                <dt className="text-muted-foreground">Nội dung</dt>
                <dd>{order.adContent}</dd>
              </>
            )}
            {order.referrer && (
              <>
                <dt className="text-muted-foreground">Trang giới thiệu</dt>
                <dd>{order.referrer}</dd>
              </>
            )}
            <dt className="text-muted-foreground">Thiết bị</dt>
            <dd>{deviceLabels[order.device]}</dd>
            <dt className="text-muted-foreground">Mức giá</dt>
            <dd>{priceTypeLabels[order.priceType]}</dd>
          </dl>
        </section>

        {CALLABLE.includes(order.status) && canCall ? (
          <CallResultPanel order={order} combos={combos} />
        ) : (
          <OrderMoney order={order} />
        )}

        {/* Thao tác theo trạng thái */}
        <div className="flex flex-wrap gap-2">
          {canShip && order.status === 'DaXacNhan' && (
            <Button onClick={() => setDialog('handover')}>
              <Truck aria-hidden="true" />
              Bàn giao vận chuyển
            </Button>
          )}
          {canShip && order.status === 'DangGiao' && (
            <>
              <Button onClick={() => setDialog('deliver')}>
                <PackageCheck aria-hidden="true" />
                Đã giao
              </Button>
              <Button variant="outline" onClick={() => setDialog('return')}>
                <RotateCcw aria-hidden="true" />
                Hoàn hàng
              </Button>
            </>
          )}
          {canCancel && CANCELLABLE.includes(order.status) && (
            <Button variant="destructive" onClick={() => setDialog('cancel')}>
              <Ban aria-hidden="true" />
              Hủy đơn
            </Button>
          )}
        </div>

        {order.status === 'DaHuy' && order.cancelReason && (
          <p className="bg-muted rounded-lg p-3 text-sm">
            Đã hủy: <strong>{cancelReasonLabels[order.cancelReason]}</strong>
            {order.cancelNote && ` · ${order.cancelNote}`} · {order.cancelledByName ?? 'Hệ thống'} ·{' '}
            {vnDateTimeText(order.cancelledAt)}
          </p>
        )}

        {order.shipment && (
          <section aria-labelledby="ship-title" className="space-y-2">
            <h3 id="ship-title" className="font-semibold">
              Vận đơn
            </h3>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-lg border p-3 text-sm">
              <dt className="text-muted-foreground">Đơn vị</dt>
              <dd>{carrierLabels[order.shipment.carrier]}</dd>
              <dt className="text-muted-foreground">Mã vận đơn</dt>
              <dd className="font-mono">{order.shipment.trackingCode}</dd>
              <dt className="text-muted-foreground">Tiền thu hộ</dt>
              <dd className="font-semibold tabular-nums">{formatVnd(order.shipment.codAmount)}</dd>
              <dt className="text-muted-foreground">Bàn giao</dt>
              <dd>
                {vnDateTimeText(order.shipment.handedOverAt)} · {order.shipment.handedOverByName}
              </dd>
              {order.shipment.deliveredAt && (
                <>
                  <dt className="text-muted-foreground">Giao thành công</dt>
                  <dd>{vnDateTimeText(order.shipment.deliveredAt)}</dd>
                </>
              )}
              {order.shipment.returnedAt && (
                <>
                  <dt className="text-muted-foreground">Hoàn hàng</dt>
                  <dd>
                    {vnDateTimeText(order.shipment.returnedAt)}
                    {order.returnReason && ` · ${returnReasonLabels[order.returnReason]}`}
                    {order.returnNote && `: ${order.returnNote}`}
                  </dd>
                </>
              )}
            </dl>
          </section>
        )}

        {order.relatedOrders.length > 0 && (
          <section aria-labelledby="related-title" className="space-y-2">
            <h3 id="related-title" className="font-semibold">
              Đơn cùng số điện thoại ({order.relatedOrders.length})
            </h3>
            <RelatedOrders
              orders={order.relatedOrders}
              canCancel={canCancel && isDup}
              highlightReturns
              onOpen={onOpenOrder}
              onCancelDuplicate={(o) => {
                setDupTarget(o)
                setDialog('cancelDup')
              }}
            />
          </section>
        )}

        <section aria-labelledby="calls-title" className="space-y-2">
          <h3 id="calls-title" className="font-semibold">
            Lịch sử cuộc gọi ({order.calls.length})
          </h3>
          <CallHistory calls={order.calls} />
        </section>

        <Separator />

        <section aria-labelledby="timeline-title" className="space-y-3">
          <h3 id="timeline-title" className="font-semibold">
            Dòng thời gian
          </h3>
          {can(permissions.orders.view) && (
            <div className="space-y-1.5">
              <div className="flex gap-2">
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={salesRules.noteMax}
                  rows={2}
                  placeholder="Thêm ghi chú cho đơn…"
                  aria-label="Ghi chú đơn"
                  aria-invalid={!!noteError || undefined}
                />
                <Button
                  variant="outline"
                  className="h-auto"
                  onClick={submitNote}
                  disabled={!note.trim() || addNote.isPending}
                  aria-label="Thêm ghi chú"
                >
                  {addNote.isPending ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Send aria-hidden="true" />
                  )}
                </Button>
              </div>
              {noteError && (
                <p role="alert" className="text-destructive text-[0.8125rem]">
                  {noteError}
                </p>
              )}
            </div>
          )}
          <OrderTimeline events={order.events} />
        </section>
      </div>

      <ReasonDialog
        open={dialog === 'cancel'}
        onOpenChange={(o) => !o && setDialog(null)}
        title={`Hủy đơn ${order.code}`}
        description="Đơn đã hủy không xử lý tiếp được."
        reasons={userCancelReasons}
        labels={cancelReasonLabels}
        confirmText="Hủy đơn"
        onConfirm={(reason, note) => cancel.mutateAsync({ reason, note })}
      />
      <ReasonDialog
        open={dialog === 'return'}
        onOpenChange={(o) => !o && setDialog(null)}
        title={`Hoàn hàng đơn ${order.code}`}
        reasons={returnReasons}
        labels={returnReasonLabels}
        confirmText="Xác nhận hoàn hàng"
        onConfirm={(reason, note) => returnOrder.mutateAsync({ reason, note })}
      />
      <ConfirmDialog
        open={dialog === 'deliver'}
        onOpenChange={(o) => !o && setDialog(null)}
        title={`Đơn ${order.code} đã giao thành công?`}
        description={
          <>
            Xác nhận đơn vị vận chuyển đã thu hộ{' '}
            <strong>{formatVnd(order.shipment?.codAmount ?? order.total)}</strong>. Doanh thu tính
            theo ngày giao.
          </>
        }
        icon={PackageCheck}
        confirmText="Đã giao"
        loading={deliver.isPending}
        onConfirm={() => deliver.mutateAsync(undefined).then(() => undefined)}
      />
      <ConfirmDialog
        open={dialog === 'notDup'}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Không phải đơn trùng?"
        description="Bỏ nhãn Trùng ở đơn này và mọi đơn cùng số trong 24 giờ; các đơn đều được tính vào số đơn."
        icon={Copy}
        confirmText="Không phải trùng"
        loading={notDup.isPending}
        onConfirm={() => notDup.mutateAsync(undefined).then(() => undefined)}
      />
      <ConfirmDialog
        open={dialog === 'cancelDup'}
        onOpenChange={(o) => {
          if (!o) {
            setDialog(null)
            setDupTarget(null)
          }
        }}
        title={`Hủy đơn ${dupTarget?.code ?? order.code} vì trùng?`}
        description="Đơn hủy lý do Đơn trùng không tính vào số đơn và tỉ lệ hủy."
        variant="destructive"
        icon={Ban}
        confirmText="Hủy đơn trùng"
        loading={dupPending || cancel.isPending}
        onConfirm={() =>
          dupTarget
            ? cancelRelatedDuplicate()
            : cancel.mutateAsync({ reason: 'DonTrung' }).then(() => undefined)
        }
      />
      <HandoverDialog
        open={dialog === 'handover'}
        onOpenChange={(o) => !o && setDialog(null)}
        orderIds={[order.id]}
      />
    </>
  )
}

/** Tiền đơn chỉ đọc (từ Đã xác nhận trở đi; BR-13) */
function OrderMoney({ order }: { order: OrderDetailDto }) {
  const changed =
    order.placedComboName !== order.comboName || order.placedQuantity !== order.quantity
  return (
    <section aria-label="Tiền đơn" className="rounded-xl border p-3">
      <p className="font-medium">
        {order.comboName} × {order.quantity}{' '}
        <span className="text-muted-foreground text-sm font-normal">
          ({order.bottleCount * order.quantity} chai · {formatVnd(order.unitPrice)}/suất)
        </span>
      </p>
      {changed && (
        <p className="text-muted-foreground text-sm">
          Lúc đặt: {order.placedComboName} × {order.placedQuantity} ·{' '}
          {formatVnd(order.placedSubtotal)}
        </p>
      )}
      <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 text-sm">
        <dt className="text-muted-foreground">Tiền hàng</dt>
        <dd className="text-right tabular-nums">{formatVnd(order.subtotal)}</dd>
        <dt className="text-muted-foreground">Phí vận chuyển</dt>
        <dd className="text-right tabular-nums">
          {order.shippingFee ? formatVnd(order.shippingFee) : 'Miễn phí'}
        </dd>
        <dt className="font-medium">Tổng thu hộ</dt>
        <dd className="text-right font-semibold tabular-nums">{formatVnd(order.total)}</dd>
        {order.upsellAmount > 0 && (
          <dd className="text-success col-span-2 text-right font-semibold">
            Upsell +{formatVnd(order.upsellAmount)}
          </dd>
        )}
      </dl>
      {order.confirmedAt && (
        <p className="text-muted-foreground mt-2 text-xs">
          Xác nhận {vnDateTimeText(order.confirmedAt)} · {order.confirmedByName}
        </p>
      )}
    </section>
  )
}
