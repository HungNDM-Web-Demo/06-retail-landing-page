# Kịch bản kiểm thử nghiệm thu — Landing Page Bán hàng

> Test case theo use case trong `03-USE-CASE.md`. Phần nền (đăng nhập, phân quyền, đặt lại dữ liệu) dùng TC-SYS-01 đến TC-SYS-10 trong `ZDOCS/03-KIEN-TRUC/USE-CASE-NEN.md` §8.

---

## 1. Cách chạy

| Mục | Nội dung |
| :--- | :--- |
| Môi trường | Chạy cả hai chế độ: dữ liệu mẫu (`mock`) và BE thật (`api`) |
| Dữ liệu | Đặt lại dữ liệu demo trước mỗi lượt test |
| Thứ tự | Chạy theo thứ tự mã TC; một số TC dùng đơn tạo ở TC trước. TC đổi thời gian khuyến mãi hoặc trạng thái nhận đơn có bước trả lại như cũ ở cuối |
| Tài khoản | Khách: không đăng nhập. Telesale dùng `nhanvien`, Quản lý dùng `quanly`, qua "Đăng nhập nhanh" |
| Thiết bị | TC vai trò Khách chạy ở cửa sổ 390×844; TC quản trị chạy ở 1366×768 |
| Đạt | Kết quả thực tế khớp toàn bộ cột "Kết quả mong đợi" |

Dữ liệu mẫu dùng trong test:

- Sản phẩm "Serum Rau Má Phục Hồi 30 ml".
- Combo `C01` "Mua 1": 1 chai; giá khuyến mãi 390.000 ₫, giá thường 450.000 ₫; không miễn phí vận chuyển.
- Combo `C02` "Mua 2 tặng 1": 2 chai, tặng 1 sữa rửa mặt Rau Má 100 ml; giá khuyến mãi 740.000 ₫, giá thường 900.000 ₫; miễn phí vận chuyển; combo mặc định, nhãn "Bán chạy nhất".
- Combo `C03` "Mua 3": 3 chai, tặng 1 sữa rửa mặt; giá khuyến mãi 990.000 ₫, giá thường 1.350.000 ₫; miễn phí vận chuyển; nhãn "Tiết kiệm nhất".
- Chương trình khuyến mãi: bắt đầu 7 ngày trước, kết thúc 23:59:59 ngày kia (tính từ lúc đặt lại dữ liệu), tự gia hạn 3 ngày kể từ ngày hôm sau ngày kết thúc (BR-20).
- Phí vận chuyển 30.000 ₫ mỗi đơn; miễn phí khi combo miễn phí vận chuyển hoặc tiền hàng ≥ 500.000 ₫.
- Telesale: `nhanvien` đang bật "Nhận đơn"; "Phạm Thu Hằng", "Đỗ Minh Tuấn" đang tắt.
- Khách "Lê Thị Hoa" `0987654321`: 2 đơn Hoàn hàng, 1 đơn Chờ gọi lại đặt cách đây 30 giờ, phụ trách `nhanvien`.
- Đơn mẫu của "Nguyễn Văn Nam" `0912000111`: Chờ gọi lại, đã 2 lần "Không nghe máy", phụ trách `nhanvien`.
- Số điện thoại test `0901000001` đến `0901000019` chưa có trong dữ liệu mẫu.
- Chế độ `mock` (bản online không có BE): các bước ghi "trình duyệt A, B" hoặc "cửa sổ ẩn danh mới" chạy bằng tab mới cùng trình duyệt với `?visitor=2`, `?visitor=3`… (mỗi số là một trình duyệt giả lập, `07-DANH-SACH-API.md` §4.2), vì cửa sổ ẩn danh không thấy dữ liệu mẫu của trình duyệt đang đăng nhập.

---

## 2. Test case

### 2.1. Landing page

