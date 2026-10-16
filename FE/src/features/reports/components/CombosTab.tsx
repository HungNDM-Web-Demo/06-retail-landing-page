'use client'

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Package } from 'lucide-react'
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
import { sourceLabel } from '@/config/landing-labels'
import { formatVnd } from '@/lib/format'
import type { ComboReportRow } from '@/types/landing'
import { useComboReport } from '../hooks/use-reports'
import { displayDateKey } from '../lib/vn-date'
import { excelSheet, reportFileName, type ExcelColumn } from '../lib/export-excel'
import type { ReportTabProps, SourceFilterProps } from '../types/report.types'
import { ExportButton, TabLoading, TabToolbar, formatCount, formatPercent } from './ReportParts'
import { SourceSelect } from './SourceSelect'

const chartConfig = {
  orders: { label: 'Số đơn', color: 'var(--chart-1)' },
  confirmed: { label: 'Đã xác nhận', color: 'var(--chart-2)' },
} satisfies ChartConfig

const COLUMNS: ExcelColumn<ComboReportRow>[] = [
  { header: 'Mã combo', value: (r) => r.comboCode, width: 10 },
  { header: 'Combo', value: (r) => r.comboName, width: 22 },
  { header: 'Số đơn', value: (r) => r.orders, width: 9 },
  { header: 'Tỉ trọng (%)', value: (r) => r.share, format: '0.0', width: 12 },
  { header: 'Đã xác nhận', value: (r) => r.confirmed, width: 12 },
  { header: 'Số chai', value: (r) => r.bottles, width: 9 },
  { header: 'Doanh thu đã giao', value: (r) => r.deliveredRevenue, width: 17 },
  { header: 'Giá trị TB đơn xác nhận', value: (r) => r.averageOrderValue, width: 20 },
]

/** Tab Combo (SCR-08, FR-30): theo combo hiện tại của đơn, lọc nguồn tùy chọn */
export function CombosTab({
  range,
  enabled,
  source,
  onSourceChange,
}: ReportTabProps & SourceFilterProps) {
  const report = useComboReport({ ...range, source }, { enabled })
  const data = report.data

  const toolbar = (
    <TabToolbar>
      <SourceSelect value={source} onChange={onSourceChange} />
      <div className="ml-auto">
        <ExportButton
          fileName={reportFileName(source ? `combo-${source}` : 'combo', range.from, range.to)}
          disabled={!data?.rows.length}
          build={() =>
            data
              ? [
                  excelSheet(
                    'Theo combo',
                    `Báo cáo theo combo ${displayDateKey(data.from)} - ${displayDateKey(data.to)}${
                      data.source ? `, nguồn ${sourceLabel(data.source)}` : ''
                    }`,
                    COLUMNS,
                    data.rows
                  ),
                ]
              : []
          }
        />
      </div>
    </TabToolbar>
  )

  if (report.error && !data) {
    return (
      <div className="space-y-4">
        {toolbar}
        <ErrorState error={report.error} onRetry={() => void report.refetch()} />
      </div>
    )
  }
  if (!data) return <TabLoading cards={0} />

  const totals = data.rows.reduce(
    (s, r) => ({
      confirmed: s.confirmed + r.confirmed,
      bottles: s.bottles + r.bottles,
      revenue: s.revenue + r.deliveredRevenue,
    }),
    { confirmed: 0, bottles: 0, revenue: 0 }
  )

  return (
    <div className="space-y-4">
      {toolbar}
      {!data.rows.length ? (
        <Card>
          <EmptyState
            icon={Package}
            title="Chưa có đơn"
            description="Khoảng ngày và nguồn đã chọn chưa có đơn nào."
          />
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-5">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Đơn theo combo</CardTitle>
              <CardDescription>Combo hiện tại của đơn, không gồm đơn hủy vì trùng.</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={chartConfig}
                className="aspect-auto h-72 w-full"
                aria-label="Biểu đồ số đơn và đơn xác nhận theo combo"
              >
                <BarChart data={data.rows} margin={{ left: 4, right: 8, top: 8 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="comboCode" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} width={36} allowDecimals={false} />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={(_, payload) =>
                          payload?.[0] ? String(payload[0].payload.comboName) : ''
                        }
                      />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar
                    dataKey="orders"
                    fill="var(--color-orders)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                  <Bar
                    dataKey="confirmed"
                    fill="var(--color-confirmed)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="gap-0 overflow-hidden py-0 xl:col-span-3">
            <div className="overflow-x-auto">
              <Table className="min-w-[680px]">
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead>Combo</TableHead>
                    <TableHead className="text-right">Đơn</TableHead>
                    <TableHead className="text-right">Tỉ trọng</TableHead>
                    <TableHead className="text-right">Xác nhận</TableHead>
                    <TableHead className="text-right">Số chai</TableHead>
                    <TableHead className="text-right">Doanh thu đã giao</TableHead>
                    <TableHead className="text-right">TB đơn xác nhận</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rows.map((r) => (
                    <TableRow key={r.comboId}>
                      <TableCell>
                        <span className="text-muted-foreground mr-1.5 text-xs">{r.comboCode}</span>
                        <span className="font-medium">{r.comboName}</span>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatCount(r.orders)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatPercent(r.share)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCount(r.confirmed)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCount(r.bottles)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatVnd(r.deliveredRevenue)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatVnd(r.averageOrderValue)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <tfoot className="bg-muted border-t font-semibold">
                  <TableRow>
                    <TableCell>Tổng</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCount(data.totalOrders)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">100%</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCount(totals.confirmed)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCount(totals.bottles)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatVnd(totals.revenue)}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </tfoot>
              </Table>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
