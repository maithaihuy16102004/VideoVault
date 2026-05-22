namespace VideoVault.Domain.Entities;

public class TrendCluster
{
    public Guid Id { get; set; }
    public string ClusterName { get; set; } = string.Empty;
    
    // HDBSCAN cluster ID
    public int ClusterId { get; set; }
    
    public string Niche { get; set; } = string.Empty;
    public double MomentumScore { get; set; }
    
    public bool IsEmerging { get; set; } = false;
    public bool IsSaturated { get; set; } = false;
    
    public DateTime DiscoveredAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; } // TTL for stale trends
}
