'use client'

import { format, parseISO } from 'date-fns'
import { vi } from 'date-fns/locale'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { vnTimeText } from '../lib/vn-date'

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

/** Đầu trang Tổng quan: thứ ngày (giờ VN), "Cập nhật lúc HH:mm", nút Làm mới */
export function DashboardHeader({
  title,
  date,
  asOf,
  isFetching,
  onRefresh,
}: {
  title: string
  /** yyyy-MM-dd giờ VN do API trả */
  date?: string
  asOf?: string
  isFetching?: boolean
  onRefresh?: () => void
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-muted-foreground min-h-5 text-sm">
          {date && capitalize(format(parseISO(date), "EEEE, 'ngày' dd/MM/yyyy", { locale: vi }))}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      </div>
      {onRefresh && (
        <div className="flex items-center gap-3">
          {asOf && <p className="text-muted-foreground text-sm">Cập nhật lúc {vnTimeText(asOf)}</p>}
          <Button variant="outline" onClick={onRefresh} disabled={isFetching}>
            <RefreshCw className={cn(isFetching && 'animate-spin')} aria-hidden="true" />
            Làm mới
          </Button>
        </div>
      )}
    </div>
  )
}
