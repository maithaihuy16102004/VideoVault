using System.Diagnostics;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VideoVault.Domain.Entities;
using VideoVault.Infrastructure.Data;

namespace VideoVault.Application.Services;

public class VideoProcessorService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly string _pythonPath = "python";
    private readonly string _scriptPath = "d:\\Work\\video_downloader.py";

    public VideoProcessorService(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }

    public async Task ProcessJobAsync(Guid jobId, string maxQuality = "Original")
    {
        using var scope = _serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var job = await db.DownloadJobs.FindAsync(jobId);
        if (job == null || job.Status != "pending") return;

        try
        {
            job.Status = "processing";
            job.StartedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();

            // Run Python Script with quality constraint
            var result = await RunPythonDownloader(job.OriginalUrl, jobId, maxQuality);

            if (result.Success)
            {
                job.Status = "completed";
                job.Progress = 100;
                job.CompletedAt = DateTime.UtcNow;
                job.Title = ExtractTitle(result.Output) ?? job.Title;
                job.FilePath = ExtractFilePath(result.Output);
                job.FileSize = ExtractFileSize(result.Output);
                job.FileUrl = $"/api/v1/downloads/{job.Id}/file";
            }
            else
            {
                job.Status = "failed";
                job.ErrorMessage = result.Error;
            }
        }
        catch (Exception ex)
        {
            job.Status = "failed";
            job.ErrorMessage = ex.Message;
        }

        await db.SaveChangesAsync();
    }

    private async Task<(bool Success, string Output, string Error)> RunPythonDownloader(
        string url, Guid jobId, string maxQuality)
    {
        var startInfo = new ProcessStartInfo
        {
            FileName = _pythonPath,
            Arguments = $"\"{_scriptPath}\" --url \"{url}\" --quality \"{maxQuality}\" --json",
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
        };

        using var process = new Process { StartInfo = startInfo };
        
        var outputBuilder = new System.Text.StringBuilder();
        var errorBuilder = new System.Text.StringBuilder();

        process.OutputDataReceived += (s, e) => { 
            if (e.Data != null) 
            {
                outputBuilder.AppendLine(e.Data); 
                
                // Parse progress: "Tiến trình: 45%" OR "[download]  45.5%"
                var match = System.Text.RegularExpressions.Regex.Match(e.Data, @"Tiến trình:\s*(\d+)%|\[download\]\s+(\d+)(?:\.\d+)?%");
                if (match.Success)
                {
                    string progressStr = match.Groups[1].Success ? match.Groups[1].Value : match.Groups[2].Value;
                    if (int.TryParse(progressStr, out int progress))
                    {
                        try 
                        {
                            using var scope = _serviceProvider.CreateScope();
                            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                            dbContext.Database.ExecuteSqlRaw("UPDATE download_jobs SET progress = {0} WHERE id = {1}", progress, jobId);
                        } 
                        catch { /* ignore temporary db locks */ }
                    }
                }
            }
        };
        process.ErrorDataReceived += (s, e) => { if (e.Data != null) errorBuilder.AppendLine(e.Data); };

        process.Start();
        process.BeginOutputReadLine();
        process.BeginErrorReadLine();

        await process.WaitForExitAsync();

        return (process.ExitCode == 0, outputBuilder.ToString(), errorBuilder.ToString());
    }

    private string? ExtractTitle(string output)
    {
        var match = System.Text.RegularExpressions.Regex.Match(output, @"📹 Tiêu đề:\s*(.+)");
        return match.Success ? match.Groups[1].Value.Trim() : null; 
    }

    private string? ExtractFilePath(string output)
    {
        var match = System.Text.RegularExpressions.Regex.Match(output, @"📁 File:\s*(.+)");
        return match.Success ? match.Groups[1].Value.Trim() : null; 
    }

    private long? ExtractFileSize(string output)
    {
        var match = System.Text.RegularExpressions.Regex.Match(output, @"\(([\d.]+) MB\)");
        if (match.Success && double.TryParse(match.Groups[1].Value, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out double mb))
        {
            return (long)(mb * 1024 * 1024);
        }
        return null;
    }
}
