import type {
  BlockType,
  CallResult,
  CancelReason,
  Carrier,
  ConversionEventType,
  DeviceType,
  OrderEventType,
  OrderStatus,
  OrderTag,
  PriceType,
  PromotionStatus,
  ReturnReason,
} from '@/types/landing'

/**
 * Chữ hiển thị của enum nghiệp vụ (docs/07-DANH-SACH-API.md §2), danh mục tỉnh/thành, icon khối nội dung,
 * link UTM mẫu cho trình diễn. Dùng chung FE-Landing và FE-Quản trị. Hằng số quy tắc ở `sales-rules.ts`.
 */

export const blockTypeLabels: Record<BlockType, string> = {
  Hero: 'Banner chính',
  Problems: 'Vấn đề của khách',
  Benefits: 'Công dụng',
  Ingredients: 'Thành phần',
  Specs: 'Thông tin sản phẩm, cách dùng',
  BeforeAfter: 'Trước và sau',
  Reviews: 'Đánh giá khách hàng',
  Certificates: 'Chứng nhận',
  Commitments: 'Cam kết',
  Faq: 'Câu hỏi thường gặp',
  Order: 'Combo và form đặt hàng',
  Footer: 'Chân trang',
}
/** Khối không ẩn được (Hero luôn đầu, Footer luôn cuối; 07 §2.4) */
export const requiredBlockTypes: BlockType[] = ['Hero', 'Order', 'Footer']

export const promotionStatusLabels: Record<PromotionStatus, string> = {
  SapChay: 'Sắp chạy',
  DangChay: 'Đang chạy',
  DaKetThuc: 'Đã kết thúc',
}
export const priceTypeLabels: Record<PriceType, string> = {
  KhuyenMai: 'Giá khuyến mãi',
  GiaThuong: 'Giá thường',
}

export const orderStatusLabels: Record<OrderStatus, string> = {
  Moi: 'Mới',
  ChoGoiLai: 'Chờ gọi lại',
  DaXacNhan: 'Đã xác nhận',
  DangGiao: 'Đang giao',
  DaGiao: 'Đã giao',
  HoanHang: 'Hoàn hàng',
  DaHuy: 'Đã hủy',
}
/** Thứ tự tab danh sách đơn (UC-05 bước 1); "TatCa" là tab cuối */
export const orderStatusTabs: (OrderStatus | 'TatCa')[] = [
  'Moi',
  'ChoGoiLai',
  'DaXacNhan',
  'DangGiao',
  'DaGiao',
  'HoanHang',
  'DaHuy',
  'TatCa',
]
/** Màu StatusBadge theo trạng thái */
export const orderStatusTones: Record<
  OrderStatus,
  'success' | 'warning' | 'danger' | 'info' | 'primary' | 'neutral'
> = {
  Moi: 'primary',
  ChoGoiLai: 'warning',
  DaXacNhan: 'info',
  DangGiao: 'info',
  DaGiao: 'success',
  HoanHang: 'danger',
  DaHuy: 'neutral',
}

export const callResultLabels: Record<CallResult, string> = {
  XacNhan: 'Xác nhận',
  KhongNgheMay: 'Không nghe máy',
  ThueBao: 'Thuê bao không liên lạc được',
  SaiSo: 'Sai số',
  HenGoiLai: 'Hẹn gọi lại',
  KhachHuy: 'Khách hủy',
}
/** Thứ tự nút kết quả gọi trên ngăn chi tiết (NFR-05: tối đa 3 thao tác) */
export const callResultOrder: CallResult[] = [
  'XacNhan',
  'KhongNgheMay',
  'ThueBao',
  'HenGoiLai',
  'KhachHuy',
  'SaiSo',
]

export const cancelReasonLabels: Record<CancelReason, string> = {
  KhachDoiY: 'Khách đổi ý',
  CheGiaCao: 'Chê giá cao',
  DatNham: 'Đặt nhầm',
  DaMuaNoiKhac: 'Đã mua nơi khác',
  DonTrung: 'Đơn trùng',
  Khac: 'Khác',
  SaiSoDienThoai: 'Sai số điện thoại',
  KhongLienLacDuoc: 'Không liên lạc được',
}
/** Lý do người dùng chọn khi hủy (BR-16); "Khac" bắt buộc ghi chú */
export const userCancelReasons: CancelReason[] = [
  'KhachDoiY',
  'CheGiaCao',
  'DatNham',
  'DaMuaNoiKhac',
  'DonTrung',
  'Khac',
]
/** Lý do khi chọn kết quả gọi "Khách hủy" (không có "Đơn trùng": dùng nút Hủy đơn trùng) */
export const customerCancelReasons: CancelReason[] = [
  'KhachDoiY',
  'CheGiaCao',
  'DatNham',
  'DaMuaNoiKhac',
  'Khac',
]

export const returnReasonLabels: Record<ReturnReason, string> = {
  KhachKhongNgheMay: 'Khách không nghe máy',
  KhachTuChoiNhan: 'Khách từ chối nhận',
  SaiDiaChi: 'Sai địa chỉ',
  Khac: 'Khác',
}

