using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace VideoVault.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Init : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "subscription_plans",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    name = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    display_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    price_monthly = table.Column<decimal>(type: "numeric(10,2)", nullable: false),
                    price_yearly = table.Column<decimal>(type: "numeric(10,2)", nullable: true),
                    quota_limit = table.Column<int>(type: "integer", nullable: false),
                    quota_period = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false, defaultValue: "daily"),
                    max_video_duration = table.Column<int>(type: "integer", nullable: true),
                    max_video_quality = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "1080p"),
                    max_concurrent_downloads = table.Column<int>(type: "integer", nullable: false, defaultValue: 3),
                    features = table.Column<string>(type: "jsonb", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    sort_order = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_subscription_plans", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    username = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    password_hash = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    full_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    avatar_url = table.Column<string>(type: "text", nullable: true),
                    role = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "user"),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    is_email_verified = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    subscription_plan_id = table.Column<Guid>(type: "uuid", nullable: true),
                    quota_used = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    quota_total = table.Column<int>(type: "integer", nullable: false, defaultValue: 10),
                    quota_reset_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    last_login_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_users", x => x.id);
                    table.ForeignKey(
                        name: "FK_users_subscription_plans_subscription_plan_id",
                        column: x => x.subscription_plan_id,
                        principalTable: "subscription_plans",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "audit_logs",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    action = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    entity = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    entity_id = table.Column<Guid>(type: "uuid", nullable: true),
                    description = table.Column<string>(type: "text", nullable: true),
                    ip_address = table.Column<string>(type: "text", nullable: true),
                    user_agent = table.Column<string>(type: "text", nullable: true),
                    metadata = table.Column<string>(type: "jsonb", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_audit_logs", x => x.id);
                    table.ForeignKey(
                        name: "FK_audit_logs_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "download_jobs",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    original_url = table.Column<string>(type: "text", nullable: false),
                    platform = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    video_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    title = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    description = table.Column<string>(type: "text", nullable: true),
                    duration = table.Column<int>(type: "integer", nullable: true),
                    thumbnail_url = table.Column<string>(type: "text", nullable: true),
                    quality = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "auto"),
                    file_size = table.Column<long>(type: "bigint", nullable: true),
                    file_url = table.Column<string>(type: "text", nullable: true),
                    file_path = table.Column<string>(type: "text", nullable: true),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "pending"),
                    progress = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    error_message = table.Column<string>(type: "text", nullable: true),
                    download_method = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "auto"),
                    video_format = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false, defaultValue: "mp4"),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    started_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    completed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    retry_count = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    max_retries = table.Column<int>(type: "integer", nullable: false, defaultValue: 3)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_download_jobs", x => x.id);
                    table.ForeignKey(
                        name: "FK_download_jobs_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "user_subscriptions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    plan_id = table.Column<Guid>(type: "uuid", nullable: false),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "active"),
                    billing_cycle = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false, defaultValue: "monthly"),
                    started_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    expires_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    cancelled_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    payment_method = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    payment_id = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_subscriptions", x => x.id);
                    table.ForeignKey(
                        name: "FK_user_subscriptions_subscription_plans_plan_id",
                        column: x => x.plan_id,
                        principalTable: "subscription_plans",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_user_subscriptions_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "payments",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    subscription_id = table.Column<Guid>(type: "uuid", nullable: true),
                    amount = table.Column<decimal>(type: "numeric(10,2)", nullable: false),
                    currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false, defaultValue: "USD"),
                    payment_method = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    payment_status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "pending"),
                    transaction_id = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    payment_intent_id = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    payment_metadata = table.Column<string>(type: "jsonb", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    completed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_payments", x => x.id);
                    table.ForeignKey(
                        name: "FK_payments_user_subscriptions_subscription_id",
                        column: x => x.subscription_id,
                        principalTable: "user_subscriptions",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_payments_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "subscription_plans",
                columns: new[] { "id", "created_at", "description", "display_name", "features", "is_active", "max_concurrent_downloads", "max_video_duration", "max_video_quality", "name", "price_monthly", "price_yearly", "quota_limit", "quota_period", "updated_at" },
                values: new object[] { new Guid("a0000000-0000-0000-0000-000000000001"), new DateTime(2026, 5, 14, 5, 34, 7, 814, DateTimeKind.Utc).AddTicks(4823), "Basic video downloads with limited quota", "Free", "[\"basic_download\"]", true, 3, null, "1080p", "free", 0m, null, 10, "daily", new DateTime(2026, 5, 14, 5, 34, 7, 814, DateTimeKind.Utc).AddTicks(4827) });

            migrationBuilder.InsertData(
                table: "subscription_plans",
                columns: new[] { "id", "created_at", "description", "display_name", "features", "is_active", "max_concurrent_downloads", "max_video_duration", "max_video_quality", "name", "price_monthly", "price_yearly", "quota_limit", "quota_period", "sort_order", "updated_at" },
                values: new object[,]
                {
                    { new Guid("a0000000-0000-0000-0000-000000000002"), new DateTime(2026, 5, 14, 5, 34, 7, 814, DateTimeKind.Utc).AddTicks(4847), "Enhanced downloads with no watermark", "Basic", "[\"basic_download\",\"no_watermark\"]", true, 3, null, "1080p", "basic", 9.99m, null, 50, "daily", 1, new DateTime(2026, 5, 14, 5, 34, 7, 814, DateTimeKind.Utc).AddTicks(4847) },
                    { new Guid("a0000000-0000-0000-0000-000000000003"), new DateTime(2026, 5, 14, 5, 34, 7, 814, DateTimeKind.Utc).AddTicks(4854), "Professional features with priority support", "Pro", "[\"basic_download\",\"no_watermark\",\"high_quality\",\"priority_support\"]", true, 3, null, "1080p", "pro", 29.99m, null, 200, "daily", 2, new DateTime(2026, 5, 14, 5, 34, 7, 814, DateTimeKind.Utc).AddTicks(4854) },
                    { new Guid("a0000000-0000-0000-0000-000000000004"), new DateTime(2026, 5, 14, 5, 34, 7, 814, DateTimeKind.Utc).AddTicks(4856), "Unlimited access with API and team features", "Enterprise", "[\"basic_download\",\"no_watermark\",\"high_quality\",\"4k_quality\",\"api_access\"]", true, 3, null, "1080p", "enterprise", 99.99m, null, 1000, "daily", 3, new DateTime(2026, 5, 14, 5, 34, 7, 814, DateTimeKind.Utc).AddTicks(4857) }
                });

            migrationBuilder.CreateIndex(
                name: "IX_audit_logs_action",
                table: "audit_logs",
                column: "action");

            migrationBuilder.CreateIndex(
                name: "IX_audit_logs_created_at",
                table: "audit_logs",
                column: "created_at",
                descending: new bool[0]);

            migrationBuilder.CreateIndex(
                name: "IX_audit_logs_user_id",
                table: "audit_logs",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_download_jobs_created_at",
                table: "download_jobs",
                column: "created_at",
                descending: new bool[0]);

            migrationBuilder.CreateIndex(
                name: "IX_download_jobs_platform",
                table: "download_jobs",
                column: "platform");

            migrationBuilder.CreateIndex(
                name: "IX_download_jobs_status",
                table: "download_jobs",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "IX_download_jobs_user_id",
                table: "download_jobs",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_download_jobs_user_id_status",
                table: "download_jobs",
                columns: new[] { "user_id", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_payments_created_at",
                table: "payments",
                column: "created_at",
                descending: new bool[0]);

            migrationBuilder.CreateIndex(
                name: "IX_payments_payment_status",
                table: "payments",
                column: "payment_status");

            migrationBuilder.CreateIndex(
                name: "IX_payments_subscription_id",
                table: "payments",
                column: "subscription_id");

            migrationBuilder.CreateIndex(
                name: "IX_payments_transaction_id",
                table: "payments",
                column: "transaction_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_payments_user_id",
                table: "payments",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_subscription_plans_is_active",
                table: "subscription_plans",
                column: "is_active");

            migrationBuilder.CreateIndex(
                name: "IX_subscription_plans_name",
                table: "subscription_plans",
                column: "name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_user_subscriptions_plan_id",
                table: "user_subscriptions",
                column: "plan_id");

            migrationBuilder.CreateIndex(
                name: "IX_user_subscriptions_status",
                table: "user_subscriptions",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "IX_user_subscriptions_user_id",
                table: "user_subscriptions",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_users_created_at",
                table: "users",
                column: "created_at",
                descending: new bool[0]);

            migrationBuilder.CreateIndex(
                name: "IX_users_email",
                table: "users",
                column: "email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_users_role",
                table: "users",
                column: "role");

            migrationBuilder.CreateIndex(
                name: "IX_users_subscription_plan_id",
                table: "users",
                column: "subscription_plan_id");

            migrationBuilder.CreateIndex(
                name: "IX_users_username",
                table: "users",
                column: "username",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "audit_logs");

            migrationBuilder.DropTable(
                name: "download_jobs");

            migrationBuilder.DropTable(
                name: "payments");

            migrationBuilder.DropTable(
                name: "user_subscriptions");

            migrationBuilder.DropTable(
                name: "users");

            migrationBuilder.DropTable(
                name: "subscription_plans");
        }
    }
}
