# Danh sách API — Landing Page Bán hàng

> Base URL dev: `https://localhost:7106` · Swagger: `https://localhost:7106/swagger`
> Demo công khai (chế độ `mock`, không có BE): `https://pum-landing-page.vercel.app`.
> Quy ước chung (đường dẫn, phân trang, lỗi) và API nền (auth, users, roles, settings, audit-logs, uploads, demo): xem `ZDOCS/03-KIEN-TRUC/QUY-UOC-API.md`.
> File này là **hợp đồng giữa BE và FE**: BE (`Application/DTOs`) và FE (`FE/src/types/landing.ts`, chép đúng các khối `ts` dưới đây) phải khớp từng trường. Ở chế độ `mock`, handler trả đúng các kiểu này, áp đúng quy tắc ở §3 và câu lỗi ở §2.8. Bảng, enum, dữ liệu mẫu: `06-THIET-KE-CSDL.md`.

---

## 1. Mã quyền nghiệp vụ

Đúng `02-SRS.md` §7; mã ghép `create / update / delete` tách thành từng mã. `ADMIN` luôn đủ quyền. Đã khai báo trong `FE/src/mock/seed/project.json` và FE `config/permissions.ts`; BE thêm vào `Application/Constants/Permissions.cs`.

| Nhóm | Mã quyền | Tên hiển thị | ADMIN | MANAGER | STAFF |
| :--- | :--- | :--- | :---: | :---: | :---: |
| Đơn hàng | `orders.view` | Xem đơn chưa chia và đơn mình phụ trách | ✓ | ✓ | ✓ |
| Đơn hàng | `orders.view-all` | Xem mọi đơn | ✓ | ✓ | |
| Đơn hàng | `orders.call` | Ghi kết quả gọi, xác nhận, sửa đơn khi xác nhận, xử lý đơn trùng | ✓ | ✓ | ✓ |
| Đơn hàng | `orders.assign` | Chia lại đơn cho telesale khác | ✓ | ✓ | |
| Đơn hàng | `orders.cancel` | Hủy đơn chưa bàn giao | ✓ | ✓ | ✓ |
| Đơn hàng | `orders.ship` | Bàn giao vận chuyển, cập nhật kết quả giao | ✓ | ✓ | ✓ |
| Đơn hàng | `orders.export` | Xuất Excel danh sách đơn | ✓ | ✓ | |
| Combo và khuyến mãi | `combos.view` | Xem combo và thời gian khuyến mãi | ✓ | ✓ | ✓ |
| Combo và khuyến mãi | `combos.create` | Thêm combo | ✓ | ✓ | |
| Combo và khuyến mãi | `combos.update` | Sửa, ẩn, sắp xếp combo, đổi thời gian khuyến mãi | ✓ | ✓ | |
| Combo và khuyến mãi | `combos.delete` | Xóa combo chưa có đơn | ✓ | ✓ | |
| Nội dung landing | `landing-contents.view` | Xem khối nội dung, đánh giá, sản phẩm | ✓ | ✓ | |
| Nội dung landing | `landing-contents.update` | Sửa khối nội dung, đánh giá, sản phẩm | ✓ | ✓ | |
| Chi phí quảng cáo | `ad-costs.view` | Xem chi phí quảng cáo | ✓ | ✓ | |
| Chi phí quảng cáo | `ad-costs.create` | Nhập chi phí quảng cáo | ✓ | ✓ | |
| Chi phí quảng cáo | `ad-costs.update` | Sửa, xóa chi phí quảng cáo | ✓ | ✓ | |
| Báo cáo | `reports.view` | Xem báo cáo và số liệu toàn shop ở Tổng quan | ✓ | ✓ | |

Quyền nền `dashboard.view` có sẵn ở `MANAGER`, `STAFF`: trang Tổng quan `/dashboard` dùng quyền này; số liệu toàn shop cần thêm `reports.view` (UC-10), telesale thấy thẻ việc của mình. Vai trò `STAFF` đổi tên hiển thị thành "Telesale". Landing `/`, trang cảm ơn `/cam-on`, API `/api/public/*` không cần quyền.

---

## 2. API nghiệp vụ

Bảng tra enum dùng chung (chuỗi PascalCase, khớp `06` §4):

```ts
type BlockType = 'Hero' | 'Problems' | 'Benefits' | 'Ingredients' | 'Specs' | 'BeforeAfter' | 'Reviews'
  | 'Certificates' | 'Commitments' | 'Faq' | 'Order' | 'Footer'
type PromotionStatus = 'SapChay' | 'DangChay' | 'DaKetThuc'
type PriceType = 'KhuyenMai' | 'GiaThuong'
type OrderStatus = 'Moi' | 'ChoGoiLai' | 'DaXacNhan' | 'DangGiao' | 'DaGiao' | 'HoanHang' | 'DaHuy'
type CallResult = 'XacNhan' | 'KhongNgheMay' | 'ThueBao' | 'SaiSo' | 'HenGoiLai' | 'KhachHuy'
type CancelReason = 'KhachDoiY' | 'CheGiaCao' | 'DatNham' | 'DaMuaNoiKhac' | 'DonTrung' | 'Khac'
  | 'SaiSoDienThoai' | 'KhongLienLacDuoc'          // hai lý do cuối hệ thống tự gán
type ReturnReason = 'KhachKhongNgheMay' | 'KhachTuChoiNhan' | 'SaiDiaChi' | 'Khac'
type Carrier = 'GHN' | 'GHTK' | 'VTP' | 'JT'
type DeviceType = 'DienThoai' | 'MayTinhBang' | 'MayTinh'
type OrderEventType = 'TaoDon' | 'ChiaDon' | 'CuocGoi' | 'DoiTrangThai' | 'SuaDon' | 'TinNhan' | 'Nhan' | 'BanGiao' | 'GhiChu'
type OrderTag = 'Trung' | 'RuiRoHoan' | 'DenGioGoiLai'
type ConversionEventType = 'PageView' | 'StartForm' | 'Purchase'
```

Chữ hiển thị đặt sẵn ở `FE/src/config/landing-labels.ts`; hằng số quy tắc ở `FE/src/config/sales-rules.ts` (BE `SalesRules.cs` cùng giá trị). Nguồn là chuỗi chữ thường đã chuẩn hóa (`facebook`, `tiktok`, `google`, `zalo`, `direct` hoặc giá trị khác giữ nguyên như `demo_test`); FE hiện `direct` là "Trực tiếp".

Tham số ngày `from`, `to` dạng `yyyy-MM-dd`, hiểu theo giờ Việt Nam (00:00 `from` đến 23:59:59 `to`). Vắng → 7 ngày tới hôm nay. Khoảng dài hơn 366 ngày → 400 `errors.from` "Khoảng ngày tối đa 366 ngày"; `to` nhỏ hơn `from` → 400 `errors.to` "Ngày kết thúc phải sau ngày bắt đầu".

Thao tác đổi đơn trả **200 kèm `OrderDetailDto` mới** (không 204) để FE thay cache ngay. DTO có `asOf` là giờ máy chủ để FE tính đồng hồ (BR-20) và "x phút trước".

### 2.1. API công khai — `/api/public/*`

Khách không đăng nhập; FE gọi bằng axios riêng **không** gắn `Authorization`, không tự làm mới token. Chỉ trả trường công khai.

- **Mã trình duyệt** `visitorId`: FE sinh `crypto.randomUUID()` một lần, lưu `localStorage` (§4.3), gửi ở mọi request ghi. Dùng để gom lượt truy cập (BR-08) và chặn 60 giây (BR-05).
- **Giới hạn tần suất** (chỉ BE; bộ lọc `[PublicRateLimit("…")]` + `IPublicRateLimiter` chép demo Menu QR, cửa sổ cố định 1 phút, khóa = IP): `public-read` 120/phút (các `GET`), `public-track` 60/phút (`visits`, `events`), `public-order` 10/phút (`orders`). Vượt → 429 `QuaNhieuYeuCau` kèm header `Retry-After`. Chế độ `mock` không giả lập 429 này (vẫn có `DatHangQuaNhanh`, `QuaNhieuDonCungSo`).
- `GET /api/public/landing` trả `Cache-Control: no-cache` (trình duyệt không dùng bản cũ: FE gọi lại sau 409 `GiaDaThayDoi` hoặc khi quản lý sửa combo, khuyến mãi phải thấy giá mới ngay); cache 60 giây chỉ ở máy chủ Next khi render (`revalidate: 60`, §4.1); `promotion` không cache (`no-store`).

| Method | Đường dẫn | Mô tả |
| :--- | :--- | :--- |
| GET | `/api/public/landing` | Toàn bộ dữ liệu landing → `LandingPageDto` (FR-04…FR-08, NFR-04) |
| GET | `/api/public/promotion` | Trạng thái khuyến mãi + giờ máy chủ → `PublicPromotion` (FR-06, BR-20) |
| GET | `/api/public/reviews?page&pageSize` | Đánh giá đang hiện theo `sortOrder`, `pageSize` mặc định 6 → `PaginatedResult<PublicReview>` (FR-08 "Xem thêm") |
| POST | `/api/public/visits` | Ghi nhận lượt truy cập `RecordVisitRequest` → 200 `RecordVisitResult` (FR-11, FR-12) |
| POST | `/api/public/events` | Sự kiện "bắt đầu điền form" `TrackEventRequest` → 204 (FR-14, P3) |
| POST | `/api/public/orders` | Đặt hàng `PlaceOrderRequest` → 201 `PlaceOrderResult`; trùng `clientRequestId` → 200, `duplicate = true` (FR-09, FR-10) |
| GET | `/api/public/recent-orders` | Tối đa 10 đơn thật gần đây → `RecentOrderNotice[]` (FR-13, BR-21, P3) |

```ts
type ContentItem = { title?: string; text?: string; value?: string; icon?: string; imageUrl?: string; afterImageUrl?: string }
type PublicStoreInfo = {
  name: string; tagline?: string; hotline: string; email?: string; address: string
  workingHours: string; businessInfo?: string; logoUrl: string; primaryColor: string
}
type PublicCombo = {
  id: string; code: string; name: string; description: string; bottleCount: number
  giftText?: string; imageUrl?: string; badge?: string; isDefault: boolean
  priceType: PriceType              // theo trạng thái khuyến mãi lúc đọc
  price: number                     // giá đang áp dụng
  compareAtPrice?: number           // giá thường, chỉ khi đang khuyến mãi (gạch ngang)
  pricePerBottle: number            // floor(price / bottleCount / 1000) × 1000
  freeShipping: boolean
  shippingFeeForOne: number         // phí khi mua 1 suất: 0 hoặc 30.000 (§3.1)
}
type PublicPromotion = { name: string; status: PromotionStatus; startAt: string; endAt: string; asOf: string }   // endAt = effectiveEndAt
type PublicReview = {
  id: string; customerName: string; province: string; rating: number; content: string
  avatarUrl?: string; photoUrl?: string; reviewedAt: string; isSample: boolean
}
type PublicBlock = { id: string; type: BlockType; title: string; subtitle?: string; body?: string
  imageUrl?: string; ctaText?: string; items: ContentItem[]; sortOrder: number }
type LandingPageDto = {
  store: PublicStoreInfo
  product: { id: string; code: string; name: string; shortName: string; volume: string; unit: string; shortDescription: string; imageUrl?: string }
  blocks: PublicBlock[]             // khối đang hiện, theo sortOrder
  combos: PublicCombo[]             // combo đang hiện, theo sortOrder
  promotion: PublicPromotion
  minPricePerBottle: number         // "chỉ từ 330.000 ₫/chai" (UC-01 bước 2)
  reviewSummary: { average: number; total: number }   // đánh giá đang hiện, average 1 chữ số thập phân
  reviews: PublicReview[]           // 6 đánh giá đầu
  shippingFee: number; freeShippingThreshold: number  // 30.000; 500.000
  asOf: string
}

type Attribution = { source: string; medium?: string; campaign?: string; content?: string; referrer?: string }
type RecordVisitRequest = {
  visitorId: string
  utmSource?: string; utmMedium?: string; utmCampaign?: string; utmContent?: string   // nguyên văn từ URL
  storedAttribution?: Attribution   // nguồn lưu trên trình duyệt từ lần có UTM gần nhất, còn trong 7 ngày
  referrer?: string                 // document.referrer khi khác tên miền landing
  device: DeviceType
  path: string
}
type RecordVisitResult = { visitId: string; isNewVisit: boolean; attribution: Attribution; saveAttribution: boolean }
type TrackEventRequest = { visitorId: string; visitId?: string; type: 'PageView' | 'StartForm' }

type PlaceOrderRequest = {
  clientRequestId: string; visitorId: string; visitId?: string
  customerName: string; phone: string; province: string; address: string; note?: string
  comboId: string; quantity: number  // 1–5
  expectedPrice: number              // giá combo khách đang thấy (PublicCombo.price)
  attribution: Attribution; device: DeviceType
}
type PlacedOrderSummary = {
  code: string; placedAt: string; customerName: string; phone: string; province: string; address: string
  comboName: string; quantity: number; priceType: PriceType; unitPrice: number
  subtotal: number; shippingFee: number; total: number
  outsideWorkingHours: boolean       // đặt ngoài 8:00–21:00 giờ VN (UC-02 4a)
}
type PlaceOrderResult = { order: PlacedOrderSummary; duplicate: boolean }
type RecentOrderNotice = { displayName: string; province: string; comboName: string; placedAt: string }
```

**`landing`** dựng từ: `Store.*` + `Brand.LogoUrl`, `Brand.PrimaryColor` (`System_Settings`), sản phẩm, khối `IsVisible`, combo `IsVisible` chưa xóa, khuyến mãi (§3.3), 6 đánh giá đầu. Khối `Reviews` không có đánh giá đang hiện thì không trả khối đó; không có combo đang hiện thì vẫn trả trang, FE hiện "Sản phẩm tạm hết, vui lòng quay lại sau" ở khối Order (UC-01 tiền điều kiện).

**`visits`** (BR-07, BR-08; thuật toán §3.2): trả nguồn đã chuẩn hóa của lượt; `saveAttribution = true` khi request có `utmSource` (FE ghi đè nguồn lưu 7 ngày). Lượt mới: cộng 1 vào `Sales_VisitStats` của giờ hiện tại, ghi `PageView` (§3.8).

