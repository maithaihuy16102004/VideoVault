namespace VideoVault.Domain.Entities;

public class RetentionSimulation
{
    public Guid Id { get; set; }
    public string VideoUrl { get; set; } = string.Empty;
    
    // Drop-off predictions
    public double Drop0To3s { get; set; }
    public double Drop3To5s { get; set; }
    
    // Realtime vs Simulation
    public double PredictedCompletionRate { get; set; }
    public double ReplayProbability { get; set; }
    
    public string? DetailedTimelineJson { get; set; }
    
    public string ModelVersion { get; set; } = "lightgbm-ret-v2";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
