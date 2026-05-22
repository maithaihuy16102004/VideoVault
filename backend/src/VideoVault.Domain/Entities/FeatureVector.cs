namespace VideoVault.Domain.Entities;

public class FeatureVector
{
    public Guid Id { get; set; }
    public string EntityType { get; set; } = string.Empty; // "VIDEO", "HASHTAG", "CREATOR"
    public string EntityId { get; set; } = string.Empty;
    
    public string VectorModel { get; set; } = "clip-ViT-B-32";
    
    // Store array of floats as JSON or specific PG type in EF
    public string VectorDataJson { get; set; } = "[]";
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