export const carrierLabels: Record<Carrier, string> = {
  GHN: 'GHN',
  GHTK: 'GHTK',
  VTP: 'Viettel Post',
  JT: 'J&T Express',
}

export const deviceLabels: Record<DeviceType, string> = {
  DienThoai: 'Điện thoại',
  MayTinhBang: 'Máy tính bảng',
  MayTinh: 'Máy tính',
}

export const orderTagLabels: Record<OrderTag, string> = {
  Trung: 'Trùng',
  RuiRoHoan: 'Rủi ro hoàn',
  DenGioGoiLai: 'Đến giờ gọi lại',
}
export const orderTagTones: Record<OrderTag, 'warning' | 'danger' | 'info'> = {
  Trung: 'warning',
  RuiRoHoan: 'danger',
  DenGioGoiLai: 'info',
}

export const orderEventTypeLabels: Record<OrderEventType, string> = {
  TaoDon: 'Tạo đơn',
  ChiaDon: 'Chia đơn',
  CuocGoi: 'Cuộc gọi',
  DoiTrangThai: 'Đổi trạng thái',
  SuaDon: 'Sửa đơn',
  TinNhan: 'Tin gửi khách',
  Nhan: 'Nhãn',
  BanGiao: 'Bàn giao vận chuyển',
  GhiChu: 'Ghi chú',
}

export const conversionEventLabels: Record<ConversionEventType, string> = {
  PageView: 'Xem trang',
  StartForm: 'Bắt đầu điền form',
  Purchase: 'Đặt hàng',
}

/** Tên hiển thị nguồn (BR-07); nguồn khác hiện nguyên chữ */
export const sourceLabels: Record<string, string> = {
  facebook: 'Facebook',
  tiktok: 'TikTok',
  google: 'Google',
  zalo: 'Zalo',
  direct: 'Trực tiếp',
}
export const sourceLabel = (source: string | null | undefined): string =>
  !source ? 'Trực tiếp' : (sourceLabels[source] ?? source)
/** Chiến dịch rỗng trong báo cáo */
export const noCampaignLabel = '(không có chiến dịch)'

/**
 * Danh mục 34 tỉnh/thành theo sắp xếp đơn vị hành chính 2025 (SRS §2.4). Đơn lưu đúng chuỗi này;
 * BE `SalesRules.Provinces` chép nguyên danh sách, sai chuỗi → errors.province "Chọn tỉnh/thành trong danh sách".
 */
export const provinces = [
  'Hà Nội',
  'TP. Hồ Chí Minh',
  'Hải Phòng',
  'Đà Nẵng',
  'Cần Thơ',
  'Huế',
  'An Giang',
  'Bắc Ninh',
  'Cà Mau',
  'Cao Bằng',
  'Đắk Lắk',
  'Điện Biên',
  'Đồng Nai',
  'Đồng Tháp',
  'Gia Lai',
  'Hà Tĩnh',
  'Hưng Yên',
  'Khánh Hòa',
  'Lai Châu',
  'Lâm Đồng',
  'Lạng Sơn',
  'Lào Cai',
  'Nghệ An',
  'Ninh Bình',
  'Phú Thọ',
  'Quảng Ngãi',
  'Quảng Ninh',
  'Quảng Trị',
  'Sơn La',
  'Tây Ninh',
  'Thái Nguyên',
  'Thanh Hóa',
  'Tuyên Quang',
  'Vĩnh Long',
] as const
export type Province = (typeof provinces)[number]

/**
 * Icon lucide dùng được trong `ContentItem.icon` (khối Hero, Problems, Benefits, Certificates, Commitments).
 * Màn sửa nội dung chỉ cho chọn trong danh sách này; landing gặp tên lạ thì hiện icon `Sparkles`.
 */
export const landingIconNames = [
  'Leaf',
  'Truck',
  'PackageCheck',
  'ThermometerSun',
  'Droplets',
  'Droplet',
  'ScanFace',
  'Layers',
  'Sparkles',
  'ShieldCheck',
  'Sun',
  'Feather',
  'FileCheck',
  'FlaskConical',
  'BadgeCheck',
  'RefreshCcw',
  'Banknote',
  'Heart',
  'Clock',
  'Gift',
] as const

/**
 * Link landing giả lập quảng cáo cho thẻ "Xem landing page" ở trang đăng nhập và DemoToolbar (07 §4.2).
 * Đường dẫn tương đối, mở tab mới.
 */
export const demoLandingLinks: { label: string; href: string }[] = [
  {
    label: 'Facebook · serum_t10',
    href: '/?utm_source=fb&utm_medium=cpc&utm_campaign=serum_t10&utm_content=video_a',
  },
  {
    label: 'TikTok · tt_video_ugc',
    href: '/?utm_source=tiktok&utm_medium=cpc&utm_campaign=tt_video_ugc&utm_content=ugc_1',
  },
  {
    label: 'Google · gg_search_serum',
    href: '/?utm_source=google&utm_medium=cpc&utm_campaign=gg_search_serum',
  },
  { label: 'Không có UTM (Trực tiếp)', href: '/' },
]