**Đặt hàng**, thứ tự kiểm tra (câu đúng §2.8):

| # | Tình huống | Kết quả | Tham chiếu |
| :---: | :--- | :--- | :--- |
| 1 | `clientRequestId` đã có | **200** đơn cũ, `duplicate = true` (không xét bước sau) | NFR-03, TC-09 |
| 2 | Dữ liệu sai BR-04 (sau khi chuẩn hóa số điện thoại) | 400 `errors` theo trường (§3.5) | TC-08 |
| 3 | Combo không có, đã xóa hoặc đang ẩn | 400 `ComboDaThayDoi` | UC-02 E4 |
| 4 | Cùng `visitorId` đã có đơn trong 60 giây | **429** `DatHangQuaNhanh` kèm `retryAfterSeconds` | BR-05, TC-09 |
| 5 | Số điện thoại đã có 5 đơn (mọi trạng thái) trong 24 giờ | **429** `QuaNhieuDonCungSo` | §3.6 |
| 6 | `expectedPrice` khác giá đang áp dụng | **409** `GiaDaThayDoi` kèm `currentPrice`, `priceType`; không tạo đơn | BR-02 (khuyến mãi vừa hết khi khách đang điền) |

Tạo đơn (một transaction): chốt `PriceType` theo §3.3 tại thời điểm nhận request; tiền §3.1; nguồn từ `attribution` (BE chuẩn hóa lại bằng cùng hàm); nhãn Trùng, Rủi ro hoàn (§3.10); chia đơn (§3.9); mã `LP` (§3.4); sự kiện `TaoDon`, `TinNhan` "Đã gửi SMS xác nhận (giả lập)", `Nhan`, `ChiaDon`; cập nhật `LastSeenAt` của lượt; ghi `Purchase` (§3.8). `outsideWorkingHours` = giờ VN lúc đặt < 8:00 hoặc ≥ 21:00.

**`recent-orders`**: đơn `PlacedAt` trong 48 giờ, trạng thái khác `DaHuy`, mới nhất trước, tối đa 10; `displayName` = từ cuối của họ tên ("Nguyễn Thị Hoa" → "Hoa"); không trả số điện thoại, địa chỉ (BR-21).

### 2.2. Khuyến mãi — `/api/promotion`

| Method | Đường dẫn | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| GET | `/api/promotion` | `combos.view` | → `PromotionDto` |
| PUT | `/api/promotion` | `combos.update` | `UpdatePromotionRequest` → `PromotionDto` (FR-16, UC-11, TC-03) |

```ts
type PromotionDto = {
  id: string; name: string; startAt: string
  endAt: string                     // giá trị đã lưu
  effectiveEndAt: string            // sau khi tự gia hạn (§3.3)
  autoRenewDays?: number            // null = tắt
  status: PromotionStatus
  version: number; asOf: string
}
type UpdatePromotionRequest = { name: string; startAt: string; endAt: string; autoRenewDays?: number; version: number }
```

Lỗi: `errors.name` "Nhập tên chương trình"; `errors.endAt` "Thời điểm kết thúc phải sau thời điểm bắt đầu" (BR-20); `errors.autoRenewDays` "Số ngày tự gia hạn từ 1 đến 30"; lệch `version` → 409 `DuLieuCu`. Lưu xong landing đếm ngược theo giá trị mới ở lần tải kế tiếp (UC-11 bước 4).

### 2.3. Combo — `/api/combos`

| Method | Đường dẫn | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| GET | `/api/combos` | `combos.view` | Combo chưa xóa, theo `sortOrder` → `ComboDto[]` |
| POST | `/api/combos` | `combos.create` | `SaveComboRequest` → 201 `ComboDto`; mã `C` + 2 số kế tiếp; cuối danh sách; hiện nếu đang có dưới 4 combo hiện, không thì ẩn |
| PUT | `/api/combos/{id}` | `combos.update` | `SaveComboRequest` → `ComboDto`; đơn cũ giữ giá đã chụp |
| PATCH | `/api/combos/{id}/visibility` | `combos.update` | `SetVisibilityRequest` → 204 |
| PUT | `/api/combos/{id}/default` | `combos.update` | Đặt mặc định, combo cũ tự bỏ → 204 (TC-34) |
| PUT | `/api/combos/order` | `combos.update` | `ReorderRequest` đủ mọi combo chưa xóa, đánh lại 10, 20… → 204 |
| DELETE | `/api/combos/{id}` | `combos.delete` | Chưa có đơn → 204 (xóa mềm) |

```ts
type ComboDto = {
  id: string; code: string; name: string; description: string; bottleCount: number
  giftText?: string; promoPrice: number; regularPrice: number; freeShipping: boolean
  badge?: string; imageUrl?: string; sortOrder: number; isDefault: boolean; isVisible: boolean
  promoPricePerBottle: number; regularPricePerBottle: number
  orderCount: number                // đơn có ComboId hoặc PlacedComboId là combo này
  updatedAt: string
}
type SaveComboRequest = {
  name: string; description: string; bottleCount: number; giftText?: string
  promoPrice: number; regularPrice: number; freeShipping: boolean; badge?: string; imageUrl?: string
}
type SetVisibilityRequest = { isVisible: boolean }
type ReorderRequest = { ids: string[] }
```

Lỗi (400): `errors.name` "Nhập tên combo" (≤ 50); `errors.description` "Nhập nội dung combo" (≤ 200); `errors.bottleCount` "Số chai từ 1 đến 10"; `errors.promoPrice`, `errors.regularPrice` "Giá phải lớn hơn 0" hoặc "Giá phải là bội số 1.000 ₫" (TC-34 bước 2: 389.500); `errors.promoPrice` "Giá khuyến mãi không lớn hơn giá thường" (TC-34 bước 1: 460.000 > 450.000); `errors.ids` "Danh sách sắp xếp không đầy đủ". Nghiệp vụ: hiện combo thứ 5 → `QuaSoComboHienThi`; ẩn hoặc xóa combo mặc định → `ComboMacDinhKhongAn`; đặt mặc định combo đang ẩn → `ComboDangAn`; xóa combo đã có đơn → `ComboDaCoDon` kèm `orderCount`.

### 2.4. Nội dung landing — sản phẩm, khối, đánh giá

| Method | Đường dẫn | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| GET | `/api/product` | `landing-contents.view` | → `ProductDto` |
| PUT | `/api/product` | `landing-contents.update` | `UpdateProductRequest` → `ProductDto` |
| GET | `/api/landing-blocks` | `landing-contents.view` | 12 khối theo `sortOrder` → `LandingBlockDto[]` |
| PUT | `/api/landing-blocks/{id}` | `landing-contents.update` | `UpdateLandingBlockRequest` → `LandingBlockDto` (FR-17) |
| PATCH | `/api/landing-blocks/{id}/visibility` | `landing-contents.update` | `SetVisibilityRequest` → 204 |
| PUT | `/api/landing-blocks/order` | `landing-contents.update` | `ReorderRequest` đủ 12 khối → 204 |
| GET | `/api/reviews?page&pageSize&search&isVisible` | `landing-contents.view` | Theo `sortOrder` → `PaginatedResult<ReviewDto>` (FR-18) |
| POST | `/api/reviews` | `landing-contents.update` | `SaveReviewRequest` → 201 `ReviewDto`, thêm cuối, đang hiện |
| PUT | `/api/reviews/{id}` | `landing-contents.update` | → `ReviewDto` |
| PATCH | `/api/reviews/{id}/visibility` | `landing-contents.update` | → 204 |
| PUT | `/api/reviews/order` | `landing-contents.update` | `ReorderRequest` đủ mọi đánh giá → 204 |

Ảnh tải lên dùng `POST /api/uploads/images` của nền, ghi đường dẫn trả về vào `imageUrl`, `avatarUrl`, `photoUrl`, `items[i].imageUrl`.

```ts
type ProductDto = { id: string; code: string; name: string; shortName: string; volume: string; unit: string
  shortDescription: string; imageUrl?: string; updatedAt: string }
type UpdateProductRequest = { name: string; shortName: string; volume: string; unit: string; shortDescription: string; imageUrl?: string }
type LandingBlockDto = {
  id: string; type: BlockType; title: string; subtitle?: string; body?: string; imageUrl?: string; ctaText?: string
  items: ContentItem[]; sortOrder: number; isVisible: boolean
  isRequired: boolean               // Hero, Order, Footer
  updatedAt: string
}
type UpdateLandingBlockRequest = { title: string; subtitle?: string; body?: string; imageUrl?: string; ctaText?: string; items: ContentItem[] }
type ReviewDto = {
  id: string; customerName: string; province: string; rating: number; content: string
  avatarUrl?: string; photoUrl?: string; reviewedAt: string; sortOrder: number; isVisible: boolean; isSample: boolean
}
type SaveReviewRequest = { customerName: string; province: string; rating: number; content: string
  avatarUrl?: string; photoUrl?: string; reviewedAt?: string; isSample: boolean }
```

Lỗi: `errors.title` "Nhập tiêu đề" (≤ 150); `errors.subtitle` ≤ 300, `errors.body` "Nội dung tối đa 2.000 ký tự"; `errors.items` "Tối đa 12 mục"; `errors["items[i].icon"]` "Biểu tượng không hợp lệ" (ngoài `landingIconNames`); khối `Faq`: `errors["items[i].title"]` "Nhập câu hỏi", `errors["items[i].text"]` "Nhập câu trả lời"; khối `BeforeAfter`: `errors["items[i].imageUrl"]` "Chọn ảnh trước", `errors["items[i].afterImageUrl"]` "Chọn ảnh sau". Ẩn `Hero`, `Order`, `Footer` → `KhoiBatBuoc`; sắp xếp mà `Hero` không đầu hoặc `Footer` không cuối → `ThuTuKhoiKhongHopLe`. Sản phẩm: `errors.name` "Nhập tên sản phẩm", `errors.shortDescription` "Nhập mô tả ngắn" (≤ 500). Đánh giá: `errors.customerName` "Nhập tên khách", `errors.province` "Chọn tỉnh/thành trong danh sách", `errors.rating` "Chọn số sao từ 1 đến 5", `errors.content` "Nhập nội dung đánh giá" (≤ 1.000).

### 2.5. Đơn hàng — `/api/orders`, `/api/telesales`

**Phạm vi xem** (FR-19, UC-05 bước 2): người có `orders.view-all` thấy mọi đơn; người chỉ có `orders.view` thấy đơn **chưa chia** và đơn `AssigneeId` = mình. Mọi endpoint theo `{id}` với đơn ngoài phạm vi → 403 `DonCuaNguoiKhac` (TC-24 bước 4).

| Method | Đường dẫn | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| GET | `/api/orders?…OrderQuery` | `orders.view` | → `OrderListResult` (kèm số đơn từng tab) |
| GET | `/api/orders/{id}` | `orders.view` | → `OrderDetailDto` (FR-21) |
| PUT | `/api/orders/{id}` | `orders.call` | Sửa họ tên, tỉnh, địa chỉ, combo, số lượng khi Mới, Chờ gọi lại `UpdateOrderRequest` → `OrderDetailDto` (BR-13) |
| POST | `/api/orders/{id}/calls` | `orders.call` | Ghi kết quả gọi `RecordCallRequest` → `OrderDetailDto` (FR-22, FR-23, BR-10) |
| POST | `/api/orders/{id}/claim` | `orders.call` | Nhận đơn chưa chia → `OrderDetailDto` (BR-09) |
| POST | `/api/orders/{id}/cancel` | `orders.cancel` | `CancelOrderRequest` → `OrderDetailDto` (FR-27, BR-16; "Hủy đơn trùng" = lý do `DonTrung`) |
| POST | `/api/orders/{id}/not-duplicate` | `orders.call` | "Không phải trùng" `VersionRequest` → `OrderDetailDto` (FR-24) |
| POST | `/api/orders/{id}/deliver` | `orders.ship` | Đã giao `VersionRequest` → `OrderDetailDto` (FR-26) |
| POST | `/api/orders/{id}/return` | `orders.ship` | Hoàn hàng `ReturnOrderRequest` → `OrderDetailDto` (FR-26, BR-18) |
| POST | `/api/orders/{id}/notes` | `orders.view` | Ghi chú `AddNoteRequest` (≤ 300) mọi trạng thái → `OrderDetailDto` (BR-13) |
| POST | `/api/orders/handover` | `orders.ship` | Bàn giao một hoặc nhiều đơn `HandoverRequest` → `HandoverResult` (FR-25, BR-17) |
| POST | `/api/orders/reassign` | `orders.assign` | Chia lại `ReassignRequest` → `ReassignResult` (FR-20) |
| GET | `/api/orders/export-rows?…OrderQuery` | `orders.export` | Mọi đơn khớp bộ lọc (không phân trang, tối đa 5.000) → `OrderExportRow[]`; FE dựng file Excel (FR-28, §4.5) |
| GET | `/api/telesales` | `orders.view` | Tài khoản vai trò `STAFF` đang hoạt động → `TelesaleDto[]` (bộ lọc, hộp Chia lại) |
| PUT | `/api/telesales/me/receiving` | `orders.call` | Bật/tắt "Nhận đơn" `SetReceivingRequest` → `TelesaleDto`; người không có vai trò `STAFF` → 400 `KhongPhaiTelesale` |

