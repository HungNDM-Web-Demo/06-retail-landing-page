using Domain.Base;
using Domain.Entities.Cms.Catalog;
using Domain.Enums.Sales.Orders;

namespace Domain.Entities.Sales.Orders;

/// <summary>Người thao tác được chụp vào bản ghi (06 §3); <see cref="System"/> = Hệ thống.</summary>
public readonly record struct SalesActor(Guid? Id, string? Name)
{
    public static SalesActor System { get; } = new(null, null);
}

/// <summary>
/// Đơn hàng COD (06 §4 <c>Sales_Orders</c>). Chuyển trạng thái theo SRS §5.2, BR-10, BR-16; service và seeder dùng chung
/// các method này nên dữ liệu mẫu đi qua đúng quy tắc. Không xóa, không ghi nhật ký thao tác (bản ghi đã chụp người và giờ).
/// </summary>
public class Order : BaseEntity, ICreationTracked, IModificationTracked, IAuditLogExempt
{
    public const int CodeMax = 20;
    public const int PhoneMax = 10;
    public const int ProvinceMax = 50;
    public const int ClientRequestIdMax = 64;
    public const int VisitorIdMax = 64;
    public const int UtmMax = 100;
    public const int ReferrerMax = 200;
    public const int PersonNameMax = 150;

    /// <summary>Trạng thái "đã từng xác nhận" (BR-19).</summary>
    public static readonly IReadOnlyList<OrderStatus> ConfirmedStatuses =
        [OrderStatus.DaXacNhan, OrderStatus.DangGiao, OrderStatus.DaGiao, OrderStatus.HoanHang];

    /// <summary>Trạng thái còn hủy được (BR-16).</summary>
    public static readonly IReadOnlyList<OrderStatus> CancellableStatuses =
        [OrderStatus.Moi, OrderStatus.ChoGoiLai, OrderStatus.DaXacNhan];

    public string Code { get; private set; } = string.Empty;
    public DateTime PlacedAt { get; private set; }
    public string CustomerName { get; private set; } = string.Empty;
    public string Phone { get; private set; } = string.Empty;
    public string Province { get; private set; } = string.Empty;
    public string Address { get; private set; } = string.Empty;
    public string? Note { get; private set; }

    public Guid ComboId { get; private set; }
    public string ComboCode { get; private set; } = string.Empty;
    public string ComboName { get; private set; } = string.Empty;
    public int BottleCount { get; private set; }
    public int Quantity { get; private set; }
    public Guid PlacedComboId { get; private set; }
    public string PlacedComboName { get; private set; } = string.Empty;
    public int PlacedQuantity { get; private set; }

    public PriceType PriceType { get; private set; }
    public decimal UnitPrice { get; private set; }
    public decimal PlacedSubtotal { get; private set; }
    public decimal Subtotal { get; private set; }
    public decimal ShippingFee { get; private set; }
    public decimal Total { get; private set; }
    public decimal UpsellAmount { get; private set; }

    public string? VisitorId { get; private set; }
    public Guid? VisitId { get; private set; }
    public string Source { get; private set; } = string.Empty;
    public string? Medium { get; private set; }
    public string? Campaign { get; private set; }
    public string? AdContent { get; private set; }
    public string? Referrer { get; private set; }
    public DeviceType Device { get; private set; }

    public Guid? AssigneeId { get; private set; }
    public string? AssigneeName { get; private set; }
    public DateTime? AssignedAt { get; private set; }

    public OrderStatus Status { get; private set; } = OrderStatus.Moi;
    public int FailedCallCount { get; private set; }
    public DateTime? NextCallAt { get; private set; }
    public DateTime? ConfirmedAt { get; private set; }
    public Guid? ConfirmedById { get; private set; }
    public string? ConfirmedByName { get; private set; }

    public CancelReason? CancelReason { get; private set; }
    public string? CancelNote { get; private set; }
    public DateTime? CancelledAt { get; private set; }
    public Guid? CancelledById { get; private set; }
    public string? CancelledByName { get; private set; }

    public ReturnReason? ReturnReason { get; private set; }
    public string? ReturnNote { get; private set; }

