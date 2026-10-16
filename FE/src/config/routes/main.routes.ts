import {
  BarChart3,
  ExternalLink,
  FileText,
  LayoutDashboard,
  Package,
  ShoppingCart,
} from 'lucide-react'
import { permissions } from '@/config/permissions'
import { routePath } from '@/config/route-path'
import type { NavGroup } from './index'

/**
 * Nhóm menu nghiệp vụ (docs/07-DANH-SACH-API.md §4.1). Tổng quan dùng `dashboard.view` của nền:
 * người có `reports.view` thấy số liệu toàn shop (FR-01, FR-02), telesale thấy việc của mình (FR-03).
 */
export const mainRoutes: NavGroup = {
  id: 'main',
  items: [
    {
      title: 'Tổng quan',
      href: routePath.dashboard,
      icon: LayoutDashboard,
      permission: permissions.dashboard.view,
      description: 'Lượt truy cập, đơn, tỉ lệ chuyển đổi, đơn chờ gọi hôm nay',
    },
    {
      title: 'Đơn hàng',
      href: routePath.orders,
      icon: ShoppingCart,
      permission: permissions.orders.view,
      description: 'Gọi xác nhận, xử lý đơn trùng, bàn giao vận chuyển',
    },
    {
      title: 'Combo và khuyến mãi',
      href: routePath.combos,
      icon: Package,
      permission: permissions.combos.view,
      description: 'Giá combo, quà tặng, thời gian khuyến mãi',
    },
    {
      title: 'Báo cáo',
      href: routePath.reports,
      icon: BarChart3,
      permission: permissions.reports.view,
      description: 'Theo nguồn, combo, telesale, theo ngày, chi phí quảng cáo',
    },
    {
      title: 'Nội dung landing',
      href: routePath.content,
      icon: FileText,
      permission: permissions.landingContents.view,
      description: 'Khối nội dung, đánh giá, thông tin sản phẩm',
    },
    {
      title: 'Xem landing page',
      href: routePath.root,
      icon: ExternalLink,
      newTab: true,
      description: 'Mở trang bán hàng ở tab mới',
    },
  ],
}
