import type { ConversionEventType, DateRangeQuery } from '@/types/landing'
import type { PaginationQuery } from '@/types/api'
import type { DateRange } from '../lib/date-range'

/** Query riêng của báo cáo (07 §2.7); DTO kết quả nằm ở `@/types/landing` */
export type SourceReportQuery = DateRangeQuery & { source?: string; campaign?: string }
export type ComboReportQuery = DateRangeQuery & { source?: string }
export type ConversionEventQuery = PaginationQuery & { type?: ConversionEventType }

export type ReportKind = 'sources' | 'combos' | 'telesales' | 'daily'

/** Props chung của một tab báo cáo (SCR-08) */
export type ReportTabProps = {
  range: DateRange
  enabled: boolean
}

/** Tab có lọc nguồn giữ trên query string */
export type SourceFilterProps = {
  source?: string
  onSourceChange: (source: string | undefined) => void
}
