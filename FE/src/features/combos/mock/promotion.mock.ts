import { permissions } from '@/config/permissions'
import { fieldErrors, salesProblem } from '@/features/orders/mock/sales-problems'
import { mockDelay } from '@/lib/data-source'
import { requirePermission } from '@/mock/mock-auth'
import { notFound } from '@/mock/mock-errors'
import type { PromotionDto, PromotionRecord, UpdatePromotionRequest } from '@/types/landing'
import { comboProblems, promotionMessages } from '../lib/combo-messages'
import { ensureFreshDay, getPromotion, promotionDb, toPromotionDto } from './store-access'

/** Handler mock `/api/promotion` (07 §2.2, §3.3; FR-16, UC-11, BR-20, TC-03, TC-17) */

function current(): PromotionRecord {
  const promotion = getPromotion()
  if (!promotion) throw notFound('Chưa có chương trình khuyến mãi')
  return promotion
}

const isoOrNull = (value: string | null | undefined) => {
  const ms = value ? Date.parse(value) : NaN
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null
}

export const promotionMock = {
  async get(): Promise<PromotionDto> {
    await mockDelay()
    ensureFreshDay()
    requirePermission(permissions.combos.view)
    return toPromotionDto(current(), Date.now())
  },

  /** Lưu xong landing đếm ngược theo giá trị mới ở lần tải kế tiếp (UC-11 bước 4) */
  async update(input: UpdatePromotionRequest): Promise<PromotionDto> {
    await mockDelay()
    ensureFreshDay()
    requirePermission(permissions.combos.update)
    const before = current()

    const errors: Record<string, string> = {}
    const name = input.name?.trim() ?? ''
    if (!name) errors.name = promotionMessages.nameRequired
    else if (name.length > 100) errors.name = promotionMessages.nameMax
    const startAt = isoOrNull(input.startAt)
    const endAt = isoOrNull(input.endAt)
    if (!startAt) errors.startAt = promotionMessages.startRequired
    if (!endAt) errors.endAt = promotionMessages.endRequired
    else if (startAt && Date.parse(endAt) <= Date.parse(startAt))
      errors.endAt = promotionMessages.endAfterStart // BR-20
    const days = input.autoRenewDays
    const hasDays = days !== undefined && days !== null
    if (hasDays && (!Number.isInteger(days) || days < 1 || days > 30))
      errors.autoRenewDays = promotionMessages.autoRenewDays
    if (Object.keys(errors).length) throw fieldErrors(errors)

    // Chống ghi đè: lệch version → 409 DuLieuCu kèm currentVersion (07 §2.8)
    if (input.version !== before.version)
      throw salesProblem(409, 'DuLieuCu', comboProblems.DuLieuCu, {
        currentVersion: before.version,
      })

    const after = promotionDb.update(before.id, {
      name,
      startAt: startAt!,
      endAt: endAt!,
      autoRenewDays: hasDays ? days : undefined,
      version: before.version + 1,
    })!
    return toPromotionDto(after, Date.now())
  },
}