| Mã | UC | Tình huống | Vai trò | Các bước | Kết quả mong đợi |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-01 | UC-01 | Combo và đồng hồ hiển thị đúng | Khách | 1. Mở `/` 2. Cuộn tới khối combo | Đồng hồ hiện "N ngày hh:mm:ss" đếm tới 23:59:59 ngày kia; `C02` được chọn sẵn, giá 740.000 ₫, gạch 900.000 ₫, "370.000 ₫/chai", "Miễn phí vận chuyển", nhãn "Bán chạy nhất"; `C03` hiện "330.000 ₫/chai"; `C01` hiện "Phí vận chuyển 30.000 ₫" |
| TC-02 | UC-01 | Nút đặt hàng cố định | Khách | 1. Cuộn tới khối đánh giá 2. Bấm "Đặt hàng ngay" ở cuối màn hình | Nút luôn hiển thị khi cuộn; bấm vào trang cuộn tới khối combo |
| TC-03 | UC-01 | Hết thời gian khuyến mãi | Quản lý, Khách | 1. Quản lý đặt thời điểm kết thúc là 1 phút trước 2. Khách tải lại landing, chọn `C01` 3. Quản lý đặt lại kết thúc 23:59:59 ngày kia | Bước 2 không còn đồng hồ; `C01` giá 450.000 ₫, không có giá gạch; tổng 480.000 ₫ (450.000 + 30.000 vì tiền hàng < 500.000 ₫). Bước 3 đồng hồ hiện lại |
| TC-04 | UC-01 | Đồng hồ theo giờ máy chủ | Khách | 1. Ghi lại thời gian còn lại 2. Chỉnh đồng hồ máy khách sớm hơn 1 ngày, tải lại trang | Thời gian còn lại không tăng thêm 1 ngày, chỉ giảm theo thời gian thực |

### 2.2. Đặt hàng

| Mã | UC | Tình huống | Vai trò | Các bước | Kết quả mong đợi |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-05 | UC-02 | Đặt combo có phí vận chuyển | Khách | 1. Chọn `C01`, số lượng 1 2. Nhập tên "Trần Thu Trang", số `0901000001`, Hà Nội, địa chỉ "Số 12 ngõ 45 Trần Duy Hưng" 3. Đặt hàng | Tổng 420.000 ₫ (390.000 + 30.000); chuyển tới `/cam-on` có mã `LP{yyMMdd}{nnnn}`; đơn Mới, phụ trách `nhanvien`; dòng thời gian có "Đã gửi SMS xác nhận (giả lập)" |
| TC-06 | UC-02 | Tiền hàng đủ mức miễn phí vận chuyển | Khách | 1. Chọn `C01`, số lượng 2, số `0901000007` 2. Đặt hàng | Tiền hàng 780.000 ₫ ≥ 500.000 ₫ nên phí 0 ₫; tổng 780.000 ₫ |
| TC-07 | UC-02 | Combo lớn nhiều suất | Khách | 1. Chọn `C03`, số lượng 2, số `0901000008` 2. Đặt hàng | Tổng 1.980.000 ₫, phí 0 ₫ |
| TC-08 | UC-02 | Dữ liệu form sai | Khách | 1. Số `0212345678` 2. Số `09123` 3. Tên "Anh 123" 4. Địa chỉ "Q1" 5. Số `+84912345678` | Bước 1–4 báo lỗi dưới từng ô, không tạo đơn, dữ liệu giữ nguyên; bước 5 hợp lệ, ô hiển thị `0912345678` |
| TC-09 | UC-02 | Gửi lặp | Khách | 1. Số `0901000013`, bấm "Đặt hàng" hai lần thật nhanh 2. Quay lại landing, đặt đơn khác ngay trong 60 giây | Bước 1 chỉ tạo một đơn; bước 2 hiện "Bạn vừa đặt hàng, vui lòng chờ 60 giây nếu muốn đặt thêm", không tạo đơn |
| TC-10 | UC-02 | Ghi nhận UTM (P2) | Khách, Telesale | 1. Mở `/?utm_source=FB&utm_medium=cpc&utm_campaign=serum_t10&utm_content=video_a` 2. Đặt `C02`, số `0901000002` 3. Telesale mở đơn | Đơn có nguồn `facebook`, kênh `cpc`, chiến dịch `serum_t10`, nội dung `video_a` |
| TC-11 | UC-02 | Nguồn trực tiếp và lần truy cập gần nhất (P2) | Khách | 1. Cửa sổ ẩn danh mới, mở `/` không có UTM, đặt `C01` số `0901000011` 2. Cũng cửa sổ đó, sau 60 giây mở `/?utm_source=tt`, đặt `C01` số `0901000012` | Đơn bước 1 nguồn "Trực tiếp"; đơn bước 2 nguồn `tiktok` |

