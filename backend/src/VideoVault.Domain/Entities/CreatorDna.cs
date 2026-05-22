namespace VideoVault.Domain.Entities;

public class CreatorDna
{
    public Guid Id { get; set; }
    public string ChannelUrl { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    
    // DNA Attributes
    public string PrimaryStyle { get; set; } = string.Empty;
    public string AveragePacing { get; set; } = string.Empty;
    public string HookPattern { get; set; } = string.Empty;
    
    // Aggregated Metrics
    public int TotalVideosAnalyzed { get; set; }
    public double AverageRetention { get; set; }
    
    public string? VectorDataJson { get; set; }
    
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
}
