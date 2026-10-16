using Application.DTOs.Orders;
using Application.DTOs.Public;
using Domain.Entities.Sales;
using Domain.Entities.Sales.Orders;
using Domain.Enums.Sales.Orders;

namespace Application.Mappings.Orders;

public static class OrderMappings
{
    /// <summary>Nhãn suy ra lúc đọc: Trùng, Rủi ro hoàn, Đến giờ gọi lại (BR-11, BR-14, BR-15).</summary>
    public static IReadOnlyList<OrderTag> TagsAt(this Order order, DateTime now)
    {
        var tags = new List<OrderTag>(3);
        if (order.IsDuplicate)
            tags.Add(OrderTag.Trung);
        if (order.IsReturnRisk)
            tags.Add(OrderTag.RuiRoHoan);
        if (order.IsDueCallback(now))
            tags.Add(OrderTag.DenGioGoiLai);
        return tags;
    }

    public static OrderListItem ToListItem(this Order o, DateTime now) => new()
    {
        Id = o.Id,
        Code = o.Code,
        PlacedAt = o.PlacedAt,
        CustomerName = o.CustomerName,
        Phone = o.Phone,
        Province = o.Province,
        ComboId = o.ComboId,
        ComboCode = o.ComboCode,
        ComboName = o.ComboName,
        Quantity = o.Quantity,
        Total = o.Total,
        Source = o.Source,
        Campaign = o.Campaign,
        AssigneeId = o.AssigneeId,
        AssigneeName = o.AssigneeName,
        Status = o.Status,
        Tags = o.TagsAt(now),
        NextCallAt = o.NextCallAt,
        FailedCallCount = o.FailedCallCount,
        UpsellAmount = o.UpsellAmount,
        Version = o.Version
    };

    /// <summary>Chi tiết đơn; <paramref name="related"/> đã sắp mới nhất trước, gồm cả đơn ngoài phạm vi xem.</summary>
    public static OrderDetailDto ToDetail(this Order o, DateTime now, IReadOnlyList<RelatedOrder> related, int returnedCount) => new()
    {
        Id = o.Id,
        Code = o.Code,
        PlacedAt = o.PlacedAt,
        CustomerName = o.CustomerName,
        Phone = o.Phone,
        Province = o.Province,
        ComboId = o.ComboId,
        ComboCode = o.ComboCode,
        ComboName = o.ComboName,
        Quantity = o.Quantity,
        Total = o.Total,
        Source = o.Source,
        Campaign = o.Campaign,
        AssigneeId = o.AssigneeId,
        AssigneeName = o.AssigneeName,
        Status = o.Status,
        Tags = o.TagsAt(now),
        NextCallAt = o.NextCallAt,
        FailedCallCount = o.FailedCallCount,
        UpsellAmount = o.UpsellAmount,
        Version = o.Version,
        Address = o.Address,
        Note = o.Note,
        PriceType = o.PriceType,
        UnitPrice = o.UnitPrice,
        BottleCount = o.BottleCount,
        PlacedComboName = o.PlacedComboName,
        PlacedQuantity = o.PlacedQuantity,
        PlacedSubtotal = o.PlacedSubtotal,
        Subtotal = o.Subtotal,
        ShippingFee = o.ShippingFee,
        Medium = o.Medium,
        AdContent = o.AdContent,
        Referrer = o.Referrer,
        Device = o.Device,
        AssignedAt = o.AssignedAt,
        ConfirmedAt = o.ConfirmedAt,
        ConfirmedByName = o.ConfirmedByName,
        CancelReason = o.CancelReason,
        CancelNote = o.CancelNote,
        CancelledAt = o.CancelledAt,
        CancelledByName = o.CancelledByName,
        ReturnReason = o.ReturnReason,
        ReturnNote = o.ReturnNote,
        Shipment = o.Shipment?.ToDto(),
        Calls = o.Calls.OrderByDescending(c => c.CalledAt).ThenByDescending(c => c.CreatedAt).Select(c => c.ToDto()).ToList(),
        Events = o.Events
            .OrderByDescending(e => e.OccurredAt).ThenByDescending(e => e.CreatedAt)
            .Select(e => e.ToDto()).ToList(),
        RelatedOrders = related,
        ReturnedCount = returnedCount,
        AsOf = now
    };

    public static OrderCallDto ToDto(this OrderCall c) => new()
    {
        Id = c.Id,
        CalledAt = c.CalledAt,
        CallerId = c.CallerId,
        CallerName = c.CallerName,
        Result = c.Result,
        CallbackAt = c.CallbackAt,
        CancelReason = c.CancelReason,
        Note = c.Note
    };

    public static OrderEventDto ToDto(this OrderEvent e) => new()
    {
        Id = e.Id,
        Type = e.Type,
        FromStatus = e.FromStatus,
        ToStatus = e.ToStatus,
        Content = e.Content,
        ActorName = e.ActorName,
        OccurredAt = e.OccurredAt
    };

    public static ShipmentDto ToDto(this Shipment s) => new()
    {
        Carrier = s.Carrier,
        TrackingCode = s.TrackingCode,
        CodAmount = s.CodAmount,
        HandedOverAt = s.HandedOverAt,
        HandedOverByName = s.HandedOverByName,
        DeliveredAt = s.DeliveredAt,
        ReturnedAt = s.ReturnedAt
    };

    public static PlacedOrderSummary ToSummary(this Order o)
    {
        var hour = SalesRules.ToVietnam(o.PlacedAt).Hour;
        return new PlacedOrderSummary
        {
            Code = o.Code,
            PlacedAt = o.PlacedAt,
            CustomerName = o.CustomerName,
            Phone = o.Phone,
            Province = o.Province,
            Address = o.Address,
            ComboName = o.ComboName,
            Quantity = o.Quantity,
            PriceType = o.PriceType,
            UnitPrice = o.UnitPrice,
            Subtotal = o.Subtotal,
            ShippingFee = o.ShippingFee,
            Total = o.Total,
            OutsideWorkingHours = hour < SalesRules.WorkingHourStart || hour >= SalesRules.WorkingHourEnd
        };
    }
}
