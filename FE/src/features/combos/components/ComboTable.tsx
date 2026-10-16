'use client'

import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { ArrowDown, ArrowUp, Gift, PackagePlus, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { DataTable } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { salesRules } from '@/config/sales-rules'
import { getErrorMessage } from '@/lib/api-error'
import { formatNumber, formatVnd } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ComboDto } from '@/types/landing'
import { useReorderCombos, useSetComboVisibility, useSetDefaultCombo } from '../hooks/use-combos'

type ComboTableProps = {
  combos: ComboDto[] | undefined
  isLoading: boolean
  isFetching: boolean
  error: unknown
  onRetry: () => void
  canUpdate: boolean
  canDelete: boolean
  onEdit: (combo: ComboDto) => void
  onDelete: (combo: ComboDto) => void
  emptyAction?: React.ReactNode
}

/** Nút bị khóa vẫn có tooltip lý do (bọc span vì nút disabled không nhận sự kiện chuột) */
function Reason({ reason, children }: { reason?: string | null; children: React.ReactElement }) {
  if (!reason) return children
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="inline-flex rounded-md" aria-label={reason}>
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-64">{reason}</TooltipContent>
    </Tooltip>
  )
}

/** Lý do không xóa được (BR-01, SRS §5.2); null là xóa được */
function deleteReason(c: ComboDto): string | null {
  if (c.isDefault) return 'Combo mặc định không xóa được, hãy chọn combo mặc định khác trước'
  if (c.orderCount > 0) return 'Combo đã có đơn, hãy dùng Ẩn'
  return null
}