### 2.3. Gọi xác nhận

| Mã | UC | Tình huống | Vai trò | Các bước | Kết quả mong đợi |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-12 | UC-03 | Upsell khi xác nhận | Telesale | 1. Mở đơn TC-05 (`C01` × 1, 420.000 ₫) 2. Đổi sang `C02` 3. Bấm "Xác nhận" | Tiền hàng 740.000 ₫, phí 0 ₫, tổng 740.000 ₫; hiện "Upsell +350.000 ₫"; đơn Đã xác nhận, lưu tiền hàng lúc đặt 390.000 ₫ và lúc xác nhận 740.000 ₫; lịch sử có 1 cuộc gọi |
| TC-13 | UC-03 | Xác nhận giữ nguyên combo | Telesale | 1. Mở đơn TC-06 2. Bấm "Xác nhận" | Đơn Đã xác nhận, tổng 780.000 ₫, không ghi upsell |
| TC-14 | UC-03 | Không nghe máy lần đầu | Telesale | 1. Mở đơn TC-07 2. Chọn "Không nghe máy" | Đơn Chờ gọi lại, giờ hẹn bằng giờ hiện tại + 2 giờ, số lần không liên lạc được 1 |
| TC-15 | UC-03 | Không liên lạc được lần thứ 3 | Telesale | 1. Mở đơn của "Nguyễn Văn Nam" 2. Chọn "Không nghe máy" | Đơn tự chuyển Đã hủy, lý do "Không liên lạc được", lịch sử có 3 cuộc gọi |
| TC-16 | UC-03 | Sai số, khách hủy thiếu lý do | Telesale | 1. Mở đơn TC-10, chọn "Khách hủy", chưa chọn lý do 2. Mở đơn TC-11 thứ nhất (`0901000011`), chọn "Sai số" | Bước 1 nút lưu khóa, đơn giữ nguyên; bước 2 đơn Đã hủy, lý do "Sai số điện thoại" |
| TC-17 | UC-03 | Giữ giá khuyến mãi khi đổi combo sau khi khuyến mãi kết thúc | Khách, Quản lý, Telesale | 1. Khách đặt `C01` × 1, số `0901000003` (420.000 ₫) 2. Quản lý đặt kết thúc khuyến mãi là 1 phút trước 3. Telesale mở đơn, đổi sang `C03`, bấm "Xác nhận" 4. Quản lý đặt lại kết thúc 23:59:59 ngày kia | Bước 3 tiền hàng 990.000 ₫ (giá khuyến mãi, không phải 1.350.000 ₫), phí 0 ₫, "Upsell +600.000 ₫", đơn Đã xác nhận |
| TC-18 | UC-03 | Khách có lịch sử hoàn hàng | Khách, Telesale | 1. Khách đặt `C02` với số `0987654321` 2. Telesale mở đơn | Đơn có nhãn "Rủi ro hoàn", không có nhãn "Trùng" (đơn cũ đặt hơn 24 giờ); ngăn chi tiết cảnh báo đỏ, liệt kê 2 đơn Hoàn hàng cũ |
| TC-19 | UC-03 | Hẹn gọi lại tới giờ | Telesale | 1. Mở đơn TC-07 (Chờ gọi lại), chọn "Hẹn gọi lại" lúc giờ hiện tại + 1 phút 2. Chờ 1 phút, tải lại danh sách | Đơn có nhãn "Đến giờ gọi lại", nằm đầu tab Chờ gọi lại; thẻ "Đến giờ gọi lại" ở Tổng quan tăng 1 |

