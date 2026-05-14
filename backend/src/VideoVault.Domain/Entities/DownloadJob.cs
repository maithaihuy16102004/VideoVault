namespace VideoVault.Domain.Entities;

public class DownloadJob
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }

    // Video info
    public string OriginalUrl { get; set; } = string.Empty;
    public string Platform { get; set; } = string.Empty;
    public string? VideoId { get; set; }

    // Metadata
    public string? Title { get; set; }
    public string? Description { get; set; }
    public int? Duration { get; set; }
    public string? ThumbnailUrl { get; set; }

    // Download details
    public string Quality { get; set; } = "auto";
    public long? FileSize { get; set; }
    public string? FileUrl { get; set; }
    public string? FilePath { get; set; }
    // New property to store extracted subtitle (SRT) file path
    public string? SubtitlePath { get; set; }

    // Status & Progress — progress is SMALLINT in DB
    public string Status { get; set; } = "pending";
    public short Progress { get; set; } = 0;
    public string? ErrorMessage { get; set; }

    // Technical — video_format mapped to ENUM
    public string DownloadMethod { get; set; } = "auto";
    public string VideoFormat { get; set; } = "mp4";

    // Timestamps (UTC)
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }

    // Retry — CHECK (>= 0) in DB
    public int RetryCount { get; set; } = 0;
    public int MaxRetries { get; set; } = 3;

    // Navigation
    public User User { get; set; } = null!;
}
