namespace VideoVault.Domain.Entities;

public class Payment
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid? SubscriptionId { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "USD";
    public string PaymentMethod { get; set; } = string.Empty;
    public string PaymentStatus { get; set; } = "pending";
    public string? TransactionId { get; set; }
    public string? PaymentIntentId { get; set; }
    public string? PaymentMetadata { get; set; } = "{}";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }

    // Navigation
    public User User { get; set; } = null!;
    public UserSubscription? Subscription { get; set; }
}
