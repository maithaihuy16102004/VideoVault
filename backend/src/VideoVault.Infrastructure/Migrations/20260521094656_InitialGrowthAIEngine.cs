using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VideoVault.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialGrowthAIEngine : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ai_analysis_logs",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    video_url = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    platform = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ranking_model_version = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    llm_version = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    predicted_viral_score = table.Column<double>(type: "double precision", nullable: false),
                    predicted_watch_time = table.Column<double>(type: "double precision", nullable: false),
                    recommendation_level = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    raw_llm_prompt = table.Column<string>(type: "text", nullable: true),
                    raw_llm_response = table.Column<string>(type: "text", nullable: true),
                    extracted_features_json = table.Column<string>(type: "jsonb", nullable: true),
                    confidence_score = table.Column<double>(type: "double precision", nullable: false),
                    used_metric_recovery = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ai_analysis_logs", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "campaign_rois",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    video_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    predicted_cpm = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    predicted_followers = table.Column<int>(type: "integer", nullable: false),
                    predicted_roi_ratio = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    actual_spend = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    actual_followers_gained = table.Column<int>(type: "integer", nullable: false),
                    actual_roi_ratio = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    is_used_for_training = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    feedback_notes = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    analyzed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_campaign_rois", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "creator_dnas",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    channel_url = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    username = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    primary_style = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    average_pacing = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    hook_pattern = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    total_videos_analyzed = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    average_retention = table.Column<double>(type: "double precision", nullable: false),
                    vector_data_json = table.Column<string>(type: "jsonb", nullable: true),
                    last_updated = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_creator_dnas", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "feature_vectors",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    entity_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    entity_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    vector_model = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    vector_data_json = table.Column<string>(type: "jsonb", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_feature_vectors", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "retention_simulations",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    video_url = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    drop_0_to_3s = table.Column<double>(type: "double precision", nullable: false),
                    drop_3_to_5s = table.Column<double>(type: "double precision", nullable: false),
                    predicted_completion_rate = table.Column<double>(type: "double precision", nullable: false),
                    replay_probability = table.Column<double>(type: "double precision", nullable: false),
                    detailed_timeline_json = table.Column<string>(type: "jsonb", nullable: true),
                    model_version = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_retention_simulations", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "trend_clusters",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    cluster_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    cluster_id = table.Column<int>(type: "integer", nullable: false),
                    niche = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    momentum_score = table.Column<double>(type: "double precision", nullable: false),
                    is_emerging = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    is_saturated = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    discovered_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    expires_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_trend_clusters", x => x.id);
                });

            migrationBuilder.UpdateData(
                table: "subscription_plans",
                keyColumn: "id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000001"),
                columns: new[] { "created_at", "updated_at" },
                values: new object[] { new DateTime(2026, 5, 21, 9, 46, 56, 106, DateTimeKind.Utc).AddTicks(9306), new DateTime(2026, 5, 21, 9, 46, 56, 106, DateTimeKind.Utc).AddTicks(9309) });

            migrationBuilder.UpdateData(
                table: "subscription_plans",
                keyColumn: "id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000002"),
                columns: new[] { "created_at", "updated_at" },
                values: new object[] { new DateTime(2026, 5, 21, 9, 46, 56, 106, DateTimeKind.Utc).AddTicks(9338), new DateTime(2026, 5, 21, 9, 46, 56, 106, DateTimeKind.Utc).AddTicks(9338) });

            migrationBuilder.UpdateData(
                table: "subscription_plans",
                keyColumn: "id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000003"),
                columns: new[] { "created_at", "updated_at" },
                values: new object[] { new DateTime(2026, 5, 21, 9, 46, 56, 106, DateTimeKind.Utc).AddTicks(9348), new DateTime(2026, 5, 21, 9, 46, 56, 106, DateTimeKind.Utc).AddTicks(9349) });

            migrationBuilder.UpdateData(
                table: "subscription_plans",
                keyColumn: "id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000004"),
                columns: new[] { "created_at", "updated_at" },
                values: new object[] { new DateTime(2026, 5, 21, 9, 46, 56, 106, DateTimeKind.Utc).AddTicks(9352), new DateTime(2026, 5, 21, 9, 46, 56, 106, DateTimeKind.Utc).AddTicks(9352) });

            migrationBuilder.CreateIndex(
                name: "IX_feature_vectors_entity_type_entity_id",
                table: "feature_vectors",
                columns: new[] { "entity_type", "entity_id" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ai_analysis_logs");

            migrationBuilder.DropTable(
                name: "campaign_rois");

            migrationBuilder.DropTable(
                name: "creator_dnas");

            migrationBuilder.DropTable(
                name: "feature_vectors");

            migrationBuilder.DropTable(
                name: "retention_simulations");

            migrationBuilder.DropTable(
                name: "trend_clusters");

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
    }
}
