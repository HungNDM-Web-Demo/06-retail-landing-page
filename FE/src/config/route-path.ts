/** Đường dẫn FE (kebab-case). Không gõ đường dẫn trực tiếp trong component. */
export const routePath = {
  /** Landing page công khai (không AuthGuard, docs/07 §4.1) */
  root: '/',
  /** Trang cảm ơn sau khi đặt hàng (công khai) */
  thankYou: '/cam-on',
  login: '/login',
  forbidden: '/forbidden',
  profile: '/profile',

  dashboard: '/dashboard',
  orders: '/admin/orders',
  combos: '/admin/combos',
  reports: '/admin/reports',
  content: '/admin/content',

  settingsUsers: '/settings/users',
  settingsRoles: '/settings/roles',
  settingsGeneral: '/settings/general',
  settingsAuditLogs: '/settings/audit-logs',
} as const

export type RoutePath = (typeof routePath)[keyof typeof routePath]

/**
 * Landing kèm tham số giả lập (docs/07 §4.2): `visitor` = trình duyệt giả lập thứ N (N ≥ 2) khi demo nhiều
 * "khách" trong một trình duyệt; `utm` = chuỗi UTM ghép sẵn, vd "utm_source=fb&utm_campaign=serum_t10".
 */
export function landingUrl(options: { visitor?: number; utm?: string } = {}): string {
  const params = new URLSearchParams(options.utm ?? '')
  if (options.visitor && options.visitor > 1) params.set('visitor', String(options.visitor))
  const query = params.toString()
  return query ? `/?${query}` : '/'
}

/** Danh sách đơn lọc sẵn (thẻ Tổng quan, ô số đơn upsell ở báo cáo telesale; FR-03, TC-36). Tham số như `OrderQuery` */
export function ordersUrl(
  filters: Record<string, string | number | boolean | undefined> = {}
): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params.set(key, String(value))
  }
  const query = params.toString()
  return query ? `${routePath.orders}?${query}` : routePath.orders
}