```ts
type OrderQuery = PaginationQuery & {
  status?: OrderStatus              // vắng = Tất cả
  from?: string; to?: string        // theo ngày đặt
  comboId?: string; source?: string
  assigneeId?: string               // "unassigned" = chưa chia
  tag?: OrderTag; confirmedById?: string; upsellOnly?: boolean
}
type OrderListItem = {
  id: string; code: string; placedAt: string; customerName: string; phone: string; province: string
  comboId: string; comboCode: string; comboName: string; quantity: number; total: number
  source: string; campaign?: string; assigneeId?: string; assigneeName?: string
  status: OrderStatus; tags: OrderTag[]; nextCallAt?: string; failedCallCount: number; upsellAmount: number
  version: number
}
type OrderStatusCounts = Record<OrderStatus | 'TatCa', number>
type OrderListResult = PaginatedResult<OrderListItem> & { statusCounts: OrderStatusCounts }

type OrderCallDto = { id: string; calledAt: string; callerId?: string; callerName: string; result: CallResult
  callbackAt?: string; cancelReason?: CancelReason; note?: string }
type OrderEventDto = { id: string; type: OrderEventType; fromStatus?: OrderStatus; toStatus?: OrderStatus
  content: string; actorName?: string; occurredAt: string }          // actorName vắng = "Hệ thống"
type ShipmentDto = { carrier: Carrier; trackingCode: string; codAmount: number; handedOverAt: string
  handedOverByName: string; deliveredAt?: string; returnedAt?: string }
type RelatedOrder = { id: string; code: string; placedAt: string; comboName: string; quantity: number; total: number
  status: OrderStatus; cancelReason?: CancelReason; returnReason?: ReturnReason; assigneeName?: string
  isDuplicate: boolean; canCancel: boolean }
type OrderDetailDto = OrderListItem & {
  address: string; note?: string
  priceType: PriceType; unitPrice: number; bottleCount: number
  placedComboName: string; placedQuantity: number; placedSubtotal: number
  subtotal: number; shippingFee: number
  medium?: string; adContent?: string; referrer?: string; device: DeviceType
  assignedAt?: string; confirmedAt?: string; confirmedByName?: string
  cancelReason?: CancelReason; cancelNote?: string; cancelledAt?: string; cancelledByName?: string
  returnReason?: ReturnReason; returnNote?: string
  shipment?: ShipmentDto
  calls: OrderCallDto[]             // mới nhất trước
  events: OrderEventDto[]           // mới nhất trước
  relatedOrders: RelatedOrder[]     // cùng số điện thoại, mới nhất trước (kể cả ngoài phạm vi xem, chỉ thông tin tóm tắt)
  returnedCount: number             // số đơn Hoàn hàng của số điện thoại (BR-15, UC-03 E3)
  asOf: string
}
type OrderChanges = { customerName: string; province: string; address: string; comboId: string; quantity: number }
type UpdateOrderRequest = OrderChanges & { version: number }
type RecordCallRequest = {
  result: CallResult
  callbackAt?: string               // bắt buộc với HenGoiLai
  cancelReason?: CancelReason       // bắt buộc với KhachHuy
  note?: string                     // ≤ 300; bắt buộc khi cancelReason = Khac
  changes?: OrderChanges            // chỉ với XacNhan (UC-03 3a upsell)
  version: number
}
type CancelOrderRequest = { reason: CancelReason; note?: string; version: number }
type ReturnOrderRequest = { reason: ReturnReason; note?: string; version: number }
type VersionRequest = { version: number }
type AddNoteRequest = { content: string }
type HandoverRequest = { orderIds: string[]; carrier: Carrier }
type HandoverResult = { handedOver: number; skipped: number; skippedOrderIds: string[]; message: string }
type ReassignRequest = { orderIds: string[]; assigneeId: string }
type ReassignResult = { reassigned: number; skipped: number; message: string }
type OrderExportRow = { code: string; customerName: string; phone: string; address: string; province: string
  goods: string; codAmount: number; note?: string }
type TelesaleDto = { userId: string; username: string; fullName: string; isReceiving: boolean
  lastAssignedAt?: string; openOrders: number }   // openOrders = đơn Mới + Chờ gọi lại đang phụ trách
type SetReceivingRequest = { isReceiving: boolean }
```

**Danh sách**: `search` theo số điện thoại (bỏ dấu cách), mã đơn, họ tên không dấu. Sắp xếp mặc định (vắng `sortBy`): đơn có nhãn `DenGioGoiLai` lên đầu (theo `nextCallAt` tăng), rồi `placedAt` giảm (BR-11); `sortBy` hỗ trợ `placedAt`, `total`, `nextCallAt`. `statusCounts` đếm theo **cùng bộ lọc trừ `status`** và cùng phạm vi xem (TC-22: số trên tab Mới bằng số dòng). `tag = DenGioGoiLai` lọc đơn Chờ gọi lại đã tới giờ. `upsellOnly` = `upsellAmount > 0`. `goods` của dòng xuất = "{tên combo} × {số lượng} ({bottleCount × số lượng} chai serum{, tặng {quà}})".

**Ghi cuộc gọi**, thứ tự kiểm tra: (1) phạm vi xem → 403; (2) `version` lệch → 409 `DonDaThayDoi` kèm `order` (UC-03 E4); (3) trạng thái không phải Mới, Chờ gọi lại → 400 `DonKhongChoGoi`; (4) dữ liệu: `HenGoiLai` thiếu `callbackAt` → `errors.callbackAt` "Chọn giờ gọi lại", không nằm trong (now, now + 7 ngày] → "Giờ gọi lại phải sau hiện tại và trong 7 ngày tới"; `KhachHuy` thiếu lý do → `errors.cancelReason` "Chọn lý do hủy", lý do ngoài `customerCancelReasons` → "Lý do không hợp lệ"; `Khac` thiếu ghi chú → `errors.note` "Nhập ghi chú cho lý do Khác"; `changes` với kết quả khác `XacNhan` → `errors.changes` "Chỉ sửa đơn khi xác nhận"; `changes` sai → như `PUT` (khóa `errors` không tiền tố: `customerName`, `province`, `address`, `comboId`, `quantity`). Sau đó: đơn chưa chia thì tự giao cho người gọi (sự kiện "{tên} nhận đơn"); áp `changes` (§3.1, sự kiện `SuaDon`); lưu cuộc gọi; chuyển trạng thái theo BR-10 (§3.7); `XacNhan` ghi `ConfirmedAt`, `ConfirmedBy`, `UpsellAmount` và tin "Đơn đã được xác nhận (SMS giả lập)"; `Version + 1`.

**Sửa đơn** (`PUT`): chỉ Mới, Chờ gọi lại → còn lại 400 `KhongSuaDonDaXacNhan`. Đổi combo hoặc số lượng thì tính lại theo **`PriceType` đã chốt** và giá hiện tại của combo mới (BR-02); combo đang ẩn chỉ giữ được nếu là combo hiện tại của đơn, chọn combo ẩn khác → `errors.comboId` "Combo không còn bán". Không đổi combo, số lượng thì giữ nguyên `UnitPrice` đã chụp.

**Hủy** (`cancel`): phạm vi, `version`; trạng thái Đang giao, Đã giao, Hoàn hàng → 400 `KhongHuyDonDaBanGiao` (TC-30); Đã hủy → `DonDaHuy`; `errors.reason` "Chọn lý do hủy" / "Lý do không hợp lệ" (chỉ `userCancelReasons`); `Khac` thiếu ghi chú → `errors.note`; `DonTrung` với đơn không có nhãn Trùng → `KhongPhaiDonTrung`. Sau khi hủy: tính lại nhãn Trùng các đơn cùng số (§3.10).

**Không phải trùng**: đơn không có nhãn → `KhongPhaiDonTrung`; bỏ nhãn ở đơn này và mọi đơn đang mang nhãn cùng số trong cửa sổ 24 giờ, đặt `DuplicateCleared = true`, sự kiện `Nhan` "Bỏ nhãn Trùng: không phải đơn trùng" ở từng đơn (TC-21).

**Giao, hoàn**: trạng thái khác Đang giao → 400 `DonChuaBanGiao`; hoàn thiếu lý do → `errors.reason` "Chọn lý do hoàn hàng", `Khac` thiếu ghi chú → `errors.note`. Đã giao ghi `DeliveredAt` (doanh thu tính ngày này, BR-19).

**Bàn giao**: `errors.carrier` "Chọn đơn vị vận chuyển"; `errors.orderIds` "Chọn ít nhất 1 đơn" / "Tối đa 100 đơn mỗi lần". Đơn ngoài phạm vi xem hoặc không phải Đã xác nhận bị bỏ qua; không còn đơn nào → 400 `KhongCoDonBanGiao`. Mỗi đơn: `Sales_Shipments` (§3.4), `CodAmount = Total`, Đang giao, sự kiện `BanGiao`. `message`: "Đã bàn giao {n} đơn" hoặc "Đã bàn giao {n} đơn, bỏ qua {m} đơn không ở trạng thái Đã xác nhận" (TC-25, UC-07 E1).

**Chia lại**: `assigneeId` phải là tài khoản `STAFF` đang hoạt động → không thì `errors.assigneeId` "Chọn telesale". Đơn Đã giao, Hoàn hàng, Đã hủy, hoặc đã là của người đó bị bỏ qua. Mỗi đơn: đổi người phụ trách, `AssignedAt = now`, sự kiện `ChiaDon` "Chia cho {họ tên}" (người làm = quản lý; TC-24). `message`: "Đã chia lại {n} đơn cho {họ tên}" thêm ", bỏ qua {m} đơn" khi có. Không đổi `LastAssignedAt` (vòng xoay chỉ tính chia tự động).

**Nhận đơn** (`claim`): đơn đã là của mình → 200 (không đổi gì); đơn của người khác → 409 `DonDaCoNguoiNhan` (kèm `order` khi người gọi xem được đơn đó); người không có vai trò `STAFF` vẫn nhận được (quản lý gọi hộ). Sự kiện `ChiaDon` "{họ tên} nhận đơn".

### 2.6. Tổng quan — `/api/dashboard`

| Method | Đường dẫn | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| GET | `/api/dashboard/manager` | `reports.view` | Số liệu toàn shop hôm nay (FR-01, FR-02) → `ManagerDashboard` |
| GET | `/api/dashboard/telesale` | `orders.call` | Việc của người đang đăng nhập (FR-03) → `TelesaleDashboard` |

```ts
type MetricCompare = { value: number | null; previous: number | null; change: number | null }
type ManagerDashboard = {
  date: string; asOf: string
  visits: MetricCompare; orders: MetricCompare; conversionRate: MetricCompare
  pendingCalls: number              // Mới + Chờ gọi lại toàn shop lúc này
  dueCallbacks: number              // Chờ gọi lại đã tới giờ
  confirmRate: MetricCompare; confirmedValue: MetricCompare
  ordersByHour: { hour: number; orders: number }[]                                   // 0–23 hôm nay
  trend14Days: { date: string; orders: number; confirmed: number; confirmRate: number | null }[]
  comboShare: { comboId: string; comboName: string; orders: number; share: number }[]
  sourceShare: { source: string; orders: number; share: number }[]
}
type TelesaleDashboard = {
  date: string; asOf: string; isReceiving: boolean
  myNew: number; unassignedNew: number; myDueCallbacks: number; myLaterCallbacks: number
  myConfirmedToday: number; myUpsellCountToday: number; myUpsellValueToday: number
}
```

Định nghĩa ở §3.11. Telesale bấm thẻ → `/admin/orders` lọc sẵn (§4.5).

### 2.7. Báo cáo, chi phí quảng cáo, sự kiện — `/api/reports`, `/api/ad-costs`, `/api/conversion-events`

| Method | Đường dẫn | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| GET | `/api/reports/sources?from&to&source&campaign` | `reports.view` | Theo nguồn, mở xuống chiến dịch (FR-29, FR-33) → `SourceReport` |
| GET | `/api/reports/combos?from&to&source` | `reports.view` | Theo combo (FR-30) → `ComboReport` |
| GET | `/api/reports/telesales?from&to` | `reports.view` | Theo telesale (FR-31) → `TelesaleReport` |
| GET | `/api/reports/daily?from&to` | `reports.view` | Theo ngày, so kỳ trước, lý do hủy, hoàn (FR-32) → `DailyReport` |
| GET | `/api/ad-costs?from&to&source` | `ad-costs.view` | Ngày giảm dần → `AdCostDto[]` (FR-33) |
| POST | `/api/ad-costs` | `ad-costs.create` | `SaveAdCostRequest` → 201 `AdCostDto` |
| PUT | `/api/ad-costs/{id}` | `ad-costs.update` | → `AdCostDto` |
| DELETE | `/api/ad-costs/{id}` | `ad-costs.update` | → 204 |
| GET | `/api/conversion-events?page&pageSize&type` | `reports.view` | Nhật ký pixel giả lập, mới nhất trước → `PaginatedResult<ConversionEventDto>` (FR-14) |

```ts
type DateRangeQuery = { from?: string; to?: string }
type SourceMetrics = {
  visits: number; orders: number; conversionRate: number | null
  confirmed: number; confirmRate: number | null
  delivered: number; returned: number; returnRate: number | null
  deliveredRevenue: number
  adCost: number; costPerConfirmed: number | null; roas: number | null
}
type SourceReportRow = SourceMetrics & { source: string; campaigns: (SourceMetrics & { campaign: string })[] }
type SourceReport = { from: string; to: string; rows: SourceReportRow[]; totals: SourceMetrics }
type ComboReportRow = { comboId: string; comboCode: string; comboName: string; orders: number; share: number
  bottles: number; confirmed: number; deliveredRevenue: number; averageOrderValue: number | null }
type ComboReport = { from: string; to: string; source?: string; rows: ComboReportRow[]; totalOrders: number }
type TelesaleReportRow = { userId: string; fullName: string; assigned: number; called: number; confirmed: number
  confirmRate: number | null; upsellCount: number; upsellValue: number; delivered: number; returned: number; returnRate: number | null }
type TelesaleReport = { from: string; to: string; rows: TelesaleReportRow[] }
type DailyTotals = { orders: number; confirmed: number; cancelled: number; returned: number; delivered: number
  deliveredRevenue: number; cancelRate: number | null }
type DailyReport = {
  from: string; to: string; totals: DailyTotals
  previous: DailyTotals & { from: string; to: string }
  days: (DailyTotals & { date: string })[]           // đủ mọi ngày
  cancelReasons: { reason: CancelReason; count: number }[]   // không gồm DonTrung
  duplicateCancelled: number
  returnReasons: { reason: ReturnReason; count: number }[]
}
type AdCostDto = { id: string; date: string; source: string; campaign: string; amount: number; updatedAt: string }
type SaveAdCostRequest = { date: string; source: string; campaign?: string; amount: number }
type ConversionEventDto = { id: string; type: ConversionEventType; occurredAt: string; source: string
  campaign?: string; orderCode?: string; value?: number; pixelCall: string }
```