### 2.4. Đơn trùng và danh sách đơn

| Mã | UC | Tình huống | Vai trò | Các bước | Kết quả mong đợi |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-20 | UC-04 | Hủy đơn trùng | Khách, Telesale, Quản lý | 1. Quản lý ghi lại số đơn hôm nay 2. Khách đặt `C01` số `0901000004` ở trình duyệt A, rồi `C02` cùng số ở trình duyệt B 3. Telesale hủy đơn `C01` bằng "Hủy đơn trùng" 4. Quản lý xem lại Tổng quan | Sau bước 2 cả hai đơn có nhãn "Trùng", cùng phụ trách `nhanvien`; sau bước 3 đơn `C01` Đã hủy lý do "Đơn trùng", đơn `C02` mất nhãn; bước 4 số đơn hôm nay chỉ tăng 1 |
| TC-21 | UC-04 | Không phải trùng, đơn cũ đã hủy | Khách, Telesale | 1. Khách đặt `C01` với số `0912000111` (đơn cũ đã hủy ở TC-15) 2. Khách đặt 2 đơn số `0901000005` từ 2 trình duyệt 3. Telesale bấm "Không phải trùng" ở một đơn | Bước 1 không có nhãn "Trùng"; sau bước 3 cả hai đơn `0901000005` mất nhãn, cùng được tính vào số đơn |
| TC-22 | UC-05 | Tìm và lọc đơn | Telesale | 1. Tìm `0901000001` 2. Lọc nguồn `facebook` 3. Xem tab Mới | Bước 1 ra đơn TC-05; bước 2 chỉ còn đơn nguồn `facebook`, có đơn TC-10; số trên tab Mới bằng số dòng trong tab |
| TC-23 | UC-05 | Giới hạn của telesale | Telesale | 1. Xem thanh công cụ danh sách đơn 2. Gõ thẳng URL `/admin/reports` | Không có nút "Xuất Excel", "Chia lại"; bước 2 chuyển tới `/forbidden` |
| TC-24 | UC-06 | Chia đơn và chia lại (P2) | Telesale, Quản lý, Khách | 1. `nhanvien` tắt "Nhận đơn" 2. Khách đặt `C01` số `0901000014` 3. `nhanvien` bấm "Nhận đơn" ở đơn đó 4. Quản lý chia lại đơn cho "Phạm Thu Hằng" 5. `nhanvien` bật lại "Nhận đơn" | Bước 2 đơn chưa chia, telesale nào cũng thấy; bước 3 đơn về `nhanvien`; bước 4 `nhanvien` không còn thấy đơn, dòng thời gian ghi "Chia cho Phạm Thu Hằng" |

### 2.5. Giao hàng và hủy đơn

