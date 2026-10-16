import { permissions } from '@/config/permissions'
import { fieldErrors } from '@/features/orders/mock/sales-problems'
import { mockDelay } from '@/lib/data-source'
import { requirePermission } from '@/mock/mock-auth'
import type {
  ComboReport,
  DailyReport,
  DateRangeQuery,
  SourceReport,
  TelesaleReport,
} from '@/types/landing'
import type { ComboReportQuery, SourceReportQuery } from '../types/report.types'
import { checkRange, comboReport, dailyReport, sourceReport, telesaleRows } from './report-calc'
import {
  activeTelesales,
  adCostsDb,
  allVisitStats,
  combosDb,
  ensureFreshDay,
  normalizeSource,
  ordersDb,
  userName,
} from './store-access'

/** from/to theo 07 §2: vắng → 7 ngày tới hôm nay; sai → 400 errors.from / errors.to */
export function resolveRange(query: DateRangeQuery): { from: string; to: string } {
  const { from, to, errors } = checkRange(query)
  if (errors) throw fieldErrors(errors)
  return { from, to }
}

const optionalSource = (s: string | undefined) => (s?.trim() ? normalizeSource(s) : undefined)

const reportData = () => ({
  orders: ordersDb.all(),
  visitStats: allVisitStats(),
  adCosts: adCostsDb.all(),
  combos: combosDb.all(),
})

/** Đầu mỗi handler báo cáo: làm mới dữ liệu khi sang ngày (07 §4.8), cần `reports.view` */
async function begin() {
  await mockDelay()
  ensureFreshDay()
  requirePermission(permissions.reports.view)
}

/** GET /api/reports/* (07 §2.7; FR-29..FR-33; UC-12) */
export const reportMock = {
  async sources(query: SourceReportQuery): Promise<SourceReport> {
    await begin()
    const { from, to } = resolveRange(query)
    return sourceReport(reportData(), from, to, {
      source: optionalSource(query.source),
      campaign: query.campaign === undefined ? undefined : query.campaign.trim(),
    })
  },

  async combos(query: ComboReportQuery): Promise<ComboReport> {
    await begin()
    const { from, to } = resolveRange(query)
    return comboReport(reportData(), from, to, optionalSource(query.source))
  },

  async telesales(query: DateRangeQuery): Promise<TelesaleReport> {
    await begin()
    const { from, to } = resolveRange(query)
    // Telesale = tài khoản vai trò STAFF đang hoạt động (07 §5 quyết định 20)
    const staff = activeTelesales().map((u) => ({ userId: u.userId, fullName: u.fullName }))
    const rows = telesaleRows(ordersDb.all(), from, to, staff, (id) => userName(id) || undefined)
    return { from, to, rows }
  },

  async daily(query: DateRangeQuery): Promise<DailyReport> {
    await begin()
    const { from, to } = resolveRange(query)
    return dailyReport(ordersDb.all(), from, to)
  },
}