Lỗi chi phí: `errors.date` "Chọn ngày", "Ngày không được ở tương lai"; `errors.source` "Nhập nguồn"; `errors.amount` "Số tiền phải lớn hơn 0" / "Số tiền là bội số 1.000 ₫"; trùng (ngày, nguồn, chiến dịch) → 409 `errors.date` "Đã có chi phí ngày này cho nguồn và chiến dịch đã chọn". `source` chuẩn hóa như BR-07. Xuất Excel báo cáo (FR-34) làm ở FE từ dữ liệu đang xem, không có endpoint.

### 2.8. Bảng mã lỗi nghiệp vụ

Lỗi 400/403/404/409/429 nghiệp vụ có trường mở rộng `code` trong ProblemDetails để FE rẽ nhánh mà không so chuỗi; `detail` đúng câu dưới đây (FE hiển thị nguyên văn). Lỗi validate theo trường dùng `errors` như `QUY-UOC-API.md` §1.3; khi chỉ có một lỗi thì `detail` là chính câu đó. BE: `Domain/Entities/Sales/SalesErrors.cs` (mã, câu), `Application/Common/Exceptions/SalesProblems.cs` (409/403/429 kèm `code`), bộ lọc `[SalesProblemCode]` đưa `code` vào 403/404 (chép mẫu `PosNotFoundCodeAttribute` của demo Menu QR).

| `code` | HTTP | `detail` | Nơi phát sinh |
| :--- | :---: | :--- | :--- |
| `ComboDaThayDoi` | 400 | Combo đã thay đổi, vui lòng chọn lại | Đặt hàng (UC-02 E4) |
| `DatHangQuaNhanh` | 429 | Bạn vừa đặt hàng, vui lòng chờ 60 giây nếu muốn đặt thêm | Đặt hàng (BR-05, TC-09); kèm `retryAfterSeconds` |
| `QuaNhieuDonCungSo` | 429 | Số điện thoại này đã đặt nhiều đơn trong 24 giờ, vui lòng gọi hotline để được hỗ trợ | Đặt hàng (§3.6) |
| `GiaDaThayDoi` | 409 | Giá combo vừa thay đổi, vui lòng kiểm tra lại tổng tiền | Đặt hàng; kèm `currentPrice`, `priceType` |
| `QuaNhieuYeuCau` | 429 | Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút | API công khai (chỉ BE) |
| `DuLieuCu` | 409 | Dữ liệu vừa được người khác thay đổi, đang tải lại | Sửa khuyến mãi; kèm `currentVersion` |
| `QuaSoComboHienThi` | 400 | Tối đa 4 combo hiển thị | Hiện combo (BR-01) |
| `ComboMacDinhKhongAn` | 400 | Combo mặc định không ẩn hoặc xóa được, hãy chọn combo mặc định khác trước | Ẩn, xóa combo (SRS §5.2) |
| `ComboDangAn` | 400 | Combo đang ẩn, hãy hiện combo trước khi đặt làm mặc định | Đặt mặc định |
| `ComboDaCoDon` | 400 | Combo đã có đơn, không xóa được. Hãy dùng Ẩn | Xóa combo (BR-01); kèm `orderCount` |
| `KhoiBatBuoc` | 400 | Khối {tên khối} luôn hiển thị | Ẩn Hero, Order, Footer |
| `ThuTuKhoiKhongHopLe` | 400 | Banner chính luôn ở đầu, chân trang luôn ở cuối | Sắp xếp khối |
| `DonCuaNguoiKhac` | 403 | Đơn đang do {họ tên} phụ trách | Mọi thao tác theo `{id}` ngoài phạm vi xem |
| `KhongTimThayDon` | 404 | Không tìm thấy đơn hàng | Đơn không tồn tại |
| `DonDaThayDoi` | 409 | Đơn đã thay đổi, vui lòng tải lại | Mọi thao tác có `version` (UC-03 E4); kèm `order` (`OrderDetailDto` mới nhất) |
| `DonKhongChoGoi` | 400 | Chỉ ghi cuộc gọi cho đơn Mới hoặc Chờ gọi lại | Ghi cuộc gọi |
| `KhongSuaDonDaXacNhan` | 400 | Từ Đã xác nhận trở đi chỉ thêm được ghi chú | Sửa đơn (BR-13) |
| `DonDaCoNguoiNhan` | 409 | Đơn đã được chia cho {họ tên} | Nhận đơn |
| `KhongHuyDonDaBanGiao` | 400 | Không thể hủy đơn đã bàn giao vận chuyển | Hủy đơn (UC-09 E2, TC-30) |
| `DonDaHuy` | 400 | Đơn đã hủy | Hủy đơn |
| `KhongPhaiDonTrung` | 400 | Đơn không có nhãn Trùng | Hủy lý do Đơn trùng, Không phải trùng |
| `DonChuaBanGiao` | 400 | Đơn chưa ở trạng thái Đang giao | Đã giao, Hoàn hàng (UC-08 E2) |
| `KhongCoDonBanGiao` | 400 | Không có đơn nào ở trạng thái Đã xác nhận | Bàn giao |
| `KhongPhaiTelesale` | 400 | Chỉ tài khoản Telesale mới bật nhận đơn | Bật/tắt nhận đơn |

Câu bắt buộc theo trường của form đặt hàng (BR-04, TC-08; FE kiểm khi rời ô bằng đúng câu này): `errors.customerName` "Nhập họ tên" / "Họ tên từ 2 đến 50 ký tự" / "Họ tên không được chứa số"; `errors.phone` "Nhập số điện thoại" / "Số điện thoại di động gồm 10 số, bắt đầu bằng 03, 05, 07, 08 hoặc 09"; `errors.province` "Chọn tỉnh/thành" / "Chọn tỉnh/thành trong danh sách"; `errors.address` "Nhập địa chỉ chi tiết" / "Địa chỉ chi tiết từ 10 đến 200 ký tự"; `errors.quantity` "Số lượng từ 1 đến 5"; `errors.note` "Ghi chú tối đa 300 ký tự"; `errors.comboId` "Chọn combo". Số tiền trong câu định dạng `350.000 ₫`, giờ `HH:mm` giờ Việt Nam.

### 2.9. Cập nhật gần thời gian thực

Không dùng SignalR (§5 quyết định 8). Màn đơn hàng tự làm mới mỗi 30 giây (NFR-05), Tổng quan mỗi 60 giây, và làm mới ngay khi tab hiện lại (`refetchOnWindowFocus`). Thông báo đơn mới chia cho mình: FE so danh sách id đơn Mới của mình giữa hai lần tải (§4.5). Ở chế độ `mock`, `mockDb.subscribe` (`remote = true`) đã tự làm mới query khi tab landing tạo đơn, nên tab quản trị thấy đơn mới gần như tức thì.

---

## 3. Công thức và quy tắc (nguồn sự thật chung của BE, FE và mock)

FE tính tại máy để form phản hồi ngay bằng `features/sales/lib/*` (§4.9); handler mock dùng lại chính các hàm đó; BE dùng `OrderPricing`, `PromotionClock`, `SourceNormalizer`, `PhoneNormalizer` (Domain). Mọi số tiền là số nguyên đồng.

### 3.1. Tiền combo, phí vận chuyển (BR-01, BR-02, BR-03)

```
unitPrice      = priceType == KhuyenMai ? combo.promoPrice : combo.regularPrice
subtotal       = unitPrice × quantity                    // tiền hàng
shippingFee    = (combo.freeShipping || subtotal ≥ 500.000) ? 0 : 30.000
total          = subtotal + shippingFee                  // tiền thu hộ
pricePerBottle = floor(price / bottleCount / 1.000) × 1.000
upsellAmount   = max(0, subtotal lúc xác nhận − placedSubtotal)   // ghi lúc XacNhan (BR-12)
minPricePerBottle = min(pricePerBottle) của combo đang hiện theo giá đang áp dụng
```

Bảng tính sẵn (giá khuyến mãi trừ khi ghi khác):

| Ca | Phép tính | Tiền hàng | Phí ship | Tổng |
| :--- | :--- | ---: | ---: | ---: |
| `C01` × 1 (TC-05, demo bước 3) | 390.000 × 1 | 390.000 | 30.000 | **420.000** |
| `C01` × 1 giá thường (TC-03) | 450.000 × 1 | 450.000 | 30.000 | **480.000** |
| `C01` × 2 (TC-06) | 390.000 × 2 ≥ 500.000 | 780.000 | 0 | **780.000** |
| `C02` × 1 (TC-12, demo bước 7) | 740.000, miễn phí ship | 740.000 | 0 | **740.000** |
| `C03` × 1 (TC-17) | 990.000 | 990.000 | 0 | **990.000** |
| `C03` × 2 (TC-07) | 990.000 × 2 | 1.980.000 | 0 | **1.980.000** |
| `C01` × 5 | 390.000 × 5 | 1.950.000 | 0 | 1.950.000 |
| `C02` × 1 giá thường | 900.000 | 900.000 | 0 | 900.000 |
| `C03` × 1 giá thường | 1.350.000 | 1.350.000 | 0 | 1.350.000 |

| Giá mỗi chai (TC-01) | Khuyến mãi | Thường |
| :--- | ---: | ---: |
| `C01` | 390.000 | 450.000 |
| `C02` | **370.000** | 450.000 |
| `C03` | **330.000** ("chỉ từ 330.000 ₫/chai") | 450.000 |

| Upsell | Phép tính | Giá trị |
| :--- | :--- | ---: |
| TC-12: `C01` × 1 → `C02` | 740.000 − 390.000 | **+350.000** |
| TC-17: `C01` × 1 → `C03` sau khi hết khuyến mãi, giữ giá khuyến mãi | 990.000 − 390.000 | **+600.000** |
| TC-36: tổng hai đơn | 350.000 + 600.000 | **950.000** |
| Dữ liệu mẫu: `C02` → `C03` | 990.000 − 740.000 | +250.000 |
| `C02` → `C01` (đổi xuống) | max(0, 390.000 − 740.000) | 0 |
| TC-27: doanh thu đã giao tăng | tiền hàng `C01` × 1 | **+390.000** |
| TC-34 bước 1, 2 | 460.000 > 450.000; 389.500 không chia hết 1.000 | lỗi |

### 3.2. Nguồn, lượt truy cập (BR-07, BR-08)

```
normalizeSource(s):   s = trim(lower(s)); rỗng → "direct"
                      fb|facebook → facebook; tt|tiktok → tiktok; gg|google → google; zl|zalo → zalo
                      khác → giữ nguyên, cắt 50 ký tự
sourceFromHost(host): host = lower, bỏ "www."
                      facebook.com, *.facebook.com, fb.com, fb.me, m.me, messenger.com → facebook
                      tiktok.com, *.tiktok.com → tiktok
                      google.<tld>, *.google.<tld> → google
                      zalo.me, *.zalo.me, zalo.vn, *.zalo.vn → zalo
                      khác → host (vd "coccoc.com")
attribution(lượt):    có utm_source → { normalizeSource(utm_source), medium, campaign, content } (lưu trình duyệt 7 ngày)
                      không có, có storedAttribution (FE chỉ gửi khi còn ≤ 7 ngày) → dùng lại
                      không có, có referrer khác tên miền landing → { sourceFromHost(host), referrer: host }
                      còn lại → { source: "direct" }
medium, campaign, content: trim, cắt 100 ký tự, rỗng → null
```

Gom lượt: tìm lượt của `visitorId` có `LastSeenAt ≥ now − 30 phút`. Có, và request **không** có UTM mới khác (nguồn, chiến dịch) của lượt đó → cùng lượt, cập nhật `LastSeenAt`, `isNewVisit = false`, trả attribution của lượt. Ngược lại tạo lượt mới (`StartedAt = LastSeenAt = now`), cộng 1 vào `Sales_VisitStats` (giờ hiện tại, nguồn, chiến dịch hoặc `''`), ghi sự kiện `PageView`. TC-11 bước 2 (UTM mới sau 60 giây) là lượt mới nguồn `tiktok`; TC-32 hai cửa sổ ẩn danh là 2 lượt; TC-35 bốn cửa sổ `utm_source=demo_test` là 4 lượt.

Tỉ lệ chuyển đổi = số đơn (không tính đơn hủy "Đơn trùng") / lượt × 100, làm tròn 2 chữ số; lượt = 0 → `null` (hiện "—", UC-10 E1).

### 3.3. Khuyến mãi, đếm ngược (BR-02, BR-20)

```
effectiveEndAt(p, now):
  nếu p.autoRenewDays == null hoặc ngàyVN(now) ≤ ngàyVN(p.endAt): trả p.endAt
  n = p.autoRenewDays × 24 giờ
  k = số nguyên nhỏ nhất ≥ 1 sao cho p.endAt + k × n > now
  trả p.endAt + k × n
status = now < startAt ? SapChay : now < effectiveEndAt ? DangChay : DaKetThuc
priceType lúc đặt = status == DangChay ? KhuyenMai : GiaThuong          // [startAt, effectiveEndAt)
```

- Tự gia hạn **chỉ bắt đầu từ ngày hôm sau** ngày kết thúc (giờ VN): quản lý đặt kết thúc 1 phút trước thì landing hết khuyến mãi tới hết ngày (TC-03, TC-17 đúng), sáng hôm sau chương trình tự chạy chu kỳ mới. Seed: kết thúc 23:59:59 ngày kia, `autoRenewDays = 3` → 00:00 ngày thứ ba kết thúc mới là 23:59:59 ba ngày sau. Mọi khách thấy cùng một giờ kết thúc theo máy chủ (không phải đếm ngược giả theo từng lượt xem).
- Không lưu kết quả gia hạn vào DB (tính lúc đọc), nên cùng một hàm cho BE và mock.
- Hiển thị (BR-20): còn ≥ 24 giờ → "N ngày hh:mm:ss"; dưới 24 giờ → "hh:mm:ss"; hết → ẩn đồng hồ, combo hiện giá thường, không giá gạch (UC-01 E1). Đồng hồ tính `now = Date.now() + (asOf − giờ máy lúc nhận)`; FE gọi lại `GET /api/public/promotion` mỗi 5 phút và khi đồng hồ về 0.

### 3.4. Mã đơn, mã vận đơn (BR-06, BR-17)

