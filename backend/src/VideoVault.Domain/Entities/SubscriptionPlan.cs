namespace VideoVault.Domain.Entities;

public class SubscriptionPlan
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? Description { get; set; }

    // Pricing — NUMERIC(12,2) for larger amounts
    public decimal PriceMonthly { get; set; }
    public decimal? PriceYearly { get; set; }

    // Limits
    public int QuotaLimit { get; set; }
    public string QuotaPeriod { get; set; } = "daily";
    public int? MaxVideoDuration { get; set; }
    public string MaxVideoQuality { get; set; } = "1080p";
    public int MaxConcurrentDownloads { get; set; } = 3;

    // Features (JSONB)
    public string Features { get; set; } = "[\"basic_download\"]";
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<User> Users { get; set; } = new List<User>();
    public ICollection<UserSubscription> UserSubscriptions { get; set; } = new List<UserSubscription>();
}
