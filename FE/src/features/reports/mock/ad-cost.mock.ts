import { permissions } from '@/config/permissions'
import { salesRules } from '@/config/sales-rules'
import { fieldErrors } from '@/features/orders/mock/sales-problems'
import { mockDelay } from '@/lib/data-source'
import { requirePermission } from '@/mock/mock-auth'
import { conflict, notFound } from '@/mock/mock-errors'
import { newId } from '@/mock/mock-helpers'
import type { AdCostDto, AdCostQuery, SaveAdCostRequest } from '@/types/landing'
import { vnKey } from '../lib/vn-date'
import { resolveRange } from './report.mock'
import { adCostsDb, ensureFreshDay, normalizeSource } from './store-access'

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/
const CAMPAIGN_MAX = 100
export const AD_COST_DUPLICATE = 'Đã có chi phí ngày này cho nguồn và chiến dịch đã chọn'

/** Kiểm dữ liệu, câu lỗi đúng 07 §2.7; trả bản đã chuẩn hóa */
function validate(input: SaveAdCostRequest): Omit<AdCostDto, 'id' | 'updatedAt'> {
  const errors: Record<string, string> = {}
  const date = (input.date ?? '').trim()
  if (!date || !DATE_KEY.test(date)) errors.date = 'Chọn ngày'
  else if (date > vnKey()) errors.date = 'Ngày không được ở tương lai'
  if (!(input.source ?? '').trim()) errors.source = 'Nhập nguồn'
  const amount = Number(input.amount)
  if (!Number.isFinite(amount) || amount <= 0) errors.amount = 'Số tiền phải lớn hơn 0'
  else if (amount % salesRules.priceStep !== 0) errors.amount = 'Số tiền là bội số 1.000 ₫'
  if (Object.keys(errors).length) throw fieldErrors(errors)
  return {
    date,
    source: normalizeSource(input.source),
    campaign: (input.campaign ?? '').trim().slice(0, CAMPAIGN_MAX),
    amount,
  }
}

/** Trùng khóa (ngày, nguồn, chiến dịch) → 409 errors.date (unique 06 §4 Sales_AdCosts) */
function assertUnique(value: Omit<AdCostDto, 'id' | 'updatedAt'>, exceptId?: string) {
  const exists = adCostsDb.some(
    (c) =>
      c.id !== exceptId &&
      c.date === value.date &&
      c.source === value.source &&
      c.campaign === value.campaign
  )
  if (exists) throw conflict(AD_COST_DUPLICATE, { date: AD_COST_DUPLICATE })
}

/** /api/ad-costs (07 §2.7; FR-33). Bảng Sales_* không ghi nhật ký thao tác (07 §5 quyết định 33) */
export const adCostMock = {
  /** Ngày giảm dần */
  async list(query: AdCostQuery): Promise<AdCostDto[]> {
    await mockDelay()
    ensureFreshDay()
    requirePermission(permissions.adCosts.view)
    const { from, to } = resolveRange(query)
    const source = query.source?.trim() ? normalizeSource(query.source) : undefined
    return adCostsDb
      .filter((c) => c.date >= from && c.date <= to && (!source || c.source === source))
      .sort(
        (a, b) =>
          b.date.localeCompare(a.date) ||
          a.source.localeCompare(b.source) ||
          a.campaign.localeCompare(b.campaign)
      )
  },

  async create(input: SaveAdCostRequest): Promise<AdCostDto> {
    await mockDelay()
    ensureFreshDay()
    requirePermission(permissions.adCosts.create)
    const value = validate(input)
    assertUnique(value)
    return adCostsDb.insert({ id: newId(), ...value, updatedAt: new Date().toISOString() })
  },

  async update(id: string, input: SaveAdCostRequest): Promise<AdCostDto> {
    await mockDelay()
    ensureFreshDay()
    requirePermission(permissions.adCosts.update)
    if (!adCostsDb.get(id)) throw notFound('Không tìm thấy chi phí quảng cáo')
    const value = validate(input)
    assertUnique(value, id)
    const updated = adCostsDb.update(id, { ...value, updatedAt: new Date().toISOString() })
    if (!updated) throw notFound('Không tìm thấy chi phí quảng cáo')
    return updated
  },

  async remove(id: string): Promise<void> {
    await mockDelay()
    ensureFreshDay()
    requirePermission(permissions.adCosts.update)
    if (!adCostsDb.remove(id)) throw notFound('Không tìm thấy chi phí quảng cáo')
  },
}