- Mã đơn `LP` + `yyMMdd` (ngày đặt giờ VN) + số thứ tự 4 chữ số trong ngày, tiếp theo số lớn nhất đã có trong ngày đó.
- Mã vận đơn khi bàn giao: mã đơn vị (`GHN`, `GHTK`, `VTP`, `JT`) + `yyMMdd` (ngày bàn giao) + 4 chữ số ngẫu nhiên, không trùng mã đã có (vd `GHTK2610124587`). Dữ liệu mẫu dùng mã đơn vị + 10 số cuối của mã đơn (`06` §5.4).

### 3.5. Kiểm tra form, số điện thoại (BR-04)

```
normalizePhone(s): bỏ dấu cách, ".", "-", "(", ")"
                   bắt đầu "+84" → "0" + phần còn lại; bắt đầu "84" và dài 11 số → "0" + phần còn lại
họ tên: trim, gộp khoảng trắng; 2–50 ký tự; không chứa chữ số
số điện thoại (sau chuẩn hóa): ^0(3|5|7|8|9)\d{8}$
tỉnh/thành: đúng một chuỗi trong danh mục 34 tỉnh/thành (FE `provinces`, BE `SalesRules.Provinces`)
địa chỉ: trim, 10–200 ký tự; số lượng nguyên 1–5; ghi chú ≤ 300
```

FE hiện số đã chuẩn hóa trong ô khi rời ô (TC-08 bước 5: `+84912345678` → `0912345678`). Thiết bị: UA có `iPad` hoặc `Tablet` → `MayTinhBang`; có `Mobi` hoặc `Android` → `DienThoai`; còn lại `MayTinh`.

### 3.6. Chống trùng, chống spam (BR-05, NFR-03)

| Lớp | Khóa | Kết quả |
| :--- | :--- | :--- |
| Nút "Đặt hàng" | Khóa từ lúc bấm tới khi có phản hồi, chữ "Đang gửi…" | Không gửi lần hai |
| Gửi lại (mất mạng, bấm lại) | `clientRequestId` (FE sinh khi mở form, giữ nguyên khi thử lại, đổi mới sau khi đặt thành công) | 200 đơn cũ, `duplicate = true` |
| Trình duyệt | `visitorId` có đơn trong 60 giây | 429 `DatHangQuaNhanh`; FE kiểm trước bằng `last-order-at` ở localStorage, cùng câu |
| Số điện thoại | ≥ 5 đơn mọi trạng thái trong 24 giờ | 429 `QuaNhieuDonCungSo` |
| IP (chỉ BE) | `public-order` 10/phút | 429 `QuaNhieuYeuCau` |
| Đơn cùng số trong 24 giờ | Không chặn, gắn nhãn Trùng (§3.10) | Telesale xử lý (UC-04) |

Hai request cùng `clientRequestId` tới đồng thời: request sau gặp unique index, BE đọc lại và trả kết quả của request trước.

### 3.7. Kết quả cuộc gọi (BR-10)

| Kết quả | Trạng thái sau | Trường đổi | Sự kiện `CuocGoi` |
| :--- | :--- | :--- | :--- |
| `XacNhan` | Đã xác nhận | `ConfirmedAt`, `ConfirmedBy`, `UpsellAmount`, `NextCallAt = null` | "Xác nhận" hoặc "Xác nhận · Upsell +350.000 ₫"; thêm `TinNhan` "Đơn đã được xác nhận (SMS giả lập)" |
| `KhongNgheMay`, `ThueBao` lần 1, 2 | Chờ gọi lại | `FailedCallCount + 1`, `NextCallAt = now + 2 giờ` | "Không nghe máy (lần 1), hẹn gọi lại 16:30" / "Thuê bao không liên lạc được (lần 2), hẹn gọi lại …" |
| `KhongNgheMay`, `ThueBao` lần 3 | Đã hủy, `KhongLienLacDuoc` | `CancelledAt`, người hủy null (hệ thống) | "Không nghe máy (lần 3), hủy vì không liên lạc được" |
| `HenGoiLai` | Chờ gọi lại | `NextCallAt = callbackAt` (số lần không đổi) | "Hẹn gọi lại lúc 16:30 15/10" |
| `SaiSo` | Đã hủy, `SaiSoDienThoai` | người hủy = người gọi | "Sai số điện thoại" |
| `KhachHuy` | Đã hủy, lý do chọn | `CancelNote = note`, người hủy = người gọi | "Khách hủy: Chê giá cao" (+ ": {ghi chú}") |

Ghi chú của cuộc gọi (nếu có) nối thêm " · {ghi chú}" vào câu sự kiện; riêng `KhachHuy`, ghi chú là ghi chú lý do (`CancelNote`) nên nối ": {ghi chú}" ("Khách hủy: Khác: Khách nói chưa có nhu cầu"), không nối lần hai. Đơn Đã hủy thì tính lại nhãn Trùng (§3.10).

### 3.8. Câu trên dòng thời gian, sự kiện pixel

| Loại | Câu (`content`) | Người |
| :--- | :--- | :--- |
| `TaoDon` | "Khách đặt hàng trên landing, nguồn {nguồn hiển thị}" + ", chiến dịch {campaign}" khi có | Hệ thống |
| `TinNhan` | "Đã gửi SMS xác nhận (giả lập)" / "Đơn đã được xác nhận (SMS giả lập)" | Hệ thống |
| `Nhan` | "Gắn nhãn Trùng" / "Gắn nhãn Rủi ro hoàn" / "Bỏ nhãn Trùng" / "Bỏ nhãn Trùng: không phải đơn trùng" | Hệ thống hoặc người bấm |
| `ChiaDon` | "Chia cho {họ tên}" (tự chia, chia lại) / "{họ tên} nhận đơn" | Hệ thống / quản lý / người nhận |
| `CuocGoi` | §3.7 | Người gọi |
| `SuaDon` | "Sửa đơn: " + các phần nối bằng "; ": "{combo cũ} × {sl} → {combo mới} × {sl}, tiền hàng {cũ} → {mới}", "đổi họ tên", "đổi địa chỉ", "đổi tỉnh/thành" | Người sửa |
| `DoiTrangThai` | "Hủy đơn: {lý do}" (+ ": {ghi chú}"), "Giao thành công", "Hoàn hàng: {lý do}" (+ ": {ghi chú}") | Người làm |
| `BanGiao` | "Bàn giao {đơn vị}, mã vận đơn {mã}, thu hộ {tổng tiền}" | Người bàn giao |
| `GhiChu` | Nội dung người dùng nhập | Người ghi |

Sự kiện đổi trạng thái luôn có `fromStatus`, `toStatus` (BR-16). Sự kiện pixel giả lập (`Sales_ConversionEvents.PixelCall`), theo nguồn của lượt: `tiktok` → `ttq.track('ViewContent' | 'InitiateCheckout' | 'CompletePayment', { value, currency: 'VND' })`; `google` → `gtag('event', 'page_view' | 'begin_checkout' | 'purchase', { value, currency: 'VND', transaction_id })`; nguồn khác → `fbq('track', 'PageView' | 'InitiateCheckout' | 'Purchase', { value, currency: 'VND' })`. `value` chỉ với đặt hàng (tổng tiền).

### 3.9. Chia đơn (BR-09)

```
đơn mới, số điện thoại p:
  có đơn cùng p trạng thái Mới / Chờ gọi lại / Đã xác nhận và đang có người phụ trách → giao cho người đó
  ngược lại: ứng viên = tài khoản STAFF đang hoạt động có Sales_TelesaleStates.IsReceiving = true
            chọn LastAssignedAt nhỏ nhất (null trước), bằng nhau theo username; đặt LastAssignedAt = now
  không có ứng viên → chưa chia (mọi telesale thấy, bấm "Nhận đơn")
```

TC-05, TC-20: chỉ `nhanvien` bật nên mọi đơn về `nhanvien`; TC-24: `nhanvien` tắt thì đơn chưa chia. Chia lại thủ công không đổi `LastAssignedAt`.

### 3.10. Nhãn Trùng, Rủi ro hoàn (BR-14, BR-15)

```
khi tạo đơn N (số p):
  khác = đơn cùng p, trạng thái khác Đã hủy, |PlacedAt − N.PlacedAt| ≤ 24 giờ
  khác ≠ ∅ → N và mọi đơn trong khác: IsDuplicate = true, DuplicateCleared = false, sự kiện "Gắn nhãn Trùng"
  số đơn Hoàn hàng của p ≥ 2 → N.IsReturnRisk = true, sự kiện "Gắn nhãn Rủi ro hoàn"
khi một đơn cùng p chuyển Đã hủy (mọi lý do):
  với mỗi đơn M cùng p, khác Đã hủy, IsDuplicate = true:
    còn đơn cùng p khác Đã hủy (≠ M) trong 24 giờ của M → giữ; không còn → IsDuplicate = false, sự kiện "Bỏ nhãn Trùng"
  đơn bị hủy giữ nguyên nhãn của nó
```

TC-20: hủy đơn `C01` lý do "Đơn trùng" → đơn `C02` mất nhãn. TC-21: đơn cũ đã hủy nên không gắn. TC-31: đơn Đang giao vẫn tính (khác Đã hủy), cả hai mang nhãn, `relatedOrders[].canCancel = false` với đơn Đang giao. TC-18: đơn cũ 30 giờ nên không Trùng, khách có 2 đơn hoàn nên Rủi ro hoàn.

### 3.11. Định nghĩa số liệu báo cáo (BR-08, BR-14, BR-19)

"Đơn tính" = đơn không bị hủy lý do `DonTrung`. "Đã từng xác nhận" = trạng thái Đã xác nhận, Đang giao, Đã giao, Hoàn hàng (đúng danh sách BR-19; đơn xác nhận rồi hủy không tính).

| Chỉ số | Cách tính | Lọc ngày theo |
| :--- | :--- | :--- |
| Lượt truy cập | Σ `Sales_VisitStats.Visits` | `HourStart` |
| Số đơn | Đếm đơn tính | `PlacedAt` |
| Tỉ lệ chuyển đổi | đơn / lượt × 100, 2 chữ số | |
| Xác nhận, tỉ lệ xác nhận | Đơn tính đã từng xác nhận; / số đơn × 100, 1 chữ số | `PlacedAt` (nhóm đơn đặt trong kỳ) |
| Giao, hoàn, tỉ lệ hoàn | Đơn Đã giao, Hoàn hàng trong nhóm đơn đặt trong kỳ; hoàn / (giao + hoàn) × 100, 1 chữ số | `PlacedAt` |
| Doanh thu đã giao | Σ `Subtotal` đơn Đã giao, không gồm phí ship | `DeliveredAt` |
| Giá trị đơn đã xác nhận (Tổng quan) | Σ `Total` đơn đã từng xác nhận | `ConfirmedAt` |
| Chi phí, chi phí mỗi đơn xác nhận, ROAS | Σ `Sales_AdCosts.Amount`; chi phí / xác nhận làm tròn 1.000 ₫ (null khi chi phí = 0 hoặc chưa có xác nhận); doanh thu đã giao / chi phí, 2 chữ số, null khi chi phí = 0 (BR-22) | `Date` |

- **Tổng quan quản lý**: hôm nay = 00:00 giờ VN tới `now`; so với **hôm qua cùng khung giờ** (00:00 hôm qua tới `now − 24 giờ`). `change` = (giá trị − kỳ trước) / kỳ trước × 100, 1 chữ số (null khi kỳ trước = 0) với số lượng, tiền; = giá trị − kỳ trước (điểm phần trăm) với tỉ lệ (null khi một bên null). `pendingCalls`, `dueCallbacks` là số hiện tại, không so. `ordersByHour` theo giờ đặt; `trend14Days` 14 ngày tới hôm nay; `comboShare`, `sourceShare` đơn tính hôm nay theo combo hiện tại và nguồn, `share` 1 chữ số.
- **Tổng quan telesale** (người đăng nhập `u`): `myNew` = Mới của `u`; `unassignedNew` = Mới chưa chia; `myDueCallbacks` / `myLaterCallbacks` = Chờ gọi lại của `u` đã / chưa tới giờ; `myConfirmedToday` = `ConfirmedById = u`, `ConfirmedAt` hôm nay, trạng thái đã từng xác nhận; upsell = trong số đó `UpsellAmount > 0`, Σ `UpsellAmount`.
- **Theo nguồn**: nhóm theo `Source`, mở xuống `Campaign` (`''` hiện "(không có chiến dịch)"); chi phí có chiến dịch `''` chỉ cộng vào dòng nguồn. Danh sách nguồn = hợp nguồn có lượt, đơn hoặc chi phí trong kỳ; sắp số đơn giảm dần. `totals` cộng mọi nguồn.
- **Theo combo**: nhóm theo combo **hiện tại** của đơn tính đặt trong kỳ (lọc `source` nếu có); `share` = đơn combo / tổng × 100; `bottles` = Σ `BottleCount × Quantity` của đơn đã từng xác nhận; `deliveredRevenue` theo `DeliveredAt`; `averageOrderValue` = Σ `Total` / số đơn đã từng xác nhận (null khi 0).
- **Theo telesale**: mọi tài khoản `STAFF` đang hoạt động (kể cả số 0) và người khác có đơn trong kỳ; nhóm đơn tính đặt trong kỳ: `assigned` = `AssigneeId` = người đó; `called` = đơn có ít nhất một cuộc gọi của người đó; `confirmed` = `ConfirmedById` = người đó và đã từng xác nhận; `confirmRate` = confirmed / assigned; upsell trong số confirmed; `returnRate` = hoàn / (giao + hoàn) của đơn người đó xác nhận. TC-36: hai đơn TC-12, TC-17 cho upsell 2 đơn, 950.000 ₫.
- **Theo ngày**: mỗi ngày giờ VN: `orders` theo `PlacedAt`; `confirmed` theo `ConfirmedAt` (đã từng xác nhận); `cancelled` theo `CancelledAt` (không gồm `DonTrung`); `returned` theo `ReturnedAt`; `delivered`, `deliveredRevenue` theo `DeliveredAt`; `cancelRate` = cancelled / orders × 100. `previous` = kỳ liền trước cùng số ngày. `cancelReasons` không có `DonTrung`, `duplicateCancelled` đếm riêng (TC-36).

### 3.12. Số đối chiếu dữ liệu mẫu lúc nạp

