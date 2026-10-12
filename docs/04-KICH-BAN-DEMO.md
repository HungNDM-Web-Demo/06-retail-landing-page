# Kịch bản demo — Landing Page Bán hàng

> Dùng khi trình bày cho chủ shop bán một sản phẩm chủ lực, đang chạy quảng cáo Facebook, TikTok và chốt đơn COD qua telesale. Thời lượng 12–15 phút. Đi theo một ngày chạy quảng cáo: khách vào trang và đặt hàng, telesale gọi chốt, gửi hàng, chủ shop xem nguồn nào ra đơn thật.

---

## 1. Chuẩn bị trước buổi demo

- [ ] Mở sẵn link demo, thử "Đăng nhập nhanh" cả 3 vai trò
- [ ] Đặt lại dữ liệu demo (thanh công cụ demo → Đặt lại dữ liệu) để có 60 ngày đơn và lượt truy cập tính tới hôm nay
- [ ] Đổi tên shop, logo, màu theo thương hiệu khách (Cài đặt → Thương hiệu) nếu đã biết
- [ ] Mở landing trên điện thoại thật hoặc DevTools 390×844, dùng link giả lập quảng cáo: `http://localhost:3106/?utm_source=fb&utm_medium=cpc&utm_campaign=serum_t10`
- [ ] Mở thêm một cửa sổ ẩn danh để đặt đơn trùng ở bước 4
- [ ] Ghi nhớ dữ liệu mẫu: combo Mua 1 (390.000 ₫, phí ship 30.000 ₫), Mua 2 tặng 1 (740.000 ₫, miễn phí ship), Mua 3 (990.000 ₫, miễn phí ship); đơn mẫu của "Nguyễn Văn Nam" đã 2 lần không nghe máy; khách "Lê Thị Hoa" có 2 đơn hoàn
- [ ] Chuẩn bị số điện thoại demo chưa có trong dữ liệu mẫu, vd `0901000088`

| Link | Ghi chú |
| :--- | :--- |
| FE | `http://localhost:3106` hoặc link online |
| Swagger | `https://localhost:7106/swagger` (khi khách hỏi về tích hợp) |

| Tài khoản | Vai trò | Dùng để cho xem |
| :--- | :--- | :--- |
| `admin` | Quản trị viên | Phân quyền, thương hiệu, thông tin shop |
| `quanly` | Quản lý | Tổng quan, combo và khuyến mãi, chia đơn, xuất Excel, báo cáo theo nguồn |
| `nhanvien` | Telesale | Gọi xác nhận, upsell, xử lý đơn trùng, bàn giao vận chuyển, cập nhật giao hàng |

Mật khẩu: giá trị `DEMO_PASSWORD` trong `.env`, hoặc bấm "Đăng nhập nhanh". Landing page không cần đăng nhập.

---

## 2. Câu chuyện demo

> Mở đầu: "Anh/chị hình dung sáng nay shop đang chạy quảng cáo serum trên Facebook. Em đi đúng hành trình một khách bấm quảng cáo tới lúc shop thu được tiền, rồi xem lại cuối ngày quảng cáo nào thật sự có lãi."

| # | Vai trò | Thao tác | Điểm cần nhấn mạnh |
| :---: | :--- | :--- | :--- |
| 1 | Quản lý | Đăng nhập, mở Tổng quan: lượt truy cập, số đơn, tỉ lệ chuyển đổi, số đơn đang chờ gọi, tỉ lệ xác nhận hôm nay so với hôm qua | Sáng mở máy là biết quảng cáo hôm qua mang về bao nhiêu khách, bao nhiêu đơn chốt được |
| 2 | Khách | Trên điện thoại, mở link quảng cáo có UTM; cuộn qua banner có đồng hồ đếm ngược, hình trước và sau, đánh giá, câu hỏi thường gặp | Trang dài đủ thuyết phục, nút "Đặt hàng ngay" luôn nằm dưới ngón tay |
| 3 | Khách | Chọn combo Mua 1, form hiện tổng 420.000 ₫ (390.000 + 30.000 phí ship); điền tên, số `0901000088`, Hà Nội, địa chỉ; bấm Đặt hàng, sang trang cảm ơn có mã `LP…` | Form 4 ô, dưới một phút; đổi combo thấy tổng tiền đổi ngay |
| 4 | Khách | Ở cửa sổ ẩn danh, đặt thêm một đơn Mua 1 với cùng số điện thoại (khách tưởng chưa gửi được) | Chuyện xảy ra hằng ngày; xem hệ thống xử lý thế nào |
| 5 | Telesale | Đổi vai trò Telesale trên thanh công cụ demo; có thông báo đơn mới; tab Mới có 2 đơn mang nhãn "Trùng", cùng chia cho mình | Đơn tự chia đều cho telesale đang trực, không ai giành đơn, không ai gọi trùng khách |
| 6 | Telesale | Mở đơn, bấm "Hủy đơn trùng" ở đơn thứ hai | Đơn trùng không làm báo cáo đẹp giả, tỉ lệ chuyển đổi vẫn đúng |
| 7 | Telesale | Bấm số gọi khách; khách đồng ý lấy Mua 2 tặng 1: đổi combo, tổng thành 740.000 ₫, miễn phí ship, hệ thống hiện "Upsell +350.000 ₫"; bấm Xác nhận | Telesale chốt thêm ngay trong cuộc gọi, công upsell được ghi lại để tính thưởng |
| 8 | Telesale | Mở đơn mẫu của "Nguyễn Văn Nam" (đã 2 lần không nghe máy), ghi "Không nghe máy" lần 3, đơn tự hủy "Không liên lạc được"; mở đơn Chờ gọi lại của "Lê Thị Hoa" thấy nhãn đỏ "Rủi ro hoàn" | Quy trình gọi lại rõ ràng, không bỏ sót, không gọi mãi; biết trước khách hay bom hàng |
| 9 | Telesale | Tab Đã xác nhận: chọn nhiều đơn, bàn giao GHTK (giả lập), mỗi đơn có mã vận đơn, tiền thu hộ; tab Đang giao: một đơn "Đã giao", một đơn "Hoàn hàng" lý do "Khách từ chối nhận" | Gửi hàng cả buổi một lần bấm; biết chính xác đơn nào đã thành tiền |
| 10 | Quản lý | Đổi sang Quản lý; Báo cáo tab Nguồn: so facebook với tiktok về tỉ lệ chuyển đổi, tỉ lệ xác nhận, tỉ lệ hoàn, doanh thu đã giao; mở facebook xuống chiến dịch `serum_t10` | Biết kênh nào ra đơn thật chứ không chỉ ra nhiều đơn ảo; đủ số liệu để tăng hay cắt ngân sách |
| 11 | Quản lý | Tab Telesale: tỉ lệ xác nhận, số đơn upsell, giá trị upsell từng người; tab Combo: Mua 2 tặng 1 chiếm bao nhiêu đơn | Có căn cứ tính thưởng telesale và chọn combo đẩy mạnh |
| 12 | Quản lý | Mở Combo: dời thời điểm kết thúc khuyến mãi sang 23:59 chủ nhật, đổi combo mặc định; mở lại landing thấy đồng hồ và combo đổi theo; xuất Excel đơn Đã xác nhận | Tự đổi chương trình mà không cần gọi người làm web; file gửi kho theo đúng mẫu nhà vận chuyển |

