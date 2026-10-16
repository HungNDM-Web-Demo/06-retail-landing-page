'use client'

import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { ArrowDown, ArrowUp, MessageSquarePlus, Pencil, Plus, SearchX, Star, X } from 'lucide-react'
import { toast } from 'sonner'
import { DataTable } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { SearchInput } from '@/components/shared/SearchInput'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useTableQuery } from '@/hooks/use-table-query'
import { getErrorMessage } from '@/lib/api-error'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ReviewDto } from '@/types/landing'
import { useMoveReview, useReviews, useSetReviewVisibility } from '../hooks/use-content'
import { ReviewFormDialog } from './ReviewFormDialog'

type Filters = { isVisible: boolean }
type FormState = { open: boolean; review: ReviewDto | null }

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} sao`} role="img">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            'size-3.5',
            n <= rating ? 'fill-warning text-warning' : 'text-muted-foreground/40'
          )}
          aria-hidden="true"
        />
      ))}
    </span>
  )
}

/** Tab Đánh giá (FR-08, FR-18): bảng, thêm/sửa, ẩn/hiện, lên/xuống theo thứ tự trên landing */
export function ReviewsTab({ canEdit }: { canEdit: boolean }) {
  const table = useTableQuery<Filters>({ pageSize: 10 })
  const reviews = useReviews(table.query)
  const visibility = useSetReviewVisibility()
  const move = useMoveReview()
  const [form, setForm] = useState<FormState>({ open: false, review: null })
  const [searchKey, setSearchKey] = useState(0)

  const hasFilters = !!table.state.search || table.state.isVisible !== undefined
  const data = reviews.data
  const offset = data ? (data.page - 1) * data.pageSize : 0
  const total = data?.totalCount ?? 0
  const busy = move.isPending || visibility.isPending

  const clearFilters = () => {
    table.resetFilters()
    setSearchKey((k) => k + 1)
  }

  const columns = useMemo<ColumnDef<ReviewDto>[]>(() => {
    const cols: ColumnDef<ReviewDto>[] = [
      {
        id: 'order',
        header: 'Thứ tự',
        meta: { className: 'w-28', headerClassName: 'w-28' },
        cell: ({ row }) => {
          const pos = offset + row.index
          if (!canEdit) return <span className="tabular-nums">{pos + 1}</span>
          const blocked = hasFilters ? 'Bỏ tìm kiếm, bộ lọc để sắp xếp' : undefined
          const doMove = (delta: -1 | 1) =>
            move.mutate(
              { id: row.original.id, delta },
              { onError: (e) => toast.error(getErrorMessage(e)) }
            )
          return (
            <div className="flex items-center gap-0.5" title={blocked}>
              <span className="text-muted-foreground w-6 text-xs tabular-nums">{pos + 1}</span>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Đưa đánh giá của ${row.original.customerName} lên trên`}
                disabled={hasFilters || pos === 0 || busy}
                onClick={() => doMove(-1)}
              >
                <ArrowUp aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Đưa đánh giá của ${row.original.customerName} xuống dưới`}
                disabled={hasFilters || pos >= total - 1 || busy}
                onClick={() => doMove(1)}
              >
                <ArrowDown aria-hidden="true" />
              </Button>
            </div>
          )
        },
      },
      {
        id: 'customer',
        header: 'Khách',
        cell: ({ row }) => (
          <div className="min-w-36 text-sm leading-snug">
            <div className="flex items-center gap-1.5 font-medium">
              {row.original.customerName}
              {row.original.isSample && (
                <StatusBadge tone="neutral" dot={false}>
                  Minh họa
                </StatusBadge>
              )}
            </div>
            <div className="text-muted-foreground">{row.original.province}</div>
          </div>
        ),
      },
      {
        id: 'rating',
        header: 'Số sao',
        cell: ({ row }) => <Stars rating={row.original.rating} />,
      },
      {
        id: 'content',
        header: 'Nội dung',
        cell: ({ row }) => (
          <p className="line-clamp-2 max-w-md text-sm" title={row.original.content}>
            {row.original.content}
          </p>
        ),
      },
      {
        id: 'reviewedAt',
        header: 'Ngày',
        cell: ({ row }) => (
          <span className="text-sm tabular-nums">{formatDate(row.original.reviewedAt)}</span>
        ),
      },
      {
        id: 'isVisible',
        header: 'Hiển thị',
        cell: ({ row }) => {
          const r = row.original
          if (!canEdit)
            return (
              <StatusBadge tone={r.isVisible ? 'success' : 'neutral'}>
                {r.isVisible ? 'Đang hiện' : 'Đang ẩn'}
              </StatusBadge>
            )
          return (
            <label className="flex min-h-10 items-center gap-2 text-sm">
              <Switch
                checked={r.isVisible}
                disabled={busy}
                aria-label={`Hiện đánh giá của ${r.customerName}`}
                onCheckedChange={(isVisible) =>
                  visibility.mutate(
                    { id: r.id, isVisible },
                    {
                      onSuccess: () =>
                        toast.success(isVisible ? 'Đã hiện đánh giá' : 'Đã ẩn đánh giá'),
                      onError: (e) => toast.error(getErrorMessage(e)),
                    }
                  )
                }
              />
              <span className={cn(!r.isVisible && 'text-muted-foreground')}>
                {r.isVisible ? 'Hiện' : 'Ẩn'}
              </span>
            </label>
          )
        },
      },
    ]
    if (canEdit)
      cols.push({
        id: 'actions',
        header: () => <span className="sr-only">Thao tác</span>,
        meta: { className: 'w-14 text-right', headerClassName: 'w-14' },
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Sửa đánh giá của ${row.original.customerName}`}
            onClick={() => setForm({ open: true, review: row.original })}
          >
            <Pencil aria-hidden="true" />
          </Button>
        ),
      })
    return cols
  }, [canEdit, hasFilters, offset, total, busy, move, visibility])

  const addButton = canEdit && (
    <Button onClick={() => setForm({ open: true, review: null })}>
      <Plus aria-hidden="true" />
      Thêm đánh giá
    </Button>
  )

  return (
    <>
      <DataTable
        columns={columns}
        data={data?.items}
        getRowId={(r) => r.id}
        isLoading={reviews.isLoading}
        isFetching={reviews.isFetching}
        error={reviews.error}
        onRetry={() => void reviews.refetch()}
        minWidth={860}
        pagination={
          data && {
            page: data.page,
            pageSize: data.pageSize,
            totalCount: data.totalCount,
            totalPages: data.totalPages,
            onPageChange: table.setPage,
            onPageSizeChange: table.setPageSize,
          }
        }
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput
              key={searchKey}
              value={table.state.search}
              onSearch={table.setSearch}
              placeholder="Tìm tên khách, tỉnh, nội dung"
              className="max-w-xs"
            />
            <Select
              value={
                table.state.isVisible === undefined ? 'all' : table.state.isVisible ? 'on' : 'off'
              }
              onValueChange={(v) =>
                table.setFilter('isVisible', v === 'all' ? undefined : v === 'on')
              }
            >
              <SelectTrigger className="w-40" aria-label="Lọc theo hiển thị">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="on">Đang hiện</SelectItem>
                <SelectItem value="off">Đang ẩn</SelectItem>
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button variant="ghost" onClick={clearFilters} className="text-muted-foreground">
                <X aria-hidden="true" />
                Xóa lọc
              </Button>
            )}
            <div className="ml-auto">{addButton}</div>
          </div>
        }
        emptyState={
          hasFilters ? (
            <EmptyState
              icon={SearchX}
              title="Không tìm thấy đánh giá phù hợp"
              action={
                <Button variant="outline" onClick={clearFilters}>
                  Xóa bộ lọc
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={MessageSquarePlus}
              title="Chưa có đánh giá"
              description="Thêm đánh giá để hiện ở khối Đánh giá khách hàng."
              action={addButton}
            />
          )
        }
      />
      <ReviewFormDialog
        open={form.open}
        onOpenChange={(open) => setForm((s) => ({ ...s, open }))}
        review={form.review}
      />
    </>
  )
}
