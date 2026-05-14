using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VideoVault.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class UpdatePlanPricing : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "subscription_plans",
                keyColumn: "id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000001"),
                columns: new[] { "created_at", "description", "features", "max_concurrent_downloads", "max_video_quality", "price_yearly", "quota_limit", "updated_at" },
                values: new object[] { new DateTime(2026, 5, 14, 8, 2, 23, 774, DateTimeKind.Utc).AddTicks(4510), "Dùng thử miễn phí, giới hạn cơ bản", "[\"basic_download\",\"720p_quality\"]", 1, "720p", 0m, 5, new DateTime(2026, 5, 14, 8, 2, 23, 774, DateTimeKind.Utc).AddTicks(4513) });

            migrationBuilder.UpdateData(
                table: "subscription_plans",
                keyColumn: "id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000002"),
                columns: new[] { "created_at", "description", "display_name", "features", "max_concurrent_downloads", "name", "price_monthly", "price_yearly", "quota_limit", "updated_at" },
                values: new object[] { new DateTime(2026, 5, 14, 8, 2, 23, 774, DateTimeKind.Utc).AddTicks(4537), "Dành cho cá nhân, tải video chất lượng cao", "Starter", "[\"basic_download\",\"1080p_quality\",\"no_watermark\",\"high_speed\"]", 2, "starter", 49000m, 490000m, 30, new DateTime(2026, 5, 14, 8, 2, 23, 774, DateTimeKind.Utc).AddTicks(4537) });

            migrationBuilder.UpdateData(
                table: "subscription_plans",
                keyColumn: "id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000003"),
                columns: new[] { "created_at", "description", "features", "max_concurrent_downloads", "max_video_quality", "price_monthly", "price_yearly", "quota_limit", "updated_at" },
                values: new object[] { new DateTime(2026, 5, 14, 8, 2, 23, 774, DateTimeKind.Utc).AddTicks(4546), "Dành cho creator, full tính năng chuyên nghiệp", "[\"basic_download\",\"4k_quality\",\"no_watermark\",\"high_speed\",\"batch_download\",\"priority_support\"]", 5, "4K", 149000m, 1490000m, 100, new DateTime(2026, 5, 14, 8, 2, 23, 774, DateTimeKind.Utc).AddTicks(4546) });

            migrationBuilder.UpdateData(
                table: "subscription_plans",
                keyColumn: "id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000004"),
                columns: new[] { "created_at", "description", "display_name", "features", "max_concurrent_downloads", "max_video_quality", "name", "price_monthly", "price_yearly", "quota_limit", "updated_at" },
                values: new object[] { new DateTime(2026, 5, 14, 8, 2, 23, 774, DateTimeKind.Utc).AddTicks(4549), "Dành cho doanh nghiệp, API và quản lý team", "Business", "[\"basic_download\",\"original_quality\",\"no_watermark\",\"high_speed\",\"batch_download\",\"priority_support\",\"api_access\",\"team_management\"]", 10, "Original", "business", 499000m, 4990000m, 500, new DateTime(2026, 5, 14, 8, 2, 23, 774, DateTimeKind.Utc).AddTicks(4549) });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "subscription_plans",
                keyColumn: "id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000001"),
                columns: new[] { "created_at", "description", "features", "max_concurrent_downloads", "max_video_quality", "price_yearly", "quota_limit", "updated_at" },
                values: new object[] { new DateTime(2026, 5, 14, 5, 44, 45, 165, DateTimeKind.Utc).AddTicks(3979), "Basic video downloads with limited quota", "[\"basic_download\"]", 3, "1080p", null, 10, new DateTime(2026, 5, 14, 5, 44, 45, 165, DateTimeKind.Utc).AddTicks(3981) });

            migrationBuilder.UpdateData(
                table: "subscription_plans",
                keyColumn: "id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000002"),
                columns: new[] { "created_at", "description", "display_name", "features", "max_concurrent_downloads", "name", "price_monthly", "price_yearly", "quota_limit", "updated_at" },
                values: new object[] { new DateTime(2026, 5, 14, 5, 44, 45, 165, DateTimeKind.Utc).AddTicks(3998), "Enhanced downloads with no watermark", "Basic", "[\"basic_download\",\"no_watermark\"]", 3, "basic", 9.99m, null, 50, new DateTime(2026, 5, 14, 5, 44, 45, 165, DateTimeKind.Utc).AddTicks(3998) });

            migrationBuilder.UpdateData(
                table: "subscription_plans",
                keyColumn: "id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000003"),
                columns: new[] { "created_at", "description", "features", "max_concurrent_downloads", "max_video_quality", "price_monthly", "price_yearly", "quota_limit", "updated_at" },
                values: new object[] { new DateTime(2026, 5, 14, 5, 44, 45, 165, DateTimeKind.Utc).AddTicks(4004), "Professional features with priority support", "[\"basic_download\",\"no_watermark\",\"high_quality\",\"priority_support\"]", 3, "1080p", 29.99m, null, 200, new DateTime(2026, 5, 14, 5, 44, 45, 165, DateTimeKind.Utc).AddTicks(4004) });

            migrationBuilder.UpdateData(
                table: "subscription_plans",
                keyColumn: "id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000004"),
                columns: new[] { "created_at", "description", "display_name", "features", "max_concurrent_downloads", "max_video_quality", "name", "price_monthly", "price_yearly", "quota_limit", "updated_at" },
                values: new object[] { new DateTime(2026, 5, 14, 5, 44, 45, 165, DateTimeKind.Utc).AddTicks(4007), "Unlimited access with API and team features", "Enterprise", "[\"basic_download\",\"no_watermark\",\"high_quality\",\"4k_quality\",\"api_access\"]", 3, "1080p", "enterprise", 99.99m, null, 1000, new DateTime(2026, 5, 14, 5, 44, 45, 165, DateTimeKind.Utc).AddTicks(4007) });
        }
    }
}