Xem `06` §5.6, §5.7: telesale `nhanvien` có 4 đơn Mới, 1 đơn chưa chia, 3 đơn đến giờ gọi lại, 3 đơn xác nhận hôm nay, upsell 2 đơn / 600.000 ₫; quản lý thấy 13 đơn hôm nay, 10 đơn chờ gọi, tỉ lệ xác nhận hôm nay 38,5%, giá trị đơn đã xác nhận 3.670.000 ₫; 59 ngày lịch sử: 588 đơn tính, tỉ lệ xác nhận 75,3% (bảng 609 đơn lịch sử; báo cáo `sources?from={hôm nay − 59}&to={hôm nay − 1}` ra 589 đơn, 75,2%, facebook 319, `nhanvien` được chia 290, tỉ lệ xác nhận 77,9% vì có thêm đơn Lê Thị Hoa 30 giờ trước, `06` §5.7), tỉ lệ hoàn 11,8%, doanh thu đã giao 255.070.000 ₫, chi phí 62.812.000 ₫, ROAS 4,06.

---

## 4. Quy ước riêng cho FE

### 4.1. Trang công khai, menu, trang sau đăng nhập

- **Landing `/`** và **cảm ơn `/cam-on`** nằm ở `app/(landing)/` (`layout.tsx`, `page.tsx`, `cam-on/page.tsx`); **xóa `app/page.tsx`** (RootRedirect của nền). Không `AuthGuard`, không AppShell, không sidebar, không `DemoToolbar` (§4.2 bước 3 có nút nổi riêng khi bật demo). Người đã đăng nhập vào `/` vẫn thấy landing; vào khu quản trị bằng `/login` (tự chuyển `/dashboard` nếu đã đăng nhập) hoặc `/dashboard`.
- Landing render phía máy chủ (NFR-04): `page.tsx` là server component, gọi `getLandingPage()` (`features/landing/services/landing.server.ts`, dùng `serverFetch('/api/public/landing', { mock, revalidate: 60 })`), `generateMetadata`: `title` = "{product.name} | {store.name}", `description` = `product.shortDescription`, `openGraph` (`type: 'website'`, `images: ['/seed/og-landing.jpg']` 1200 × 630, `locale: 'vi_VN'`), `alternates.canonical = '/'`; `metadataBase` lấy `NEXT_PUBLIC_PUBLIC_URL` (vd `https://pum-landing-page.vercel.app`). `/cam-on`: `robots: { index: false }`. Thêm `app/robots.ts`, `app/sitemap.ts` chỉ có `/` (chép mẫu demo Danh mục).
- Sau khi hydrate, client gọi lại `GET /api/public/landing` (React Query `initialData` từ máy chủ, `refetchOnMount: 'always'`) để thấy ngay sửa đổi combo, nội dung, khuyến mãi (UC-11 bước 4; ở mock máy chủ chỉ có seed gốc, trình duyệt mới có localStorage).
- **Menu** (`config/routes/main.routes.ts`, đã khai báo): Tổng quan `/dashboard` (`dashboard.view`), Đơn hàng `/admin/orders` (`orders.view`), Combo và khuyến mãi `/admin/combos` (`combos.view`), Báo cáo `/admin/reports` (`reports.view`), Nội dung landing `/admin/content` (`landing-contents.view`), Xem landing page `/` (tab mới), rồi nhóm Cài đặt của nền. `homeAfterLogin = /dashboard` (cả quản lý, telesale đều có `dashboard.view`). Telesale gõ `/admin/reports` → `/forbidden` (TC-23).

### 4.2. Trình diễn trên một trình duyệt (chế độ `mock` trên Vercel)

Người xem `https://pum-landing-page.vercel.app` thường chỉ có một trình duyệt, không có BE. Dữ liệu mock nằm trong localStorage nên **mọi tab cùng trình duyệt thấy cùng dữ liệu**; cửa sổ ẩn danh là bộ dữ liệu riêng, không thấy đơn của nhau. Luồng "khách đặt hàng có UTM → telesale thấy đơn mới → gọi xác nhận → báo cáo theo nguồn" chạy bằng **nhiều tab**:

1. **Trang đăng nhập** (`features/auth/pages/LoginPage.tsx`, thêm một thẻ dưới Đăng nhập nhanh, chỉ khi `appConfig.demoToolbar`): thẻ "Xem landing page" có nút chính "Mở landing page" (tab mới `/`) và danh sách link UTM mẫu `demoLandingLinks` (Facebook · serum_t10, TikTok · tt_video_ugc, Google · gg_search_serum, Không có UTM), mỗi link mở tab mới; dòng gợi ý "Đăng nhập Telesale ở tab này để thấy đơn mới".
2. **`DemoToolbar`** (`components/demo/DemoToolbar.tsx`, thêm một `Section` "Landing", hiện ở trang đã đăng nhập, cả hai chế độ):
   - Mở landing theo nguồn: chọn một link `demoLandingLinks` → tab mới.
   - **"Giả lập đơn từ quảng cáo"**: chọn nguồn ngẫu nhiên theo tỉ trọng (facebook 55%, tiktok 25%, google 10%, zalo 5%, trực tiếp 5%) và chiến dịch tương ứng (`06` §5.1), khách ngẫu nhiên (tên tiếng Việt, số điện thoại ngẫu nhiên hợp lệ, không bắt đầu `090100`, tỉnh, địa chỉ), combo theo tỉ trọng 45/40/15, số lượng 1; gửi qua **chính service công khai**: `POST visits` rồi `POST orders` với `visitorId = "demo-sim-" + uuid` mới mỗi lần (không vướng 60 giây). Thông báo "Đã tạo đơn LP… từ {nguồn}". Đơn đi đúng mọi quy tắc nên xuất hiện ở tab Đơn hàng kèm âm báo.
   - "Mở landing như khách khác": tab mới `/?visitor=N` (N tăng dần, §4.3) để thử đơn trùng từ "trình duyệt khác" (TC-20, TC-21).
3. **Trên landing ở chế độ demo** (`appConfig.demoToolbar`): nút tròn nhỏ góc trên phải "Khu quản trị" mở `/login` ở tab mới (không che nút Đặt hàng cố định).
4. **Nhiều "trình duyệt" trong một trình duyệt**: tham số `?visitor=N` (N ≥ 2) cho tab một danh tính riêng: `visitorId`, nguồn lưu 7 ngày, `last-order-at` lưu ở khóa có hậu tố `:v{N}`; N giữ trong `sessionStorage` của tab nên sang `/cam-on` không mất. Không có tham số = trình duyệt 1. TC-20, TC-21 ("trình duyệt A, B"), TC-32, TC-35 ("cửa sổ ẩn danh mới") chạy ở mock bằng các tab `?visitor=2`, `3`… (ghi ở 05 §1).
5. **Âm báo**: màn Đơn hàng có nút "Bật âm báo" (trình duyệt chặn tự phát âm trước khi người dùng bấm), lưu `localStorage` khóa `retail-landing-page:order-sound`.

Kịch bản gợi ý cho người xem một mình: tab 1 đăng nhập nhanh Telesale, mở Đơn hàng, bật âm báo → tab 2 mở "Facebook · serum_t10" từ trang đăng nhập hoặc DemoToolbar → chọn combo, đặt hàng → tab 1 có thông báo, đơn mới nhãn nguồn facebook → gọi xác nhận, upsell → đổi vai trò Quản lý → Báo cáo tab Nguồn thấy đơn trong `serum_t10`.

### 4.3. Landing `/` (SCR-01, SCR-02)

- Tối ưu điện thoại dọc 360–430 px (NFR-01), nội dung tối đa 480 px ở giữa trên màn rộng. Khối render theo `blocks` (đúng thứ tự `sortOrder`), mỗi `BlockType` một component trong `features/landing/components/blocks/`. Ảnh `next/image` (hoặc `<img>` có `width`, `height`, `loading="lazy"` trừ ảnh Hero), khung giữ tỉ lệ có màu nền để không nhảy bố cục (UC-01 E2). Icon theo `landingIconNames`.
- **Hero**: ảnh, tiêu đề, phụ đề, "chỉ từ {minPricePerBottle}/chai", đồng hồ đếm ngược (§3.3), 3 ý ngắn, nút "Đặt hàng ngay" cuộn tới khối Order.
- **Thanh "Đặt hàng ngay" cố định** cuối màn hình điện thoại, ẩn khi khối Order đang trong màn hình (IntersectionObserver); bấm cuộn mượt tới khối combo (FR-05, TC-02). Vùng chạm ≥ 44 px.
- **BeforeAfter**: thanh kéo so sánh hai ảnh (`imageUrl` trước, `afterImageUrl` sau), có nhãn "Trước", "Sau 28 ngày", câu lưu ý `body` ngay dưới.
- **Reviews**: điểm trung bình (sao + "4,8/5 · 20 đánh giá"), 6 đánh giá đầu từ `reviews`, nút "Xem thêm" gọi `GET /api/public/reviews?page=n&pageSize=6` (FR-08); avatar thiếu thì chữ viết tắt; `isSample` hiện chữ nhỏ "Minh họa".
- **Faq**: accordion một mục mở (UC-01 3b). **Footer**: `store.*`, chính sách dạng accordion, `body`, dòng PUM nền (`Company.*` công khai).
- **Khối Order** (SCR-02): thẻ combo dạng radio (tên, nội dung, quà, giá, giá gạch, "{pricePerBottle}/chai", "Miễn phí vận chuyển" hoặc "Phí vận chuyển 30.000 ₫", nhãn), chọn sẵn `isDefault` (FR-07, TC-01); đồng hồ đếm ngược nhỏ trên form; form React Hook Form + Zod (`features/sales/schemas/order-form.schema.ts`): họ tên, số điện thoại (`inputMode="tel"`, chuẩn hóa khi rời ô), tỉnh/thành (Combobox có tìm không dấu, NFR-02), địa chỉ, số lượng (nút − / +, 1–5), ghi chú; lỗi hiện khi rời ô; khu tổng tiền (tiền hàng, phí ship, tổng) cập nhật ngay (§3.1).
- **Gửi**: kiểm `last-order-at` trước (60 giây, §3.6); nút khóa "Đang gửi…"; `expectedPrice = combo.price`; thành công → lưu `PlacedOrderSummary` vào `sessionStorage` khóa `placed-order`, ghi `last-order-at`, đổi `clientRequestId`, chuyển `/cam-on`. Lỗi theo trường → gắn vào ô (`applyFieldErrors`); `ComboDaThayDoi` → toast đúng câu, tải lại landing, cuộn về khối combo (UC-02 E4); `GiaDaThayDoi` → cập nhật giá theo `currentPrice`, hộp thông báo, chờ khách bấm lại; `DatHangQuaNhanh`, `QuaNhieuDonCungSo`, `QuaNhieuYeuCau` → hộp thông báo đúng `detail`; lỗi mạng → "Chưa gửi được đơn, vui lòng thử lại", giữ nguyên dữ liệu (lưu nháp `order-draft` ở `sessionStorage`), gửi lại cùng `clientRequestId` (NFR-03, UC-02 E3).
- **UTM, lượt** (§3.2): khi tải trang gọi `POST visits` với UTM trên URL, nguồn lưu (khóa `attribution`, `{ ...Attribution, savedAt }`, bỏ khi quá 7 ngày), `document.referrer` nếu khác host; `saveAttribution` → ghi đè. Giữ `visitId` và `attribution` trả về trong bộ nhớ để gửi kèm đơn. Lần đầu chạm vào ô form mỗi lượt → `POST events` `StartForm`. Khóa trình duyệt qua `storageKey()`: `visitor`, `attribution`, `last-order-at` (thêm hậu tố `:v{N}`, §4.2).
- **Thông báo đơn gần đây** (P3): `GET recent-orders` một lần, hiện góc dưới trái mỗi 15 giây, tối đa 5 lần mỗi lượt xem, câu "Hoa ở Hà Nội vừa đặt Mua 2 tặng 1 – 12 phút trước" (BR-21); không che thanh Đặt hàng.
- Màu theo `store.primaryColor` (cơ chế `brand-color.ts` của nền); nút đặt hàng `variant="cta"`.

### 4.4. Trang cảm ơn `/cam-on` (SCR-03)

Đọc `placed-order` (sessionStorage của tab, có hậu tố `:v{N}`). Có: dấu tích, "Đặt hàng thành công", mã đơn lớn, combo × số lượng, tiền hàng, phí ship, tổng, họ tên, số điện thoại, địa chỉ, câu `outsideWorkingHours ? "Nhân viên sẽ gọi xác nhận từ 8 giờ sáng" : "Nhân viên sẽ gọi xác nhận trong 15 phút, vui lòng để ý điện thoại"` (UC-02 bước 5, 4a), hotline shop, nút "Quay lại trang sản phẩm". Không có: "Không tìm thấy thông tin đơn vừa đặt" + nút về `/`. Không gọi API.

### 4.5. Đơn hàng `/admin/orders` (SCR-05, SCR-06)

