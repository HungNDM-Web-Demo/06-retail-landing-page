/** Endpoint BE (QUY-UOC-API §3). Đường dẫn tương đối, lib/axios.ts ghép với NEXT_PUBLIC_API_URL. */
export const apiRoutes = {
  auth: {
    login: '/api/auth/login',
    refresh: '/api/auth/refresh',
    logout: '/api/auth/logout',
    me: '/api/auth/me',
    changePassword: '/api/auth/me/password',
  },
  demo: {
    accounts: '/api/demo/accounts',
    loginAs: '/api/demo/login-as',
    reset: '/api/demo/reset',
  },
  users: {
    list: '/api/users',
    detail: (id: string) => `/api/users/${id}`,
    lock: (id: string) => `/api/users/${id}/lock`,
    resetPassword: (id: string) => `/api/users/${id}/reset-password`,
  },
  roles: {
    list: '/api/roles',
    detail: (id: string) => `/api/roles/${id}`,
    permissions: (id: string) => `/api/roles/${id}/permissions`,
  },
  permissions: {
    list: '/api/permissions',
  },
  settings: {
    public: '/api/settings/public',
    list: '/api/settings',
  },
  uploads: {
    images: '/api/uploads/images',
  },
  auditLogs: {
    list: '/api/audit-logs',
  },

  // ───────── Nghiệp vụ (docs/07-DANH-SACH-API.md §2) ─────────

  /** API công khai, không gắn token (07 §2.1) */
  public: {
    landing: '/api/public/landing',
    promotion: '/api/public/promotion',
    reviews: '/api/public/reviews',
    visits: '/api/public/visits',
    events: '/api/public/events',
    orders: '/api/public/orders',
    recentOrders: '/api/public/recent-orders',
  },
  promotion: '/api/promotion',
  combos: {
    list: '/api/combos',
    detail: (id: string) => `/api/combos/${id}`,
    visibility: (id: string) => `/api/combos/${id}/visibility`,
    setDefault: (id: string) => `/api/combos/${id}/default`,
    order: '/api/combos/order',
  },
  product: '/api/product',
  landingBlocks: {
    list: '/api/landing-blocks',
    detail: (id: string) => `/api/landing-blocks/${id}`,
    visibility: (id: string) => `/api/landing-blocks/${id}/visibility`,
    order: '/api/landing-blocks/order',
  },
  reviews: {
    list: '/api/reviews',
    detail: (id: string) => `/api/reviews/${id}`,
    visibility: (id: string) => `/api/reviews/${id}/visibility`,
    order: '/api/reviews/order',
  },
  orders: {
    list: '/api/orders',
    detail: (id: string) => `/api/orders/${id}`,
    calls: (id: string) => `/api/orders/${id}/calls`,
    claim: (id: string) => `/api/orders/${id}/claim`,
    cancel: (id: string) => `/api/orders/${id}/cancel`,
    notDuplicate: (id: string) => `/api/orders/${id}/not-duplicate`,
    deliver: (id: string) => `/api/orders/${id}/deliver`,
    return: (id: string) => `/api/orders/${id}/return`,
    notes: (id: string) => `/api/orders/${id}/notes`,
    handover: '/api/orders/handover',
    reassign: '/api/orders/reassign',
    exportRows: '/api/orders/export-rows',
  },
  telesales: {
    list: '/api/telesales',
    myReceiving: '/api/telesales/me/receiving',
  },
  dashboard: {
    manager: '/api/dashboard/manager',
    telesale: '/api/dashboard/telesale',
  },
  reports: {
    sources: '/api/reports/sources',
    combos: '/api/reports/combos',
    telesales: '/api/reports/telesales',
    daily: '/api/reports/daily',
  },
  adCosts: {
    list: '/api/ad-costs',
    detail: (id: string) => `/api/ad-costs/${id}`,
  },
  conversionEvents: '/api/conversion-events',
} as const
