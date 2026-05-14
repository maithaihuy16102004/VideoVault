namespace VideoVault.Domain.Entities;

public class User
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string? FullName { get; set; }
    public string? AvatarUrl { get; set; }

    // Role & Status — mapped to user_role ENUM as string
    public string Role { get; set; } = "user";
    public bool IsActive { get; set; } = true;
    public bool IsEmailVerified { get; set; } = false;

    // Subscription info
    public Guid? SubscriptionPlanId { get; set; }
    public int QuotaUsed { get; set; } = 0;
    public int QuotaTotal { get; set; } = 5;
    public DateTime? QuotaResetAt { get; set; }

    // Timestamps (UTC)
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastLoginAt { get; set; }

    // Navigation properties
    public SubscriptionPlan? SubscriptionPlan { get; set; }
    public ICollection<DownloadJob> DownloadJobs { get; set; } = new List<DownloadJob>();
    public ICollection<UserSubscription> UserSubscriptions { get; set; } = new List<UserSubscription>();
    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
    public ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();
}