- Desktop 1366 × 768. Đầu trang: công tắc "Nhận đơn" (chỉ người có vai trò `STAFF`, `PUT /api/telesales/me/receiving`), "Bật âm báo", "Xuất Excel" (`orders.export`), "Chia lại" (`orders.assign`, khi đã chọn dòng), "Bàn giao vận chuyển" (`orders.ship`, khi đã chọn dòng).
- Tab trạng thái `orderStatusTabs` kèm `statusCounts`, mặc định tab Mới; tìm theo SĐT, mã, tên; lọc ngày đặt, combo, nguồn, telesale (`orders.view-all`; có "Chưa chia"), nhãn. Đọc bộ lọc từ query string (`ordersUrl()`): thẻ Tổng quan, ô upsell báo cáo telesale (TC-36) mở sẵn bộ lọc. Dòng: mã, "5 phút trước", khách, SĐT, tỉnh, combo × SL, tổng, nguồn (+ chiến dịch), telesale, nhãn (`StatusBadge` theo `orderTagTones`); đơn chưa chia có nút "Nhận đơn". Trống: "Xóa bộ lọc" (UC-05 E1).
- **Ngăn chi tiết** (Sheet bên phải): khách, số điện thoại là liên kết `tel:` (FR-21), địa chỉ, combo, tiền, nguồn, chiến dịch, nội dung, thiết bị; cảnh báo đỏ khi `RuiRoHoan` kèm danh sách đơn hoàn (`relatedOrders`, UC-03 E3); "Đơn cùng số điện thoại" với nút "Hủy đơn trùng" (`canCancel`) và "Không phải trùng"; lịch sử cuộc gọi; dòng thời gian.
- **Ghi kết quả gọi** ≤ 3 thao tác (NFR-05): hàng nút `callResultOrder`; "Xác nhận" lưu ngay (kèm `changes` nếu đã sửa combo, số lượng, địa chỉ trong ngăn, hiện "Upsell +350.000 ₫" xem trước theo §3.1); "Hẹn gọi lại" mở chọn giờ (gợi ý +30 phút, +1 giờ, +2 giờ, 19:00) và khóa nút lưu khi chưa chọn; "Khách hủy" mở chọn lý do `customerCancelReasons`, khóa khi chưa chọn (UC-03 E2); ô ghi chú tùy chọn. Đơn Đã xác nhận trở đi chỉ còn "Thêm ghi chú" (BR-13).
- Hủy đơn: hộp chọn `userCancelReasons` + ghi chú (bắt buộc khi Khác), nút xác nhận khóa khi chưa chọn (UC-09 E1); không có nút khi Đang giao trở đi. Đã giao: `ConfirmDialog` hiện tiền thu hộ (UC-08 bước 2). Hoàn hàng: chọn `returnReasons`. Bàn giao: hộp chọn đơn vị (`carrierLabels`), nút khóa khi chưa chọn (UC-07 E2), hiện `message` trả về.
- `409 DonDaThayDoi` → toast đúng câu, thay cache bằng `order` trong lỗi.
- **Tự làm mới** 30 giây; **thông báo đơn mới**: hook `useNewOrderAlerts` so id đơn Mới của mình (và chưa chia) giữa hai lần tải danh sách, đơn mới → toast "Có đơn mới {mã} từ {nguồn}" + âm báo (nếu bật), lần tải đầu không báo (UC-05 1a).
- **Xuất Excel**: `GET export-rows` (cùng bộ lọc đang xem) → `write-excel-file` (đã có trong `package.json`), cột "Mã đơn, Tên người nhận, Số điện thoại, Địa chỉ, Tỉnh/thành, Nội dung hàng, Tiền thu hộ, Ghi chú" (FR-28), tên file `don-hang-{yyyyMMdd-HHmm}.xlsx`.

### 4.6. Combo, khuyến mãi, nội dung landing

**Combo và khuyến mãi `/admin/combos` (SCR-07)**

- Khung chương trình: tên, bắt đầu, kết thúc (chọn ngày giờ), trạng thái, "Kết thúc sau khi tự gia hạn: {effectiveEndAt}" khi khác `endAt`, công tắc "Tự gia hạn khi hết hạn (bản demo)" + số ngày; lưu bằng `PUT /api/promotion`.
- Bảng combo kéo thả sắp xếp: mã, tên, nội dung, quà, giá khuyến mãi, giá thường, giá mỗi chai, miễn phí ship, nhãn, mặc định (radio), hiện/ẩn (công tắc), số đơn; xóa khóa khi `orderCount > 0` kèm gợi ý "Ẩn". Người chỉ có `combos.view` (telesale) xem, không có nút sửa.

**Nội dung landing `/admin/content` (SCR-09, P3)**: Tab Khối nội dung (danh sách kéo thả, công tắc hiện/ẩn, khóa với khối bắt buộc; form sửa theo loại khối, mục `items` thêm/xóa/sắp xếp, chọn icon trong `landingIconNames`, tải ảnh), tab Đánh giá (bảng, thêm/sửa/ẩn/sắp xếp), tab Sản phẩm. Bên phải khung xem trước điện thoại 390 × 844 dùng **chính component khối của landing** (`LandingPreview` của FE-Landing, nhận `LandingPageDto` dựng từ dữ liệu đang sửa, FR-17).

### 4.7. Tổng quan, báo cáo

- `/dashboard` (thay nội dung `app/(protected)/dashboard/page.tsx` của nền): có `reports.view` → `GET /api/dashboard/manager`: 6 thẻ FR-01 (mũi tên tăng/giảm, "—" khi null), biểu đồ đơn theo giờ, xu hướng 14 ngày (cột đơn + đường tỉ lệ xác nhận), hai biểu đồ tròn combo, nguồn; bấm một nguồn → `/admin/reports?tab=sources&source=…` (UC-10 2a). Không có `reports.view` → `GET /api/dashboard/telesale`: thẻ "Đơn mới chờ gọi", "Đến giờ gọi lại", "Đã xác nhận hôm nay", "Upsell hôm nay", bấm mở `ordersUrl({ status: 'Moi', assigneeId: me })`, `{ tag: 'DenGioGoiLai' }`… (FR-03). Không hiện lượt truy cập, tỉ lệ chuyển đổi, doanh thu toàn shop với telesale (TC-33).
- `/admin/reports`: tab Nguồn (mặc định, 7 ngày, bảng mở xuống chiến dịch, cột chi phí, chi phí/đơn xác nhận, ROAS), Combo, Telesale (ô số đơn upsell là liên kết `ordersUrl({ confirmedById, upsellOnly: true, from, to })`), Theo ngày (biểu đồ + bảng + lý do hủy, hoàn), Chi phí quảng cáo (bảng nhập, `ad-costs.*`), Sự kiện pixel (nhật ký `conversion-events`, P3). Chọn nhanh Hôm nay, 7 ngày, 30 ngày, Tháng này, Tùy chọn; chặn > 366 ngày trước khi gọi; tab và khoảng ngày giữ trên query string. "Xuất Excel" (FR-34) dựng file từ dữ liệu tab đang xem bằng `write-excel-file`.
- Định dạng: tiền `formatVnd`, tỉ lệ chuyển đổi 2 chữ số, tỉ lệ khác 1 chữ số, dấu phẩy thập phân.

### 4.8. Mock

- **Collection** (`mockDb.collection`, scope `business`): `products`, `combos`, `promotions`, `landing-blocks`, `reviews` (`features/landing/mock/landing.store.ts`); `orders` (cuộc gọi, sự kiện, vận đơn lồng trong bản ghi), `visits`, `visit-stats` (chỉ lượt phát sinh khi demo), `telesale-states`, `ad-costs`, `conversion-events` (giữ 500 bản ghi mới nhất), `sales-meta` (`features/sales/mock/sales.store.ts`). Kiểu bản ghi `*Record` trong `FE/src/types/landing.ts`. Cài đặt shop đọc `settingsDb` của nền (`@/mock/system-data`), id, họ tên tài khoản bằng `userIdOf(username)`.
- **Seed**: `mockDb.registerSeed('demo-data', demoData)`, suy ra trường đúng `06` §5 (giờ VN, phút tương đối, `stableId` ở `06` §5.2), tính tiền, sự kiện bằng `features/sales/lib/*`.
- **Lượt truy cập lịch sử** (≈ 9.700 dòng giờ) giữ ở kho **trong bộ nhớ** dựng lại từ seed mỗi lần tải trang, không ghi localStorage; `allVisitStats()` hợp kho này với collection `visit-stats`.
- **Làm mới theo ngày**: `sales-meta` lưu `seededDate` (ngày VN lúc nạp). Lần truy cập đầu mà khác ngày hôm nay → `reseed()` mọi collection nghiệp vụ của dự án rồi nạp lại (đơn "hôm nay", đếm ngược luôn đúng khi người xem quay lại hôm sau; `06` §5.3).
- **Giờ máy chủ ở mock** (TC-04): route `app/server-time/route.ts` (`dynamic = 'force-dynamic'`) trả `{ now }` từ máy chủ Next; handler `public.promotion`, `public.landing` lấy `asOf` từ route này (lưu độ lệch một lần mỗi lần tải trang, lỗi thì dùng giờ máy).
- **API công khai ở mock**: handler không gọi `requirePermission`, không đọc phiên đăng nhập (tab landing không đăng nhập vẫn chạy).
- Lỗi trả đúng ProblemDetails có `code` như §2.8 (`domain(detail, { code, … })`, `conflict`, `forbidden`, `notFound` của `mock-errors.ts`; 429 dùng `new ApiError` với `status: 429`).
- Mã `LP` sinh trong handler theo ngày, nối tiếp số lớn nhất đã có.

### 4.9. Chia việc FE (hai agent làm song song)

Đã viết sẵn, **dùng chung, không agent nào tự đổi cấu trúc** (cần đổi hợp đồng thì sửa 07 trước, báo bên kia): `src/types/landing.ts` (mọi DTO, enum, `*Record`), `src/config/landing-labels.ts`, `src/config/sales-rules.ts`, `src/config/permissions.ts`, `src/config/route-path.ts` (`landingUrl`, `ordersUrl`), `src/config/routes/main.routes.ts`, `src/config/api-routes.ts`, `src/config/setting-labels.ts`, `src/mock/seed/*.json`, `scripts/generate-orders.mjs`. Được **thêm** hằng mới vào các file config (nối cuối nhóm của mình), không sửa dòng của bên kia. `package.json` đã có `write-excel-file`; cần gói khác thì **chỉ FE-Landing** thêm (FE-Quản trị nhờ). `app/theme.css`: chỉ FE-Landing thêm token (vd `--landing-*`).

| | **FE-Landing** | **FE-Quản trị** |
| :--- | :--- | :--- |
| Màn hình | `/` (SCR-01, SCR-02), `/cam-on` (SCR-03); thẻ "Xem landing page" ở trang đăng nhập; mục "Landing" của `DemoToolbar`; nút "Khu quản trị" trên landing | `/admin/orders` (SCR-05, SCR-06), `/admin/combos` (SCR-07), `/admin/content` (SCR-09), `/dashboard` (SCR-04), `/admin/reports` (SCR-08) |
| Thư mục feature sở hữu | `features/sales/` (lõi dùng chung, xem dưới), `features/landing/` | `features/orders/`, `features/combos/`, `features/content/`, `features/reports/` (gồm Tổng quan, chi phí quảng cáo, sự kiện pixel) |
| Route `app/` | `app/(landing)/**`, `app/server-time/route.ts`, `app/robots.ts`, `app/sitemap.ts`; xóa `app/page.tsx` | `app/(protected)/admin/**`, `app/(protected)/dashboard/page.tsx` (thay nội dung) |
| Collection mock-db sở hữu (khai báo, nạp seed) | **Tất cả** (§4.8): `landing.store.ts`, `sales.store.ts` | Không khai báo collection; handler của mình đọc, ghi qua API của store |
| Handler mock | `features/landing/mock/` (`/api/public/*`) | `features/orders/mock/` (đơn, telesale), `features/combos/mock/` (combo, khuyến mãi), `features/content/mock/` (sản phẩm, khối, đánh giá), `features/reports/mock/` (Tổng quan, báo cáo, chi phí, sự kiện) |
| File nền được sửa | `features/auth/pages/LoginPage.tsx` (chèn một thẻ), `components/demo/DemoToolbar.tsx` (thêm một `Section`), `app/theme.css` (token), `package.json` | Không sửa file nền ngoài trang dashboard |

**Lõi `features/sales/` và kho mock (FE-Landing viết, FE-Quản trị chỉ import).** Mốc 1, làm **trước tiên** để FE-Quản trị dùng được ngay:

| File | Xuất ra |
| :--- | :--- |
| `lib/vn-time.ts` | `vnNow()`, `vnDateKey(iso)` (yyyy-MM-dd), `vnStartOfDay(dateKey)`, `vnHour(iso)`, `vnClock(dateKey, 'HH:mm')`, `formatVnTime(iso)` |
| `lib/pricing.ts` | `unitPrice(combo, priceType)`, `orderAmounts(combo, priceType, quantity)` → `{ unitPrice, subtotal, shippingFee, total }`, `pricePerBottle(price, bottles)`, `upsellAmount(placed, now)` (§3.1) |
| `lib/promotion.ts` | `effectiveEndAt(p, now)`, `promotionStatus(p, now)`, `priceTypeAt(p, now)`, `formatCountdown(ms)` (§3.3) |
| `lib/phone.ts`, `lib/order-validation.ts` | `normalizePhone()`; `validateOrderInput()` → `Record<field, câu>` đúng §2.8 (form, handler công khai, sửa đơn dùng chung) |
| `lib/attribution.ts` | `normalizeSource()`, `sourceFromHost()`, `resolveAttribution()`, `detectDevice()` (§3.2) |
| `lib/order-rules.ts` | `nextOrderCode(day, existing)`, `trackingCode(carrier, day, existing)`, `pickAssignee(...)` (§3.9), `applyDuplicateTagsOnCreate()`, `recomputeDuplicatesAfterCancel()` (§3.10), `isReturnRisk()`, `orderTags(record, now)`, `applyCallResult(record, input, actor, now)` (§3.7) |
| `lib/order-events.ts` | Hàm dựng `OrderEventRecord` đúng câu §3.8 (`evCreated`, `evSms`, `evAssigned`, `evCall`, `evEdited`, `evStatus`, `evHandover`, `evTag`, `evNote`) và `pixelCall()` |
| `mock/sales.store.ts` | Collection §4.8, `ordersDb`, `allVisitStats()`, `telesaleStatesDb`, `adCostsDb`, `conversionEventsDb`, `bumpVisitStat()`, `userName(id)`, `ensureFreshDay()` |
| `features/landing/mock/landing.store.ts` | `productDb`, `combosDb`, `promotionDb`, `blocksDb`, `reviewsDb`, `getPromotion()` |

Mốc 2: `features/landing/components/LandingPreview.tsx` (FE-Quản trị dùng ở khung xem trước; trước khi có thì hiện khung trống) và handler đặt hàng công khai (để "Giả lập đơn" và TC chạy). FE-Quản trị viết handler đơn hàng bằng `applyCallResult`, `recomputeDuplicatesAfterCancel`, `order-events`; trước mốc 1 có thể dựng giao diện với dữ liệu tạm.

