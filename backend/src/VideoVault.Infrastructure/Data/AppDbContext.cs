using Microsoft.EntityFrameworkCore;
using VideoVault.Domain.Entities;

namespace VideoVault.Infrastructure.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<SubscriptionPlan> SubscriptionPlans => Set<SubscriptionPlan>();
    public DbSet<UserSubscription> UserSubscriptions => Set<UserSubscription>();
    public DbSet<DownloadJob> DownloadJobs => Set<DownloadJob>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ========== USER ==========
        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()");
            entity.Property(e => e.Email).HasColumnName("email").HasMaxLength(255).IsRequired();
            entity.Property(e => e.Username).HasColumnName("username").HasMaxLength(100).IsRequired();
            entity.Property(e => e.PasswordHash).HasColumnName("password_hash").HasMaxLength(255).IsRequired();
            entity.Property(e => e.FullName).HasColumnName("full_name").HasMaxLength(255);
            entity.Property(e => e.AvatarUrl).HasColumnName("avatar_url");
            entity.Property(e => e.Role).HasColumnName("role").HasMaxLength(20).HasDefaultValue("user");
            entity.Property(e => e.IsActive).HasColumnName("is_active").HasDefaultValue(true);
            entity.Property(e => e.IsEmailVerified).HasColumnName("is_email_verified").HasDefaultValue(false);
            entity.Property(e => e.SubscriptionPlanId).HasColumnName("subscription_plan_id");
            entity.Property(e => e.QuotaUsed).HasColumnName("quota_used").HasDefaultValue(0);
            entity.Property(e => e.QuotaTotal).HasColumnName("quota_total").HasDefaultValue(10);
            entity.Property(e => e.QuotaResetAt).HasColumnName("quota_reset_at");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("NOW()");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("NOW()");
            entity.Property(e => e.LastLoginAt).HasColumnName("last_login_at");

            entity.HasIndex(e => e.Email).IsUnique();
            entity.HasIndex(e => e.Username).IsUnique();
            entity.HasIndex(e => e.Role);
            entity.HasIndex(e => e.CreatedAt).IsDescending();

            entity.HasOne(e => e.SubscriptionPlan)
                  .WithMany(p => p.Users)
                  .HasForeignKey(e => e.SubscriptionPlanId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        // ========== SUBSCRIPTION PLANS ==========
        modelBuilder.Entity<SubscriptionPlan>(entity =>
        {
            entity.ToTable("subscription_plans");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()");
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(50).IsRequired();
            entity.Property(e => e.DisplayName).HasColumnName("display_name").HasMaxLength(100).IsRequired();
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.PriceMonthly).HasColumnName("price_monthly").HasColumnType("decimal(12,2)");
            entity.Property(e => e.PriceYearly).HasColumnName("price_yearly").HasColumnType("decimal(12,2)");
            entity.Property(e => e.QuotaLimit).HasColumnName("quota_limit").IsRequired();
            entity.Property(e => e.QuotaPeriod).HasColumnName("quota_period").HasMaxLength(10).HasDefaultValue("daily");
            entity.Property(e => e.MaxVideoDuration).HasColumnName("max_video_duration");
            entity.Property(e => e.MaxVideoQuality).HasColumnName("max_video_quality").HasMaxLength(20).HasDefaultValue("1080p");
            entity.Property(e => e.MaxConcurrentDownloads).HasColumnName("max_concurrent_downloads").HasDefaultValue(3);
            entity.Property(e => e.Features).HasColumnName("features").HasColumnType("jsonb");
            entity.Property(e => e.IsActive).HasColumnName("is_active").HasDefaultValue(true);
            entity.Property(e => e.SortOrder).HasColumnName("sort_order").HasDefaultValue(0);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("NOW()");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("NOW()");

            entity.HasIndex(e => e.Name).IsUnique();
            entity.HasIndex(e => e.IsActive);

            // Seed default plans - Giá phù hợp thị trường Đông Nam Á
            entity.HasData(
                new SubscriptionPlan { Id = Guid.Parse("a0000000-0000-0000-0000-000000000001"), Name = "free", DisplayName = "Free", Description = "Dùng thử miễn phí, giới hạn cơ bản", PriceMonthly = 0, PriceYearly = 0, QuotaLimit = 5, MaxVideoQuality = "720p", MaxConcurrentDownloads = 1, Features = "[\"basic_download\",\"720p_quality\"]", SortOrder = 0 },
                new SubscriptionPlan { Id = Guid.Parse("a0000000-0000-0000-0000-000000000002"), Name = "starter", DisplayName = "Starter", Description = "Dành cho cá nhân, tải video chất lượng cao", PriceMonthly = 49000, PriceYearly = 490000, QuotaLimit = 30, MaxVideoQuality = "1080p", MaxConcurrentDownloads = 2, Features = "[\"basic_download\",\"1080p_quality\",\"no_watermark\",\"high_speed\"]", SortOrder = 1 },
                new SubscriptionPlan { Id = Guid.Parse("a0000000-0000-0000-0000-000000000003"), Name = "pro", DisplayName = "Pro", Description = "Dành cho creator, full tính năng chuyên nghiệp", PriceMonthly = 149000, PriceYearly = 1490000, QuotaLimit = 100, MaxVideoQuality = "4K", MaxConcurrentDownloads = 5, Features = "[\"basic_download\",\"4k_quality\",\"no_watermark\",\"high_speed\",\"batch_download\",\"priority_support\"]", SortOrder = 2 },
                new SubscriptionPlan { Id = Guid.Parse("a0000000-0000-0000-0000-000000000004"), Name = "business", DisplayName = "Business", Description = "Dành cho doanh nghiệp, API và quản lý team", PriceMonthly = 499000, PriceYearly = 4990000, QuotaLimit = 500, MaxVideoQuality = "Original", MaxConcurrentDownloads = 10, Features = "[\"basic_download\",\"original_quality\",\"no_watermark\",\"high_speed\",\"batch_download\",\"priority_support\",\"api_access\",\"team_management\"]", SortOrder = 3 }
            );
        });

        // ========== USER SUBSCRIPTIONS ==========
        modelBuilder.Entity<UserSubscription>(entity =>
        {
            entity.ToTable("user_subscriptions");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.PlanId).HasColumnName("plan_id");
            entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(20).HasDefaultValue("active");
            entity.Property(e => e.BillingCycle).HasColumnName("billing_cycle").HasMaxLength(10).HasDefaultValue("monthly");
            entity.Property(e => e.StartedAt).HasColumnName("started_at").HasDefaultValueSql("NOW()");
            entity.Property(e => e.ExpiresAt).HasColumnName("expires_at");
            entity.Property(e => e.CancelledAt).HasColumnName("cancelled_at");
            entity.Property(e => e.PaymentMethod).HasColumnName("payment_method").HasMaxLength(50);
            entity.Property(e => e.PaymentId).HasColumnName("payment_id").HasMaxLength(255);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("NOW()");

            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.Status);

            entity.HasOne(e => e.User).WithMany(u => u.UserSubscriptions).HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Plan).WithMany(p => p.UserSubscriptions).HasForeignKey(e => e.PlanId);
        });

        // ========== DOWNLOAD JOBS ==========
        modelBuilder.Entity<DownloadJob>(entity =>
        {
            entity.ToTable("download_jobs");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.OriginalUrl).HasColumnName("original_url").IsRequired();
            entity.Property(e => e.Platform).HasColumnName("platform").HasMaxLength(20).IsRequired();
            entity.Property(e => e.VideoId).HasColumnName("video_id").HasMaxLength(100);
            entity.Property(e => e.Title).HasColumnName("title").HasMaxLength(500);
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.Duration).HasColumnName("duration");
            entity.Property(e => e.ThumbnailUrl).HasColumnName("thumbnail_url");
            entity.Property(e => e.Quality).HasColumnName("quality").HasMaxLength(20).HasDefaultValue("auto");
            entity.Property(e => e.FileSize).HasColumnName("file_size");
            entity.Property(e => e.FileUrl).HasColumnName("file_url");
            entity.Property(e => e.FilePath).HasColumnName("file_path");
            entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(20).HasDefaultValue("pending");
            entity.Property(e => e.Progress).HasColumnName("progress").HasColumnType("smallint").HasDefaultValue((short)0);
            entity.Property(e => e.ErrorMessage).HasColumnName("error_message");
            entity.Property(e => e.DownloadMethod).HasColumnName("download_method").HasMaxLength(20).HasDefaultValue("auto");
            entity.Property(e => e.VideoFormat).HasColumnName("video_format").HasMaxLength(10).HasDefaultValue("mp4");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("NOW()");
            entity.Property(e => e.StartedAt).HasColumnName("started_at");
            entity.Property(e => e.CompletedAt).HasColumnName("completed_at");
            entity.Property(e => e.RetryCount).HasColumnName("retry_count").HasDefaultValue(0);
            entity.Property(e => e.MaxRetries).HasColumnName("max_retries").HasDefaultValue(3);

            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.Platform);
            entity.HasIndex(e => new { e.UserId, e.Status });
            entity.HasIndex(e => e.CreatedAt).IsDescending();

            entity.HasOne(e => e.User).WithMany(u => u.DownloadJobs).HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        // ========== PAYMENTS ==========
        modelBuilder.Entity<Payment>(entity =>
        {
            entity.ToTable("payments");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.SubscriptionId).HasColumnName("subscription_id");
            entity.Property(e => e.Amount).HasColumnName("amount").HasColumnType("decimal(12,2)");
            entity.Property(e => e.Currency).HasColumnName("currency").HasMaxLength(3).HasDefaultValue("USD");
            entity.Property(e => e.PaymentMethod).HasColumnName("payment_method").HasMaxLength(50);
            entity.Property(e => e.PaymentStatus).HasColumnName("payment_status").HasMaxLength(20).HasDefaultValue("pending");
            entity.Property(e => e.TransactionId).HasColumnName("transaction_id").HasMaxLength(255);
            entity.Property(e => e.PaymentIntentId).HasColumnName("payment_intent_id").HasMaxLength(255);
            entity.Property(e => e.PaymentMetadata).HasColumnName("payment_metadata").HasColumnType("jsonb");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("NOW()");
            entity.Property(e => e.CompletedAt).HasColumnName("completed_at");

            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.PaymentStatus);
            entity.HasIndex(e => e.CreatedAt).IsDescending();
            entity.HasIndex(e => e.TransactionId).IsUnique();

            entity.HasOne(e => e.User).WithMany(u => u.Payments).HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Subscription).WithMany(s => s.Payments).HasForeignKey(e => e.SubscriptionId).OnDelete(DeleteBehavior.SetNull);
        });

        // ========== AUDIT LOGS ==========
        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.ToTable("audit_logs");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.Action).HasColumnName("action").HasMaxLength(50).IsRequired();
            entity.Property(e => e.Entity).HasColumnName("entity").HasMaxLength(50);
            entity.Property(e => e.EntityId).HasColumnName("entity_id");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.IpAddress).HasColumnName("ip_address");
            entity.Property(e => e.UserAgent).HasColumnName("user_agent");
            entity.Property(e => e.Metadata).HasColumnName("metadata").HasColumnType("jsonb");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("NOW()");

            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.Action);
            entity.HasIndex(e => e.CreatedAt).IsDescending();

            entity.HasOne(e => e.User).WithMany(u => u.AuditLogs).HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.SetNull);
        });
    }

    public override int SaveChanges()
    {
        UpdateTimestamps();
        return base.SaveChanges();
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        UpdateTimestamps();
        return base.SaveChangesAsync(cancellationToken);
    }

    private void UpdateTimestamps()
    {
        var entries = ChangeTracker.Entries()
            .Where(e => e.State == EntityState.Modified);

        foreach (var entry in entries)
        {
            if (entry.Entity is User user) user.UpdatedAt = DateTime.UtcNow;
            if (entry.Entity is SubscriptionPlan plan) plan.UpdatedAt = DateTime.UtcNow;
        }
    }
}
