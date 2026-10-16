import Link from 'next/link'
import { ArrowRight, type LucideIcon } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

type MetricCardProps = {
  label: string
  value?: React.ReactNode
  icon?: LucideIcon
  /** Dòng phụ dưới số: so sánh kỳ trước, ghi chú */
  footer?: React.ReactNode
  /** Có thì cả thẻ là liên kết (thẻ việc của telesale, FR-03) */
  href?: string
  /** Tô nhẹ thẻ cần chú ý (vd còn đơn đến giờ gọi lại) */
  highlight?: boolean
  isLoading?: boolean
  className?: string
}

/** Thẻ chỉ số Tổng quan (SCR-04): giống KpiCard nền nhưng nhận dòng phụ tùy ý và bấm được */
export function MetricCard({
  label,
  value,
  icon: Icon,
  footer,
  href,
  highlight,
  isLoading,
  className,
}: MetricCardProps) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-muted-foreground text-sm font-medium">{label}</p>
        {Icon && (
          <span
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-lg',
              highlight ? 'bg-warning/12 text-warning' : 'bg-primary/10 text-primary'
            )}
          >
            <Icon className="size-[1.125rem]" aria-hidden="true" />
          </span>
        )}
      </div>
      {isLoading ? (
        <Skeleton className="mt-2 h-8 w-32" />
      ) : (
        <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      )}
      {!isLoading && (footer || href) && (
        <div className="mt-2 flex items-center justify-between gap-2 text-xs">
          <span className="min-w-0">{footer}</span>
          {href && (
            <ArrowRight
              className="text-muted-foreground group-hover:text-primary size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          )}
        </div>
      )}
    </>
  )
  const base = cn(
    'bg-card rounded-xl border p-5 shadow-xs',
    highlight && 'border-warning/50 bg-warning/5',
    className
  )
  if (!href) return <div className={base}>{body}</div>
  return (
    <Link
      href={href}
      className={cn(
        base,
        'group hover:border-primary/40 focus-visible:ring-ring/50 block transition-[border-color,box-shadow] duration-200 outline-none hover:shadow-sm focus-visible:ring-3'
      )}
    >
      {body}
    </Link>
  )
}
