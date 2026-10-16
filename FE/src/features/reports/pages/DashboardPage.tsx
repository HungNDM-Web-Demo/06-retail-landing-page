'use client'

import { LayoutDashboard } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { PermissionGuard } from '@/components/shared/PermissionGuard'
import { permissions } from '@/config/permissions'
import { usePermissions } from '@/hooks/use-permissions'
import { DashboardHeader } from '../components/DashboardHeader'
import { ManagerOverview } from '../components/ManagerOverview'
import { TelesaleOverview } from '../components/TelesaleOverview'

/**
 * SCR-04 Tổng quan `/dashboard` (UC-10; FR-01..FR-03; 07 §4.7): có `reports.view` → số liệu toàn shop,
 * không có → việc của telesale (cần `orders.call`). Thiếu `dashboard.view` → /forbidden.
 */
export function DashboardPage() {
  return (
    <PermissionGuard permission={permissions.dashboard.view} redirect>
      <DashboardView />
    </PermissionGuard>
  )
}

function DashboardView() {
  const { can } = usePermissions()
  if (can(permissions.reports.view)) return <ManagerOverview />
  if (can(permissions.orders.call)) return <TelesaleOverview />
  return (
    <div className="space-y-6">
      <DashboardHeader title="Tổng quan" />
      <EmptyState
        icon={LayoutDashboard}
        title="Chưa có số liệu để hiển thị"
        description="Tài khoản của bạn chưa được cấp quyền xem báo cáo hoặc gọi xác nhận đơn."
      />
    </div>
  )
}