Service: mỗi feature có `services/*.service.ts` riêng, chỉ gọi đường dẫn trong `apiRoutes`; API công khai dùng `features/landing/services/public-api.ts` (axios không token, cả FE-Quản trị không gọi). Query key: `['public', 'landing' | 'promotion' | 'reviews' | 'recent-orders', …]`, `['promotion']`, `['combos']`, `['product']`, `['landing-blocks']`, `['reviews', query]`, `['orders', query]`, `['order', id]`, `['telesales']`, `['dashboard', 'manager' | 'telesale']`, `['reports', loại, query]`, `['ad-costs', query]`, `['conversion-events', query]`. Sau khi ghi đơn: `invalidateQueries(['orders'])`, `['order', id]`, `['dashboard']`.

### 4.10. Thứ tự làm BE (một agent)

Namespace theo `BE-CAU-TRUC-THU-MUC.md`; Area `Cms` (module `Catalog`, `Content`) và `Sales` (module `Orders`, `Tracking`, `Telesales`, `Marketing`, `Reports`, `Public`). Chép nguyên từ demo Menu QR (`04-fnb-menu-qr/BE`): `Application/Common/Time/VietnamTime.cs`, `Infrastructure/Persistence/Seeders/SeedJson.cs`, `API/Filters/PublicRateLimitAttribute.cs` (đổi khóa thành IP, đổi tên bộ lọc lỗi thành `SalesProblemCodeAttribute`), `Infrastructure/Implementations/Services/Public/PublicRateLimiter.cs`, mẫu `Application/Common/Exceptions/PosConflicts.cs` → `SalesProblems.cs`.

1. **Domain**: `Domain/Enums/Cms/*`, `Domain/Enums/Sales/*` (mọi enum `06` §4); `Domain/Entities/Cms/Catalog/{Product,Combo,Promotion}.cs`, `Cms/Content/{LandingBlock,Review}.cs`, `Sales/Orders/{Order,OrderCall,OrderEvent,Shipment}.cs`, `Sales/Tracking/{Visit,VisitStat,ConversionEvent}.cs`, `Sales/Telesales/TelesaleState.cs`, `Sales/Marketing/AdCost.cs`; `Domain/Entities/Sales/{SalesRules,SalesErrors,OrderPricing,PromotionClock,SourceNormalizer,PhoneNormalizer,OrderEventTexts}.cs` (§3).
2. **Persistence**: `Infrastructure/Persistence/Configurations/{Cms,Sales}/*Configuration.cs` (index, unique, jsonb `Items`, concurrency `06` §4); migration `Add_Cms_Sales` (Postgres).
3. **Seed**: `SalesSeedRecords.cs` (kiểu đọc JSON `06` §5.4), `DemoDataSeeder.cs` suy ra đúng `06` §5 (dùng chung `OrderPricing`, `OrderEventTexts`); đối chiếu số `06` §5.7 bằng `GET /api/reports/sources` 59 ngày. `project.json` đã có quyền, tài khoản, cài đặt (SystemSeeder nền tự đồng bộ).
4. **API công khai** (P1, FE-Landing chạy chế độ `api` cần trước): `IPublicLandingService` (landing, promotion, reviews, recent-orders), `IVisitTrackingService` (visits, events, `VisitStats` upsert), `IOrderPlacementService` (§2.1 bảng kiểm tra, §3.9, §3.10) + `Controllers/Public/PublicController.cs` (`[AllowAnonymous]`, `[PublicRateLimit]`).
5. **Đơn hàng**: `IOrderService` (danh sách + `statusCounts`, chi tiết, sửa, gọi, nhận, hủy, không phải trùng, giao, hoàn, ghi chú, bàn giao, chia lại, export-rows), `ITelesaleService`; repository riêng `IOrderQueryRepository` cho danh sách, đếm tab; mọi ghi trong transaction, kiểm `Version`.
6. **Combo, khuyến mãi, nội dung**: `IComboService`, `IPromotionService`, `IProductService`, `ILandingBlockService`, `IReviewService` + controller.
7. **Tổng quan, báo cáo**: `IDashboardService`, `ISalesReportService` + `ISalesReportRepository` (truy vấn gộp §3.11), `IAdCostService`, `IConversionEventService`.
8. Mã quyền §1 ở `Application/Constants/ProjectPermissions.cs` (tách khỏi `Permissions.cs` nền, như demo Menu QR); `ExceptionMiddleware` nền không sửa (dùng bộ lọc `[SalesProblemCode]`). Danh sách đơn, báo cáo dùng `IGenericRepository` (truy vấn lọc rồi tổng hợp trong bộ nhớ, như demo Menu QR), không tạo `IOrderQueryRepository`, `ISalesReportRepository`. Lỗi validate nhiều trường: `detail` là câu mặc định của nền "Dữ liệu gửi lên không hợp lệ.". Combo mới tự làm mặc định khi chưa có combo mặc định nào.
9. Kiểm: `dotnet publish` không lỗi (máy dev không có Docker/Postgres; dùng Postgres portable nếu cần chạy), chạy tay qua Swagger các TC trọng tâm: TC-05, 06, 07, 08, 09, 10, 11, 12, 15, 17, 18, 20, 21, 24, 25, 30, 31, 34, 35, 36.

---

## 5. Quyết định thiết kế (BE và FE làm theo)

Những điểm SRS, use case chưa nói rõ đã được chốt như sau; FE mock làm giống BE để hai chế độ ra cùng kết quả.

| # | Chỗ | Quyết định | Lý do |
| :---: | :--- | :--- | :--- |
| 1 | Đếm ngược luôn còn hạn khi demo | `Cms_Promotions.AutoRenewDays` (seed 3): **từ ngày hôm sau** ngày kết thúc, kết thúc tự dời theo chu kỳ N ngày, tính lúc đọc, mọi khách cùng một giờ; mock còn tự nạp lại dữ liệu khi sang ngày mới | Demo công khai mở bất kỳ ngày nào vẫn có đồng hồ; không phải đếm ngược giả theo lượt xem (NFR-06); TC-03, TC-17 vẫn đúng vì trong ngày không gia hạn. Đã ghi vào SRS §2.4, BR-20 |
| 2 | Một chương trình khuyến mãi | Bảng một dòng, không có lịch nhiều chương trình | SRS §5.1 "áp cho mọi combo" |
| 3 | Mức giá đơn mẫu | Mọi đơn mẫu giá khuyến mãi | Shop chạy khuyến mãi liên tục; số dễ đối chiếu |
| 4 | Giá đổi khi khách đang điền | `expectedPrice` lệch → 409 `GiaDaThayDoi`, không tạo đơn | BR-02 chốt giá lúc gửi; khách phải thấy đúng giá sẽ trả |
| 5 | Combo và form | Một khối `Order` (không tách hai khối) | SCR-02 là một màn; không thể xếp form xa combo |
| 6 | Khối bắt buộc | `Hero` đầu, `Footer` cuối, `Hero`, `Order`, `Footer` không ẩn | Landing không có nút đặt hàng, chân trang thì không dùng được |
| 7 | Khối "Cam kết" | Thêm loại `Commitments` sau `Certificates`; FR-04 sửa "chứng nhận, cam kết" | Cam kết kiểm hàng, đổi trả, COD là lý do chốt đơn chính của landing COD |
| 8 | Cập nhật đơn mới | Hỏi lại 30 giây + làm mới khi tab hiện lại, không SignalR | NFR-05 cho phép; giảm việc BE; ở mock BroadcastChannel đã tức thì |
| 9 | Lượt truy cập | Bảng thô `Sales_Visits` để gom phiên + bảng gộp theo giờ `Sales_VisitStats` cho báo cáo | 60 ngày × 550 lượt không đưa được vào seed, localStorage |
| 10 | Lượt mới khi đổi UTM | UTM khác nguồn hoặc chiến dịch trong 30 phút vẫn tính lượt mới | Giống Google Analytics; TC-11 bước 2 |
| 11 | Nguồn lưu trên trình duyệt | FE lưu, gửi `storedAttribution`; BE chuẩn hóa lại | BR-07 "lưu trên trình duyệt 7 ngày" |
| 12 | "Trực tiếp" | Lưu `direct`, hiển thị "Trực tiếp" | Khóa không dấu cho lọc, URL |
| 13 | Nhiều trình duyệt ở mock | Tab `?visitor=N` thay cho cửa sổ ẩn danh | Ẩn danh là localStorage khác, không thấy dữ liệu demo |
| 14 | Chống spam | 60 giây theo trình duyệt; tối đa 5 đơn/số/24 giờ; IP 10 đơn/phút (BE) | BR-05; số điện thoại và IP bổ sung chống phá; demo vẫn đặt 2–3 đơn cùng số |
| 15 | Hủy một đơn bất kỳ lý do | Tính lại nhãn Trùng các đơn cùng số | BR-14 nói "Đơn trùng", nhưng đơn còn lại không còn trùng với đơn đã hủy (TC-21) |
| 16 | Đơn đã hủy | Giữ nhãn Trùng của nó | Biết đơn đó bị hủy vì trùng |
| 17 | Tỉ lệ xác nhận | Đúng danh sách BR-19 (xác nhận rồi hủy không tính) | SRS liệt kê rõ trạng thái |
| 18 | Báo cáo nguồn | Đơn, xác nhận, giao, hoàn theo nhóm đơn đặt trong kỳ; doanh thu theo ngày giao | BR-19 "tính theo ngày giao"; tỉ lệ cùng một nhóm đơn mới so được |
| 19 | So với hôm qua | Cùng khung giờ 00:00 → giờ hiện tại | Sáng nào cũng "giảm" nếu so cả ngày hôm qua |
| 20 | Telesale | Tài khoản vai trò `STAFF`; chỉ `STAFF` bật "Nhận đơn", được chia | SRS §2.2 Telesale = `STAFF`; quản lý không bị chia đơn tự động |
| 21 | Ghi cuộc gọi đơn chưa chia | Tự giao cho người gọi | Tránh đơn đã gọi mà không ai phụ trách |
| 22 | Phạm vi xem | Ngoài phạm vi → 403 `DonCuaNguoiKhac` | TC-24; phân biệt với không tồn tại (404) |
| 23 | Chia lại | Không đổi `LastAssignedAt` | Vòng xoay BR-09 chỉ cho chia tự động |
| 24 | Sửa đơn khi xác nhận | Một request `calls` có `changes` | NFR-05 tối đa 3 thao tác |
| 25 | Hẹn gọi lại | Trong 7 ngày tới | Chặn nhập nhầm năm |
| 26 | Mã vận đơn | Đơn vị + `yyMMdd` + 4 số ngẫu nhiên (SRS ví dụ `GHTK2610124587`); seed dùng 10 số cuối mã đơn | Khớp ví dụ SRS; seed xác định |
| 27 | Xuất Excel | FE dựng file (`write-excel-file`) từ `export-rows` / dữ liệu báo cáo | BE không cần thư viện Excel; giống các demo trước |
| 28 | Ảnh chia sẻ | File tĩnh `/seed/og-landing.jpg` | Zalo, Facebook đọc JPG ổn định hơn WebP |
| 29 | Landing ở mock | Máy chủ trả seed gốc (SEO), trình duyệt gọi lại lấy dữ liệu localStorage | Máy chủ Next không đọc được localStorage |
| 30 | Giờ máy chủ ở mock | Route `app/server-time` của Next | TC-04 chạy được cả trên Vercel |
| 31 | Ngày nạp seed | Mock tự nạp lại khi sang ngày mới (giờ VN) | Người xem quay lại hôm sau vẫn có đơn hôm nay, đếm ngược còn hạn |
| 32 | Đánh giá hư cấu | `IsSample` + chữ "Minh họa", khối có dòng "dữ liệu minh họa" | NFR-06 |
| 33 | Nhật ký thao tác | Bảng `Sales_*` không ghi `System_AuditLogs` | Ghi rất nhiều; bản ghi đã chụp người, giờ |
| 34 | Ghi chú đơn | Mọi trạng thái, mọi người xem được đơn (`orders.view`) | BR-13 "chỉ thêm được ghi chú" |
| 35 | Combo mới khi đã đủ 4 combo hiện | Tạo ở trạng thái ẩn | BR-01 tối đa 4 hiển thị, không chặn việc chuẩn bị combo |
| 36 | Lỗi dữ liệu nhiều trường | `detail` = "Dữ liệu gửi lên không hợp lệ." (ExceptionMiddleware nền), một lỗi thì `detail` là chính câu đó; mock trả cùng câu. FE gắn `errors` vào ô có trên form, khóa khác hiện `detail` | BE và mock cùng một câu; lỗi không gắn được ô (vd `expectedPrice`) không bị nuốt |
| 37 | Cache `GET /api/public/landing` | `Cache-Control: no-cache`; cache 60 giây chỉ ở máy chủ Next khi render | `max-age=60` làm trình duyệt dùng bản cũ: sau 409 `GiaDaThayDoi` vẫn thấy giá cũ, quản lý sửa combo, khuyến mãi khách tải lại chưa thấy (TC-03, TC-34) |
| 38 | Khóa lỗi `changes` khi xác nhận | Không tiền tố (`customerName`, `province`, `address`, `comboId`, `quantity`), giống `PUT` | Ngăn xác nhận dùng chung ô với form sửa đơn |
| 39 | `OrderCallDto.callerId` | Có thể vắng (null khi tài khoản người gọi đã xóa); `callerName` luôn có | Cuộc gọi chụp tên người gọi |
| 40 | `TelesaleDto.openOrders` | Đơn Mới + Chờ gọi lại đang phụ trách (không gồm Đã xác nhận) | Số việc còn phải gọi khi chia lại đơn |
| 41 | Báo cáo thiếu `from`/`to` | Thiếu `to` → hôm nay; thiếu `from` → `to` − 6 ngày (7 ngày tới `to`); BE và mock như nhau | §2 "vắng → 7 ngày tới hôm nay"; không lọc một phía |
| 42 | Đơn đã hủy còn nhãn Trùng | Ngăn chi tiết không hiện khung "Có đơn cùng số", nút "Hủy đơn này (Đơn trùng)", "Không phải trùng" | Quyết định 16: nhãn chỉ để biết lý do hủy |
| 43 | Chi phí mỗi đơn xác nhận khi không có chi phí | `null` (hiện "—"), không phải 0 ₫; BE và mock như nhau | Nguồn tự nhiên (Trực tiếp) không có chi phí; "0 ₫/đơn" gây hiểu nhầm |
