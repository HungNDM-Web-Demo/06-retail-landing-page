'use client'

import { Fragment, useState } from 'react'
import { ChevronRight, Megaphone } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { noCampaignLabel, sourceLabel } from '@/config/landing-labels'
import { formatVnd } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { SourceMetrics } from '@/types/landing'
import { useSourceReport } from '../hooks/use-reports'
import { displayDateKey } from '../lib/vn-date'
import { excelSheet, reportFileName, type ExcelColumn } from '../lib/export-excel'
import type { ReportTabProps } from '../types/report.types'
import {
  ExportButton,
  Stat,
  TabLoading,
  TabToolbar,
  formatConversion,
  formatCount,
  formatPercent,
  formatRoas,
} from './ReportParts'

type ExportRow = SourceMetrics & { source: string; campaign: string | null }

const COLUMNS: ExcelColumn<ExportRow>[] = [
  { header: 'Nguồn', value: (r) => (r.source ? sourceLabel(r.source) : 'Tổng'), width: 14 },
  {
    header: 'Chiến dịch',
    value: (r) => (r.campaign === null ? '' : r.campaign || noCampaignLabel),
    width: 22,
  },
  { header: 'Lượt truy cập', value: (r) => r.visits, width: 13 },
  { header: 'Số đơn', value: (r) => r.orders, width: 9 },
  { header: 'Chuyển đổi (%)', value: (r) => r.conversionRate, format: '0.00', width: 13 },
  { header: 'Xác nhận', value: (r) => r.confirmed, width: 10 },
  { header: 'Tỉ lệ xác nhận (%)', value: (r) => r.confirmRate, format: '0.0', width: 16 },
  { header: 'Giao', value: (r) => r.delivered, width: 8 },
  { header: 'Hoàn', value: (r) => r.returned, width: 8 },
  { header: 'Tỉ lệ hoàn (%)', value: (r) => r.returnRate, format: '0.0', width: 13 },
  { header: 'Doanh thu đã giao', value: (r) => r.deliveredRevenue, width: 17 },
  { header: 'Chi phí quảng cáo', value: (r) => r.adCost, width: 16 },
  { header: 'Chi phí/đơn xác nhận', value: (r) => r.costPerConfirmed, width: 18 },
  { header: 'ROAS', value: (r) => r.roas, format: '0.00', width: 8 },
]

/** Ô số liệu chung cho dòng nguồn, chiến dịch, tổng */
function MetricCells({ m }: { m: SourceMetrics }) {
  return (
    <>
      <TableCell className="text-right tabular-nums">{formatCount(m.visits)}</TableCell>
      <TableCell className="text-right font-medium tabular-nums">{formatCount(m.orders)}</TableCell>
      <TableCell className="text-right tabular-nums">
        {formatConversion(m.conversionRate)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatCount(m.confirmed)}{' '}
        <span className="text-muted-foreground text-xs">({formatPercent(m.confirmRate)})</span>
      </TableCell>
      <TableCell className="text-right tabular-nums">{formatCount(m.delivered)}</TableCell>
      <TableCell className="text-right tabular-nums">
        {formatCount(m.returned)}{' '}
        <span className="text-muted-foreground text-xs">({formatPercent(m.returnRate)})</span>
      </TableCell>
      <TableCell className="text-right tabular-nums">{formatVnd(m.deliveredRevenue)}</TableCell>
      <TableCell className="text-right tabular-nums">{formatVnd(m.adCost)}</TableCell>
      <TableCell className="text-right tabular-nums">{formatVnd(m.costPerConfirmed)}</TableCell>
      <TableCell className="text-right font-medium tabular-nums">{formatRoas(m.roas)}</TableCell>
    </>
  )
}

/**
 * Tab Nguồn (SCR-08, UC-12, FR-29, FR-33; TC-35): bảng theo nguồn mở xuống chiến dịch, chi phí, ROAS.
 * `source` trên query string (từ Tổng quan) được tô sáng và mở sẵn.
 */