| Mã | UC | Tình huống | Vai trò | Các bước | Kết quả mong đợi |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-25 | UC-07 | Bàn giao nhiều đơn, có đơn sai trạng thái | Telesale | 1. Chọn đơn TC-12, TC-13 (Đã xác nhận) và một đơn Mới 2. Bàn giao, chọn GHTK | Báo "Đã bàn giao 2 đơn, bỏ qua 1 đơn không ở trạng thái Đã xác nhận"; 2 đơn Đang giao, mã vận đơn `GHTK` + 10 số, tiền thu hộ 740.000 ₫ và 780.000 ₫; đơn Mới giữ nguyên |
| TC-26 | UC-07 | Thiếu đơn vị vận chuyển, xuất Excel (P2) | Telesale, Quản lý | 1. Telesale chọn một đơn Đã xác nhận, mở "Bàn giao", chưa chọn đơn vị 2. Quản lý lọc tab Đang giao hôm nay, bấm "Xuất Excel" | Bước 1 nút "Bàn giao" khóa; bước 2 file có đủ đơn trong bộ lọc, cột tên, số điện thoại, địa chỉ, tỉnh/thành, nội dung hàng, tiền thu hộ, ghi chú; tiền thu hộ khớp tổng tiền đơn |
| TC-27 | UC-08 | Giao thành công | Khách, Telesale, Quản lý | 1. Quản lý ghi lại doanh thu đã giao hôm nay 2. Khách đặt `C01` × 1, số `0901000006` (420.000 ₫) 3. Telesale xác nhận, bàn giao GHN, bấm "Đã giao" 4. Quản lý mở báo cáo hôm nay | Đơn Đã giao; doanh thu đã giao tăng 390.000 ₫ (không gồm 30.000 ₫ phí vận chuyển) |
| TC-28 | UC-08 | Hoàn hàng | Telesale | 1. Mở đơn TC-13 (Đang giao), bấm "Hoàn hàng", chưa chọn lý do 2. Chọn "Khách từ chối nhận" | Bước 1 nút xác nhận khóa; bước 2 đơn Hoàn hàng, lý do lưu trên dòng thời gian |
| TC-29 | UC-09 | Hủy đơn đã xác nhận | Telesale | 1. Xác nhận đơn TC-18 2. Bấm "Hủy đơn", chưa chọn lý do 3. Chọn "Khách đổi ý" | Bước 2 nút xác nhận khóa; bước 3 đơn Đã hủy, ghi người hủy `nhanvien` và lý do |
| TC-30 | UC-09 | Không hủy được đơn đang giao | Telesale | 1. Mở đơn TC-12 (Đang giao) 2. Chế độ `api`: gọi API hủy đơn đó | Không có nút "Hủy đơn"; API trả lỗi "Không thể hủy đơn đã bàn giao vận chuyển" |
| TC-31 | UC-04 | Đơn trùng với đơn đã bàn giao | Khách, Telesale | 1. Khách đặt `C01` với số `0901000001` (đơn TC-12 của số này đang Đang giao) 2. Telesale mở đơn mới, xem các đơn cùng số | Cả hai đơn có nhãn "Trùng", đơn mới chia cho `nhanvien`; đơn Đang giao không có nút "Hủy đơn trùng"; telesale chỉ hủy được đơn mới với lý do "Đơn trùng" hoặc bấm "Không phải trùng" |

### 2.6. Tổng quan, combo, báo cáo

| Mã | UC | Tình huống | Vai trò | Các bước | Kết quả mong đợi |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-32 | UC-10 | Tổng quan cập nhật theo lượt và đơn mới | Quản lý, Khách | 1. Ghi lại lượt truy cập, số đơn, đơn chờ gọi 2. Mở landing ở 2 cửa sổ ẩn danh mới, đặt `C02` ở một cửa sổ, số `0901000010` 3. Tải lại Tổng quan | Lượt truy cập tăng 2, số đơn tăng 1, đơn chờ gọi tăng 1; tỉ lệ chuyển đổi bằng số đơn / lượt truy cập × 100, làm tròn 2 chữ số |
| TC-33 | UC-10 | Tổng quan của telesale | Telesale | 1. Sau TC-12, đăng nhập nhanh vai trò Telesale | Có thẻ đơn chờ gọi, đến giờ gọi lại, đã xác nhận hôm nay, upsell hôm nay có ít nhất 350.000 ₫ từ TC-12; không có lượt truy cập, tỉ lệ chuyển đổi, doanh thu toàn shop |
| TC-34 | UC-11 | Sửa combo (P2) | Quản lý, Khách | 1. Sửa giá khuyến mãi `C01` thành 460.000 ₫ (lớn hơn giá thường 450.000 ₫) 2. Sửa thành 389.500 ₫ 3. Chọn `C03` làm combo mặc định, lưu 4. Khách tải lại landing | Bước 1, 2 báo lỗi, không lưu; bước 3 `C02` tự bỏ mặc định; bước 4 `C03` được chọn sẵn |
| TC-35 | UC-12 | Báo cáo theo nguồn (P2) | Khách, Quản lý | 1. Mở `/?utm_source=demo_test` ở 4 cửa sổ ẩn danh mới 2. Đặt `C01` từ một cửa sổ, số `0901000009` 3. Quản lý mở Báo cáo, tab Nguồn, Hôm nay | Nguồn `demo_test`: 4 lượt truy cập, 1 đơn, tỉ lệ chuyển đổi 25,00% |
| TC-36 | UC-12 | Báo cáo telesale và đơn trùng (P2) | Quản lý | 1. Sau TC-12, TC-17, TC-20, mở tab Telesale, Hôm nay 2. Mở tab Theo ngày | Dòng `nhanvien` có số đơn upsell và giá trị upsell gồm đơn TC-12 (+350.000 ₫) và TC-17 (+600.000 ₫), tổng 950.000 ₫ từ hai đơn này; bấm vào ô số đơn upsell thấy cả hai đơn. Đơn hủy "Đơn trùng" ở TC-20 không tính vào số đơn và tỉ lệ hủy |

