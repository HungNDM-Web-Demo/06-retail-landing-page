import { permissions } from '@/config/permissions'
import { mockDelay } from '@/lib/data-source'
import { requirePermission } from '@/mock/mock-auth'
import { paginate } from '@/mock/mock-helpers'
import type { PaginatedResult } from '@/types/api'
import type { ConversionEventDto } from '@/types/landing'
import type { ConversionEventQuery } from '../types/report.types'
import { conversionEventsDb, ensureFreshDay } from './store-access'

/** GET /api/conversion-events (07 §2.7, §3.8; FR-14): nhật ký pixel giả lập, mới nhất trước */
export const conversionEventMock = {
  async list(query: ConversionEventQuery): Promise<PaginatedResult<ConversionEventDto>> {
    await mockDelay()
    ensureFreshDay()
    requirePermission(permissions.reports.view)
    const items = conversionEventsDb
      .filter((e) => !query.type || e.type === query.type)
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
      .map((e): ConversionEventDto => ({
        id: e.id,
        type: e.type,
        occurredAt: e.occurredAt,
        source: e.source,
        campaign: e.campaign,
        orderCode: e.orderCode,
        value: e.value,
        pixelCall: e.pixelCall,
      }))
    return paginate(items, { page: query.page ?? 1, pageSize: query.pageSize ?? 20 })
  },
}
