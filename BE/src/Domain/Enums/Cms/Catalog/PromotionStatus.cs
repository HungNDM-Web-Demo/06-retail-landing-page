namespace Domain.Enums.Cms.Catalog;

/// <summary>Trạng thái khuyến mãi, chỉ có trong DTO, suy ra lúc đọc (06 §4 Cms_Promotions, 07 §3.3).</summary>
public enum PromotionStatus
{
    SapChay = 0,
    DangChay = 1,
    DaKetThuc = 2
}
