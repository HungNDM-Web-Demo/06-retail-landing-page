import type { OrderExportRow } from '@/types/landing'
import { excelSheet, exportExcel, type ExcelColumn } from '@/features/reports/lib/export-excel'

/**
 * Xuất danh sách đơn theo mẫu đơn vị vận chuyển (FR-28, 07 §4.5): cột "Mã đơn, Tên người nhận, Số điện thoại,
 * Địa chỉ, Tỉnh/thành, Nội dung hàng, Tiền thu hộ, Ghi chú"; tên file `don-hang-{yyyyMMdd-HHmm}.xlsx`.
 */
export const orderExportColumns: ExcelColumn<OrderExportRow>[] = [
  { header: 'Mã đơn', value: (r) => r.code, width: 16 },
  { header: 'Tên người nhận', value: (r) => r.customerName, width: 24 },
  { header: 'Số điện thoại', value: (r) => r.phone, width: 14 },
  { header: 'Địa chỉ', value: (r) => r.address, width: 40 },
  { header: 'Tỉnh/thành', value: (r) => r.province, width: 18 },
  { header: 'Nội dung hàng', value: (r) => r.goods, width: 56 },
  { header: 'Tiền thu hộ', value: (r) => r.codAmount, width: 14 },
  { header: 'Ghi chú', value: (r) => r.note, width: 30 },
]

export function orderFileName(now = new Date()) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `don-hang-${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}.xlsx`
}

export async function exportOrderRows(rows: OrderExportRow[]) {
  await exportExcel(orderFileName(), [excelSheet('Đơn hàng', null, orderExportColumns, rows)])
}
