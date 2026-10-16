'use client'

import Link from 'next/link'
import { Headset } from 'lucide-react'
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
import { ordersUrl } from '@/config/route-path'
import { formatVnd } from '@/lib/format'
import type { TelesaleReportRow } from '@/types/landing'
import { useTelesaleReport } from '../hooks/use-reports'
import { displayDateKey } from '../lib/vn-date'
import { excelSheet, reportFileName, type ExcelColumn } from '../lib/export-excel'
import type { ReportTabProps } from '../types/report.types'
import { ExportButton, TabLoading, TabToolbar, formatCount, formatPercent } from './ReportParts'

const COLUMNS: ExcelColumn<TelesaleReportRow>[] = [
  { header: 'Telesale', value: (r) => r.fullName, width: 22 },
  { header: 'Được chia', value: (r) => r.assigned, width: 11 },
  { header: 'Đã gọi', value: (r) => r.called, width: 9 },
  { header: 'Xác nhận', value: (r) => r.confirmed, width: 10 },
  { header: 'Tỉ lệ xác nhận (%)', value: (r) => r.confirmRate, format: '0.0', width: 16 },
  { header: 'Số đơn upsell', value: (r) => r.upsellCount, width: 13 },
  { header: 'Giá trị upsell', value: (r) => r.upsellValue, width: 15 },
  { header: 'Giao', value: (r) => r.delivered, width: 8 },
  { header: 'Hoàn', value: (r) => r.returned, width: 8 },
  { header: 'Tỉ lệ hoàn (%)', value: (r) => r.returnRate, format: '0.0', width: 13 },
]

/**
 * Tab Telesale (SCR-08, FR-31; TC-36): nhóm đơn đặt trong kỳ theo người; ô số đơn upsell mở danh sách đơn
 * lọc sẵn người xác nhận + chỉ upsell + khoảng ngày.
 */
export function TelesalesTab({ range, enabled }: ReportTabProps) {
  const report = useTelesaleReport(range, { enabled })
  const data = report.data
  if (report.error && !data) {
    return <ErrorState error={report.error} onRetry={() => void report.refetch()} />
  }
  if (!data) return <TabLoading cards={0} />

  return (
    <div className="space-y-4">
      <TabToolbar>
        <p className="text-muted-foreground text-sm">
          Tính trên đơn đặt trong kỳ (không gồm đơn hủy vì trùng); upsell, giao, hoàn theo đơn người
          đó xác nhận.
        </p>
        <div className="ml-auto">
          <ExportButton
            fileName={reportFileName('telesale', data.from, data.to)}
            disabled={!data.rows.length}
            build={() => [
              excelSheet(
                'Theo telesale',
                `Báo cáo theo telesale ${displayDateKey(data.from)} - ${displayDateKey(data.to)}`,
                COLUMNS,
                data.rows
              ),
            ]}
          />
        </div>
      </TabToolbar>

      {!data.rows.length ? (
        <Card>
          <EmptyState
            icon={Headset}
            title="Chưa có telesale"
            description="Chưa có tài khoản Telesale đang hoạt động."
          />
        </Card>
      ) : (
        <Card className="gap-0 overflow-hidden py-0">
          <div className="overflow-x-auto">
            <Table className="min-w-[960px]">
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead>Telesale</TableHead>
                  <TableHead className="text-right">Được chia</TableHead>
                  <TableHead className="text-right">Đã gọi</TableHead>
                  <TableHead className="text-right">Xác nhận</TableHead>
                  <TableHead className="text-right">Tỉ lệ xác nhận</TableHead>
                  <TableHead className="text-right">Đơn upsell</TableHead>
                  <TableHead className="text-right">Giá trị upsell</TableHead>
                  <TableHead className="text-right">Giao</TableHead>
                  <TableHead className="text-right">Hoàn</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rows.map((r) => (
                  <TableRow key={r.userId}>
                    <TableCell className="font-medium">{r.fullName}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCount(r.assigned)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCount(r.called)}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatCount(r.confirmed)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatPercent(r.confirmRate)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.upsellCount > 0 ? (
                        <Link
                          href={ordersUrl({
                            confirmedById: r.userId,
                            upsellOnly: true,
                            from: data.from,
                            to: data.to,
                          })}
                          className="text-primary font-medium underline-offset-4 hover:underline"
                          title={`Xem ${r.upsellCount} đơn upsell của ${r.fullName}`}
                        >
                          {formatCount(r.upsellCount)}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatVnd(r.upsellValue)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCount(r.delivered)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCount(r.returned)}{' '}
                      <span className="text-muted-foreground text-xs">
                        ({formatPercent(r.returnRate)})
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  )
}
