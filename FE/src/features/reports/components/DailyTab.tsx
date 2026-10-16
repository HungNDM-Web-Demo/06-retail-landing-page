'use client'

import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from 'recharts'
import { CalendarDays } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cancelReasonLabels, returnReasonLabels } from '@/config/landing-labels'
import { formatVnd } from '@/lib/format'
import type { DailyTotals } from '@/types/landing'
import { useDailyReport } from '../hooks/use-reports'
import { displayDateKey, shortDateKey } from '../lib/vn-date'
import { excelSheet, reportFileName, type ExcelColumn } from '../lib/export-excel'
import type { ReportTabProps } from '../types/report.types'
import {
  ChangeText,
  ExportButton,
  Stat,
  TabLoading,
  TabToolbar,
  changePercent,
  changePoints,
  formatCount,
  formatPercent,
} from './ReportParts'

const chartConfig = {
  orders: { label: 'Đơn đặt', color: 'var(--chart-1)' },
  confirmed: { label: 'Xác nhận', color: 'var(--chart-2)' },
  delivered: { label: 'Đã giao', color: 'var(--chart-3)' },
} satisfies ChartConfig

type DayRow = DailyTotals & { date: string }

const COLUMNS: ExcelColumn<DayRow>[] = [
  { header: 'Ngày', value: (d) => (d.date ? displayDateKey(d.date) : 'Tổng'), width: 12 },
  { header: 'Đơn đặt', value: (d) => d.orders, width: 10 },
  { header: 'Xác nhận', value: (d) => d.confirmed, width: 10 },
  { header: 'Đã hủy', value: (d) => d.cancelled, width: 9 },
  { header: 'Tỉ lệ hủy (%)', value: (d) => d.cancelRate, format: '0.0', width: 12 },
  { header: 'Hoàn', value: (d) => d.returned, width: 8 },
  { header: 'Đã giao', value: (d) => d.delivered, width: 9 },
  { header: 'Doanh thu đã giao', value: (d) => d.deliveredRevenue, width: 17 },
]

type ReasonRow = { label: string; count: number }
const REASON_COLUMNS: ExcelColumn<ReasonRow>[] = [
  { header: 'Lý do', value: (r) => r.label, width: 24 },
  { header: 'Số đơn', value: (r) => r.count, width: 10 },
]

const SINCE = 'so với kỳ trước'

/**
 * Tab Theo ngày (SCR-08, FR-32; TC-27, TC-36): mỗi chỉ số lọc theo mốc riêng (đặt, xác nhận, hủy, hoàn, giao),
 * so với kỳ liền trước cùng số ngày; lý do hủy không gồm Đơn trùng.
 */