    public bool IsDuplicate { get; private set; }
    public bool DuplicateCleared { get; private set; }
    public bool IsReturnRisk { get; private set; }

    public string? ClientRequestId { get; private set; }

    /// <summary>Khóa lạc quan, tăng 1 ở mỗi thao tác đổi đơn (UC-03 E4).</summary>
    public int Version { get; private set; } = 1;

    public Guid? CreatedBy { get; set; }
    public Guid? UpdatedBy { get; set; }

    public List<OrderCall> Calls { get; private set; } = [];
    public List<OrderEvent> Events { get; private set; } = [];
    public Shipment? Shipment { get; private set; }

    public bool IsConfirmedStatus => ConfirmedStatuses.Contains(Status);

    /// <summary>"Đơn tính": không bị hủy lý do Đơn trùng (BR-14).</summary>
    public bool IsCounted => !(Status == OrderStatus.DaHuy && CancelReason == Enums.Sales.Orders.CancelReason.DonTrung);

    public bool IsDueCallback(DateTime now) => Status == OrderStatus.ChoGoiLai && NextCallAt <= now;

    public static Order Place(
        string code, DateTime placedAt, string customerName, string phone, string province, string address, string? note,
        Combo combo, int quantity, PriceType priceType,
        string source, string? medium, string? campaign, string? adContent, string? referrer, DeviceType device,
        string? visitorId, Guid? visitId, string? clientRequestId)
    {
        var order = new Order
        {
            Code = code,
            PlacedAt = placedAt,
            CustomerName = customerName,
            Phone = phone,
            Province = province,
            Address = address,
            Note = string.IsNullOrWhiteSpace(note) ? null : note.Trim(),
            PriceType = priceType,
            PlacedComboId = combo.Id,
            PlacedComboName = combo.Name,
            PlacedQuantity = quantity,
            Source = source,
            Medium = medium,
            Campaign = campaign,
            AdContent = adContent,
            Referrer = referrer,
            Device = device,
            VisitorId = visitorId,
            VisitId = visitId,
            ClientRequestId = clientRequestId
        };
        order.SetItems(combo, quantity, combo.PriceOf(priceType));
        order.PlacedSubtotal = order.Subtotal;
        return order;
    }

    public void SetCode(string code) => Code = code;

    public void AssignTo(Guid userId, string fullName, DateTime at)
    {
        AssigneeId = userId;
        AssigneeName = fullName;
        AssignedAt = at;
    }

    /// <summary>
    /// Đổi combo, số lượng (BR-02, BR-13): tính lại theo mức giá đã chốt và giá hiện tại của combo mới. Không đổi gì thì giữ đơn
    /// giá đã chụp và trả null; có đổi thì trả câu "{cũ} → {mới}, tiền hàng …".
    /// </summary>
    public string? ChangeItems(Combo combo, int quantity)
    {
        if (combo.Id == ComboId && quantity == Quantity)
            return null;

        var (oldName, oldQuantity, oldSubtotal) = (ComboName, Quantity, Subtotal);
        SetItems(combo, quantity, combo.PriceOf(PriceType));
        return Sales.OrderEventTexts.ItemsChanged(oldName, oldQuantity, ComboName, Quantity, oldSubtotal, Subtotal);
    }

    /// <summary>Sửa họ tên, tỉnh, địa chỉ; trả các phần câu "đổi họ tên"… đã đổi.</summary>
    public List<string> ChangeCustomer(string customerName, string province, string address)
    {
        var parts = new List<string>();
        if (customerName != CustomerName)
        {
            CustomerName = customerName;
            parts.Add(Sales.OrderEventTexts.EditedName);
        }

        if (address != Address)
        {
            Address = address;
            parts.Add(Sales.OrderEventTexts.EditedAddress);
        }

        if (province != Province)
        {
            Province = province;
            parts.Add(Sales.OrderEventTexts.EditedProvince);
        }

        return parts;
    }

