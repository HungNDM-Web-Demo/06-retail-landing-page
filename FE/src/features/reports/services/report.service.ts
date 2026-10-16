import { apiRoutes } from '@/config/api-routes'
import { apiCall } from '@/lib/axios'
import { isMockMode } from '@/lib/data-source'
import type { PaginatedResult } from '@/types/api'
import type {
  AdCostDto,
  AdCostQuery,
  ComboReport,
  ConversionEventDto,
  DailyReport,
  DateRangeQuery,
  ManagerDashboard,
  SaveAdCostRequest,
  SourceReport,
  TelesaleDashboard,
  TelesaleReport,
} from '@/types/landing'
import { adCostMock } from '../mock/ad-cost.mock'
import { conversionEventMock } from '../mock/conversion-event.mock'
import { dashboardMock } from '../mock/dashboard.mock'
import { reportMock } from '../mock/report.mock'
import type {
  ComboReportQuery,
  ConversionEventQuery,
  SourceReportQuery,
} from '../types/report.types'

/** Tổng quan, báo cáo, chi phí quảng cáo, sự kiện pixel (07 §2.6, §2.7) */
export const reportService = {
  dashboardManager: (): Promise<ManagerDashboard> =>
    isMockMode() ? dashboardMock.manager() : apiCall.get(apiRoutes.dashboard.manager),
  dashboardTelesale: (): Promise<TelesaleDashboard> =>
    isMockMode() ? dashboardMock.telesale() : apiCall.get(apiRoutes.dashboard.telesale),

  sources: (q: SourceReportQuery): Promise<SourceReport> =>
    isMockMode() ? reportMock.sources(q) : apiCall.get(apiRoutes.reports.sources, { params: q }),
  combos: (q: ComboReportQuery): Promise<ComboReport> =>
    isMockMode() ? reportMock.combos(q) : apiCall.get(apiRoutes.reports.combos, { params: q }),
  telesales: (q: DateRangeQuery): Promise<TelesaleReport> =>
    isMockMode()
      ? reportMock.telesales(q)
      : apiCall.get(apiRoutes.reports.telesales, { params: q }),
  daily: (q: DateRangeQuery): Promise<DailyReport> =>
    isMockMode() ? reportMock.daily(q) : apiCall.get(apiRoutes.reports.daily, { params: q }),

  adCosts: {
    list: (q: AdCostQuery): Promise<AdCostDto[]> =>
      isMockMode() ? adCostMock.list(q) : apiCall.get(apiRoutes.adCosts.list, { params: q }),
    create: (input: SaveAdCostRequest): Promise<AdCostDto> =>
      isMockMode()
        ? adCostMock.create(input)
        : apiCall.post<AdCostDto>(apiRoutes.adCosts.list, input),
    update: (id: string, input: SaveAdCostRequest): Promise<AdCostDto> =>
      isMockMode()
        ? adCostMock.update(id, input)
        : apiCall.put<AdCostDto>(apiRoutes.adCosts.detail(id), input),
    remove: (id: string): Promise<void> =>
      isMockMode() ? adCostMock.remove(id) : apiCall.delete(apiRoutes.adCosts.detail(id)),
  },

  conversionEvents: (q: ConversionEventQuery): Promise<PaginatedResult<ConversionEventDto>> =>
    isMockMode()
      ? conversionEventMock.list(q)
      : apiCall.get(apiRoutes.conversionEvents, { params: q }),
}
