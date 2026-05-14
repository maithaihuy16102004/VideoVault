namespace VideoVault.Contracts.Downloads;

public record CreateDownloadRequest(string Url, string Quality = "auto");

public record DownloadJobDto(
    Guid Id,
    string OriginalUrl,
    string Platform,
    string? Title,
    string Quality,
    string Status,
    short Progress,
    long? FileSize,
    string? FileUrl,
    string? ErrorMessage,
    DateTime CreatedAt,
    DateTime? CompletedAt,
    // New field for subtitle path (SRT)
    string? SubtitlePath
);

// ── Scraping DTOs ──────────────────────────────────────

public record ScrapedVideoDto(
    string VideoId,
    string Url,
    string Title,
    string ThumbnailUrl,
    string Author,
    int Duration,
    string Views,
    string Likes,
    string Platform
);

public record AccountInfoDto(
    string Username,
    string Nickname,
    string Avatar,
    string Followers,
    string Likes,
    int VideoCount,
    List<ScrapedVideoDto> Videos
);

public record HashtagInfoDto(
    string Hashtag,
    string ViewCount,
    int VideoCount,
    List<ScrapedVideoDto> Videos
);

public record BatchDownloadRequest(List<string> Urls, string Quality = "auto");

public record BatchDownloadResponse(
    List<DownloadJobDto> Jobs,
    List<string> Failed
);