    /// <summary>Áp kết quả cuộc gọi (BR-10, 07 §3.7). Trả trạng thái trước, sau.</summary>
    public (OrderStatus From, OrderStatus To) ApplyCall(
        CallResult result, DateTime now, SalesActor caller, DateTime? callbackAt, CancelReason? cancelReason, string? note)
    {
        var from = Status;
        switch (result)
        {
            case CallResult.XacNhan:
                Status = OrderStatus.DaXacNhan;
                ConfirmedAt = now;
                ConfirmedById = caller.Id;
                ConfirmedByName = caller.Name;
                NextCallAt = null;
                UpsellAmount = Sales.OrderPricing.Upsell(Subtotal, PlacedSubtotal);
                break;

            case CallResult.KhongNgheMay or CallResult.ThueBao:
                FailedCallCount++;
                if (FailedCallCount >= Sales.SalesRules.MaxFailedCalls)
                    Cancel(Enums.Sales.Orders.CancelReason.KhongLienLacDuoc, null, now, SalesActor.System);
                else
                {
                    Status = OrderStatus.ChoGoiLai;
                    NextCallAt = now.AddMinutes(Sales.SalesRules.AutoCallbackMinutes);
                }

                break;

            case CallResult.HenGoiLai:
                Status = OrderStatus.ChoGoiLai;
                NextCallAt = callbackAt;
                break;

            case CallResult.SaiSo:
                Cancel(Enums.Sales.Orders.CancelReason.SaiSoDienThoai, null, now, caller);
                break;

            case CallResult.KhachHuy:
                Cancel(cancelReason ?? Enums.Sales.Orders.CancelReason.Khac, note, now, caller);
                break;
        }

        return (from, Status);
    }

    public void Cancel(CancelReason reason, string? note, DateTime now, SalesActor actor)
    {
        Status = OrderStatus.DaHuy;
        CancelReason = reason;
        CancelNote = string.IsNullOrWhiteSpace(note) ? null : note.Trim();
        CancelledAt = now;
        CancelledById = actor.Id;
        CancelledByName = actor.Name;
        NextCallAt = null;
    }

    public void MarkShipped() => Status = OrderStatus.DangGiao;

    public void MarkDelivered() => Status = OrderStatus.DaGiao;

    public void MarkReturned(ReturnReason reason, string? note)
    {
        Status = OrderStatus.HoanHang;
        ReturnReason = reason;
        ReturnNote = string.IsNullOrWhiteSpace(note) ? null : note.Trim();
    }

    public void MarkDuplicate()
    {
        IsDuplicate = true;
        DuplicateCleared = false;
    }

    /// <summary>Bỏ nhãn Trùng; <paramref name="byUser"/> = người bấm "Không phải trùng".</summary>
    public void ClearDuplicate(bool byUser)
    {
        IsDuplicate = false;
        if (byUser)
            DuplicateCleared = true;
    }

    public void MarkReturnRisk() => IsReturnRisk = true;

    public void Touch() => Version++;

    /// <summary>
    /// Thêm một dòng thời gian. Các dòng thêm liền nhau cùng một thời điểm được giãn 1 ms để dòng thời gian giữ đúng thứ tự
    /// (tạo đơn → SMS → nhãn → chia đơn) khi sắp theo giờ.
    /// </summary>
    public OrderEvent AddEvent(OrderEventType type, string content, SalesActor actor, DateTime at, OrderStatus? from = null, OrderStatus? to = null)
    {
        if (Events.Count > 0 && at <= Events[^1].OccurredAt)
            at = Events[^1].OccurredAt.AddMilliseconds(1);
        var ev = OrderEvent.Create(Id, type, content, actor, at, from, to);
        Events.Add(ev);
        return ev;
    }

    private void SetItems(Combo combo, int quantity, decimal unitPrice)
    {
        var amounts = Sales.OrderPricing.Calculate(unitPrice, quantity, combo.FreeShipping);
        ComboId = combo.Id;
        ComboCode = combo.Code;
        ComboName = combo.Name;
        BottleCount = combo.BottleCount;
        Quantity = quantity;
        UnitPrice = amounts.UnitPrice;
        Subtotal = amounts.Subtotal;
        ShippingFee = amounts.ShippingFee;
        Total = amounts.Total;
    }
}
