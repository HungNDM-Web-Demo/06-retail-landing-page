import { permissions, roleCodes } from '@/config/permissions'
import { mockDelay } from '@/lib/data-source'
import { requirePermission } from '@/mock/mock-auth'
import { stableId } from '@/mock/mock-helpers'
import { rolesOfUser } from '@/mock/system-data'
import type { OrderStatus, SetReceivingRequest, TelesaleDto } from '@/types/landing'
import { salesProblem } from './sales-problems'
import {
  activeTelesales,
  ensureFreshDay,
  ordersDb,
  telesaleStateOf,
  telesaleStatesDb,
} from './store-access'

/** Handler mock `/api/telesales` (07 §2.5; FR-20, BR-09). Telesale = tài khoản vai trò STAFF (quyết định 20). */

/** Đơn đang mở của người nhận: Mới + Chờ gọi lại (giống BE TelesaleService) */
const OPEN: OrderStatus[] = ['Moi', 'ChoGoiLai']

function toDto(user: { userId: string; username: string; fullName: string }): TelesaleDto {
  const state = telesaleStateOf(user.userId)
  return {
    userId: user.userId,
    username: user.username,
    fullName: user.fullName,
    isReceiving: !!state?.isReceiving,
    lastAssignedAt: state?.lastAssignedAt,
    openOrders: ordersDb.count((o) => o.assigneeId === user.userId && OPEN.includes(o.status)),
  }
}

export const telesaleMock = {
  async getList(): Promise<TelesaleDto[]> {
    await mockDelay()
    ensureFreshDay()
    requirePermission(permissions.orders.view)
    return activeTelesales().map(toDto)
  },

  /** Bật/tắt "Nhận đơn" của người đang đăng nhập; chỉ vai trò STAFF (07 §2.5) */
  async setMyReceiving(input: SetReceivingRequest): Promise<TelesaleDto> {
    await mockDelay()
    ensureFreshDay()
    const { user } = requirePermission(permissions.orders.call)
    if (!rolesOfUser(user).some((r) => r.code === roleCodes.staff)) {
      throw salesProblem(400, 'KhongPhaiTelesale', 'Chỉ tài khoản Telesale mới bật nhận đơn')
    }
    const state = telesaleStateOf(user.id)
    if (state) telesaleStatesDb.update(state.id, { isReceiving: !!input.isReceiving })
    else
      telesaleStatesDb.insert({
        id: stableId('telesale', user.username),
        userId: user.id,
        isReceiving: !!input.isReceiving,
      })
    return toDto({ userId: user.id, username: user.username, fullName: user.fullName })
  },
}
