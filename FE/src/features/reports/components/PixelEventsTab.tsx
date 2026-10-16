'use client'

import { useState } from 'react'
import { Radio } from 'lucide-react'
import { DataTablePagination } from '@/components/shared/DataTablePagination'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { StatusBadge, type StatusTone } from '@/components/shared/StatusBadge'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { conversionEventLabels, sourceLabel } from '@/config/landing-labels'
import { formatVnd } from '@/lib/format'
import type { ConversionEventDto, ConversionEventType } from '@/types/landing'
import { useConversionEvents } from '../hooks/use-reports'
import { vnDateTimeText, vnKey } from '../lib/vn-date'
import { excelSheet, type ExcelColumn } from '../lib/export-excel'
import { ExportButton, TabToolbar } from './ReportParts'

const ALL = '__all__'
const TYPES = Object.keys(conversionEventLabels) as ConversionEventType[]
const TONES: Record<ConversionEventType, StatusTone> = {
  PageView: 'neutral',
  StartForm: 'info',
  Purchase: 'success',
}

const COLUMNS: ExcelColumn<ConversionEventDto>[] = [
  { header: 'Thời điểm', value: (e) => vnDateTimeText(e.occurredAt), width: 17 },
  { header: 'Loại', value: (e) => conversionEventLabels[e.type], width: 18 },
  { header: 'Nguồn', value: (e) => sourceLabel(e.source), width: 12 },
  { header: 'Chiến dịch', value: (e) => e.campaign ?? '', width: 18 },
  { header: 'Mã đơn', value: (e) => e.orderCode ?? '', width: 15 },
  { header: 'Giá trị', value: (e) => e.value, width: 12 },
  { header: 'Lệnh pixel', value: (e) => e.pixelCall, width: 70 },
]

/**
 * Tab Sự kiện pixel (SCR-08, FR-14, P3; 07 §3.8): nhật ký pixel giả lập, mới nhất trước, lọc loại.
 * Không theo khoảng ngày (kho chỉ giữ 500 sự kiện gần nhất).
 */
export function PixelEventsTab({ enabled }: { enabled: boolean }) {
  const [type, setType] = useState<ConversionEventType | undefined>()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const query = { page, pageSize, ...(type ? { type } : {}) }
  const list = useConversionEvents(query, { enabled })
  const data = list.data

  return (
    <div className="space-y-4">
      <TabToolbar>
        <Select
          value={type ?? ALL}
          onValueChange={(v) => {
            setType(v === ALL ? undefined : (v as ConversionEventType))
            setPage(1)
          }}
        >
          <SelectTrigger className="h-10 w-52" aria-label="Lọc loại sự kiện">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tất cả sự kiện</SelectItem>
            {TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {conversionEventLabels[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-sm">
          Pixel giả lập, không gửi đi đâu; không lọc theo khoảng ngày.
        </p>
        <div className="ml-auto">
          <ExportButton
            fileName={() => `su-kien-pixel-${vnKey()}-trang-${page}.xlsx`}
            disabled={!data?.items.length}
            build={() => [excelSheet('Sự kiện pixel', null, COLUMNS, data?.items ?? [])]}
          />
        </div>
      </TabToolbar>

      {list.error && !data ? (
        <ErrorState error={list.error} onRetry={() => void list.refetch()} />
      ) : !data ? (
        <Skeleton className="h-80 rounded-xl" />
      ) : !data.items.length ? (
        <Card>
          <EmptyState
            icon={Radio}
            title="Chưa có sự kiện"
            description="Mở landing page hoặc đặt thử một đơn để thấy sự kiện pixel giả lập."
          />
        </Card>
      ) : (
        <Card className="gap-0 py-0">
          <div className="overflow-x-auto">
            <Table className="min-w-[1000px]">
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead>Thời điểm</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Nguồn</TableHead>
                  <TableHead>Chiến dịch</TableHead>
                  <TableHead>Mã đơn</TableHead>
                  <TableHead className="text-right">Giá trị</TableHead>
                  <TableHead>Lệnh pixel</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="tabular-nums">{vnDateTimeText(e.occurredAt)}</TableCell>
                    <TableCell>
                      <StatusBadge tone={TONES[e.type]}>
                        {conversionEventLabels[e.type]}
                      </StatusBadge>
                    </TableCell>
                    <TableCell>{sourceLabel(e.source)}</TableCell>
                    <TableCell className={e.campaign ? '' : 'text-muted-foreground'}>
                      {e.campaign || '—'}
                    </TableCell>
                    <TableCell className="font-medium tabular-nums">{e.orderCode ?? '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatVnd(e.value)}</TableCell>
                    <TableCell className="max-w-[26rem]">
                      <code
                        className="bg-muted block truncate rounded px-2 py-1 font-mono text-xs"
                        title={e.pixelCall}
                      >
                        {e.pixelCall}
                      </code>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="border-t px-4 py-3">
            <DataTablePagination
              page={data.page}
              pageSize={data.pageSize}
              totalCount={data.totalCount}
              totalPages={data.totalPages}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size)
                setPage(1)
              }}
            />
          </div>
        </Card>
      )}
    </div>
  )
}
