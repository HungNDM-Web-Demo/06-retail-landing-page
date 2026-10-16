'use client'

import { useState } from 'react'
import { FileSpreadsheet, Loader2, TrendingDown, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getErrorMessage } from '@/lib/api-error'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { exportExcel, type ExcelSheet } from '../lib/export-excel'

/** Trục tiền gọn: 1.250.000 → "1,3tr", 85.000 → "85k" */
export const compactVnd = (v: number) =>
  Math.abs(v) >= 1_000_000
    ? `${formatNumber(v / 1_000_000, 1)}tr`
    : Math.abs(v) >= 1000
      ? `${formatNumber(v / 1000, 0)}k`
      : formatNumber(v, 0)

/** Tỉ lệ 1 chữ số: 38.5 → "38,5%"; null → "—" (07 §4.7) */
export const formatPercent = (v: number | null | undefined) =>
  v === null || v === undefined ? '—' : `${formatNumber(v, 1)}%`

/** Tỉ lệ chuyển đổi 2 chữ số: 1.79 → "1,79%" (giữ đủ 2 chữ số) */
export const formatConversion = (v: number | null | undefined) =>
  v === null || v === undefined
    ? '—'
    : `${new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)}%`

/** ROAS 2 chữ số: 4.06 → "4,06" */
export const formatRoas = (v: number | null | undefined) =>
  v === null || v === undefined
    ? '—'
    : new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
        v
      )

/** Số nguyên: 1234 → "1.234" */
export const formatCount = (v: number | null | undefined) => formatNumber(v, 0)

/** % thay đổi so với kỳ trước, 1 chữ số; null khi kỳ trước = 0 (07 §3.11) */
export const changePercent = (value: number, previous: number) =>
  previous === 0 ? null : Math.round(((value - previous) / previous) * 1000) / 10

/** Chênh lệch điểm phần trăm giữa hai tỉ lệ; null khi một bên null */
export const changePoints = (value: number | null, previous: number | null) =>
  value === null || previous === null ? null : Math.round((value - previous) * 10) / 10

/** Nút "Xuất Excel": dựng trang tính khi bấm (có thể tải thêm dữ liệu) rồi tải file về máy */
export function ExportButton({
  fileName,
  build,
  disabled,
  label = 'Xuất Excel',
}: {
  fileName: string | (() => string)
  build: () => ExcelSheet[] | Promise<ExcelSheet[]>
  disabled?: boolean
  label?: string
}) {
  const [pending, setPending] = useState(false)
  return (
    <Button
      variant="outline"
      disabled={disabled || pending}
      onClick={async () => {
        setPending(true)
        try {
          const sheets = await build()
          await exportExcel(typeof fileName === 'function' ? fileName() : fileName, sheets)
          toast.success('Đã xuất file Excel')
        } catch (error) {
          toast.error(getErrorMessage(error, 'Không xuất được file Excel'))
        } finally {
          setPending(false)
        }
      }}
    >
      {pending ? (
        <Loader2 className="animate-spin" aria-hidden="true" />
      ) : (
        <FileSpreadsheet aria-hidden="true" />
      )}
      {label}
    </Button>
  )
}

/** Thẻ số liệu tổng của tab báo cáo */
export function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  tone?: 'destructive' | 'success'
}) {
  return (
    <div className="bg-card rounded-xl border p-4 shadow-xs">
      <p className="text-muted-foreground text-sm">{label}</p>
      <p
        className={cn(
          'mt-1 text-xl font-semibold tabular-nums',
          tone === 'destructive' && 'text-destructive',
          tone === 'success' && 'text-success'
        )}
      >
        {value}
      </p>
      {sub && <div className="text-muted-foreground mt-1 text-xs">{sub}</div>}
    </div>
  )
}

/**
 * Thay đổi so với kỳ trước: mũi tên + số, không chỉ dựa vào màu.
 * `unit = '%'` với số lượng, tiền; `unit = 'điểm'` với tỉ lệ (điểm phần trăm, 07 §3.11).
 */
export function ChangeText({
  value,
  unit = '%',
  inverse,
  suffix,
  digits = 1,
}: {
  value: number | null | undefined
  unit?: '%' | 'điểm'
  /** true khi giảm là tốt (tỉ lệ hủy, hoàn) */
  inverse?: boolean
  suffix?: string
  /** Số chữ số thập phân (tỉ lệ chuyển đổi: 2) */
  digits?: number
}) {
  if (value === undefined || value === null) {
    return <span className="text-muted-foreground">— {suffix}</span>
  }
  const up = value >= 0
  const good = inverse ? !up : up
  const Icon = up ? TrendingUp : TrendingDown
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className={cn(
          'inline-flex items-center gap-0.5 font-semibold',
          value === 0 ? 'text-muted-foreground' : good ? 'text-success' : 'text-destructive'
        )}
      >
        <Icon className="size-3.5" aria-hidden="true" />
        <span className="sr-only">{up ? 'Tăng' : 'Giảm'}</span>
        {up ? '+' : '−'}
        {formatNumber(Math.abs(value), digits)}
        {unit === '%' ? '%' : ' điểm'}
      </span>
      {suffix && <span className="text-muted-foreground">{suffix}</span>}
    </span>
  )
}

/** Khung chờ tải chung: hàng thẻ và một khối bảng/biểu đồ */
export function TabLoading({ cards = 4 }: { cards?: number }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Đang tải báo cáo">
      {cards > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: cards }, (_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      )}
      <Skeleton className="h-80 rounded-xl" />
    </div>
  )
}

/** Thanh lọc riêng của tab và nút xuất, nằm một hàng phía trên nội dung */
export function TabToolbar({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>
}
