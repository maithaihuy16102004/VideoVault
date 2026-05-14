using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VideoVault.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class SchemaV2_Improvements : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_audit_logs_users_user_id",
                table: "audit_logs");

            migrationBuilder.DropForeignKey(
                name: "FK_payments_user_subscriptions_subscription_id",
                table: "payments");

            migrationBuilder.AlterColumn<decimal>(
                name: "price_yearly",
                table: "subscription_plans",
                type: "numeric(12,2)",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric(10,2)",
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "price_monthly",
                table: "subscription_plans",
                type: "numeric(12,2)",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(10,2)");

            migrationBuilder.AlterColumn<decimal>(
                name: "amount",
                table: "payments",
                type: "numeric(12,2)",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(10,2)");

            migrationBuilder.AlterColumn<short>(
                name: "progress",
                table: "download_jobs",
                type: "smallint",
                nullable: false,
                defaultValue: (short)0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldDefaultValue: 0);

            migrationBuilder.UpdateData(
                table: "subscription_plans",
                keyColumn: "id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000001"),
                columns: new[] { "created_at", "updated_at" },
                values: new object[] { new DateTime(2026, 5, 14, 5, 44, 45, 165, DateTimeKind.Utc).AddTicks(3979), new DateTime(2026, 5, 14, 5, 44, 45, 165, DateTimeKind.Utc).AddTicks(3981) });

            migrationBuilder.UpdateData(
                table: "subscription_plans",
                keyColumn: "id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000002"),
                columns: new[] { "created_at", "updated_at" },
                values: new object[] { new DateTime(2026, 5, 14, 5, 44, 45, 165, DateTimeKind.Utc).AddTicks(3998), new DateTime(2026, 5, 14, 5, 44, 45, 165, DateTimeKind.Utc).AddTicks(3998) });

            migrationBuilder.UpdateData(
                table: "subscription_plans",
                keyColumn: "id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000003"),
                columns: new[] { "created_at", "updated_at" },
                values: new object[] { new DateTime(2026, 5, 14, 5, 44, 45, 165, DateTimeKind.Utc).AddTicks(4004), new DateTime(2026, 5, 14, 5, 44, 45, 165, DateTimeKind.Utc).AddTicks(4004) });

            migrationBuilder.UpdateData(
                table: "subscription_plans",
                keyColumn: "id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000004"),
                columns: new[] { "created_at", "updated_at" },
                values: new object[] { new DateTime(2026, 5, 14, 5, 44, 45, 165, DateTimeKind.Utc).AddTicks(4007), new DateTime(2026, 5, 14, 5, 44, 45, 165, DateTimeKind.Utc).AddTicks(4007) });

            migrationBuilder.AddForeignKey(
                name: "FK_audit_logs_users_user_id",
                table: "audit_logs",
                column: "user_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_payments_user_subscriptions_subscription_id",
                table: "payments",
                column: "subscription_id",
                principalTable: "user_subscriptions",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_audit_logs_users_user_id",
                table: "audit_logs");

            migrationBuilder.DropForeignKey(
                name: "FK_payments_user_subscriptions_subscription_id",
                table: "payments");

            migrationBuilder.AlterColumn<decimal>(
                name: "price_yearly",
                table: "subscription_plans",
                type: "numeric(10,2)",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric(12,2)",
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "price_monthly",
                table: "subscription_plans",
                type: "numeric(10,2)",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(12,2)");

            migrationBuilder.AlterColumn<decimal>(
                name: "amount",
                table: "payments",
                type: "numeric(10,2)",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(12,2)");

            migrationBuilder.AlterColumn<int>(
                name: "progress",
                table: "download_jobs",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(short),
                oldType: "smallint",
                oldDefaultValue: (short)0);

            migrationBuilder.UpdateData(
                table: "subscription_plans",
                keyColumn: "id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000001"),
                columns: new[] { "created_at", "updated_at" },
                values: new object[] { new DateTime(2026, 5, 14, 5, 34, 7, 814, DateTimeKind.Utc).AddTicks(4823), new DateTime(2026, 5, 14, 5, 34, 7, 814, DateTimeKind.Utc).AddTicks(4827) });

            migrationBuilder.UpdateData(
                table: "subscription_plans",
                keyColumn: "id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000002"),
                columns: new[] { "created_at", "updated_at" },
                values: new object[] { new DateTime(2026, 5, 14, 5, 34, 7, 814, DateTimeKind.Utc).AddTicks(4847), new DateTime(2026, 5, 14, 5, 34, 7, 814, DateTimeKind.Utc).AddTicks(4847) });

            migrationBuilder.UpdateData(
                table: "subscription_plans",
                keyColumn: "id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000003"),
                columns: new[] { "created_at", "updated_at" },
                values: new object[] { new DateTime(2026, 5, 14, 5, 34, 7, 814, DateTimeKind.Utc).AddTicks(4854), new DateTime(2026, 5, 14, 5, 34, 7, 814, DateTimeKind.Utc).AddTicks(4854) });

            migrationBuilder.UpdateData(
                table: "subscription_plans",
                keyColumn: "id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000004"),
                columns: new[] { "created_at", "updated_at" },
                values: new object[] { new DateTime(2026, 5, 14, 5, 34, 7, 814, DateTimeKind.Utc).AddTicks(4856), new DateTime(2026, 5, 14, 5, 34, 7, 814, DateTimeKind.Utc).AddTicks(4857) });

            migrationBuilder.AddForeignKey(
                name: "FK_audit_logs_users_user_id",
                table: "audit_logs",
                column: "user_id",
                principalTable: "users",
                principalColumn: "id");

            migrationBuilder.AddForeignKey(
                name: "FK_payments_user_subscriptions_subscription_id",
                table: "payments",
                column: "subscription_id",
                principalTable: "user_subscriptions",
                principalColumn: "id");
        }
    }
}
