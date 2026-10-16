import { permissions } from '@/config/permissions'
import { salesRules } from '@/config/sales-rules'
import { fieldErrors, salesProblem } from '@/features/orders/mock/sales-problems'
import { mockDelay } from '@/lib/data-source'
import { requirePermission } from '@/mock/mock-auth'
import { mockDb } from '@/mock/mock-db'
import { notFound } from '@/mock/mock-errors'
import { newId, nextCode } from '@/mock/mock-helpers'
import type {
  ComboDto,
  ComboRecord,
  ReorderRequest,
  SaveComboRequest,
  SetVisibilityRequest,
} from '@/types/landing'
import { comboLimits, comboMessages, comboProblems } from '../lib/combo-messages'
import {
  combosDb,
  ensureFreshDay,
  getProduct,
  liveCombos,
  orderCountsByCombo,
  pricePerBottle,
} from './store-access'

/** Handler mock `/api/combos` (07 §2.3; FR-15, UC-11, BR-01, TC-34) */

const trimOrUndefined = (value: string | null | undefined) => value?.trim() || undefined

function toDto(record: ComboRecord, orderCount: number): ComboDto {
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    description: record.description,
    bottleCount: record.bottleCount,
    giftText: record.giftText || undefined,
    promoPrice: record.promoPrice,
    regularPrice: record.regularPrice,
    freeShipping: record.freeShipping,
    badge: record.badge || undefined,
    imageUrl: record.imageUrl || undefined,
    sortOrder: record.sortOrder,
    isDefault: record.isDefault,
    isVisible: record.isVisible,
    promoPricePerBottle: pricePerBottle(record.promoPrice, record.bottleCount),
    regularPricePerBottle: pricePerBottle(record.regularPrice, record.bottleCount),
    orderCount,
    updatedAt: record.updatedAt,
  }
}

function getLive(id: string): ComboRecord {
  const combo = combosDb.get(id)
  if (!combo || combo.isDeleted) throw notFound(comboMessages.notFound)
  return combo
}

function priceError(value: number): string | undefined {
  if (!Number.isFinite(value) || value <= 0) return comboMessages.pricePositive
  if (!Number.isInteger(value) || value % salesRules.priceStep !== 0) return comboMessages.priceStep
  return undefined
}

/** Kiểm tra SaveComboRequest đúng câu 07 §2.3 (BR-01) */
function validate(input: SaveComboRequest) {
  const errors: Record<string, string> = {}
  const name = input.name?.trim() ?? ''
  if (!name) errors.name = comboMessages.nameRequired
  else if (name.length > comboLimits.name) errors.name = comboMessages.nameMax
  const description = input.description?.trim() ?? ''
  if (!description) errors.description = comboMessages.descriptionRequired
  else if (description.length > comboLimits.description)
    errors.description = comboMessages.descriptionMax
  const bottles = Number(input.bottleCount)
  if (!Number.isInteger(bottles) || bottles < 1 || bottles > salesRules.maxBottleCount)
    errors.bottleCount = comboMessages.bottleCount
  if ((input.giftText?.trim().length ?? 0) > comboLimits.gift)
    errors.giftText = comboMessages.giftMax
  if ((input.badge?.trim().length ?? 0) > comboLimits.badge) errors.badge = comboMessages.badgeMax
  if ((input.imageUrl?.trim().length ?? 0) > comboLimits.imageUrl)
    errors.imageUrl = comboMessages.imageUrlMax

  const promo = Number(input.promoPrice)
  const regular = Number(input.regularPrice)
  const promoError = priceError(promo)
  const regularError = priceError(regular)
  if (promoError) errors.promoPrice = promoError
  if (regularError) errors.regularPrice = regularError
  // TC-34 bước 1: 460.000 > 450.000
  if (!promoError && !regularError && promo > regular)
    errors.promoPrice = comboMessages.promoNotAboveRegular
  if (Object.keys(errors).length) throw fieldErrors(errors)
}

const fieldsOf = (input: SaveComboRequest) => ({
  name: input.name.trim(),
  description: input.description.trim(),
  bottleCount: Number(input.bottleCount),
  giftText: trimOrUndefined(input.giftText),
  promoPrice: Number(input.promoPrice),
  regularPrice: Number(input.regularPrice),
  freeShipping: !!input.freeShipping,
  badge: trimOrUndefined(input.badge),
  imageUrl: trimOrUndefined(input.imageUrl),
})

