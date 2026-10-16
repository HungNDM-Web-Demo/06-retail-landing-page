using Domain.Entities.Cms.Catalog;
using Domain.Entities.Sales.Marketing;
using Domain.Entities.Sales.Orders;
using Domain.Entities.Sales.Telesales;
using Domain.Entities.Sales.Tracking;
using Domain.Entities.System.Users;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations.Sales;

// Đơn, cuộc gọi, sự kiện, vận đơn, lượt truy cập, telesale, chi phí: Sales_* (06 §4). Không có navigation tới bảng xóa mềm
// (combo, tài khoản) để truy vấn không mất đơn cũ; tên combo, họ tên người làm đã chụp vào bản ghi.

public sealed class OrderConfiguration : IEntityTypeConfiguration<Order>
{
    public void Configure(EntityTypeBuilder<Order> builder)
    {
        builder.ToTable("Sales_Orders");
        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.Property(x => x.Code).HasMaxLength(Order.CodeMax).IsRequired();
        builder.Property(x => x.CustomerName).HasMaxLength(50).IsRequired();
        builder.Property(x => x.Phone).HasMaxLength(Order.PhoneMax).IsRequired();
        builder.Property(x => x.Province).HasMaxLength(Order.ProvinceMax).IsRequired();
        builder.Property(x => x.Address).HasMaxLength(200).IsRequired();
        builder.Property(x => x.Note).HasMaxLength(300);
        builder.Property(x => x.ComboCode).HasMaxLength(Combo.CodeMax).IsRequired();
        builder.Property(x => x.ComboName).HasMaxLength(Combo.NameMax).IsRequired();
        builder.Property(x => x.PlacedComboName).HasMaxLength(Combo.NameMax).IsRequired();
        builder.Property(x => x.UnitPrice).HasPrecision(18, 2);
        builder.Property(x => x.PlacedSubtotal).HasPrecision(18, 2);
        builder.Property(x => x.Subtotal).HasPrecision(18, 2);
        builder.Property(x => x.ShippingFee).HasPrecision(18, 2);
        builder.Property(x => x.Total).HasPrecision(18, 2);
        builder.Property(x => x.UpsellAmount).HasPrecision(18, 2);
        builder.Property(x => x.VisitorId).HasMaxLength(Order.VisitorIdMax);
        builder.Property(x => x.Source).HasMaxLength(50).IsRequired();
        builder.Property(x => x.Medium).HasMaxLength(Order.UtmMax);
        builder.Property(x => x.Campaign).HasMaxLength(Order.UtmMax);
        builder.Property(x => x.AdContent).HasMaxLength(Order.UtmMax);
        builder.Property(x => x.Referrer).HasMaxLength(Order.ReferrerMax);
        builder.Property(x => x.AssigneeName).HasMaxLength(Order.PersonNameMax);
        builder.Property(x => x.ConfirmedByName).HasMaxLength(Order.PersonNameMax);
        builder.Property(x => x.CancelNote).HasMaxLength(300);
        builder.Property(x => x.CancelledByName).HasMaxLength(Order.PersonNameMax);
        builder.Property(x => x.ReturnNote).HasMaxLength(300);
        builder.Property(x => x.ClientRequestId).HasMaxLength(Order.ClientRequestIdMax);

        // UC-03 E4: mọi thao tác đổi đơn gửi kèm version.
        builder.Property(x => x.Version).IsConcurrencyToken();

        builder.Ignore(x => x.IsConfirmedStatus);
        builder.Ignore(x => x.IsCounted);

        builder.HasIndex(x => x.Code).IsUnique();
        builder.HasIndex(x => x.ClientRequestId).IsUnique();
        builder.HasIndex(x => x.PlacedAt);
        builder.HasIndex(x => new { x.Phone, x.PlacedAt });
        builder.HasIndex(x => new { x.VisitorId, x.PlacedAt });
        builder.HasIndex(x => new { x.Source, x.PlacedAt });
        builder.HasIndex(x => new { x.AssigneeId, x.Status });
        builder.HasIndex(x => new { x.Status, x.PlacedAt });

        builder.HasOne<Combo>().WithMany().HasForeignKey(x => x.ComboId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<Combo>().WithMany().HasForeignKey(x => x.PlacedComboId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<Visit>().WithMany().HasForeignKey(x => x.VisitId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<User>().WithMany().HasForeignKey(x => x.AssigneeId).OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(x => x.Calls).WithOne().HasForeignKey(x => x.OrderId).OnDelete(DeleteBehavior.Restrict);
        builder.HasMany(x => x.Events).WithOne().HasForeignKey(x => x.OrderId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.Shipment).WithOne().HasForeignKey<Shipment>(x => x.OrderId).OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class OrderCallConfiguration : IEntityTypeConfiguration<OrderCall>
{
    public void Configure(EntityTypeBuilder<OrderCall> builder)
    {
        builder.ToTable("Sales_OrderCalls");
        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.Property(x => x.CallerName).HasMaxLength(Order.PersonNameMax).IsRequired();
        builder.Property(x => x.Note).HasMaxLength(OrderCall.NoteMax);
        builder.HasIndex(x => new { x.OrderId, x.CalledAt });
        builder.HasIndex(x => new { x.CallerId, x.CalledAt });
        builder.HasOne<User>().WithMany().HasForeignKey(x => x.CallerId).OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class OrderEventConfiguration : IEntityTypeConfiguration<OrderEvent>
{
    public void Configure(EntityTypeBuilder<OrderEvent> builder)
    {
        builder.ToTable("Sales_OrderEvents");
        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.Property(x => x.Content).HasMaxLength(OrderEvent.ContentMax).IsRequired();
        builder.Property(x => x.ActorName).HasMaxLength(Order.PersonNameMax);
        builder.HasIndex(x => new { x.OrderId, x.OccurredAt });
    }
}

public sealed class ShipmentConfiguration : IEntityTypeConfiguration<Shipment>
{
    public void Configure(EntityTypeBuilder<Shipment> builder)
    {
        builder.ToTable("Sales_Shipments");
        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.Property(x => x.TrackingCode).HasMaxLength(Shipment.TrackingCodeMax).IsRequired();
        builder.Property(x => x.CodAmount).HasPrecision(18, 2);
        builder.Property(x => x.HandedOverByName).HasMaxLength(Order.PersonNameMax).IsRequired();
        builder.HasIndex(x => x.OrderId).IsUnique();
        builder.HasIndex(x => x.TrackingCode).IsUnique();
        builder.HasIndex(x => x.DeliveredAt);
        builder.HasIndex(x => x.ReturnedAt);
    }
}

public sealed class VisitConfiguration : IEntityTypeConfiguration<Visit>
{
    public void Configure(EntityTypeBuilder<Visit> builder)
    {
        builder.ToTable("Sales_Visits");
        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.Property(x => x.VisitorId).HasMaxLength(Order.VisitorIdMax).IsRequired();
        builder.Property(x => x.Source).HasMaxLength(50).IsRequired();
        builder.Property(x => x.Medium).HasMaxLength(Order.UtmMax);
        builder.Property(x => x.Campaign).HasMaxLength(Order.UtmMax);
        builder.Property(x => x.AdContent).HasMaxLength(Order.UtmMax);
        builder.Property(x => x.Referrer).HasMaxLength(Order.ReferrerMax);
        builder.Property(x => x.Path).HasMaxLength(Visit.PathMax);
        builder.HasIndex(x => new { x.VisitorId, x.LastSeenAt });
    }
}

public sealed class VisitStatConfiguration : IEntityTypeConfiguration<VisitStat>
{
    public void Configure(EntityTypeBuilder<VisitStat> builder)
    {
        builder.ToTable("Sales_VisitStats");
        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.Property(x => x.Source).HasMaxLength(50).IsRequired();
        builder.Property(x => x.Campaign).HasMaxLength(Order.UtmMax).IsRequired();
        builder.HasIndex(x => new { x.HourStart, x.Source, x.Campaign }).IsUnique();
    }
}

public sealed class ConversionEventConfiguration : IEntityTypeConfiguration<ConversionEvent>
{
    public void Configure(EntityTypeBuilder<ConversionEvent> builder)
    {
        builder.ToTable("Sales_ConversionEvents");
        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.Property(x => x.VisitorId).HasMaxLength(Order.VisitorIdMax).IsRequired();
        builder.Property(x => x.Source).HasMaxLength(50).IsRequired();
        builder.Property(x => x.Campaign).HasMaxLength(Order.UtmMax);
        builder.Property(x => x.Value).HasPrecision(18, 2);
        builder.Property(x => x.PixelCall).HasMaxLength(ConversionEvent.PixelCallMax).IsRequired();
        builder.HasIndex(x => x.OccurredAt);
        builder.HasOne<Visit>().WithMany().HasForeignKey(x => x.VisitId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<Order>().WithMany().HasForeignKey(x => x.OrderId).OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class TelesaleStateConfiguration : IEntityTypeConfiguration<TelesaleState>
{
    public void Configure(EntityTypeBuilder<TelesaleState> builder)
    {
        builder.ToTable("Sales_TelesaleStates");
        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.HasIndex(x => x.UserId).IsUnique();
        builder.HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class AdCostConfiguration : IEntityTypeConfiguration<AdCost>
{
    public void Configure(EntityTypeBuilder<AdCost> builder)
    {
        builder.ToTable("Sales_AdCosts");
        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.Property(x => x.Source).HasMaxLength(AdCost.SourceMax).IsRequired();
        builder.Property(x => x.Campaign).HasMaxLength(AdCost.CampaignMax).IsRequired();
        builder.Property(x => x.Amount).HasPrecision(18, 2);
        builder.HasIndex(x => new { x.Date, x.Source, x.Campaign }).IsUnique();
    }
}
