/**
 * Câu lỗi nội dung landing đúng 07 §2.4, §2.8 (khối, sản phẩm, đánh giá). Handler mock và Zod schema dùng chung.
 * Câu nào 07 chưa ghi (giới hạn độ dài phụ) đặt theo cùng giọng và ghi chú ở đây.
 */

export const blockMessages = {
  titleRequired: 'Nhập tiêu đề',
  titleMax: 'Tiêu đề tối đa 150 ký tự',
  subtitleMax: 'Phụ đề tối đa 300 ký tự',
  bodyMax: 'Nội dung tối đa 2.000 ký tự',
  imageUrlMax: 'Đường dẫn ảnh tối đa 500 ký tự',
  ctaMax: 'Chữ nút tối đa 50 ký tự',
  itemsMax: 'Tối đa 12 mục',
  iconInvalid: 'Biểu tượng không hợp lệ',
  faqQuestion: 'Nhập câu hỏi',
  faqAnswer: 'Nhập câu trả lời',
  beforeImage: 'Chọn ảnh trước',
  afterImage: 'Chọn ảnh sau',
  idsIncomplete: 'Danh sách sắp xếp không đầy đủ',
  notFound: 'Không tìm thấy khối nội dung',
} as const

export const blockLimits = {
  title: 150,
  subtitle: 300,
  body: 2000,
  imageUrl: 500,
  cta: 50,
  items: 12,
}

/** Mã lỗi khối (07 §2.8) */
export const blockProblems = {
  KhoiBatBuoc: (blockName: string) => `Khối ${blockName} luôn hiển thị`,
  ThuTuKhoiKhongHopLe: 'Banner chính luôn ở đầu, chân trang luôn ở cuối',
} as const

export const productMessages = {
  nameRequired: 'Nhập tên sản phẩm',
  nameMax: 'Tên sản phẩm tối đa 150 ký tự',
  shortNameRequired: 'Nhập tên ngắn',
  shortNameMax: 'Tên ngắn tối đa 50 ký tự',
  volumeRequired: 'Nhập dung tích',
  volumeMax: 'Dung tích tối đa 30 ký tự',
  unitRequired: 'Nhập đơn vị',
  unitMax: 'Đơn vị tối đa 20 ký tự',
  shortDescriptionRequired: 'Nhập mô tả ngắn',
  shortDescriptionMax: 'Mô tả ngắn tối đa 500 ký tự',
  imageUrlMax: 'Đường dẫn ảnh tối đa 500 ký tự',
} as const

export const reviewMessages = {
  customerNameRequired: 'Nhập tên khách',
  customerNameMax: 'Tên khách tối đa 50 ký tự',
  province: 'Chọn tỉnh/thành trong danh sách',
  rating: 'Chọn số sao từ 1 đến 5',
  contentRequired: 'Nhập nội dung đánh giá',
  contentMax: 'Nội dung đánh giá tối đa 1.000 ký tự',
  urlMax: 'Đường dẫn ảnh tối đa 500 ký tự',
  reviewedAt: 'Ngày đánh giá không hợp lệ',
  notFound: 'Không tìm thấy đánh giá',
} as const

export const imageMessages = {
  type: 'Chỉ nhận ảnh JPG, PNG, WebP hoặc SVG',
  size: 'Ảnh tối đa 2 MB',
} as const
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024
