/**
 * Mã quyền, khai báo giống hệt BE `Application/Constants/Permissions.cs`
 * và danh sách seed `src/mock/seed/system.json` (+ project.json).
 * Định dạng `{resource}.{action}`. Không gõ chuỗi mã quyền trực tiếp trong component.
 */
export const permissions = {
  dashboard: {
    view: 'dashboard.view',
  },
  users: {
    view: 'users.view',
    create: 'users.create',
    update: 'users.update',
    delete: 'users.delete',
  },
  roles: {
    view: 'roles.view',
    create: 'roles.create',
    update: 'roles.update',
    delete: 'roles.delete',
  },
  settings: {
    view: 'settings.view',
    update: 'settings.update',
  },
  auditLogs: {
    view: 'audit-logs.view',
  },
  // Quyền nghiệp vụ (docs/07-DANH-SACH-API.md §1, project.json)
  orders: {
    view: 'orders.view',
    viewAll: 'orders.view-all',
    call: 'orders.call',
    assign: 'orders.assign',
    cancel: 'orders.cancel',
    ship: 'orders.ship',
    export: 'orders.export',
  },
  combos: {
    view: 'combos.view',
    create: 'combos.create',
    update: 'combos.update',
    delete: 'combos.delete',
  },
  landingContents: {
    view: 'landing-contents.view',
    update: 'landing-contents.update',
  },
  adCosts: {
    view: 'ad-costs.view',
    create: 'ad-costs.create',
    update: 'ad-costs.update',
  },
  reports: {
    view: 'reports.view',
  },
} as const

/** Mã vai trò hệ thống (BR-SYS-06). */
export const roleCodes = {
  admin: 'ADMIN',
  manager: 'MANAGER',
  staff: 'STAFF',
} as const

type Leaves<T> = T extends string ? T : { [K in keyof T]: Leaves<T[K]> }[keyof T]
export type PermissionCode = Leaves<typeof permissions>