/** Bảng combo SCR-07 (FR-15, BR-01, TC-34): sắp xếp lên/xuống, mặc định, hiện/ẩn, sửa, xóa */
export function ComboTable({
  combos,
  isLoading,
  isFetching,
  error,
  onRetry,
  canUpdate,
  canDelete,
  onEdit,
  onDelete,
  emptyAction,
}: ComboTableProps) {
  const reorder = useReorderCombos()
  const visibility = useSetComboVisibility()
  const setDefault = useSetDefaultCombo()
  const list = useMemo(() => combos ?? [], [combos])
  const visibleCount = list.filter((c) => c.isVisible).length
  const busy = reorder.isPending || visibility.isPending || setDefault.isPending

  const columns = useMemo<ColumnDef<ComboDto>[]>(() => {
    const move = (index: number, delta: -1 | 1) => {
      const ids = list.map((c) => c.id)
      const target = index + delta
      ;[ids[index], ids[target]] = [ids[target], ids[index]]
      reorder.mutate(ids, { onError: (e) => toast.error(getErrorMessage(e)) })
    }

    const toggleVisible = (c: ComboDto, isVisible: boolean) =>
      visibility.mutate(
        { id: c.id, isVisible },
        {
          onSuccess: () => toast.success(isVisible ? `Đã hiện ${c.code}` : `Đã ẩn ${c.code}`),
          onError: (e) => toast.error(getErrorMessage(e)),
        }
      )

    const makeDefault = (c: ComboDto) =>
      setDefault.mutate(c.id, {
        onSuccess: () => toast.success(`${c.code} là combo mặc định trên landing`),
        onError: (e) => toast.error(getErrorMessage(e)),
      })

    const cols: ColumnDef<ComboDto>[] = [
      {
        id: 'order',
        header: 'Thứ tự',
        meta: { className: 'w-24', headerClassName: 'w-24' },
        cell: ({ row }) => {
          const i = row.index
          if (!canUpdate) return <span className="tabular-nums">{i + 1}</span>
          return (
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Đưa ${row.original.code} lên trên`}
                disabled={i === 0 || busy}
                onClick={() => move(i, -1)}
              >
                <ArrowUp aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Đưa ${row.original.code} xuống dưới`}
                disabled={i === list.length - 1 || busy}
                onClick={() => move(i, 1)}
              >
                <ArrowDown aria-hidden="true" />
              </Button>
            </div>
          )
        },
      },
      {
        id: 'code',
        header: 'Mã',
        meta: { className: 'w-16 font-mono text-sm font-medium' },
        cell: ({ row }) => row.original.code,
      },
      {
        id: 'name',
        header: 'Combo',
        cell: ({ row }) => {
          const c = row.original
          return (
            <div className="max-w-72 min-w-48 py-1 text-sm leading-snug">
              <div className="font-medium">{c.name}</div>
              <div className="text-muted-foreground line-clamp-2">{c.description}</div>
              {c.giftText && (
                <div className="text-success mt-0.5 flex items-start gap-1">
                  <Gift className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                  <span>Tặng {c.giftText}</span>
                </div>
              )}
            </div>
          )
        },
      },
      {
        id: 'promoPrice',
        header: 'Giá khuyến mãi',
        meta: { className: 'text-right', headerClassName: 'text-right' },
        cell: ({ row }) => (
          <div className="text-sm tabular-nums">
            <div className="font-semibold">{formatVnd(row.original.promoPrice)}</div>
            <div className="text-muted-foreground text-xs">
              {formatVnd(row.original.promoPricePerBottle)}/chai
            </div>
          </div>
        ),
      },
      {
        id: 'regularPrice',
        header: 'Giá thường',
        meta: { className: 'text-right', headerClassName: 'text-right' },
        cell: ({ row }) => (
          <div className="text-sm tabular-nums">
            <div>{formatVnd(row.original.regularPrice)}</div>
            <div className="text-muted-foreground text-xs">
              {formatVnd(row.original.regularPricePerBottle)}/chai
            </div>
          </div>
        ),
      },
      {
        id: 'freeShipping',
        header: 'Vận chuyển',
        cell: ({ row }) =>
          row.original.freeShipping ? (
            <StatusBadge tone="success">Miễn phí</StatusBadge>
          ) : (
            <span className="text-muted-foreground text-sm tabular-nums">
              {formatVnd(salesRules.shippingFee)}
            </span>
          ),
      },
      {
        id: 'badge',
        header: 'Nhãn',
        cell: ({ row }) =>
          row.original.badge ? (
            <StatusBadge tone="primary" dot={false}>
              {row.original.badge}
            </StatusBadge>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: 'isDefault',
        header: 'Mặc định',
        meta: { className: 'text-center', headerClassName: 'text-center' },
        cell: ({ row }) => {
          const c = row.original
          if (!canUpdate)
            return c.isDefault ? <StatusBadge tone="primary">Mặc định</StatusBadge> : null
          const reason = !c.isDefault && !c.isVisible ? 'Combo đang ẩn, hãy hiện combo trước' : null
          return (
            <Reason reason={reason}>
              <button
                type="button"
                role="radio"
                aria-checked={c.isDefault}
                aria-label={`Đặt ${c.code} làm combo mặc định`}
                disabled={!!reason || busy}
                onClick={() => !c.isDefault && makeDefault(c)}
                className="focus-visible:ring-ring/50 hover:bg-muted inline-flex size-10 items-center justify-center rounded-md outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span
                  className={cn(
                    'flex size-4 items-center justify-center rounded-full border',
                    c.isDefault ? 'border-primary bg-primary' : 'border-input'
                  )}
                >
                  {c.isDefault && <span className="bg-primary-foreground size-1.5 rounded-full" />}
                </span>
              </button>
            </Reason>
          )
        },
      },
      {
        id: 'isVisible',
        header: 'Hiển thị',
        cell: ({ row }) => {
          const c = row.original
          if (!canUpdate)
            return (
              <StatusBadge tone={c.isVisible ? 'success' : 'neutral'}>
                {c.isVisible ? 'Đang hiện' : 'Đang ẩn'}
              </StatusBadge>
            )
          const reason = c.isDefault
            ? 'Combo mặc định luôn hiện'
            : !c.isVisible && visibleCount >= salesRules.maxVisibleCombos
              ? 'Tối đa 4 combo hiển thị, hãy ẩn combo khác trước'
              : null
          return (
            <Reason reason={reason}>
              <label className="flex min-h-10 items-center gap-2 text-sm">
                <Switch
                  checked={c.isVisible}
                  onCheckedChange={(v) => toggleVisible(c, v)}
                  disabled={!!reason || busy}
                  aria-label={`Hiện combo ${c.code} trên landing`}
                />
                <span className={cn(!c.isVisible && 'text-muted-foreground')}>
                  {c.isVisible ? 'Hiện' : 'Ẩn'}
                </span>
              </label>
            </Reason>
          )
        },
      },
      {
        id: 'orderCount',
        header: 'Số đơn',
        meta: { className: 'text-right tabular-nums', headerClassName: 'text-right' },
        cell: ({ row }) => formatNumber(row.original.orderCount, 0),
      },
    ]

    if (canUpdate || canDelete) {
      cols.push({
        id: 'actions',
        header: () => <span className="sr-only">Thao tác</span>,
        meta: { className: 'w-24 text-right', headerClassName: 'w-24' },
        cell: ({ row }) => {
          const c = row.original
          const reason = deleteReason(c)
          return (
            <div className="flex justify-end gap-0.5">
              {canUpdate && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Sửa combo ${c.code}`}
                  onClick={() => onEdit(c)}
                >
                  <Pencil aria-hidden="true" />
                </Button>
              )}
              {canDelete && (
                <Reason reason={reason}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    aria-label={`Xóa combo ${c.code}`}
                    disabled={!!reason}
                    onClick={() => onDelete(c)}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </Reason>
              )}
            </div>
          )
        },
      })
    }
    return cols
  }, [
    list,
    canUpdate,
    canDelete,
    busy,
    visibleCount,
    onEdit,
    onDelete,
    reorder,
    visibility,
    setDefault,
  ])

  return (
    <DataTable
      columns={columns}
      data={combos}
      getRowId={(c) => c.id}
      isLoading={isLoading}
      isFetching={isFetching}
      error={error}
      onRetry={onRetry}
      minWidth={1040}
      emptyState={
        <EmptyState
          icon={PackagePlus}
          title="Chưa có combo nào"
          description="Thêm combo để khách chọn trên landing."
          action={emptyAction}
        />
      }
    />
  )
}
