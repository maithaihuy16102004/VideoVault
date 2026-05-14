using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using VideoVault.Contracts.Downloads;
using VideoVault.Domain.Entities;
using VideoVault.Infrastructure.Data;

namespace VideoVault.Application.Services;

public class DownloadService
{
    private readonly AppDbContext _db;
    private readonly VideoProcessorService _processor;

    public DownloadService(AppDbContext db, VideoProcessorService processor)
    {
        _db = db;
        _processor = processor;
    }

    public async Task<DownloadJobDto> CreateJobAsync(Guid userId, CreateDownloadRequest request)
    {
        var user = await _db.Users
            .Include(u => u.SubscriptionPlan)
            .FirstOrDefaultAsync(u => u.Id == userId)
            ?? throw new KeyNotFoundException("User not found.");

        var plan = user.SubscriptionPlan;

        // ── 1. QUOTA RESET ──
        if (user.QuotaResetAt.HasValue && user.QuotaResetAt <= DateTime.UtcNow)
        {
            user.QuotaUsed = 0;
            user.QuotaResetAt = DateTime.UtcNow.AddDays(1);
        }

        // ── 2. DAILY QUOTA CHECK (theo plan) ──
        int dailyLimit = plan?.QuotaLimit ?? 5; // Free mặc định 5
        if (user.QuotaUsed >= dailyLimit)
            throw new InvalidOperationException(
                $"Bạn đã hết lượt tải hôm nay ({dailyLimit} lượt/ngày). Nâng cấp gói để tải thêm.");

        // ── 3. CONCURRENT DOWNLOADS CHECK ──
        int maxConcurrent = plan?.MaxConcurrentDownloads ?? 1;
        int activeCount = await _db.DownloadJobs
            .CountAsync(j => j.UserId == userId && (j.Status == "pending" || j.Status == "processing"));
        if (activeCount >= maxConcurrent)
            throw new InvalidOperationException(
                $"Gói {plan?.DisplayName ?? "Free"} chỉ cho phép tải {maxConcurrent} video cùng lúc. Vui lòng chờ hoặc nâng cấp gói.");

        // ── 4. RESOLVE MAX QUALITY (theo plan) ──
        string maxQuality = plan?.MaxVideoQuality ?? "720p";

        var platform = DetectPlatform(request.Url);

        var job = new DownloadJob
        {
            UserId = userId,
            OriginalUrl = request.Url,
            Platform = platform,
            Quality = maxQuality,  // Gán quality theo plan
            Status = "pending",
        };

        _db.DownloadJobs.Add(job);
        user.QuotaUsed++;
        
        // Set quota reset nếu chưa có
        if (!user.QuotaResetAt.HasValue)
            user.QuotaResetAt = DateTime.UtcNow.AddDays(1);

        await _db.SaveChangesAsync();

        // Trigger processing in background, truyền maxQuality
        _ = Task.Run(() => _processor.ProcessJobAsync(job.Id, maxQuality));

        return MapToDto(job);
    }

    public async Task<List<DownloadJobDto>> GetHistoryAsync(Guid userId, int page = 1, int pageSize = 20)
    {
        var jobs = await _db.DownloadJobs
            .Where(j => j.UserId == userId)
            .OrderByDescending(j => j.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return jobs.Select(MapToDto).ToList();
    }

    public async Task<DownloadJobDto?> GetJobAsync(Guid userId, Guid jobId)
    {
        var job = await GetJobEntityAsync(userId, jobId);
        return job == null ? null : MapToDto(job);
    }

    public async Task<DownloadJob?> GetJobEntityAsync(Guid userId, Guid jobId)
    {
        return await _db.DownloadJobs.FirstOrDefaultAsync(j => j.Id == jobId && j.UserId == userId);
    }

    public async Task<bool> CancelJobAsync(Guid userId, Guid jobId)
    {
        var job = await _db.DownloadJobs
            .FirstOrDefaultAsync(j => j.Id == jobId && j.UserId == userId);

        if (job == null) return false;
        if (job.Status is "completed" or "cancelled") return false;

        job.Status = "cancelled";
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteJobAsync(Guid userId, Guid jobId)
    {
        var job = await _db.DownloadJobs
            .FirstOrDefaultAsync(j => j.Id == jobId && j.UserId == userId);

        if (job == null) return false;

        _db.DownloadJobs.Remove(job);
        await _db.SaveChangesAsync();
        return true;
    }

    private static string DetectPlatform(string url)
    {
        if (Regex.IsMatch(url, @"douyin\.com|v\.douyin\.com")) return "douyin";
        if (Regex.IsMatch(url, @"tiktok\.com")) return "tiktok";
        if (Regex.IsMatch(url, @"xiaohongshu\.com|xhslink\.com")) return "xhs";
        if (Regex.IsMatch(url, @"bilibili\.com|bilibili\.tv|b23\.tv")) return "bilibili";
        if (Regex.IsMatch(url, @"youtube\.com|youtu\.be")) return "youtube";
        if (Regex.IsMatch(url, @"instagram\.com")) return "instagram";
        if (Regex.IsMatch(url, @"facebook\.com|fb\.watch")) return "facebook";
        return "other";
    }

    private static DownloadJobDto MapToDto(DownloadJob job) => new(
        job.Id, job.OriginalUrl, job.Platform, job.Title,
        job.Quality, job.Status, job.Progress,
        job.FileSize, job.FileUrl, job.ErrorMessage,
        job.CreatedAt, job.CompletedAt,
        // Include subtitle path if available
        job.SubtitlePath
    );
}
