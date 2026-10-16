/**
 * Câu lỗi combo, khuyến mãi đúng nguyên văn 07 §2.2, §2.3, §2.8. Dùng chung cho handler mock và Zod schema
 * để form báo lỗi tại máy giống hệt BE.
 */

export const comboMessages = {
  nameRequired: 'Nhập tên combo',
  nameMax: 'Tên combo tối đa 50 ký tự',
  descriptionRequired: 'Nhập nội dung combo',
  descriptionMax: 'Nội dung combo tối đa 200 ký tự',
  bottleCount: 'Số chai từ 1 đến 10',
  giftMax: 'Quà tặng tối đa 100 ký tự',
  badgeMax: 'Nhãn tối đa 30 ký tự',
  imageUrlMax: 'Đường dẫn ảnh tối đa 500 ký tự',
  pricePositive: 'Giá phải lớn hơn 0',
  priceStep: 'Giá phải là bội số 1.000 ₫',
  promoNotAboveRegular: 'Giá khuyến mãi không lớn hơn giá thường',
  idsIncomplete: 'Danh sách sắp xếp không đầy đủ',
  notFound: 'Không tìm thấy combo',
} as const

export const comboLimits = { name: 50, description: 200, gift: 100, badge: 30, imageUrl: 500 }

export const promotionMessages = {
  nameRequired: 'Nhập tên chương trình',
  nameMax: 'Tên chương trình tối đa 100 ký tự',
  startRequired: 'Chọn thời điểm bắt đầu',
  endRequired: 'Chọn thời điểm kết thúc',
  endAfterStart: 'Thời điểm kết thúc phải sau thời điểm bắt đầu',
  autoRenewDays: 'Số ngày tự gia hạn từ 1 đến 30',
} as const

/** Mã lỗi nghiệp vụ có `code` (07 §2.8) */
export const comboProblems = {
  QuaSoComboHienThi: 'Tối đa 4 combo hiển thị',
  ComboMacDinhKhongAn: 'Combo mặc định không ẩn hoặc xóa được, hãy chọn combo mặc định khác trước',
  ComboDangAn: 'Combo đang ẩn, hãy hiện combo trước khi đặt làm mặc định',
  ComboDaCoDon: 'Combo đã có đơn, không xóa được. Hãy dùng Ẩn',
  DuLieuCu: 'Dữ liệu vừa được người khác thay đổi, đang tải lại',
} as const
