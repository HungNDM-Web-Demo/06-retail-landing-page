import type { BlockType, ContentItem } from '@/types/landing'

/**
 * Trường dùng của từng loại khối (06 §4 Cms_LandingBlocks, FR-04, FR-17). Màn sửa chỉ hiện ô loại khối dùng;
 * title luôn có, subtitle hiện ở mọi khối (tùy chọn).
 */

export type ItemField = keyof ContentItem

export type BlockFieldConfig = {
  body?: string // nhãn ô body
  imageUrl?: boolean
  ctaText?: boolean
  /** Không có = khối không có mục (nội dung lấy nơi khác) */
  items?: {
    label: string // "Ý ngắn", "Câu hỏi"…
    fields: Partial<Record<ItemField, string>> // trường → nhãn
    note?: string
  }
  note?: string
}

export const blockFields: Record<BlockType, BlockFieldConfig> = {
  Hero: {
    imageUrl: true,
    ctaText: true,
    items: { label: 'Ý ngắn', fields: { icon: 'Biểu tượng', title: 'Nội dung' } },
    note: 'Giá "chỉ từ …/chai" và đồng hồ đếm ngược do landing tự ghép.',
  },
  Problems: {
    items: { label: 'Vấn đề', fields: { icon: 'Biểu tượng', title: 'Tiêu đề', text: 'Mô tả' } },
  },
  Benefits: {
    imageUrl: true,
    items: { label: 'Công dụng', fields: { icon: 'Biểu tượng', title: 'Tiêu đề', text: 'Mô tả' } },
  },
  Ingredients: {
    body: 'Đoạn giới thiệu',
    items: {
      label: 'Thành phần',
      fields: { imageUrl: 'Ảnh', title: 'Tên', value: 'Tên khoa học', text: 'Tác dụng' },
    },
  },
  Specs: {
    body: 'Cách dùng',
    items: { label: 'Thông số', fields: { title: 'Tên thông số', value: 'Giá trị' } },
  },
  BeforeAfter: {
    body: 'Câu lưu ý',
    items: {
      label: 'Cặp ảnh',
      fields: {
        title: 'Nhãn trước',
        text: 'Nhãn sau',
        imageUrl: 'Ảnh trước',
        afterImageUrl: 'Ảnh sau',
      },
    },
  },
  Reviews: { ctaText: true, note: 'Danh sách đánh giá sửa ở tab Đánh giá.' },
  Certificates: {
    items: { label: 'Chứng nhận', fields: { icon: 'Biểu tượng', title: 'Tên', text: 'Mô tả' } },
  },
  Commitments: {
    items: { label: 'Cam kết', fields: { icon: 'Biểu tượng', title: 'Tiêu đề', text: 'Mô tả' } },
  },
  Faq: {
    items: { label: 'Câu hỏi', fields: { title: 'Câu hỏi', text: 'Câu trả lời' } },
  },
  Order: {
    body: 'Đoạn ghi chú',
    ctaText: true,
    note: 'Combo lấy từ màn Combo và khuyến mãi.',
  },
  Footer: {
    body: 'Đoạn cuối trang',
    items: { label: 'Chính sách', fields: { title: 'Tên chính sách', text: 'Nội dung' } },
    note: 'Thông tin shop lấy từ Cài đặt chung.',
  },
}

/** Trường dài dùng ô nhiều dòng */
export const multilineItemFields: ItemField[] = ['text']
/** Trường ảnh dùng ô ảnh */
export const imageItemFields: ItemField[] = ['imageUrl', 'afterImageUrl']
