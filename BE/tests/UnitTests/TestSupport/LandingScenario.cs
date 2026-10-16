using Application.DTOs.Orders;
using Application.DTOs.Public;
using Application.Interfaces.Services.Orders;
using Application.Interfaces.Services.Public;
using Domain.Entities.Cms.Catalog;
using Domain.Entities.Sales.Orders;
using Domain.Enums.Sales.Orders;
using Microsoft.EntityFrameworkCore;

namespace UnitTests.TestSupport;

/// <summary>Thao tác dùng lại trong test: đặt hàng công khai, tra combo, thao tác đơn bằng tài khoản telesale.</summary>
public sealed class LandingScenario(SalesTestHost host)
{
    public SalesTestHost Host => host;

    public Task<Combo> ComboAsync(string code) => host.QueryAsync<Combo, Combo>(q => q.SingleAsync(c => c.Code == code));

    public Task<Order> OrderByCodeAsync(string code) => host.QueryAsync<Order, Order>(q => q.SingleAsync(o => o.Code == code));

    public Task<Order> OrderByPhoneAsync(string phone) =>
        host.QueryAsync<Order, Order>(q => q.Where(o => o.Phone == phone).OrderByDescending(o => o.PlacedAt).FirstAsync());

    public async Task<PlaceOrderRequest> RequestAsync(string comboCode, int quantity, string phone, string? visitor = null,
        Attribution? attribution = null, string name = "Trần Thu Trang", decimal? expectedPrice = null)
    {
        var combo = await ComboAsync(comboCode);
        var landing = await host.CallAsync<IPublicLandingService, LandingPageDto>(s => s.GetLandingAsync());
        var price = landing.Combos.FirstOrDefault(c => c.Id == combo.Id)?.Price ?? combo.PromoPrice;
        return new PlaceOrderRequest
        {
            ClientRequestId = Guid.NewGuid().ToString(),
            VisitorId = visitor ?? "visitor-" + Guid.NewGuid().ToString("N"),
            CustomerName = name,
            Phone = phone,
            Province = "Hà Nội",
            Address = "Số 12 ngõ 45 Trần Duy Hưng",
            ComboId = combo.Id,
            Quantity = quantity,
            ExpectedPrice = expectedPrice ?? price,
            Attribution = attribution ?? new Attribution { Source = "direct" },
            Device = DeviceType.DienThoai
        };
    }

    public async Task<PlaceOrderResult> PlaceAsync(PlaceOrderRequest request)
    {
        await host.SignInAsync(null);
        var outcome = await host.CallAsync<IOrderPlacementService, WriteOutcome<PlaceOrderResult>>(s => s.PlaceOrderAsync(request));
        return outcome.Value;
    }

    public async Task<Order> PlaceOrderAsync(string comboCode, int quantity, string phone, Attribution? attribution = null)
    {
        var result = await PlaceAsync(await RequestAsync(comboCode, quantity, phone, attribution: attribution));
        return await OrderByCodeAsync(result.Order.Code);
    }

    public async Task<OrderDetailDto> AsAsync(string username, Func<IOrderService, Task<OrderDetailDto>> action)
    {
        await host.SignInAsync(username);
        return await host.CallAsync(action);
    }

    public async Task<T> AsAsync<T>(string username, Func<IOrderService, Task<T>> action)
    {
        await host.SignInAsync(username);
        return await host.CallAsync(action);
    }

    public Task<OrderDetailDto> CallAsync(string username, Guid orderId, CallResult result, OrderChanges? changes = null,
        DateTime? callbackAt = null, CancelReason? reason = null, string? note = null) =>
        AsAsync(username, async s =>
        {
            var detail = await s.GetDetailAsync(orderId);
            return await s.RecordCallAsync(orderId, new RecordCallRequest
            {
                Result = result,
                Changes = changes,
                CallbackAt = callbackAt,
                CancelReason = reason,
                Note = note,
                Version = detail.Version
            });
        });

    public static OrderChanges ChangesOf(Order order, Guid comboId, int quantity) => new()
    {
        CustomerName = order.CustomerName,
        Province = order.Province,
        Address = order.Address,
        ComboId = comboId,
        Quantity = quantity
    };
}