> Kết: "Toàn bộ dữ liệu anh/chị vừa thấy là dữ liệu mẫu. Bản triển khai sẽ dùng sản phẩm, hình ảnh, tên miền của shop mình, gắn pixel quảng cáo thật và nối với đơn vị vận chuyển shop đang dùng."

---

## 3. Câu hỏi khách hay hỏi

| Câu hỏi | Trả lời gợi ý |
| :--- | :--- |
| Có gắn Facebook Pixel, TikTok Pixel, Google Ads được không? | Demo chỉ ghi nhật ký sự kiện giả lập. Bản triển khai gắn pixel và Conversion API để quảng cáo tối ưu theo đơn thật. |
| Báo cáo có trừ đơn ảo, đơn trùng không? | Có. Đơn hủy lý do "Đơn trùng" không tính vào số đơn và tỉ lệ chuyển đổi; báo cáo nguồn có cả tỉ lệ xác nhận và tỉ lệ hoàn, không chỉ số đơn đổ về. |
| Telesale gọi trên web, có ghi âm không? | Demo bấm số để gọi bằng điện thoại. Bản triển khai có thể nối tổng đài ảo để gọi trên web, ghi âm và tự lưu thời lượng cuộc gọi. |
| Đơn có tự đẩy sang GHTK, Viettel Post không? | Demo giả lập mã vận đơn và có xuất Excel theo mẫu. Bản triển khai nối API để tạo vận đơn và cập nhật trạng thái giao tự động. |
| Có báo đơn mới qua Zalo, Telegram, Google Sheet không? | Demo báo ngay trong trang quản lý kèm âm báo. Bản triển khai có thể gửi thêm qua Zalo OA, Telegram hoặc ghi ra Google Sheet. |
| Bán nhiều sản phẩm thì sao? | Demo một sản phẩm một trang. Bản triển khai nhân bản landing cho từng sản phẩm, đơn và báo cáo gom chung một chỗ. |
| Có chống đơn rác, đối thủ phá không? | Có kiểm tra số điện thoại, chặn gửi lặp trong 60 giây, gắn nhãn đơn trùng. Bản triển khai thêm captcha ẩn và chặn theo IP. |
| Có đúng quy định quảng cáo mỹ phẩm không? | Nội dung mẫu không đưa cam kết chữa bệnh, đếm ngược theo thời hạn thật. Nội dung triển khai do shop cung cấp và chịu trách nhiệm theo hồ sơ công bố sản phẩm. |
| Tự sửa nội dung trang được không? | Bản demo cho sửa combo, giá, thời gian khuyến mãi; sửa từng khối nội dung là phần làm thêm. Bản triển khai có trình sửa khối đầy đủ. |

---

## 4. Sau buổi demo

- [ ] Ghi lại yêu cầu khách nêu thêm vào `01-TONG-QUAN-NGHIEP-VU.md`
- [ ] Ghi lại sản phẩm, các combo đang bán, số đơn mỗi ngày, số telesale, kênh quảng cáo và đơn vị vận chuyển khách đang dùng
- [ ] Gửi link demo và tài khoản `nhanvien`, `quanly` cho khách tự trải nghiệm (nếu đồng ý)
