'use client'

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AdCostQuery, DateRangeQuery, SaveAdCostRequest } from '@/types/landing'
import { reportService } from '../services/report.service'
import type {
  ComboReportQuery,
  ConversionEventQuery,
  SourceReportQuery,
} from '../types/report.types'

/** Khóa query theo 07 §4.9 */
export const reportKeys = {
  dashboardManager: ['dashboard', 'manager'] as const,
  dashboardTelesale: ['dashboard', 'telesale'] as const,
  reports: ['reports'] as const,
  sources: (q: SourceReportQuery) => ['reports', 'sources', q] as const,
  combos: (q: ComboReportQuery) => ['reports', 'combos', q] as const,
  telesales: (q: DateRangeQuery) => ['reports', 'telesales', q] as const,
  daily: (q: DateRangeQuery) => ['reports', 'daily', q] as const,
  adCosts: ['ad-costs'] as const,
  adCostList: (q: AdCostQuery) => ['ad-costs', q] as const,
  conversionEvents: (q: ConversionEventQuery) => ['conversion-events', q] as const,
}

type Opt = { enabled?: boolean }
const common = { placeholderData: keepPreviousData, staleTime: 30_000 }
/** Tổng quan tự làm mới 60 giây và khi tab hiện lại (07 §2.9) */
const live = { refetchInterval: 60_000, refetchOnWindowFocus: true }

export const useManagerDashboard = (o: Opt = {}) =>
  useQuery({
    queryKey: reportKeys.dashboardManager,
    queryFn: reportService.dashboardManager,
    enabled: o.enabled ?? true,
    ...live,
  })

export const useTelesaleDashboard = (o: Opt = {}) =>
  useQuery({
    queryKey: reportKeys.dashboardTelesale,
    queryFn: reportService.dashboardTelesale,
    enabled: o.enabled ?? true,
    ...live,
  })

export const useSourceReport = (q: SourceReportQuery, o: Opt = {}) =>
  useQuery({
    queryKey: reportKeys.sources(q),
    queryFn: () => reportService.sources(q),
    enabled: o.enabled ?? true,
    ...common,
  })

export const useComboReport = (q: ComboReportQuery, o: Opt = {}) =>
  useQuery({
    queryKey: reportKeys.combos(q),
    queryFn: () => reportService.combos(q),
    enabled: o.enabled ?? true,
    ...common,
  })

export const useTelesaleReport = (q: DateRangeQuery, o: Opt = {}) =>
  useQuery({
    queryKey: reportKeys.telesales(q),
    queryFn: () => reportService.telesales(q),
    enabled: o.enabled ?? true,
    ...common,
  })

export const useDailyReport = (q: DateRangeQuery, o: Opt = {}) =>
  useQuery({
    queryKey: reportKeys.daily(q),
    queryFn: () => reportService.daily(q),
    enabled: o.enabled ?? true,
    ...common,
  })

export const useAdCosts = (q: AdCostQuery, o: Opt = {}) =>
  useQuery({
    queryKey: reportKeys.adCostList(q),
    queryFn: () => reportService.adCosts.list(q),
    enabled: o.enabled ?? true,
    ...common,
  })

export const useConversionEvents = (q: ConversionEventQuery, o: Opt = {}) =>
  useQuery({
    queryKey: reportKeys.conversionEvents(q),
    queryFn: () => reportService.conversionEvents(q),
    enabled: o.enabled ?? true,
    ...common,
  })

/** Ghi chi phí xong: làm mới danh sách chi phí và mọi báo cáo (chi phí, ROAS theo nguồn) */
function useInvalidateAdCosts() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: reportKeys.adCosts })
    void queryClient.invalidateQueries({ queryKey: reportKeys.reports })
  }
}

export function useCreateAdCost() {
  const invalidate = useInvalidateAdCosts()
  return useMutation({
    mutationFn: (input: SaveAdCostRequest) => reportService.adCosts.create(input),
    onSuccess: invalidate,
  })
}

export function useUpdateAdCost() {
  const invalidate = useInvalidateAdCosts()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: SaveAdCostRequest }) =>
      reportService.adCosts.update(id, input),
    onSuccess: invalidate,
  })
}

export function useDeleteAdCost() {
  const invalidate = useInvalidateAdCosts()
  return useMutation({
    mutationFn: (id: string) => reportService.adCosts.remove(id),
    onSuccess: invalidate,
  })
}
