namespace Domain.Enums.Sales.Orders;

/// <summary>Vòng đời đơn COD (SRS §5.2, 06 §4).</summary>
public enum OrderStatus
{
    Moi = 0,
    ChoGoiLai = 1,
    DaXacNhan = 2,
    DangGiao = 3,
    DaGiao = 4,
    HoanHang = 5,
    DaHuy = 6
}
