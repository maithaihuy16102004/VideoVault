using System.Diagnostics;
using System.Text.Json;
using System.Text.Json.Serialization;
using VideoVault.Contracts.Downloads;

namespace VideoVault.Application.Services;

/// <summary>
/// Calls video_downloader.py in scraping mode (--mode account / --mode hashtag)
/// to extract video lists from social media platforms.
/// </summary>
public class ScrapingService
{
    private readonly string _pythonPath = "python";
    private readonly string _scriptPath = @"d:\Work\video_downloader.py";

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    /// <summary>Scrape latest videos from a user account.</summary>
    public async Task<AccountInfoDto> ScrapeAccountAsync(string username, string platform = "douyin", int limit = 50)
    {
        var args = $"\"{_scriptPath}\" --mode account --username \"{username}\" --platform \"{platform}\" --limit {limit}";
        var (output, error, exitCode) = await RunPythonAsync(args);

        if (exitCode != 0 || string.IsNullOrWhiteSpace(output))
            throw new InvalidOperationException($"Scraping failed: {error}");

        // Parse the JSON line from stdout (skip emoji lines)
        var jsonLine = ExtractJsonLine(output);

        var raw = JsonSerializer.Deserialize<RawAccountResult>(jsonLine, JsonOpts)
            ?? throw new InvalidOperationException("Failed to parse account data.");

        if (!string.IsNullOrEmpty(raw.Error))
            throw new InvalidOperationException(raw.Error);

        return new AccountInfoDto(
            raw.Username ?? username,
            raw.Nickname ?? username,
            raw.Avatar ?? "",
            raw.Followers ?? "0",
            raw.Likes ?? "0",
            raw.VideoCount,
            raw.Videos.Select(v => new ScrapedVideoDto(
                v.VideoId, v.Url, v.Title, v.ThumbnailUrl,
                v.Author, v.Duration, v.Views, v.Likes, v.Platform
            )).ToList()
        );
    }

    /// <summary>Scrape trending videos by hashtag.</summary>
    public async Task<HashtagInfoDto> ScrapeHashtagAsync(string hashtag, string platform = "douyin", int limit = 50)
    {
        var args = $"\"{_scriptPath}\" --mode hashtag --hashtag \"{hashtag}\" --platform \"{platform}\" --limit {limit}";
        var (output, error, exitCode) = await RunPythonAsync(args);

        if (exitCode != 0 || string.IsNullOrWhiteSpace(output))
            throw new InvalidOperationException($"Scraping failed: {error}");

        var jsonLine = ExtractJsonLine(output);

        var raw = JsonSerializer.Deserialize<RawHashtagResult>(jsonLine, JsonOpts)
            ?? throw new InvalidOperationException("Failed to parse hashtag data.");

        if (!string.IsNullOrEmpty(raw.Error))
            throw new InvalidOperationException(raw.Error);

        return new HashtagInfoDto(
            raw.Hashtag ?? hashtag,
            raw.ViewCount ?? "0",
            raw.VideoCount,
            raw.Videos.Select(v => new ScrapedVideoDto(
                v.VideoId, v.Url, v.Title, v.ThumbnailUrl,
                v.Author, v.Duration, v.Views, v.Likes, v.Platform
            )).ToList()
        );
    }

    private async Task<(string Output, string Error, int ExitCode)> RunPythonAsync(string arguments)
    {
        var startInfo = new ProcessStartInfo
        {
            FileName = _pythonPath,
            Arguments = arguments,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
            StandardOutputEncoding = System.Text.Encoding.UTF8,
            StandardErrorEncoding = System.Text.Encoding.UTF8,
        };

        using var process = new Process { StartInfo = startInfo };

        var outputBuilder = new System.Text.StringBuilder();
        var errorBuilder = new System.Text.StringBuilder();

        process.OutputDataReceived += (_, e) => { if (e.Data != null) outputBuilder.AppendLine(e.Data); };
        process.ErrorDataReceived += (_, e) => { if (e.Data != null) errorBuilder.AppendLine(e.Data); };

        process.Start();
        process.BeginOutputReadLine();
        process.BeginErrorReadLine();

        // Timeout: 2 minutes for scraping
        var completed = await Task.Run(() => process.WaitForExit(120_000));
        if (!completed)
        {
            process.Kill(entireProcessTree: true);
            throw new TimeoutException("Scraping timed out after 120 seconds.");
        }

        return (outputBuilder.ToString(), errorBuilder.ToString(), process.ExitCode);
    }

    /// <summary>
    /// Extract the last valid JSON line from mixed output (emoji + JSON).
    /// The Python script outputs a JSON object as the last meaningful line.
    /// </summary>
    private static string ExtractJsonLine(string output)
    {
        var lines = output.Split('\n', StringSplitOptions.RemoveEmptyEntries);
        // Search from bottom up for a line starting with '{'
        for (int i = lines.Length - 1; i >= 0; i--)
        {
            var trimmed = lines[i].Trim();
            if (trimmed.StartsWith('{') && trimmed.EndsWith('}'))
                return trimmed;
        }
        // Fallback: return entire output and let JSON parser fail with a clear message
        return output.Trim();
    }

    // ── Raw deserialization models (match Python JSON output) ──

    private record RawAccountResult
    {
        public string? Error { get; init; }
        public string? Username { get; init; }
        public string? Nickname { get; init; }
        public string? Avatar { get; init; }
        public string? Followers { get; init; }
        public string? Likes { get; init; }
        public int VideoCount { get; init; }
        public List<RawVideo> Videos { get; init; } = [];
    }

    private record RawHashtagResult
    {
        public string? Error { get; init; }
        public string? Hashtag { get; init; }
        public string? ViewCount { get; init; }
        public int VideoCount { get; init; }
        public List<RawVideo> Videos { get; init; } = [];
    }

    private record RawVideo
    {
        public string VideoId { get; init; } = "";
        public string Url { get; init; } = "";
        public string Title { get; init; } = "";
        public string ThumbnailUrl { get; init; } = "";
        public string Author { get; init; } = "";
        public int Duration { get; init; }
        public string Views { get; init; } = "0";
        public string Likes { get; init; } = "0";
        public string Platform { get; init; } = "douyin";
    }
}
