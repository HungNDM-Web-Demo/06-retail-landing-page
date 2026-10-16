'use client'

import { useState } from 'react'
import { FilterX } from 'lucide-react'
import { SearchInput } from '@/components/shared/SearchInput'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { orderTagLabels, sourceLabels } from '@/config/landing-labels'
import { addDaysKey, vnKey } from '@/features/reports/lib/vn-date'
import type { ComboDto, OrderTag, TelesaleDto } from '@/types/landing'
import { activeFilterCount, type OrderFilters as Filters } from '../lib/order-filters'

const ALL = '__all'

type DatePreset = 'all' | 'today' | 'yesterday' | '7d' | '30d' | 'custom'

function datePresetOf(f: Filters): DatePreset {
  if (!f.from && !f.to) return 'all'
  const today = vnKey()
  if (f.from === today && f.to === today) return 'today'
  const y = addDaysKey(today, -1)
  if (f.from === y && f.to === y) return 'yesterday'
  if (f.to === today && f.from === addDaysKey(today, -6)) return '7d'
  if (f.to === today && f.from === addDaysKey(today, -29)) return '30d'
  return 'custom'
}

function presetRange(p: DatePreset): { from?: string; to?: string } {
  const today = vnKey()
  switch (p) {
    case 'today':
      return { from: today, to: today }
    case 'yesterday': {
      const y = addDaysKey(today, -1)
      return { from: y, to: y }
    }
    case '7d':
      return { from: addDaysKey(today, -6), to: today }
    case '30d':
      return { from: addDaysKey(today, -29), to: today }
    default:
      return { from: undefined, to: undefined }
  }
}

/**
 * Thanh lọc danh sách đơn (UC-05 bước 2): tìm SĐT/mã/tên, ngày đặt, combo, nguồn, telesale (chỉ người có
 * `orders.view-all`, có "Chưa chia"), nhãn. "Xóa bộ lọc" khi đang lọc.
 */
export function OrderFilters({
  value,
  onChange,
  combos,
  telesales,
  showAssignee,
  sources,
}: {
  value: Filters
  onChange: (next: Filters) => void
  combos: ComboDto[]
  telesales: TelesaleDto[]
  showAssignee: boolean
  /** Nguồn khác ngoài 5 nguồn chuẩn đang có trong dữ liệu (vd demo_test) */
  sources: string[]
}) {
  const [resetKey, setResetKey] = useState(0)
  const set = (patch: Partial<Filters>) => onChange({ ...value, ...patch })
  const preset = datePresetOf(value)
  const count = activeFilterCount(value) + (value.search ? 1 : 0)
  const sourceOptions = [...new Set([...Object.keys(sourceLabels), ...sources])]

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SearchInput
        key={resetKey}
        value={value.search ?? ''}
        onSearch={(search) => {
          if ((search || undefined) !== value.search) set({ search: search || undefined })
        }}
        placeholder="Tìm SĐT, mã đơn, tên khách"
        aria-label="Tìm đơn theo số điện thoại, mã đơn, tên khách"
        className="w-full sm:w-64"
      />

      <Select
        value={preset}
        onValueChange={(p) => p !== 'custom' && set(presetRange(p as DatePreset))}
      >
        <SelectTrigger className="h-10 w-40" aria-label="Ngày đặt">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Mọi ngày đặt</SelectItem>
          <SelectItem value="today">Hôm nay</SelectItem>
          <SelectItem value="yesterday">Hôm qua</SelectItem>
          <SelectItem value="7d">7 ngày</SelectItem>
          <SelectItem value="30d">30 ngày</SelectItem>
          <SelectItem value="custom">Tùy chọn</SelectItem>
        </SelectContent>
      </Select>
      {preset === 'custom' && (
        <div className="flex items-center gap-1">
          <Input
            type="date"
            value={value.from ?? ''}
            max={value.to}
            onChange={(e) => set({ from: e.target.value || undefined })}
            aria-label="Đặt từ ngày"
            className="h-10 w-38"
          />
          <span className="text-muted-foreground" aria-hidden="true">
            →
          </span>
          <Input
            type="date"
            value={value.to ?? ''}
            min={value.from}
            onChange={(e) => set({ to: e.target.value || undefined })}
            aria-label="Đặt đến ngày"
            className="h-10 w-38"
          />
        </div>
      )}

      <Select
        value={value.comboId ?? ALL}
        onValueChange={(v) => set({ comboId: v === ALL ? undefined : v })}
      >
        <SelectTrigger className="h-10 w-44" aria-label="Combo">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Mọi combo</SelectItem>
          {combos.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.code} · {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={value.source ?? ALL}
        onValueChange={(v) => set({ source: v === ALL ? undefined : v })}
      >
        <SelectTrigger className="h-10 w-36" aria-label="Nguồn">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Mọi nguồn</SelectItem>
          {sourceOptions.map((s) => (
            <SelectItem key={s} value={s}>
              {sourceLabels[s] ?? s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showAssignee && (
        <Select
          value={value.assigneeId ?? ALL}
          onValueChange={(v) => set({ assigneeId: v === ALL ? undefined : v })}
        >
          <SelectTrigger className="h-10 w-44" aria-label="Telesale phụ trách">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Mọi telesale</SelectItem>
            <SelectItem value="unassigned">Chưa chia</SelectItem>
            {telesales.map((t) => (
              <SelectItem key={t.userId} value={t.userId}>
                {t.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select
        value={value.tag ?? ALL}
        onValueChange={(v) => set({ tag: v === ALL ? undefined : (v as OrderTag) })}
      >
        <SelectTrigger className="h-10 w-40" aria-label="Nhãn">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Mọi nhãn</SelectItem>
          {(Object.keys(orderTagLabels) as OrderTag[]).map((t) => (
            <SelectItem key={t} value={t}>
              {orderTagLabels[t]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {(value.confirmedById || value.upsellOnly) && (
        <span className="bg-primary/10 text-primary rounded-full px-3 py-1 text-xs font-medium">
          {value.upsellOnly ? 'Đơn có upsell' : 'Đơn đã xác nhận'}
          {value.confirmedById ? ' của một telesale' : ''}
        </span>
      )}

      {count > 0 && (
        <Button
          variant="ghost"
          onClick={() => {
            setResetKey((k) => k + 1)
            onChange({})
          }}
        >
          <FilterX aria-hidden="true" />
          Xóa bộ lọc
        </Button>
      )}
    </div>
  )
}
