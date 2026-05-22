using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VideoVault.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddDownloadType2 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DownloadType",
                table: "download_jobs",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.UpdateData(
                table: "subscription_plans",
                keyColumn: "id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000001"),
                columns: new[] { "created_at", "updated_at" },
                values: new object[] { new DateTime(2026, 5, 21, 8, 22, 28, 233, DateTimeKind.Utc).AddTicks(9619), new DateTime(2026, 5, 21, 8, 22, 28, 233, DateTimeKind.Utc).AddTicks(9623) });

            migrationBuilder.UpdateData(
                table: "subscription_plans",
                keyColumn: "id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000002"),
                columns: new[] { "created_at", "updated_at" },
                values: new object[] { new DateTime(2026, 5, 21, 8, 22, 28, 233, DateTimeKind.Utc).AddTicks(9642), new DateTime(2026, 5, 21, 8, 22, 28, 233, DateTimeKind.Utc).AddTicks(9642) });

            migrationBuilder.UpdateData(
                table: "subscription_plans",
                keyColumn: "id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000003"),
                columns: new[] { "created_at", "updated_at" },
                values: new object[] { new DateTime(2026, 5, 21, 8, 22, 28, 233, DateTimeKind.Utc).AddTicks(9651), new DateTime(2026, 5, 21, 8, 22, 28, 233, DateTimeKind.Utc).AddTicks(9651) });

            migrationBuilder.UpdateData(
                table: "subscription_plans",
                keyColumn: "id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000004"),
                columns: new[] { "created_at", "updated_at" },
                values: new object[] { new DateTime(2026, 5, 21, 8, 22, 28, 233, DateTimeKind.Utc).AddTicks(9654), new DateTime(2026, 5, 21, 8, 22, 28, 233, DateTimeKind.Utc).AddTicks(9654) });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DownloadType",
                table: "download_jobs");

            migrationBuilder.DropColumn(
                name: "SubtitlePath",
                table: "download_jobs");

            migrationBuilder.UpdateData(
                table: "subscription_plans",
                keyColumn: "id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000001"),
                columns: new[] { "created_at", "updated_at" },
                values: new object[] { new DateTime(2026, 5, 14, 8, 2, 23, 774, DateTimeKind.Utc).AddTicks(4510), new DateTime(2026, 5, 14, 8, 2, 23, 774, DateTimeKind.Utc).AddTicks(4513) });

            migrationBuilder.UpdateData(
                table: "subscription_plans",
                keyColumn: "id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000002"),
                columns: new[] { "created_at", "updated_at" },
                values: new object[] { new DateTime(2026, 5, 14, 8, 2, 23, 774, DateTimeKind.Utc).AddTicks(4537), new DateTime(2026, 5, 14, 8, 2, 23, 774, DateTimeKind.Utc).AddTicks(4537) });

            migrationBuilder.UpdateData(
                table: "subscription_plans",
                keyColumn: "id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000003"),
                columns: new[] { "created_at", "updated_at" },
                values: new object[] { new DateTime(2026, 5, 14, 8, 2, 23, 774, DateTimeKind.Utc).AddTicks(4546), new DateTime(2026, 5, 14, 8, 2, 23, 774, DateTimeKind.Utc).AddTicks(4546) });

            migrationBuilder.UpdateData(
                table: "subscription_plans",
                keyColumn: "id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000004"),
                columns: new[] { "created_at", "updated_at" },
                values: new object[] { new DateTime(2026, 5, 14, 8, 2, 23, 774, DateTimeKind.Utc).AddTicks(4549), new DateTime(2026, 5, 14, 8, 2, 23, 774, DateTimeKind.Utc).AddTicks(4549) });
        }
    }
}
