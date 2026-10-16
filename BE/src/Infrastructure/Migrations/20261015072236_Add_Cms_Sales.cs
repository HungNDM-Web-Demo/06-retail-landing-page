using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Add_Cms_Sales : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Cms_LandingBlocks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    Title = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Subtitle = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    Body = table.Column<string>(type: "text", nullable: true),
                    ImageUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CtaText = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Items = table.Column<string>(type: "text", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    IsVisible = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Cms_LandingBlocks", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Cms_Products",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    ShortName = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Volume = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Unit = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    ShortDescription = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    ImageUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Cms_Products", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Cms_Promotions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    StartAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EndAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    AutoRenewDays = table.Column<int>(type: "integer", nullable: true),
                    Version = table.Column<int>(type: "integer", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Cms_Promotions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Cms_Reviews",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CustomerName = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Province = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Rating = table.Column<int>(type: "integer", nullable: false),
                    Content = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    AvatarUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    PhotoUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ReviewedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    IsVisible = table.Column<bool>(type: "boolean", nullable: false),
                    IsSample = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Cms_Reviews", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Sales_AdCosts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Date = table.Column<DateOnly>(type: "date", nullable: false),
                    Source = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Campaign = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Sales_AdCosts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Sales_TelesaleStates",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    IsReceiving = table.Column<bool>(type: "boolean", nullable: false),
                    LastAssignedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Sales_TelesaleStates", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Sales_TelesaleStates_System_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "System_Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Sales_Visits",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    VisitorId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    StartedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastSeenAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Source = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Medium = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Campaign = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    AdContent = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Referrer = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Device = table.Column<int>(type: "integer", nullable: false),
                    Path = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Sales_Visits", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Sales_VisitStats",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    HourStart = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Source = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Campaign = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Visits = table.Column<int>(type: "integer", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Sales_VisitStats", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Cms_Combos",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Description = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    BottleCount = table.Column<int>(type: "integer", nullable: false),
                    GiftText = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    PromoPrice = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    RegularPrice = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    FreeShipping = table.Column<bool>(type: "boolean", nullable: false),
                    Badge = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    ImageUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    IsDefault = table.Column<bool>(type: "boolean", nullable: false),
                    IsVisible = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Cms_Combos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Cms_Combos_Cms_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Cms_Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Sales_Orders",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    PlacedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CustomerName = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Phone = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Province = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Address = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Note = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    ComboId = table.Column<Guid>(type: "uuid", nullable: false),
                    ComboCode = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: false),
                    ComboName = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    BottleCount = table.Column<int>(type: "integer", nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    PlacedComboId = table.Column<Guid>(type: "uuid", nullable: false),
                    PlacedComboName = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    PlacedQuantity = table.Column<int>(type: "integer", nullable: false),
                    PriceType = table.Column<int>(type: "integer", nullable: false),
                    UnitPrice = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    PlacedSubtotal = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Subtotal = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    ShippingFee = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Total = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    UpsellAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    VisitorId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    VisitId = table.Column<Guid>(type: "uuid", nullable: true),
                    Source = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Medium = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Campaign = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    AdContent = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Referrer = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Device = table.Column<int>(type: "integer", nullable: false),
                    AssigneeId = table.Column<Guid>(type: "uuid", nullable: true),
                    AssigneeName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    AssignedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    FailedCallCount = table.Column<int>(type: "integer", nullable: false),
                    NextCallAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ConfirmedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ConfirmedById = table.Column<Guid>(type: "uuid", nullable: true),
                    ConfirmedByName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    CancelReason = table.Column<int>(type: "integer", nullable: true),
                    CancelNote = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    CancelledAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CancelledById = table.Column<Guid>(type: "uuid", nullable: true),
                    CancelledByName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    ReturnReason = table.Column<int>(type: "integer", nullable: true),
                    ReturnNote = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    IsDuplicate = table.Column<bool>(type: "boolean", nullable: false),
                    DuplicateCleared = table.Column<bool>(type: "boolean", nullable: false),
                    IsReturnRisk = table.Column<bool>(type: "boolean", nullable: false),
                    ClientRequestId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    Version = table.Column<int>(type: "integer", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Sales_Orders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Sales_Orders_Cms_Combos_ComboId",
                        column: x => x.ComboId,
                        principalTable: "Cms_Combos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Sales_Orders_Cms_Combos_PlacedComboId",
                        column: x => x.PlacedComboId,
                        principalTable: "Cms_Combos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Sales_Orders_Sales_Visits_VisitId",
                        column: x => x.VisitId,
                        principalTable: "Sales_Visits",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Sales_Orders_System_Users_AssigneeId",
                        column: x => x.AssigneeId,
                        principalTable: "System_Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Sales_ConversionEvents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    OccurredAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    VisitorId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    VisitId = table.Column<Guid>(type: "uuid", nullable: true),
                    OrderId = table.Column<Guid>(type: "uuid", nullable: true),
                    Source = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Campaign = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Value = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    PixelCall = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Sales_ConversionEvents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Sales_ConversionEvents_Sales_Orders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "Sales_Orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Sales_ConversionEvents_Sales_Visits_VisitId",
                        column: x => x.VisitId,
                        principalTable: "Sales_Visits",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Sales_OrderCalls",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OrderId = table.Column<Guid>(type: "uuid", nullable: false),
                    CalledAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CallerId = table.Column<Guid>(type: "uuid", nullable: true),
                    CallerName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Result = table.Column<int>(type: "integer", nullable: false),
                    CallbackAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CancelReason = table.Column<int>(type: "integer", nullable: true),
                    Note = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Sales_OrderCalls", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Sales_OrderCalls_Sales_Orders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "Sales_Orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Sales_OrderCalls_System_Users_CallerId",
                        column: x => x.CallerId,
                        principalTable: "System_Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Sales_OrderEvents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OrderId = table.Column<Guid>(type: "uuid", nullable: false),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    FromStatus = table.Column<int>(type: "integer", nullable: true),
                    ToStatus = table.Column<int>(type: "integer", nullable: true),
                    Content = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    ActorId = table.Column<Guid>(type: "uuid", nullable: true),
                    ActorName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    OccurredAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Sales_OrderEvents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Sales_OrderEvents_Sales_Orders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "Sales_Orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Sales_Shipments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OrderId = table.Column<Guid>(type: "uuid", nullable: false),
                    Carrier = table.Column<int>(type: "integer", nullable: false),
                    TrackingCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CodAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    HandedOverAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    HandedOverById = table.Column<Guid>(type: "uuid", nullable: true),
                    HandedOverByName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    DeliveredAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ReturnedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Sales_Shipments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Sales_Shipments_Sales_Orders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "Sales_Orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Cms_Combos_Code",
                table: "Cms_Combos",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Cms_Combos_IsVisible_SortOrder",
                table: "Cms_Combos",
                columns: new[] { "IsVisible", "SortOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_Cms_Combos_ProductId",
                table: "Cms_Combos",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_Cms_LandingBlocks_Type",
                table: "Cms_LandingBlocks",
                column: "Type",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Cms_Products_Code",
                table: "Cms_Products",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Cms_Reviews_IsVisible_SortOrder",
                table: "Cms_Reviews",
                columns: new[] { "IsVisible", "SortOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_Sales_AdCosts_Date_Source_Campaign",
                table: "Sales_AdCosts",
                columns: new[] { "Date", "Source", "Campaign" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Sales_ConversionEvents_OccurredAt",
                table: "Sales_ConversionEvents",
                column: "OccurredAt");

            migrationBuilder.CreateIndex(
                name: "IX_Sales_ConversionEvents_OrderId",
                table: "Sales_ConversionEvents",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_Sales_ConversionEvents_VisitId",
                table: "Sales_ConversionEvents",
                column: "VisitId");

            migrationBuilder.CreateIndex(
                name: "IX_Sales_OrderCalls_CallerId_CalledAt",
                table: "Sales_OrderCalls",
                columns: new[] { "CallerId", "CalledAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Sales_OrderCalls_OrderId_CalledAt",
                table: "Sales_OrderCalls",
                columns: new[] { "OrderId", "CalledAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Sales_OrderEvents_OrderId_OccurredAt",
                table: "Sales_OrderEvents",
                columns: new[] { "OrderId", "OccurredAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Sales_Orders_AssigneeId_Status",
                table: "Sales_Orders",
                columns: new[] { "AssigneeId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_Sales_Orders_ClientRequestId",
                table: "Sales_Orders",
                column: "ClientRequestId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Sales_Orders_Code",
                table: "Sales_Orders",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Sales_Orders_ComboId",
                table: "Sales_Orders",
                column: "ComboId");

            migrationBuilder.CreateIndex(
                name: "IX_Sales_Orders_Phone_PlacedAt",
                table: "Sales_Orders",
                columns: new[] { "Phone", "PlacedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Sales_Orders_PlacedAt",
                table: "Sales_Orders",
                column: "PlacedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Sales_Orders_PlacedComboId",
                table: "Sales_Orders",
                column: "PlacedComboId");

            migrationBuilder.CreateIndex(
                name: "IX_Sales_Orders_Source_PlacedAt",
                table: "Sales_Orders",
                columns: new[] { "Source", "PlacedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Sales_Orders_Status_PlacedAt",
                table: "Sales_Orders",
                columns: new[] { "Status", "PlacedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Sales_Orders_VisitId",
                table: "Sales_Orders",
                column: "VisitId");

            migrationBuilder.CreateIndex(
                name: "IX_Sales_Orders_VisitorId_PlacedAt",
                table: "Sales_Orders",
                columns: new[] { "VisitorId", "PlacedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Sales_Shipments_DeliveredAt",
                table: "Sales_Shipments",
                column: "DeliveredAt");

            migrationBuilder.CreateIndex(
                name: "IX_Sales_Shipments_OrderId",
                table: "Sales_Shipments",
                column: "OrderId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Sales_Shipments_ReturnedAt",
                table: "Sales_Shipments",
                column: "ReturnedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Sales_Shipments_TrackingCode",
                table: "Sales_Shipments",
                column: "TrackingCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Sales_TelesaleStates_UserId",
                table: "Sales_TelesaleStates",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Sales_Visits_VisitorId_LastSeenAt",
                table: "Sales_Visits",
                columns: new[] { "VisitorId", "LastSeenAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Sales_VisitStats_HourStart_Source_Campaign",
                table: "Sales_VisitStats",
                columns: new[] { "HourStart", "Source", "Campaign" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Cms_LandingBlocks");

            migrationBuilder.DropTable(
                name: "Cms_Promotions");

            migrationBuilder.DropTable(
                name: "Cms_Reviews");

            migrationBuilder.DropTable(
                name: "Sales_AdCosts");

            migrationBuilder.DropTable(
                name: "Sales_ConversionEvents");

            migrationBuilder.DropTable(
                name: "Sales_OrderCalls");

            migrationBuilder.DropTable(
                name: "Sales_OrderEvents");

            migrationBuilder.DropTable(
                name: "Sales_Shipments");

            migrationBuilder.DropTable(
                name: "Sales_TelesaleStates");

            migrationBuilder.DropTable(
                name: "Sales_VisitStats");

            migrationBuilder.DropTable(
                name: "Sales_Orders");

            migrationBuilder.DropTable(
                name: "Cms_Combos");

            migrationBuilder.DropTable(
                name: "Sales_Visits");

            migrationBuilder.DropTable(
                name: "Cms_Products");
        }
    }
}
