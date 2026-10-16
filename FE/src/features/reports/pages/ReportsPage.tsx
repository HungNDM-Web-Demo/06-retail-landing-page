'use client'

import { Suspense, useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ChartColumn } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { PermissionGuard } from '@/components/shared/PermissionGuard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { permissions } from '@/config/permissions'
import { usePermissions } from '@/hooks/use-permissions'
import { AdCostsTab } from '../components/AdCostsTab'
import { CombosTab } from '../components/CombosTab'
import { DailyTab } from '../components/DailyTab'
import { DateRangeFilter } from '../components/DateRangeFilter'
import { PixelEventsTab } from '../components/PixelEventsTab'
import { SourcesTab } from '../components/SourcesTab'
import { TelesalesTab } from '../components/TelesalesTab'
import {
  DEFAULT_PRESET,
  detectPreset,
  presetRange,
  rangeError,
  type DateRange,
} from '../lib/date-range'

const TABS = [
  { value: 'sources', label: 'Nguồn' },
  { value: 'combos', label: 'Combo' },
  { value: 'telesales', label: 'Telesale' },
  { value: 'daily', label: 'Theo ngày' },
  { value: 'ad-costs', label: 'Chi phí quảng cáo' },
  { value: 'pixel', label: 'Sự kiện pixel' },
] as const
type TabValue = (typeof TABS)[number]['value']
const isTab = (v: string | null): v is TabValue => TABS.some((t) => t.value === v)

/**
 * SCR-08 Báo cáo `/admin/reports` (UC-12, UC-14; FR-29..FR-34; TC-23, TC-35, TC-36): tab, khoảng ngày và nguồn
 * giữ trên query string (`?tab=sources&source=facebook&from&to`). Thiếu `reports.view` → /forbidden.
 */
export function ReportsPage() {
  return (
    <PermissionGuard permission={permissions.reports.view} redirect>
      <Suspense>
        <ReportsView />
      </Suspense>
    </PermissionGuard>
  )
}

function ReportsView() {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const { can } = usePermissions()
  const canAdCosts = can(permissions.adCosts.view)

  const rawTab = params.get('tab')
  const tab: TabValue = isTab(rawTab) && (rawTab !== 'ad-costs' || canAdCosts) ? rawTab : 'sources'
  const from = params.get('from') ?? ''
  const to = params.get('to') ?? ''
  // Khoảng ngày trên URL sai (định dạng, > 366 ngày) thì về mặc định 7 ngày
  const range: DateRange = rangeError(from, to) ? presetRange(DEFAULT_PRESET) : { from, to }
  const preset = detectPreset(range)
  const source = params.get('source')?.trim().toLowerCase() || undefined

  const setParams = useCallback(
    (patch: Record<string, string | undefined>) => {
      const next = new URLSearchParams(params.toString())
      for (const [key, value] of Object.entries(patch)) {
        if (value) next.set(key, value)
        else next.delete(key)
      }
      router.replace(`${pathname}?${next.toString()}`, { scroll: false })
    },
    [params, pathname, router]
  )
  const onSourceChange = (s: string | undefined) => setParams({ source: s })
  const tabs = TABS.filter((t) => t.value !== 'ad-costs' || canAdCosts)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Báo cáo"
        icon={ChartColumn}
        description="Số liệu theo giờ Việt Nam; không tính đơn hủy vì trùng. Xuất Excel dựng từ bảng đang xem."
      />
      <DateRangeFilter
        preset={preset}
        value={range}
        onChange={(_, r) => setParams({ from: r.from, to: r.to })}
      />
      <Tabs value={tab} onValueChange={(v) => isTab(v) && setParams({ tab: v })} className="gap-4">
        <div className="overflow-x-auto overflow-y-hidden">
          <TabsList className="w-max group-data-horizontal/tabs:h-12">
            {tabs.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="min-h-10 px-4">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value="sources">
          <SourcesTab range={range} enabled={tab === 'sources'} source={source} />
        </TabsContent>
        <TabsContent value="combos">
          <CombosTab
            range={range}
            enabled={tab === 'combos'}
            source={source}
            onSourceChange={onSourceChange}
          />
        </TabsContent>
        <TabsContent value="telesales">
          <TelesalesTab range={range} enabled={tab === 'telesales'} />
        </TabsContent>
        <TabsContent value="daily">
          <DailyTab range={range} enabled={tab === 'daily'} />
        </TabsContent>
        {canAdCosts && (
          <TabsContent value="ad-costs">
            <AdCostsTab
              range={range}
              enabled={tab === 'ad-costs'}
              source={source}
              onSourceChange={onSourceChange}
            />
          </TabsContent>
        )}
        <TabsContent value="pixel">
          <PixelEventsTab enabled={tab === 'pixel'} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
