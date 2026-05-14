namespace VideoVault.Domain.Entities;

public class UserSubscription
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid PlanId { get; set; }
    public string Status { get; set; } = "active";
    public string BillingCycle { get; set; } = "monthly";
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ExpiresAt { get; set; }
    public DateTime? CancelledAt { get; set; }
    public string? PaymentMethod { get; set; }
    public string? PaymentId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public User User { get; set; } = null!;
    public SubscriptionPlan Plan { get; set; } = null!;
    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
}
