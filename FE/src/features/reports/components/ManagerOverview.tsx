'use client'

import { Bar, BarChart, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from 'recharts'
import { BadgeCheck, Eye, MousePointerClick, PhoneCall, ShoppingBag, Wallet } from 'lucide-react'
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
import { sourceLabel } from '@/config/landing-labels'
import { routePath } from '@/config/route-path'
import { formatVnd } from '@/lib/format'
import type { MetricCompare } from '@/types/landing'
import { useManagerDashboard } from '../hooks/use-reports'
import { displayDateKey, shortDateKey } from '../lib/vn-date'
import { DashboardHeader } from './DashboardHeader'
import { MetricCard } from './MetricCard'
import { ChangeText, formatConversion, formatCount, formatPercent } from './ReportParts'
import { SharePie } from './SharePie'

const SINCE = 'so với hôm qua cùng giờ'

const hourConfig = {
  orders: { label: 'Số đơn', color: 'var(--chart-1)' },
} satisfies ChartConfig

const trendConfig = {
  orders: { label: 'Số đơn', color: 'var(--chart-1)' },
  confirmed: { label: 'Đã xác nhận', color: 'var(--chart-2)' },
  confirmRate: { label: 'Tỉ lệ xác nhận', color: 'var(--chart-4)' },
} satisfies ChartConfig

/** Link báo cáo theo nguồn lọc sẵn (UC-10 2a) */
const sourceReportUrl = (source: string) =>
  `${routePath.reports}?${new URLSearchParams({ tab: 'sources', source }).toString()}`

/** Dòng so sánh hôm qua cùng giờ; "—" khi không so được (UC-10 E1) */
function Compare({
  metric,
  unit = '%',
  digits,
}: {
  metric: MetricCompare
  unit?: '%' | 'điểm'
  digits?: number
}) {
  return <ChangeText value={metric.change} unit={unit} digits={digits} suffix={SINCE} />
}

/**
 * Tổng quan quản lý (SCR-04, UC-10, FR-01, FR-02; TC-32): 6 thẻ hôm nay so với hôm qua cùng giờ,
 * đơn theo giờ, xu hướng 14 ngày, tỉ trọng combo và nguồn. Tự làm mới 60 giây.
 */
export function ManagerOverview() {
  const q = useManagerDashboard()
  const d = q.data
  const loading = !d

  const hours = (d?.ordersByHour ?? []).map((h) => ({ ...h, label: `${h.hour}h` }))
  const hasHours = hours.some((h) => h.orders > 0)
  const trend = d?.trend14Days ?? []

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Tổng quan bán hàng"
        date={d?.date}
        asOf={d?.asOf}
        isFetching={q.isFetching}
        onRefresh={() => void q.refetch()}
      />

      {q.error && !d ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <>
          <section
            aria-label="Số liệu hôm nay"
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <MetricCard
              label="Lượt truy cập"
              icon={Eye}
              isLoading={loading}
              value={d && formatCount(d.visits.value)}
              footer={d && <Compare metric={d.visits} />}
            />
            <MetricCard
              label="Số đơn"
              icon={ShoppingBag}
              isLoading={loading}
              value={d && formatCount(d.orders.value)}
              footer={d && <Compare metric={d.orders} />}
            />
            <MetricCard
              label="Tỉ lệ chuyển đổi"
              icon={MousePointerClick}
              isLoading={loading}
              value={d && formatConversion(d.conversionRate.value)}
              footer={d && <Compare metric={d.conversionRate} unit="điểm" digits={2} />}
            />
            <MetricCard
              label="Đơn chờ gọi"
              icon={PhoneCall}
              isLoading={loading}
              highlight={!!d && d.dueCallbacks > 0}
              value={d && formatCount(d.pendingCalls)}
              footer={
                d && (
                  <span
                    className={
                      d.dueCallbacks > 0 ? 'text-warning font-medium' : 'text-muted-foreground'
                    }
                  >
                    {formatCount(d.dueCallbacks)} đến giờ gọi lại
                  </span>
                )
              }
            />
            <MetricCard
              label="Tỉ lệ xác nhận"
              icon={BadgeCheck}
              isLoading={loading}
              value={d && formatPercent(d.confirmRate.value)}
              footer={d && <Compare metric={d.confirmRate} unit="điểm" />}
            />
            <MetricCard
              label="Giá trị đơn đã xác nhận"
              icon={Wallet}
              isLoading={loading}
              value={d && formatVnd(d.confirmedValue.value)}
              footer={d && <Compare metric={d.confirmedValue} />}
            />
          </section>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Đơn theo giờ hôm nay</CardTitle>
                <CardDescription>Theo giờ đặt hàng, không gồm đơn hủy vì trùng.</CardDescription>
              </CardHeader>
              <CardContent>
                {!d ? (
                  <div className="bg-muted h-64 animate-pulse rounded-lg" />
                ) : !hasHours ? (
                  <EmptyState compact icon={ShoppingBag} title="Hôm nay chưa có đơn" />
                ) : (
                  <ChartContainer
                    config={hourConfig}
                    className="aspect-auto h-64 w-full"
                    aria-label="Biểu đồ số đơn theo giờ hôm nay"
                  >
                    <BarChart data={hours} margin={{ left: 4, right: 8, top: 8 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} interval={1} />
                      <YAxis tickLine={false} axisLine={false} width={28} allowDecimals={false} />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            labelFormatter={(v) => `Khung ${String(v)}`}
                            formatter={(value) => (
                              <div className="flex w-full justify-between gap-4">
                                <span className="text-muted-foreground">Số đơn</span>
                                <span className="font-medium tabular-nums">
                                  {formatCount(Number(value))}
                                </span>
                              </div>
                            )}
                          />
                        }
                      />
                      <Bar
                        dataKey="orders"
                        fill="var(--color-orders)"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={24}
                      />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Xu hướng 14 ngày</CardTitle>
                <CardDescription>
                  Cột: đơn và đơn đã xác nhận theo ngày đặt. Đường: tỉ lệ xác nhận (trục phải).
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!d ? (
                  <div className="bg-muted h-64 animate-pulse rounded-lg" />
                ) : (
                  <ChartContainer
                    config={trendConfig}
                    className="aspect-auto h-64 w-full"
                    aria-label="Biểu đồ số đơn, đơn xác nhận và tỉ lệ xác nhận 14 ngày"
                  >
                    <ComposedChart data={trend} margin={{ left: 4, right: 4, top: 8 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="date"
                        tickFormatter={shortDateKey}
                        tickLine={false}
                        axisLine={false}
                        minTickGap={12}
                      />
                      <YAxis
                        yAxisId="count"
                        tickLine={false}
                        axisLine={false}
                        width={32}
                        allowDecimals={false}
                      />
                      <YAxis
                        yAxisId="rate"
                        orientation="right"
                        domain={[0, 100]}
                        tickFormatter={(v: number) => `${v}%`}
                        tickLine={false}
                        axisLine={false}
                        width={40}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            labelFormatter={(_, payload) =>
                              payload?.[0] ? displayDateKey(String(payload[0].payload.date)) : ''
                            }
                            formatter={(value, name) => (
                              <div className="flex w-full justify-between gap-4">
                                <span className="text-muted-foreground">
                                  {trendConfig[name as keyof typeof trendConfig]?.label}
                                </span>
                                <span className="font-medium tabular-nums">
                                  {name === 'confirmRate'
                                    ? formatPercent(value === null ? null : Number(value))
                                    : formatCount(Number(value))}
                                </span>
                              </div>
                            )}
                          />
                        }
                      />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Bar
                        yAxisId="count"
                        dataKey="orders"
                        fill="var(--color-orders)"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={18}
                      />
                      <Bar
                        yAxisId="count"
                        dataKey="confirmed"
                        fill="var(--color-confirmed)"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={18}
                      />
                      <Line
                        yAxisId="rate"
                        dataKey="confirmRate"
                        type="monotone"
                        stroke="var(--color-confirmRate)"
                        strokeWidth={2}
                        dot={{ r: 2 }}
                        connectNulls
                      />
                    </ComposedChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <SharePie
              title="Tỉ trọng combo hôm nay"
              description="Theo combo hiện tại của đơn (sau khi telesale đổi combo)."
              isLoading={loading}
              items={d?.comboShare.map((c) => ({
                label: c.comboName,
                orders: c.orders,
                share: c.share,
              }))}
            />
            <SharePie
              title="Tỉ trọng nguồn hôm nay"
              description="Bấm một nguồn để mở báo cáo theo nguồn."
              isLoading={loading}
              items={d?.sourceShare.map((s) => ({
                label: sourceLabel(s.source),
                orders: s.orders,
                share: s.share,
                href: sourceReportUrl(s.source),
              }))}
            />
          </div>
        </>
      )}
    </div>
  )
}