export function DailyTab({ range, enabled }: ReportTabProps) {
  const report = useDailyReport(range, { enabled })
  const data = report.data
  if (report.error && !data) {
    return <ErrorState error={report.error} onRetry={() => void report.refetch()} />
  }
  if (!data) return <TabLoading cards={6} />

  const t = data.totals
  const p = data.previous
  const cancelRows: ReasonRow[] = data.cancelReasons.map((r) => ({
    label: cancelReasonLabels[r.reason],
    count: r.count,
  }))
  const returnRows: ReasonRow[] = data.returnReasons.map((r) => ({
    label: returnReasonLabels[r.reason],
    count: r.count,
  }))
  const hasData = data.days.some(
    (d) => d.orders || d.confirmed || d.delivered || d.cancelled || d.returned
  )

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-6">
        <Stat
          label="Đơn đặt"
          value={formatCount(t.orders)}
          sub={<ChangeText value={changePercent(t.orders, p.orders)} suffix={SINCE} />}
        />
        <Stat
          label="Xác nhận"
          value={formatCount(t.confirmed)}
          sub={<ChangeText value={changePercent(t.confirmed, p.confirmed)} suffix={SINCE} />}
        />
        <Stat
          label="Đã hủy"
          value={formatCount(t.cancelled)}
          sub={
            <span className="space-y-0.5">
              <span className="block">Tỉ lệ hủy {formatPercent(t.cancelRate)}</span>
              <ChangeText
                value={changePoints(t.cancelRate, p.cancelRate)}
                unit="điểm"
                inverse
                suffix={SINCE}
              />
            </span>
          }
        />
        <Stat
          label="Hoàn hàng"
          value={formatCount(t.returned)}
          sub={<ChangeText value={changePercent(t.returned, p.returned)} inverse suffix={SINCE} />}
        />
        <Stat
          label="Đã giao"
          value={formatCount(t.delivered)}
          sub={<ChangeText value={changePercent(t.delivered, p.delivered)} suffix={SINCE} />}
        />
        <Stat
          label="Doanh thu đã giao"
          value={formatVnd(t.deliveredRevenue)}
          sub={
            <ChangeText
              value={changePercent(t.deliveredRevenue, p.deliveredRevenue)}
              suffix={SINCE}
            />
          }
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Theo ngày</CardTitle>
            <CardDescription>
              Kỳ trước: {displayDateKey(p.from)} → {displayDateKey(p.to)}. Đơn theo ngày đặt, xác
              nhận theo ngày xác nhận, giao theo ngày giao.
            </CardDescription>
          </div>
          <TabToolbar>
            <ExportButton
              fileName={reportFileName('theo-ngay', data.from, data.to)}
              build={() => [
                excelSheet(
                  'Theo ngày',
                  `Báo cáo theo ngày ${displayDateKey(data.from)} - ${displayDateKey(data.to)}`,
                  COLUMNS,
                  [...data.days, { ...t, date: '' }]
                ),
                excelSheet(
                  'Lý do hủy',
                  `Không gồm ${data.duplicateCancelled} đơn hủy vì trùng`,
                  REASON_COLUMNS,
                  cancelRows
                ),
                excelSheet('Lý do hoàn', null, REASON_COLUMNS, returnRows),
              ]}
            />
          </TabToolbar>
        </CardHeader>
        <CardContent>
          {!hasData ? (
            <EmptyState
              icon={CalendarDays}
              title="Chưa có số liệu"
              description="Khoảng ngày này chưa có đơn."
            />
          ) : (
            <ChartContainer
              config={chartConfig}
              className="aspect-auto h-72 w-full"
              aria-label="Biểu đồ đơn đặt, xác nhận, đã giao theo ngày"
            >
              <ComposedChart data={data.days} margin={{ left: 4, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={shortDateKey}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={16}
                />
                <YAxis tickLine={false} axisLine={false} width={32} allowDecimals={false} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent labelFormatter={(v) => displayDateKey(String(v))} />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar
                  dataKey="orders"
                  fill="var(--color-orders)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
                <Line
                  dataKey="confirmed"
                  type="monotone"
                  stroke="var(--color-confirmed)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  dataKey="delivered"
                  type="monotone"
                  stroke="var(--color-delivered)"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card className="gap-0 py-0">
        <div className="max-h-[28rem] overflow-auto">
          <Table className="min-w-[760px]">
            <TableHeader className="bg-muted sticky top-0 z-10">
              <TableRow>
                <TableHead>Ngày</TableHead>
                <TableHead className="text-right">Đơn đặt</TableHead>
                <TableHead className="text-right">Xác nhận</TableHead>
                <TableHead className="text-right">Đã hủy</TableHead>
                <TableHead className="text-right">Tỉ lệ hủy</TableHead>
                <TableHead className="text-right">Hoàn</TableHead>
                <TableHead className="text-right">Đã giao</TableHead>
                <TableHead className="text-right">Doanh thu đã giao</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...data.days].reverse().map((d) => (
                <DayRowView key={d.date} label={displayDateKey(d.date)} row={d} />
              ))}
            </TableBody>
            <tfoot className="bg-muted sticky bottom-0 border-t font-semibold">
              <DayRowView label="Tổng" row={t} />
            </tfoot>
          </Table>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <ReasonTable
          title="Lý do hủy"
          note={`Không gồm ${formatCount(data.duplicateCancelled)} đơn hủy vì trùng.`}
          rows={cancelRows}
          empty="Không có đơn hủy trong kỳ"
        />
        <ReasonTable title="Lý do hoàn" rows={returnRows} empty="Không có đơn hoàn trong kỳ" />
      </div>
    </div>
  )
}

function DayRowView({ label, row }: { label: string; row: DailyTotals }) {
  return (
    <TableRow>
      <TableCell className="tabular-nums">{label}</TableCell>
      <TableCell className="text-right font-medium tabular-nums">
        {formatCount(row.orders)}
      </TableCell>
      <TableCell className="text-right tabular-nums">{formatCount(row.confirmed)}</TableCell>
      <TableCell className="text-right tabular-nums">{formatCount(row.cancelled)}</TableCell>
      <TableCell className="text-right tabular-nums">{formatPercent(row.cancelRate)}</TableCell>
      <TableCell className="text-right tabular-nums">{formatCount(row.returned)}</TableCell>
      <TableCell className="text-right tabular-nums">{formatCount(row.delivered)}</TableCell>
      <TableCell className="text-right tabular-nums">{formatVnd(row.deliveredRevenue)}</TableCell>
    </TableRow>
  )
}

function ReasonTable({
  title,
  note,
  rows,
  empty,
}: {
  title: string
  note?: string
  rows: ReasonRow[]
  empty: string
}) {
  const total = rows.reduce((s, r) => s + r.count, 0)
  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b py-4">
        <CardTitle className="text-base">{title}</CardTitle>
        {note && <CardDescription>{note}</CardDescription>}
      </CardHeader>
      {!rows.length ? (
        <p className="text-muted-foreground px-6 py-6 text-sm">{empty}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Lý do</TableHead>
              <TableHead className="text-right">Số đơn</TableHead>
              <TableHead className="pr-6 text-right">Tỉ lệ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.label}>
                <TableCell className="pl-6">{r.label}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {formatCount(r.count)}
                </TableCell>
                <TableCell className="text-muted-foreground pr-6 text-right tabular-nums">
                  {formatPercent(Math.round((r.count / total) * 1000) / 10)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  )
}
