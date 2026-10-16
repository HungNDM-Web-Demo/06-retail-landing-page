'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { sourceLabel } from '@/config/landing-labels'

/** Nguồn chuẩn hóa thường gặp (BR-07) */
export const KNOWN_SOURCES = ['facebook', 'tiktok', 'google', 'zalo', 'direct'] as const

const ALL = '__all__'

/** Ô lọc nguồn của tab báo cáo; nguồn lạ trên query string (vd demo_test) vẫn hiện để chọn lại */
export function SourceSelect({
  value,
  onChange,
  extra = [],
}: {
  value: string | undefined
  onChange: (source: string | undefined) => void
  /** Nguồn khác lấy từ dữ liệu đang xem */
  extra?: string[]
}) {
  const options = [...new Set<string>([...KNOWN_SOURCES, ...extra, ...(value ? [value] : [])])]
  return (
    <Select value={value ?? ALL} onValueChange={(v) => onChange(v === ALL ? undefined : v)}>
      <SelectTrigger className="h-10 w-48" aria-label="Lọc theo nguồn">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>Tất cả nguồn</SelectItem>
        {options.map((s) => (
          <SelectItem key={s} value={s}>
            {sourceLabel(s)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
