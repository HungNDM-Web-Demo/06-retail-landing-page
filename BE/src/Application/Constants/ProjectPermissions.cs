namespace Application.Constants;

/// <summary>
/// Mã quyền nghiệp vụ của Landing Page Bán hàng (02-SRS §7, 07-DANH-SACH-API §1). Tách khỏi <see cref="Permissions"/> (quyền nền)
/// để không sửa file nền. Mỗi mã phải có trong FE/src/mock/seed/project.json và FE src/config/permissions.ts;
/// test <c>ProjectPermissionTests</c> kiểm tra việc này.
/// </summary>
public static class ProjectPermissions
{
    public static class Orders
    {
        /// <summary>Xem đơn chưa chia và đơn mình phụ trách.</summary>
        public const string View = "orders.view";

        /// <summary>Xem mọi đơn.</summary>
        public const string ViewAll = "orders.view-all";

        /// <summary>Ghi kết quả gọi, xác nhận, sửa đơn khi xác nhận, xử lý đơn trùng.</summary>
        public const string Call = "orders.call";

        public const string Assign = "orders.assign";
        public const string Cancel = "orders.cancel";
        public const string Ship = "orders.ship";
        public const string Export = "orders.export";
    }

    public static class Combos
    {
        public const string View = "combos.view";
        public const string Create = "combos.create";

        /// <summary>Sửa, ẩn, sắp xếp combo, đổi thời gian khuyến mãi.</summary>
        public const string Update = "combos.update";

        public const string Delete = "combos.delete";
    }

    public static class LandingContents
    {
        public const string View = "landing-contents.view";
        public const string Update = "landing-contents.update";
    }

    public static class AdCosts
    {
        public const string View = "ad-costs.view";
        public const string Create = "ad-costs.create";

        /// <summary>Sửa, xóa chi phí.</summary>
        public const string Update = "ad-costs.update";
    }

    public static class Reports
    {
        /// <summary>Báo cáo và số liệu toàn shop ở Tổng quan.</summary>
        public const string View = "reports.view";
    }
}