export function SourcesTab({ range, enabled, source }: ReportTabProps & { source?: string }) {
  const report = useSourceReport(range, { enabled })
  const [open, setOpen] = useState<Set<string>>(() => new Set(source ? [source] : []))
  const data = report.data
  if (report.error && !data) {
    return <ErrorState error={report.error} onRetry={() => void report.refetch()} />
  }
  if (!data) return <TabLoading />

  const t = data.totals
  const toggle = (s: string) =>
    setOpen((cur) => {
      const next = new Set(cur)
      if (next.has(s)) next.delete(s)
      else next.add(s)
      return next
    })
  const missing = source && !data.rows.some((r) => r.source === source)

  const exportRows: ExportRow[] = [
    ...data.rows.flatMap((r) => [
      { ...r, campaign: null },
      ...r.campaigns.map((c) => ({ ...c, source: r.source })),
    ]),
    { ...t, source: '', campaign: null },
  ]

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Số đơn"
          value={formatCount(t.orders)}
          sub={`${formatCount(t.visits)} lượt · chuyển đổi ${formatConversion(t.conversionRate)}`}
        />
        <Stat
          label="Đã xác nhận"
          value={formatCount(t.confirmed)}
          sub={`Tỉ lệ xác nhận ${formatPercent(t.confirmRate)} · hoàn ${formatPercent(t.returnRate)}`}
        />
        <Stat
          label="Doanh thu đã giao"
          value={formatVnd(t.deliveredRevenue)}
          sub="Tiền hàng, không gồm phí ship"
        />
        <Stat
          label="Chi phí quảng cáo"
          value={formatVnd(t.adCost)}
          sub={`ROAS ${formatRoas(t.roas)} · ${formatVnd(t.costPerConfirmed)}/đơn xác nhận`}
        />
      </div>

      <TabToolbar>
        <p className="text-muted-foreground text-sm">
          Đơn, xác nhận, giao, hoàn tính theo đơn đặt trong kỳ; doanh thu theo ngày giao; chi phí
          theo ngày.
        </p>
        <div className="ml-auto">
          <ExportButton
            fileName={reportFileName('nguon', data.from, data.to)}
            disabled={!data.rows.length}
            build={() => [
              excelSheet(
                'Theo nguồn',
                `Báo cáo theo nguồn ${displayDateKey(data.from)} - ${displayDateKey(data.to)}`,
                COLUMNS,
                exportRows
              ),
            ]}
          />
        </div>
      </TabToolbar>

      {missing && (
        <p className="bg-info/10 text-info rounded-lg px-3 py-2 text-sm" role="status">
          Nguồn {sourceLabel(source)} không có lượt, đơn hay chi phí trong khoảng ngày này.
        </p>
      )}

      {!data.rows.length ? (
        <Card>
          <EmptyState
            icon={Megaphone}
            title="Chưa có số liệu"
            description="Khoảng ngày này chưa có lượt truy cập, đơn hay chi phí quảng cáo."
          />
        </Card>
      ) : (
        <Card className="gap-0 py-0">
          <div className="max-h-[36rem] overflow-auto">
            <Table className="min-w-[1180px]">
              <TableHeader className="bg-muted sticky top-0 z-10">
                <TableRow>
                  <TableHead className="min-w-52">Nguồn / chiến dịch</TableHead>
                  <TableHead className="text-right">Lượt</TableHead>
                  <TableHead className="text-right">Đơn</TableHead>
                  <TableHead className="text-right">Chuyển đổi</TableHead>
                  <TableHead className="text-right">Xác nhận</TableHead>
                  <TableHead className="text-right">Giao</TableHead>
                  <TableHead className="text-right">Hoàn</TableHead>
                  <TableHead className="text-right">Doanh thu đã giao</TableHead>
                  <TableHead className="text-right">Chi phí</TableHead>
                  <TableHead className="text-right">Chi phí/đơn XN</TableHead>
                  <TableHead className="text-right">ROAS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rows.map((r) => {
                  const expanded = open.has(r.source)
                  const highlighted = r.source === source
                  return (
                    <Fragment key={r.source}>
                      <TableRow className={cn(highlighted && 'bg-primary/5 hover:bg-primary/10')}>
                        <TableCell>
                          <button
                            type="button"
                            onClick={() => toggle(r.source)}
                            aria-expanded={expanded}
                            className="focus-visible:ring-ring/50 -ml-1 flex min-h-8 items-center gap-1.5 rounded-md px-1 font-medium outline-none focus-visible:ring-3"
                          >
                            <ChevronRight
                              className={cn(
                                'text-muted-foreground size-4 transition-transform duration-200',
                                expanded && 'rotate-90'
                              )}
                              aria-hidden="true"
                            />
                            {sourceLabel(r.source)}
                            <span className="text-muted-foreground text-xs font-normal">
                              ({r.campaigns.length} chiến dịch)
                            </span>
                          </button>
                        </TableCell>
                        <MetricCells m={r} />
                      </TableRow>
                      {expanded &&
                        r.campaigns.map((c) => (
                          <TableRow
                            key={`${r.source}:${c.campaign}`}
                            className={cn('text-sm', highlighted ? 'bg-primary/5' : 'bg-muted/30')}
                          >
                            <TableCell className="text-muted-foreground pl-9">
                              {c.campaign || noCampaignLabel}
                            </TableCell>
                            <MetricCells m={c} />
                          </TableRow>
                        ))}
                    </Fragment>
                  )
                })}
              </TableBody>
              <tfoot className="bg-muted sticky bottom-0 border-t font-semibold">
                <TableRow>
                  <TableCell>Tổng</TableCell>
                  <MetricCells m={t} />
                </TableRow>
              </tfoot>
            </Table>
          </div>
        </Card>
      )}
    </div>
  )
}
