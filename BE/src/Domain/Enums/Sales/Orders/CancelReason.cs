namespace Domain.Enums.Sales.Orders;

/// <summary>Lý do hủy đơn (BR-16); hai giá trị cuối hệ thống tự gán.</summary>
public enum CancelReason
{
    KhachDoiY = 0,
    CheGiaCao = 1,
    DatNham = 2,
    DaMuaNoiKhac = 3,
    DonTrung = 4,
    Khac = 5,
    SaiSoDienThoai = 6,
    KhongLienLacDuoc = 7
}
