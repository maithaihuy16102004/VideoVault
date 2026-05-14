using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VideoVault.Application.Services;
using VideoVault.Contracts.Common;
using VideoVault.Contracts.Downloads;

namespace VideoVault.API.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class DownloadsController : ControllerBase
{
    private readonly DownloadService _downloadService;
    private readonly ScrapingService _scrapingService;

    public DownloadsController(DownloadService downloadService, ScrapingService scrapingService)
    {
        _downloadService = downloadService;
        _scrapingService = scrapingService;
    }

    /// <summary>Create a new download job.</summary>
    [HttpPost]
    public async Task<IActionResult> CreateJob([FromBody] CreateDownloadRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        try
        {
            var job = await _downloadService.CreateJobAsync(userId.Value, request);
            return CreatedAtAction(nameof(GetJob), new { id = job.Id }, new ApiResponse<DownloadJobDto>(true, job, "Download job created."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ApiResponse<string>(false, null, ex.Message));
        }
    }

    /// <summary>Get download history for current user.</summary>
    [HttpGet]
    public async Task<IActionResult> GetHistory([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var jobs = await _downloadService.GetHistoryAsync(userId.Value, page, pageSize);
        return Ok(new ApiResponse<List<DownloadJobDto>>(true, jobs));
    }

    /// <summary>Get a specific download job status.</summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetJob(Guid id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var job = await _downloadService.GetJobAsync(userId.Value, id);
        if (job == null) return NotFound(new ApiResponse<string>(false, null, "Download job not found."));

        return Ok(new ApiResponse<DownloadJobDto>(true, job));
    }

    /// <summary>Download the physical file - optimized streaming.</summary>
    [HttpGet("{id:guid}/file")]
    public async Task<IActionResult> GetFile(Guid id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var job = await _downloadService.GetJobEntityAsync(userId.Value, id);
        if (job == null || string.IsNullOrEmpty(job.FilePath) || !System.IO.File.Exists(job.FilePath))
            return NotFound("File not found or not ready.");

        var ext = System.IO.Path.GetExtension(job.FilePath).ToLowerInvariant();
        var contentType = ext switch
        {
            ".mp4" => "video/mp4",
            ".webm" => "video/webm",
            ".mkv" => "video/x-matroska",
            ".mov" => "video/quicktime",
            _ => "application/octet-stream"
        };

        // 64KB buffer for fast streaming
        var stream = new System.IO.FileStream(
            job.FilePath,
            System.IO.FileMode.Open,
            System.IO.FileAccess.Read,
            System.IO.FileShare.Read,
            bufferSize: 65536,
            useAsync: true
        );
        return File(stream, contentType, System.IO.Path.GetFileName(job.FilePath), enableRangeProcessing: true);
    }

    /// <summary>Cancel a pending or processing download job.</summary>
    [HttpPut("{id:guid}/cancel")]
    public async Task<IActionResult> CancelJob(Guid id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var success = await _downloadService.CancelJobAsync(userId.Value, id);
        if (!success) return BadRequest(new ApiResponse<string>(false, null, "Cannot cancel this job."));

        return Ok(new ApiResponse<string>(true, null, "Job cancelled."));
    }

    /// <summary>Delete a completed or cancelled download job.</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteJob(Guid id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var success = await _downloadService.DeleteJobAsync(userId.Value, id);
        if (!success) return NotFound(new ApiResponse<string>(false, null, "Download job not found."));

        return Ok(new ApiResponse<string>(true, null, "Job deleted."));
    }

    // ─── SCRAPING ENDPOINTS ────────────────────────────────────────

    /// <summary>Scrape latest videos from a user account (calls video_downloader.py --mode account).</summary>
    [HttpGet("scrape/account")]
    public async Task<IActionResult> ScrapeAccount([FromQuery] string username, [FromQuery] string platform = "douyin")
    {
        if (string.IsNullOrWhiteSpace(username))
            return BadRequest(new ApiResponse<string>(false, null, "Username is required."));

        try
        {
            var result = await _scrapingService.ScrapeAccountAsync(username, platform);
            return Ok(new ApiResponse<AccountInfoDto>(true, result));
        }
        catch (Exception ex)
        {
            return StatusCode(500, new ApiResponse<string>(false, null, ex.Message));
        }
    }

    /// <summary>Scrape trending videos by hashtag (calls video_downloader.py --mode hashtag).</summary>
    [HttpGet("scrape/hashtag")]
    public async Task<IActionResult> ScrapeHashtag([FromQuery] string hashtag, [FromQuery] string platform = "douyin")
    {
        if (string.IsNullOrWhiteSpace(hashtag))
            return BadRequest(new ApiResponse<string>(false, null, "Hashtag is required."));

        try
        {
            var result = await _scrapingService.ScrapeHashtagAsync(hashtag, platform);
            return Ok(new ApiResponse<HashtagInfoDto>(true, result));
        }
        catch (Exception ex)
        {
            return StatusCode(500, new ApiResponse<string>(false, null, ex.Message));
        }
    }

    /// <summary>Batch download multiple videos at once.</summary>
    [HttpPost("batch")]
    public async Task<IActionResult> BatchDownload([FromBody] BatchDownloadRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var jobs = new List<DownloadJobDto>();
        var failed = new List<string>();

        foreach (var url in request.Urls)
        {
            try
            {
                var job = await _downloadService.CreateJobAsync(userId.Value, new CreateDownloadRequest(url, request.Quality));
                jobs.Add(job);
            }
            catch (Exception ex)
            {
                failed.Add($"{url}: {ex.Message}");
            }
        }

        var response = new BatchDownloadResponse(jobs, failed);
        return Ok(new ApiResponse<BatchDownloadResponse>(true, response, $"{jobs.Count} jobs created, {failed.Count} failed."));
    }

    private Guid? GetUserId()
    {
        var claim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        return claim != null && Guid.TryParse(claim.Value, out var id) ? id : null;
    }
}
