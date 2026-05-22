namespace VideoVault.Domain.Entities;

public class CampaignRoi
{
    public Guid Id { get; set; }
    public string VideoId { get; set; } = string.Empty;
    public Guid UserId { get; set; }
    
    // Predicted ROI
    public decimal PredictedCpm { get; set; }
    public int PredictedFollowers { get; set; }
    public decimal PredictedRoiRatio { get; set; }
    
    // Actual Outcomes (For Reinforcement Learning)
    public decimal ActualSpend { get; set; }
    public int ActualFollowersGained { get; set; }
    public decimal ActualRoiRatio { get; set; }
    
    // ML Loop
    public bool IsUsedForTraining { get; set; } = false;
    public string? FeedbackNotes { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? AnalyzedAt { get; set; }
}
