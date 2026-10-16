'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Cell, Pie, PieChart } from 'recharts'
import { PieChart as PieIcon } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { cn } from '@/lib/utils'
import { formatCount, formatPercent } from './ReportParts'

export type ShareItem = { label: string; orders: number; share: number; href?: string }

/** Màu lát thứ i: token biểu đồ, quay vòng 5 màu */
const sliceColor = (i: number) => `var(--chart-${(i % 5) + 1})`

/**
 * Biểu đồ tròn tỉ trọng đơn kèm chú thích có số đơn và % (FR-02). Mục có `href` bấm được ở cả lát và
 * chú thích (nguồn → báo cáo theo nguồn, UC-10 2a).
 */
export function SharePie({
  title,
  description,
  items,
  isLoading,
}: {
  title: string
  description?: string
  items: ShareItem[] | undefined
  isLoading?: boolean
}) {
  const router = useRouter()
  const data = (items ?? []).map((item, i) => ({ ...item, key: `k${i}`, fill: sliceColor(i) }))
  const config = Object.fromEntries(
    data.map((d) => [d.key, { label: d.label, color: d.fill }])
  ) satisfies ChartConfig

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="bg-muted h-56 animate-pulse rounded-lg" />
        ) : !data.length ? (
          <EmptyState compact icon={PieIcon} title="Hôm nay chưa có đơn" />
        ) : (
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <ChartContainer
              config={config}
              className="aspect-square h-52 shrink-0"
              aria-label={`Biểu đồ tròn ${title.toLowerCase()}`}
            >
              <PieChart>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      hideLabel
                      nameKey="key"
                      formatter={(_, __, item) => {
                        const row = item.payload as (typeof data)[number]
                        return (
                          <div className="flex w-full items-center justify-between gap-4">
                            <span className="flex items-center gap-1.5">
                              <span
                                className="size-2.5 rounded-[2px]"
                                style={{ background: row.fill }}
                                aria-hidden="true"
                              />
                              {row.label}
                            </span>
                            <span className="font-medium tabular-nums">
                              {formatCount(row.orders)} đơn · {formatPercent(row.share)}
                            </span>
                          </div>
                        )
                      }}
                    />
                  }
                />
                <Pie
                  data={data}
                  dataKey="orders"
                  nameKey="key"
                  innerRadius="55%"
                  outerRadius="95%"
                  strokeWidth={2}
                  className={cn(data.some((d) => d.href) && 'cursor-pointer')}
                  onClick={(_, index) => {
                    const href = data[index]?.href
                    if (href) router.push(href)
                  }}
                >
                  {data.map((d) => (
                    <Cell key={d.key} fill={d.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <ul className="w-full min-w-0 space-y-1">
              {data.map((d) => {
                const content = (
                  <>
                    <span
                      className="size-3 shrink-0 rounded-sm"
                      style={{ background: d.fill }}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1 truncate">{d.label}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {formatCount(d.orders)} đơn
                    </span>
                    <span className="w-14 text-right font-medium tabular-nums">
                      {formatPercent(d.share)}
                    </span>
                  </>
                )
                return (
                  <li key={d.key}>
                    {d.href ? (
                      <Link
                        href={d.href}
                        className="hover:bg-muted focus-visible:ring-ring/50 flex min-h-9 items-center gap-2 rounded-md px-2 text-sm outline-none focus-visible:ring-3"
                        title={`Xem báo cáo theo nguồn ${d.label}`}
                      >
                        {content}
                      </Link>
                    ) : (
                      <div className="flex min-h-9 items-center gap-2 px-2 text-sm">{content}</div>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
