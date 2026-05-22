namespace VideoVault.Domain.Entities;

public class AiAnalysisLog
{
    public Guid Id { get; set; }
    public string VideoUrl { get; set; } = string.Empty;
    public string Platform { get; set; } = string.Empty;
    
    // Model versions used for tracking MLOps
    public string RankingModelVersion { get; set; } = "xgb-v1.0";
    public string LlmVersion { get; set; } = "gemini-2.5-flash";
    
    // Predicted Metrics
    public double PredictedViralScore { get; set; }
    public double PredictedWatchTime { get; set; }
    public string RecommendationLevel { get; set; } = "NOT_RECOMMENDED";
    
    // Raw inputs and outputs
    public string? RawLlmPrompt { get; set; }
    public string? RawLlmResponse { get; set; }
    public string? ExtractedFeaturesJson { get; set; }
    
    // Confidence & Tracking
    public double ConfidenceScore { get; set; }
    public bool UsedMetricRecovery { get; set; } = false;
    
    // Timestamps
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
