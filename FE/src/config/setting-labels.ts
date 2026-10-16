/**
 * Nhãn, gợi ý và quy tắc kiểm tra cho khóa cài đặt riêng của dự án (project.json → settings; docs/06-THIET-KE-CSDL.md §3).
 * Trang Cài đặt chung hiển thị khóa ngoài nhóm Thương hiệu/Doanh nghiệp theo nhóm ("Shop"); mock gọi
 * `validateProjectSettings` khi lưu, BE kiểm cùng quy tắc.
 */
export const settingExtraLabels: Record<string, { label: string; hint?: string }> = {
  'Store.Name': { label: 'Tên shop', hint: 'Hiện ở đầu landing, chân trang, tiêu đề chia sẻ' },
  'Store.Tagline': {
    label: 'Khẩu hiệu',
    hint: 'Dòng nhỏ dưới tên shop ở chân trang, có thể bỏ trống',
  },
  'Store.Hotline': { label: 'Hotline', hint: 'Hiện ở chân trang và trang cảm ơn' },
  'Store.Email': { label: 'Email chăm sóc khách hàng', hint: 'Có thể bỏ trống' },
  'Store.Address': { label: 'Địa chỉ', hint: 'Hiện ở chân trang' },
  'Store.WorkingHours': { label: 'Giờ làm việc', hint: 'Chữ hiển thị, vd 8:00–21:00 hằng ngày' },
  'Store.BusinessInfo': {
    label: 'Thông tin đăng ký kinh doanh',
    hint: 'Dòng cuối chân trang, có thể bỏ trống',
  },
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const HOTLINE_RE = /^[0-9 .+]{8,20}$/

/** Kiểm tra giá trị cài đặt riêng của dự án; trả về { [chỉ số trong items]: thông báo lỗi }. */
export function validateProjectSettings(
  items: { key: string; value?: string | null }[],
  current: Record<string, string>
): Record<number, string> {
  void current
  const errors: Record<number, string> = {}
  items.forEach(({ key, value }, i) => {
    const v = (value ?? '').trim()
    switch (key) {
      case 'Store.Name':
        if (!v) errors[i] = 'Nhập tên shop'
        else if (v.length > 100) errors[i] = 'Tên shop tối đa 100 ký tự'
        break
      case 'Store.Hotline':
        if (!HOTLINE_RE.test(v)) errors[i] = 'Hotline gồm 8–20 chữ số, có thể có dấu cách'
        break
      case 'Store.Email':
        if (v && !EMAIL_RE.test(v)) errors[i] = 'Email không hợp lệ'
        break
      case 'Store.Address':
        if (!v) errors[i] = 'Nhập địa chỉ'
        break
      case 'Store.WorkingHours':
        if (!v) errors[i] = 'Nhập giờ làm việc'
        break
    }
  })
  return errors
}
