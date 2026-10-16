namespace Domain.Entities.Sales;

/// <summary>
/// Mã lỗi nghiệp vụ (<c>code</c> trong ProblemDetails) và câu thông báo đúng chữ của 07 §2.8; FE hiển thị nguyên văn.
/// </summary>
public static class SalesErrors
{
    public const string ComboDaThayDoi = nameof(ComboDaThayDoi);
    public const string ComboDaThayDoiMessage = "Combo đã thay đổi, vui lòng chọn lại";

    public const string DatHangQuaNhanh = nameof(DatHangQuaNhanh);
    public const string DatHangQuaNhanhMessage = "Bạn vừa đặt hàng, vui lòng chờ 60 giây nếu muốn đặt thêm";

    public const string QuaNhieuDonCungSo = nameof(QuaNhieuDonCungSo);
    public const string QuaNhieuDonCungSoMessage = "Số điện thoại này đã đặt nhiều đơn trong 24 giờ, vui lòng gọi hotline để được hỗ trợ";

    public const string GiaDaThayDoi = nameof(GiaDaThayDoi);
    public const string GiaDaThayDoiMessage = "Giá combo vừa thay đổi, vui lòng kiểm tra lại tổng tiền";

    public const string QuaNhieuYeuCau = nameof(QuaNhieuYeuCau);
    public const string QuaNhieuYeuCauMessage = "Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút";

    public const string DuLieuCu = nameof(DuLieuCu);
    public const string DuLieuCuMessage = "Dữ liệu vừa được người khác thay đổi, đang tải lại";

    public const string QuaSoComboHienThi = nameof(QuaSoComboHienThi);
    public const string QuaSoComboHienThiMessage = "Tối đa 4 combo hiển thị";

    public const string ComboMacDinhKhongAn = nameof(ComboMacDinhKhongAn);
    public const string ComboMacDinhKhongAnMessage = "Combo mặc định không ẩn hoặc xóa được, hãy chọn combo mặc định khác trước";

    public const string ComboDangAn = nameof(ComboDangAn);
    public const string ComboDangAnMessage = "Combo đang ẩn, hãy hiện combo trước khi đặt làm mặc định";

    public const string ComboDaCoDon = nameof(ComboDaCoDon);
    public const string ComboDaCoDonMessage = "Combo đã có đơn, không xóa được. Hãy dùng Ẩn";

    public const string KhoiBatBuoc = nameof(KhoiBatBuoc);

    public const string ThuTuKhoiKhongHopLe = nameof(ThuTuKhoiKhongHopLe);
    public const string ThuTuKhoiKhongHopLeMessage = "Banner chính luôn ở đầu, chân trang luôn ở cuối";

    public const string DonCuaNguoiKhac = nameof(DonCuaNguoiKhac);

    public const string KhongTimThayDon = nameof(KhongTimThayDon);
    public const string KhongTimThayDonMessage = "Không tìm thấy đơn hàng";

    public const string DonDaThayDoi = nameof(DonDaThayDoi);
    public const string DonDaThayDoiMessage = "Đơn đã thay đổi, vui lòng tải lại";

    public const string DonKhongChoGoi = nameof(DonKhongChoGoi);
    public const string DonKhongChoGoiMessage = "Chỉ ghi cuộc gọi cho đơn Mới hoặc Chờ gọi lại";

    public const string KhongSuaDonDaXacNhan = nameof(KhongSuaDonDaXacNhan);
    public const string KhongSuaDonDaXacNhanMessage = "Từ Đã xác nhận trở đi chỉ thêm được ghi chú";

    public const string DonDaCoNguoiNhan = nameof(DonDaCoNguoiNhan);

    public const string KhongHuyDonDaBanGiao = nameof(KhongHuyDonDaBanGiao);
    public const string KhongHuyDonDaBanGiaoMessage = "Không thể hủy đơn đã bàn giao vận chuyển";

    public const string DonDaHuy = nameof(DonDaHuy);
    public const string DonDaHuyMessage = "Đơn đã hủy";

    public const string KhongPhaiDonTrung = nameof(KhongPhaiDonTrung);
    public const string KhongPhaiDonTrungMessage = "Đơn không có nhãn Trùng";

    public const string DonChuaBanGiao = nameof(DonChuaBanGiao);
    public const string DonChuaBanGiaoMessage = "Đơn chưa ở trạng thái Đang giao";

    public const string KhongCoDonBanGiao = nameof(KhongCoDonBanGiao);
    public const string KhongCoDonBanGiaoMessage = "Không có đơn nào ở trạng thái Đã xác nhận";

    public const string KhongPhaiTelesale = nameof(KhongPhaiTelesale);
    public const string KhongPhaiTelesaleMessage = "Chỉ tài khoản Telesale mới bật nhận đơn";

    public static string KhoiBatBuocMessage(string blockName) => $"Khối {blockName} luôn hiển thị";

    public static string DonCuaNguoiKhacMessage(string? assigneeName) => $"Đơn đang do {assigneeName ?? "người khác"} phụ trách";

    public static string DonDaCoNguoiNhanMessage(string? assigneeName) => $"Đơn đã được chia cho {assigneeName ?? "người khác"}";
}
