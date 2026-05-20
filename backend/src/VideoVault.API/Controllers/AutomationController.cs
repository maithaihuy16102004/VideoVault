using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using VideoVault.Application.Services;
using VideoVault.Contracts.Automation;

namespace VideoVault.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AutomationController : ControllerBase
    {
        private readonly IPipelineService _pipelineService;
        private readonly ILogger<AutomationController> _logger;

        public AutomationController(IPipelineService pipelineService, ILogger<AutomationController> logger)
        {
            _pipelineService = pipelineService;
            _logger = logger;
        }

        [HttpPost("run")]
        public async Task<IActionResult> RunPipeline([FromForm] IFormFile file, [FromForm] string targetLanguage = "vi", [FromForm] string customPrompt = "")
        {
            if (file == null || file.Length == 0)
                return BadRequest("No video file uploaded.");

            var tempPath = Path.GetTempFileName() + Path.GetExtension(file.FileName);
            
            try
            {
                using (var stream = new FileStream(tempPath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }

                var request = new PipelineJobRequest
                {
                    VideoPath = tempPath,
                    TargetLanguage = targetLanguage,
                    CustomPrompt = customPrompt
                };

                _logger.LogInformation($"Received pipeline request for video: {file.FileName}");
                var resultSegments = await _pipelineService.RunPipelineAsync(request);

                return Ok(new
                {
                    Message = "Pipeline executed successfully",
                    TotalSegments = resultSegments.Count,
                    Data = resultSegments
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing automation pipeline");
                return StatusCode(500, new { Error = ex.Message });
            }
            finally
            {
                if (System.IO.File.Exists(tempPath))
                {
                    System.IO.File.Delete(tempPath);
                }
            }
        }
    }
}
