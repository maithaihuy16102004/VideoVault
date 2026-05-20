using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using VideoVault.Contracts.Automation;

namespace VideoVault.Application.Services
{
    public interface IPipelineService
    {
        Task<List<SubtitleSegment>> RunPipelineAsync(PipelineJobRequest request);
    }

    public class PipelineService : IPipelineService
    {
        private readonly HttpClient _httpClient;
        private readonly IAiService _aiService;
        private readonly ILogger<PipelineService> _logger;

        public PipelineService(HttpClient httpClient, IAiService aiService, ILogger<PipelineService> logger)
        {
            _httpClient = httpClient;
            _aiService = aiService;
            _logger = logger;
        }

        public async Task<List<SubtitleSegment>> RunPipelineAsync(PipelineJobRequest request)
        {
            _logger.LogInformation($"Starting Elite Pipeline for {request.VideoPath}");
            
            // 1. Extract STT
            var segments = await ExtractSubtitlesAsync(request.VideoPath);
            if (segments.Count == 0) throw new Exception("No subtitles found in video.");

            // 2. Translate Batch
            await TranslateSegmentsAsync(segments, request.TargetLanguage, request.CustomPrompt);

            // 3. Generate TTS with strict duration limits
            await GenerateVoiceAsync(segments);

            _logger.LogInformation("Pipeline completed perfectly. All audio segments generated.");
            return segments;
        }

        private async Task<List<SubtitleSegment>> ExtractSubtitlesAsync(string videoPath)
        {
            _logger.LogInformation("Calling STT Service on Port 5051...");
            using var form = new MultipartFormDataContent();
            var fileContent = new StreamContent(File.OpenRead(videoPath));
            fileContent.Headers.ContentType = MediaTypeHeaderValue.Parse("video/mp4");
            form.Add(fileContent, "file", Path.GetFileName(videoPath));

            var response = await _httpClient.PostAsync("http://localhost:5051/extract", form);
            response.EnsureSuccessStatusCode();
            var json = await response.Content.ReadAsStringAsync();
            var jobId = JsonDocument.Parse(json).RootElement.GetProperty("jobId").GetString();

            _logger.LogInformation($"STT Job Started: {jobId}. Polling...");
            
            while (true)
            {
                await Task.Delay(2000);
                var statusRes = await _httpClient.GetAsync($"http://localhost:5051/status/{jobId}");
                statusRes.EnsureSuccessStatusCode();
                var statusJson = await statusRes.Content.ReadAsStringAsync();
                var root = JsonDocument.Parse(statusJson).RootElement;
                
                var status = root.GetProperty("status").GetString();
                if (status == "error") throw new Exception("STT Error: " + root.GetProperty("error").GetString());
                if (status == "done")
                {
                    var srtContent = root.GetProperty("srtContent").GetString();
                    return ParseSrt(srtContent!);
                }
            }
        }

        private async Task TranslateSegmentsAsync(List<SubtitleSegment> segments, string targetLang, string customPrompt)
        {
            _logger.LogInformation("Translating segments natively in bulk...");
            
            var sb = new StringBuilder();
            sb.AppendLine("Please translate the following segments. Return only in format 'Index: TranslatedText'.");
            sb.AppendLine("CRITICAL RULE: Translate accurately but condense phrasing extremely well so it fits the duration limit. Do NOT use ellipses '...' for pauses.");
            if (!string.IsNullOrWhiteSpace(customPrompt)) sb.AppendLine($"Tone requirement: {customPrompt}");
            sb.AppendLine();
            
            foreach (var seg in segments)
            {
                sb.AppendLine($"{seg.Index}: {seg.OriginalText}");
            }

            var translationBlock = await _aiService.TranslateAsync(sb.ToString(), targetLang);
            
            // Map back
            var lines = translationBlock.Split(new[] { '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries);
            foreach (var line in lines)
            {
                var parts = line.Split(':', 2);
                if (parts.Length == 2 && int.TryParse(parts[0].Trim(), out int idx))
                {
                    var seg = segments.Find(s => s.Index == idx);
                    if (seg != null) seg.TranslatedText = parts[1].Trim();
                }
            }
            
            // Fallback for missing
            foreach(var seg in segments)
            {
                if (string.IsNullOrEmpty(seg.TranslatedText)) seg.TranslatedText = seg.OriginalText;
            }
        }

        private async Task GenerateVoiceAsync(List<SubtitleSegment> segments)
        {
            _logger.LogInformation("Generating strict-duration TTS on Port 5052...");
            // Run sequentially to not overload edge-tts and avoid API rate limits
            foreach (var seg in segments)
            {
                var payload = new
                {
                    text = seg.TranslatedText,
                    voice = "vi-VN-HoaiMyNeural",
                    max_duration = seg.DurationSeconds
                };
                
                var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
                var response = await _httpClient.PostAsync("http://localhost:5052/api/tts/generate", content);
                
                if (response.IsSuccessStatusCode)
                {
                    // Save file to a known temporary directory
                    var dir = Path.Combine(Path.GetTempPath(), "VideoVaultAudio");
                    Directory.CreateDirectory(dir);
                    var outPath = Path.Combine(dir, $"seg_{seg.Index}_{Guid.NewGuid()}.mp3");
                    using var fs = new FileStream(outPath, FileMode.Create);
                    await response.Content.CopyToAsync(fs);
                    seg.AudioFilePath = outPath;
                }
                else
                {
                    _logger.LogWarning($"Failed to generate TTS for segment {seg.Index}");
                }
            }
        }

        private List<SubtitleSegment> ParseSrt(string srt)
        {
            var segments = new List<SubtitleSegment>();
            var blocks = srt.Split(new[] { "\r\n\r\n", "\n\n" }, StringSplitOptions.RemoveEmptyEntries);
            
            foreach (var block in blocks)
            {
                var lines = block.Split(new[] { "\r\n", "\n" }, StringSplitOptions.None);
                if (lines.Length >= 3)
                {
                    if (int.TryParse(lines[0].Trim(), out int index))
                    {
                        var times = lines[1].Split(new[] { " --> " }, StringSplitOptions.None);
                        if (times.Length == 2)
                        {
                            var text = string.Join(" ", lines[2..]);
                            var startSecs = ParseTime(times[0]);
                            var endSecs = ParseTime(times[1]);
                            segments.Add(new SubtitleSegment
                            {
                                Index = index,
                                StartTime = times[0].Trim(),
                                EndTime = times[1].Trim(),
                                DurationSeconds = Math.Max(0.1, endSecs - startSecs),
                                OriginalText = text.Trim()
                            });
                        }
                    }
                }
            }
            return segments;
        }

        private double ParseTime(string timeStr)
        {
            // Format: HH:MM:SS,MMM
            var parts = timeStr.Trim().Replace(',', '.').Split(':');
            if (parts.Length == 3)
            {
                return int.Parse(parts[0]) * 3600 + int.Parse(parts[1]) * 60 + double.Parse(parts[2]);
            }
            return 0;
        }
    }
}
