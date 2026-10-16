'use client'

import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Hand, Loader2, PhoneCall } from 'lucide-react'
import { DataTable } from '@/components/shared/DataTable'
import type { PaginationProps } from '@/components/shared/DataTablePagination'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { formatPhone, formatRelativeTime, formatVnd } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { SortDir } from '@/types/api'
import type { OrderListItem } from '@/types/landing'
import { vnTimeDateText } from '@/features/reports/lib/vn-date'
import { OrderStatusBadge, OrderTagBadges, SourceText } from './OrderBadges'

type Props = {
  data: OrderListItem[] | undefined
  isLoading: boolean
  isFetching: boolean
  error: unknown
  onRetry: () => void
  pagination?: PaginationProps
  sorting: {
    sortBy?: string
    sortDir?: SortDir
    onSortChange: (by?: string, dir?: SortDir) => void
  }
  selectable: boolean
  selected: Set<string>
  onSelectedChange: (next: Set<string>) => void
  showStatus: boolean
  canClaim: boolean
  claimingId?: string
  onClaim: (order: OrderListItem) => void
  onOpen: (order: OrderListItem) => void
  activeId?: string | null
  toolbar?: React.ReactNode
  emptyState: React.ReactNode
}

/** Bảng đơn (SCR-05; UC-05 bước 2): mã, "5 phút trước", khách, SĐT, tỉnh, combo × SL, tổng, nguồn, telesale, nhãn */
export function OrderTable(props: Props) {
  const {
    data,
    selectable,
    selected,
    onSelectedChange,
    showStatus,
    canClaim,
    claimingId,
    onClaim,
    activeId,
  } = props

  const columns = useMemo<ColumnDef<OrderListItem>[]>(() => {
    const ids = data?.map((o) => o.id) ?? []
    const allChecked = ids.length > 0 && ids.every((id) => selected.has(id))
    const someChecked = ids.some((id) => selected.has(id))
    const toggle = (id: string, on: boolean) => {
      const next = new Set(selected)
      if (on) next.add(id)
      else next.delete(id)
      onSelectedChange(next)
    }
    const cols: ColumnDef<OrderListItem>[] = []
    if (selectable) {
      cols.push({
        id: 'select',
        header: () => (
          <Checkbox
            checked={allChecked ? true : someChecked ? 'indeterminate' : false}
            onCheckedChange={(on) => {
              const next = new Set(selected)
              ids.forEach((id) => (on ? next.add(id) : next.delete(id)))
              onSelectedChange(next)
            }}
            aria-label="Chọn mọi đơn trên trang"
          />
        ),
        cell: ({ row }) => (
          <span onClick={(e) => e.stopPropagation()} className="flex">
            <Checkbox
              checked={selected.has(row.original.id)}
              onCheckedChange={(on) => toggle(row.original.id, on === true)}
              aria-label={`Chọn đơn ${row.original.code}`}
            />
          </span>
        ),
        meta: { className: 'w-10', headerClassName: 'w-10' },
      })
    }
    cols.push(
      {
        id: 'placedAt',
        header: 'Mã đơn',
        enableSorting: true,
        cell: ({ row }) => (
          <span className="flex flex-col leading-tight">
            <span
              className={cn(
                'font-mono text-sm font-medium',
                activeId === row.original.id && 'text-primary'
              )}
            >
              {row.original.code}
            </span>
            <span className="text-muted-foreground text-xs">
              {formatRelativeTime(row.original.placedAt)}
            </span>
          </span>
        ),
      },
      {
        id: 'customer',
        header: 'Khách hàng',
        cell: ({ row }) => (
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate font-medium">{row.original.customerName}</span>
            <span className="text-muted-foreground text-xs tabular-nums">
              {formatPhone(row.original.phone)} · {row.original.province}
            </span>
          </span>
        ),
        meta: { className: 'max-w-56' },
      },
      {
        id: 'combo',
        header: 'Combo',
        cell: ({ row }) => (
          <span className="whitespace-nowrap">
            {row.original.comboName}{' '}
            <span className="text-muted-foreground">× {row.original.quantity}</span>
          </span>
        ),
      },
      {
        id: 'total',
        header: 'Tổng tiền',
        enableSorting: true,
        cell: ({ row }) => (
          <span className="flex flex-col items-end leading-tight">
            <span className="font-medium tabular-nums">{formatVnd(row.original.total)}</span>
            {row.original.upsellAmount > 0 && (
              <span className="text-success text-xs tabular-nums">
                Upsell +{formatVnd(row.original.upsellAmount)}
              </span>
            )}
          </span>
        ),
        meta: { className: 'text-right', headerClassName: 'text-right' },
      },
      {
        id: 'source',
        header: 'Nguồn',
        cell: ({ row }) => (
          <SourceText source={row.original.source} campaign={row.original.campaign} />
        ),
        meta: { className: 'max-w-40' },
      },
      {
        id: 'assignee',
        header: 'Telesale',
        cell: ({ row }) =>
          row.original.assigneeName ? (
            <span className="whitespace-nowrap">{row.original.assigneeName}</span>
          ) : canClaim && row.original.status === 'Moi' ? (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation()
                onClaim(row.original)
              }}
              disabled={claimingId === row.original.id}
            >
              {claimingId === row.original.id ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <Hand aria-hidden="true" />
              )}
              Nhận đơn
            </Button>
          ) : (
            <span className="text-muted-foreground italic">Chưa chia</span>
          ),
      },
      {
        id: 'nextCallAt',
        header: 'Trạng thái, nhãn',
        enableSorting: true,
        cell: ({ row }) => {
          const o = row.original
          return (
            <span className="flex flex-col items-start gap-1">
              {showStatus && <OrderStatusBadge status={o.status} />}
              {o.status === 'ChoGoiLai' && o.nextCallAt && (
                <span className="text-muted-foreground flex items-center gap-1 text-xs whitespace-nowrap">
                  <PhoneCall className="size-3" aria-hidden="true" />
                  Gọi lại {vnTimeDateText(o.nextCallAt)}
                  {o.failedCallCount > 0 && ` · ${o.failedCallCount} lần không liên lạc được`}
                </span>
              )}
              <OrderTagBadges tags={o.tags} />
            </span>
          )
        },
      }
    )
    return cols
  }, [
    data,
    selected,
    onSelectedChange,
    selectable,
    showStatus,
    canClaim,
    claimingId,
    onClaim,
    activeId,
  ])

  return (
    <DataTable
      columns={columns}
      data={props.data}
      isLoading={props.isLoading}
      isFetching={props.isFetching}
      error={props.error}
      onRetry={props.onRetry}
      sorting={props.sorting}
      pagination={props.pagination}
      getRowId={(o) => o.id}
      onRowClick={props.onOpen}
      toolbar={props.toolbar}
      emptyState={props.emptyState}
      minWidth={1080}
    />
  )
}
