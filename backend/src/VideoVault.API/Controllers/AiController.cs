using System;
using System.Diagnostics;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VideoVault.Application.Services;

namespace VideoVault.API.Controllers
{
    [ApiController]
    [Route("api/v1/ai")]
    [Authorize]
    public class AiController : ControllerBase
    {
        private readonly IAiService _aiService;

        public AiController(IAiService aiService)
        {
            _aiService = aiService;
        }

        public class GenerateCaptionRequest
        {
            public string Url { get; set; } = string.Empty;
        }

        [HttpPost("generate-caption")]
        public async Task<IActionResult> GenerateCaption([FromBody] GenerateCaptionRequest request)
        {
            if (string.IsNullOrEmpty(request.Url)) return BadRequest(new { error = "URL is required" });

            // Call video_downloader.py --mode info
            var scriptPath = "d:\\Work\\services\\video_downloader\\video_downloader.py";
            var startInfo = new ProcessStartInfo
            {
                FileName = "python",
                Arguments = $"\"{scriptPath}\" --url \"{request.Url}\" --mode info --json",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true,
            };

            using var process = new Process { StartInfo = startInfo };
            process.Start();
            string output = await process.StandardOutput.ReadToEndAsync();
            await process.WaitForExitAsync();

            if (process.ExitCode != 0)
            {
                return BadRequest(new { error = "Failed to extract info from URL" });
            }

            try
            {
                // Find JSON string from python output
                var jsonStr = output.Trim();
                var startIndex = jsonStr.IndexOf('{');
                var endIndex = jsonStr.LastIndexOf('}');
                if (startIndex >= 0 && endIndex > startIndex)
                {
                    jsonStr = jsonStr.Substring(startIndex, endIndex - startIndex + 1);
                }

                // Parse JSON output from python
                var jsonDoc = JsonDocument.Parse(jsonStr);
                var root = jsonDoc.RootElement;
                
                if (root.TryGetProperty("error", out var err))
                {
                    return BadRequest(new { error = err.GetString() });
                }

                string title = root.TryGetProperty("title", out var t) ? t.GetString() ?? "" : "";
                string description = root.TryGetProperty("description", out var d) ? d.GetString() ?? "" : "";
                
                var tags = new System.Collections.Generic.List<string>();
                if (root.TryGetProperty("tags", out var tgs) && tgs.ValueKind == JsonValueKind.Array)
                {
                    foreach (var tag in tgs.EnumerateArray()) tags.Add(tag.GetString() ?? "");
                }

                var result = await _aiService.GenerateCaptionAndHashtagsAsync(title, description, tags.ToArray());
                
                // Result is expected to be JSON string like { "caption": "...", "hashtags": [...] }
                var cleanJson = result.Trim();
                
                // Try to extract JSON from inside ```json ... ``` or ``` ... ```
                var match = Regex.Match(cleanJson, @"```(?:json)?\s*(.*?)\s*```", RegexOptions.Singleline | RegexOptions.IgnoreCase);
                if (match.Success)
                {
                    cleanJson = match.Groups[1].Value.Trim();
                }

                // Further clean by finding the first '{' and the last '}' to handle any leading/trailing garbage/backticks
                var firstCurly = cleanJson.IndexOf('{');
                var lastCurly = cleanJson.LastIndexOf('}');
                if (firstCurly >= 0 && lastCurly > firstCurly)
                {
                    cleanJson = cleanJson.Substring(firstCurly, lastCurly - firstCurly + 1).Trim();
                }

                var aiDoc = JsonDocument.Parse(cleanJson);
                return Ok(aiDoc.RootElement);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "AI generation failed: " + ex.Message });
            }
        }
    }
}