---

## 3. Biên bản chạy thử

| Ngày | Người test | Chế độ | Số TC đạt / tổng | Lỗi ghi nhận |
| :--- | :--- | :--- | :---: | :--- |
| 15/10/2026 | Claude (kiểm thử tự động trên trình duyệt) | `api` (BE thật trên Postgres, đặt lại dữ liệu trước khi chạy) | 34 / 36 | Đạt TC-01, TC-03, TC-05 → TC-36; landing chạy ở 390×844, quản trị 1366×768; đăng nhập bằng form `admin`, `quanly`, `nhanvien` vào `/dashboard`; thẻ "Xem landing page" ở trang đăng nhập; đơn mới hiện sau lần làm mới 30 giây; 429 đặt quá nhanh, gửi lại cùng `clientRequestId`, `GiaDaThayDoi`, `ComboDaThayDoi`, tự gia hạn khuyến mãi; số 59 ngày khớp `06` §5.7. Chưa kiểm ở `api`: TC-02 (khung trình duyệt kiểm thử không vẽ khung hình nên không bắt được sự kiện cuộn), TC-04 (không đổi được đồng hồ máy). Lỗi đã sửa: (1) BE `GET /api/public/landing` trả `max-age=60` nên sau 409 `GiaDaThayDoi` và sau khi quản lý sửa khuyến mãi, combo khách vẫn thấy giá cũ → `no-cache`; (2) BE khóa lỗi `changes.*` khi xác nhận kèm sửa đơn → không tiền tố như `PUT` (thêm test); (3) FE form sửa khối nội dung không lưu được vì BE trả `null` cho trường trống; (4) FE form đặt hàng nuốt lỗi có khóa lạ → chỉ gắn vào ô có trên form, còn lại hiện thông báo; (5) FE `callerId` cho phép vắng; mock `openOrders` chỉ đếm Mới + Chờ gọi lại; mock "chi phí mỗi đơn xác nhận" trả null khi không có chi phí; mock lỗi nhiều trường dùng câu của BE; ẩn thao tác đơn trùng trên đơn đã hủy |
| 15/10/2026 | Claude (kiểm thử tự động trên trình duyệt) | `mock` (kiểm lại phần đã sửa, đặt lại dữ liệu demo) | 3 / 3 | Đạt TC-05, TC-09, TC-10; thêm: báo cáo `from = hôm nay − 59`, `to = hôm nay − 1` ra 589 đơn, tỉ lệ xác nhận 75,2%, facebook 319, `nhanvien` 290 được chia, 77,9% (khớp BE); "Trực tiếp" hiện "—" ở chi phí mỗi đơn xác nhận như BE; lưu khối nội dung được. Không có lỗi mới |
