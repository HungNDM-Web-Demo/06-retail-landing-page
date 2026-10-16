using Domain.Base;
using Domain.Entities.Sales;
using Domain.Enums.Cms.Catalog;
using Domain.Enums.Sales.Orders;

namespace Domain.Entities.Cms.Catalog;

/// <summary>Chương trình khuyến mãi, một dòng (06 §4 <c>Cms_Promotions</c>). Trạng thái suy ra lúc đọc (<see cref="PromotionClock"/>).</summary>
public class Promotion : BaseEntity, ICreationTracked, IModificationTracked
{
    public const int NameMax = 100;
    public const int AutoRenewMin = 1;
    public const int AutoRenewMax = 30;

    public string Name { get; private set; } = string.Empty;
    public DateTime StartAt { get; private set; }
    public DateTime EndAt { get; private set; }
    public int? AutoRenewDays { get; private set; }

    /// <summary>Khóa lạc quan, tăng 1 mỗi lần sửa.</summary>
    public int Version { get; private set; } = 1;

    public Guid? CreatedBy { get; set; }
    public Guid? UpdatedBy { get; set; }

    public static Promotion Create(string name, DateTime startAt, DateTime endAt, int? autoRenewDays)
    {
        var promotion = new Promotion();
        promotion.Apply(name, startAt, endAt, autoRenewDays);
        return promotion;
    }

    public void Update(string name, DateTime startAt, DateTime endAt, int? autoRenewDays)
    {
        Apply(name, startAt, endAt, autoRenewDays);
        Version++;
    }

    public DateTime EffectiveEndAt(DateTime now) => PromotionClock.EffectiveEndAt(EndAt, AutoRenewDays, now);

    public PromotionStatus StatusAt(DateTime now) => PromotionClock.Status(StartAt, EffectiveEndAt(now), now);

    public PriceType PriceTypeAt(DateTime now) => PromotionClock.PriceTypeAt(StartAt, EffectiveEndAt(now), now);

    private void Apply(string name, DateTime startAt, DateTime endAt, int? autoRenewDays)
    {
        Name = name.Trim();
        StartAt = startAt;
        EndAt = endAt;
        AutoRenewDays = autoRenewDays;
    }
}
