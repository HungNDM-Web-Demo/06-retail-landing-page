using Application.Common.Exceptions;
using Application.Constants;
using Application.DTOs.Orders;
using Application.Interfaces.Repositories;
using Application.Interfaces.Services.Common;
using Application.Interfaces.Services.Orders;
using Domain.Entities.Sales;
using Domain.Entities.Sales.Orders;
using Domain.Entities.Sales.Telesales;
using Domain.Entities.System.Users;
using Domain.Enums.Sales.Orders;
using Infrastructure.Implementations.Services.Sales;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Implementations.Services.Orders;

/// <summary>Telesale = tài khoản vai trò STAFF đang hoạt động (07 §5 quyết định 20); công tắc "Nhận đơn" (BR-09).</summary>
public sealed class TelesaleService(
    IGenericRepository<User> users,
    IGenericRepository<TelesaleState> states,
    IGenericRepository<Order> orders,
    IUnitOfWork unitOfWork,
    ICurrentUserService currentUser) : ITelesaleService
{
    public async Task<IReadOnlyList<TelesaleDto>> GetAllAsync(CancellationToken ct = default)
    {
        var staff = await SalesSupport.ActiveStaff(users).OrderBy(u => u.Username)
            .Select(u => new { u.Id, u.Username, u.FullName }).ToListAsync(ct);
        var ids = staff.Select(s => s.Id).ToList();
        var stateList = await states.QueryNoTracking().Where(s => ids.Contains(s.UserId)).ToListAsync(ct);
        var open = await orders.QueryNoTracking()
            .Where(o => o.AssigneeId != null && ids.Contains(o.AssigneeId.Value)
                && (o.Status == OrderStatus.Moi || o.Status == OrderStatus.ChoGoiLai))
            .GroupBy(o => o.AssigneeId)
            .Select(g => new { UserId = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        return staff.Select(u =>
        {
            var state = stateList.FirstOrDefault(s => s.UserId == u.Id);
            return new TelesaleDto
            {
                UserId = u.Id,
                Username = u.Username,
                FullName = u.FullName,
                IsReceiving = state?.IsReceiving ?? false,
                LastAssignedAt = state?.LastAssignedAt,
                OpenOrders = open.FirstOrDefault(o => o.UserId == u.Id)?.Count ?? 0
            };
        }).ToList();
    }

    public async Task<TelesaleDto> SetMyReceivingAsync(bool isReceiving, CancellationToken ct = default)
    {
        var userId = currentUser.UserId ?? throw new UnauthorizedAccessException("Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn.");
        var user = await SalesSupport.ActiveStaff(users).Where(u => u.Id == userId)
            .Select(u => new { u.Id, u.Username, u.FullName }).FirstOrDefaultAsync(ct)
            ?? throw SalesProblems.Bad(SalesErrors.KhongPhaiTelesale, SalesErrors.KhongPhaiTelesaleMessage);

        var state = await states.Query().FirstOrDefaultAsync(s => s.UserId == userId, ct);
        if (state is null)
        {
            state = TelesaleState.Create(userId, isReceiving, null);
            await states.AddAsync(state, ct);
        }
        else
            state.SetReceiving(isReceiving);

        await unitOfWork.SaveChangesAsync(ct);
        var openOrders = await orders.QueryNoTracking()
            .CountAsync(o => o.AssigneeId == userId && (o.Status == OrderStatus.Moi || o.Status == OrderStatus.ChoGoiLai), ct);
        return new TelesaleDto
        {
            UserId = user.Id,
            Username = user.Username,
            FullName = user.FullName,
            IsReceiving = state.IsReceiving,
            LastAssignedAt = state.LastAssignedAt,
            OpenOrders = openOrders
        };
    }
}