export const comboMock = {
  async getList(): Promise<ComboDto[]> {
    await mockDelay()
    ensureFreshDay()
    requirePermission(permissions.combos.view)
    const counts = orderCountsByCombo()
    return liveCombos().map((c) => toDto(c, counts.get(c.id) ?? 0))
  },

  /** Mã C + 2 số kế tiếp (tính cả combo đã xóa), cuối danh sách; hiện nếu đang dưới 4 combo hiện (quyết định 35) */
  async create(input: SaveComboRequest): Promise<ComboDto> {
    await mockDelay()
    ensureFreshDay()
    requirePermission(permissions.combos.create)
    validate(input)
    const live = liveCombos()
    const visibleCount = live.filter((c) => c.isVisible).length
    const isVisible = visibleCount < salesRules.maxVisibleCombos
    const now = new Date().toISOString()
    const record: ComboRecord = {
      id: newId(),
      code: nextCode(combosDb.all(), 'code', 'C', 2),
      productId: getProduct()?.id ?? '',
      ...fieldsOf(input),
      sortOrder: (live.at(-1)?.sortOrder ?? 0) + 10,
      // Chưa có combo mặc định nào đang hiện thì combo mới làm mặc định (06 §4 IsDefault)
      isDefault: isVisible && !live.some((c) => c.isDefault && c.isVisible),
      isVisible,
      isDeleted: false,
      updatedAt: now,
    }
    combosDb.insert(record)
    return toDto(record, 0)
  },

  /** Đơn cũ giữ giá đã chụp nên chỉ sửa combo */
  async update(id: string, input: SaveComboRequest): Promise<ComboDto> {
    await mockDelay()
    ensureFreshDay()
    requirePermission(permissions.combos.update)
    getLive(id)
    validate(input)
    const after = combosDb.update(id, { ...fieldsOf(input), updatedAt: new Date().toISOString() })!
    return toDto(after, orderCountsByCombo().get(id) ?? 0)
  },

  /** BR-01 tối đa 4 combo hiện; SRS §5.2 combo mặc định không ẩn */
  async setVisibility(id: string, input: SetVisibilityRequest): Promise<void> {
    await mockDelay()
    ensureFreshDay()
    requirePermission(permissions.combos.update)
    const combo = getLive(id)
    if (combo.isVisible === input.isVisible) return
    if (input.isVisible) {
      const visible = liveCombos().filter((c) => c.isVisible).length
      if (visible >= salesRules.maxVisibleCombos)
        throw salesProblem(400, 'QuaSoComboHienThi', comboProblems.QuaSoComboHienThi)
    } else if (combo.isDefault) {
      throw salesProblem(400, 'ComboMacDinhKhongAn', comboProblems.ComboMacDinhKhongAn)
    }
    combosDb.update(id, { isVisible: input.isVisible, updatedAt: new Date().toISOString() })
  },

  /** TC-34 bước 3: đặt mặc định, combo cũ tự bỏ */
  async setDefault(id: string): Promise<void> {
    await mockDelay()
    ensureFreshDay()
    requirePermission(permissions.combos.update)
    const combo = getLive(id)
    if (!combo.isVisible) throw salesProblem(400, 'ComboDangAn', comboProblems.ComboDangAn)
    if (combo.isDefault) return
    const now = new Date().toISOString()
    mockDb.batch(() => {
      for (const other of combosDb.filter((c) => c.isDefault && c.id !== id))
        combosDb.update(other.id, { isDefault: false, updatedAt: now })
      combosDb.update(id, { isDefault: true, updatedAt: now })
    })
  },

  /** Đủ mọi combo chưa xóa, đánh lại 10, 20, 30… */
  async reorder(input: ReorderRequest): Promise<void> {
    await mockDelay()
    ensureFreshDay()
    requirePermission(permissions.combos.update)
    const live = liveCombos()
    const ids = input.ids ?? []
    const complete =
      ids.length === live.length &&
      new Set(ids).size === ids.length &&
      live.every((c) => ids.includes(c.id))
    if (!complete) throw fieldErrors({ ids: comboMessages.idsIncomplete })
    mockDb.batch(() => ids.forEach((id, i) => combosDb.update(id, { sortOrder: (i + 1) * 10 })))
  },

  /** Xóa mềm combo chưa có đơn (BR-01) */
  async remove(id: string): Promise<void> {
    await mockDelay()
    ensureFreshDay()
    requirePermission(permissions.combos.delete)
    const combo = getLive(id)
    if (combo.isDefault)
      throw salesProblem(400, 'ComboMacDinhKhongAn', comboProblems.ComboMacDinhKhongAn)
    const orderCount = orderCountsByCombo().get(id) ?? 0
    if (orderCount > 0)
      throw salesProblem(400, 'ComboDaCoDon', comboProblems.ComboDaCoDon, { orderCount })
    combosDb.update(id, {
      isDeleted: true,
      isVisible: false,
      updatedAt: new Date().toISOString(),
    })
  },
}
