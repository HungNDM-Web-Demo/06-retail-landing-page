import { permissions } from '@/config/permissions'
import { isDueCallback } from '@/features/sales/lib/order-rules'
import { mockDelay } from '@/lib/data-source'
import { requirePermission } from '@/mock/mock-auth'
import type { ManagerDashboard, TelesaleDashboard } from '@/types/landing'
import { vnDayStartMs, vnKey } from '../lib/vn-date'
import { inWindow, isEverConfirmed, managerDashboard } from './report-calc'
import {
  adCostsDb,
  allVisitStats,
  combosDb,
  ensureFreshDay,
  ordersDb,
  telesaleStateOf,
} from './store-access'

/** GET /api/dashboard/* (07 §2.6; FR-01, FR-02, FR-03; UC-10) */
export const dashboardMock = {
  /** Số liệu toàn shop hôm nay, cần `reports.view` */
  async manager(): Promise<ManagerDashboard> {
    await mockDelay()
    ensureFreshDay()
    requirePermission(permissions.reports.view)
    return managerDashboard({
      orders: ordersDb.all(),
      visitStats: allVisitStats(),
      adCosts: adCostsDb.all(),
      combos: combosDb.all(),
    })
  },

  /** Việc của người đang đăng nhập `u` (07 §3.11 "Tổng quan telesale"), cần `orders.call` */
  async telesale(): Promise<TelesaleDashboard> {
    await mockDelay()
    ensureFreshDay()
    const { user } = requirePermission(permissions.orders.call)
    const now = Date.now()
    const today = vnKey(now)
    const w = { start: vnDayStartMs(today), end: now }
    const orders = ordersDb.all()
    const mine = orders.filter((o) => o.assigneeId === user.id)
    const callbacks = mine.filter((o) => o.status === 'ChoGoiLai')
    const due = callbacks.filter((o) => isDueCallback(o, now)).length
    const confirmedToday = orders.filter(
      (o) => o.confirmedById === user.id && isEverConfirmed(o) && inWindow(o.confirmedAt, w)
    )
    const upsell = confirmedToday.filter((o) => o.upsellAmount > 0)
    return {
      date: today,
      asOf: new Date(now).toISOString(),
      isReceiving: telesaleStateOf(user.id)?.isReceiving ?? false,
      myNew: mine.filter((o) => o.status === 'Moi').length,
      unassignedNew: orders.filter((o) => o.status === 'Moi' && !o.assigneeId).length,
      myDueCallbacks: due,
      myLaterCallbacks: callbacks.length - due,
      myConfirmedToday: confirmedToday.length,
      myUpsellCountToday: upsell.length,
      myUpsellValueToday: upsell.reduce((s, o) => s + o.upsellAmount, 0),
    }
  },
}
