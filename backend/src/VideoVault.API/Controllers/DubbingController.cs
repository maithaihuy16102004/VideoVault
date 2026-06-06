using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VideoVault.Application.Services;
using VideoVault.Contracts.Automation;

namespace VideoVault.API.Controllers
{
    [ApiController]
    [Route("api/v1/dubbing")]
    [Authorize]
    public class DubbingController : ControllerBase
    {
        private readonly IDubbingPipelineService _dubbingService;

        public DubbingController(IDubbingPipelineService dubbingService)
        {
            _dubbingService = dubbingService;
        }

        [HttpPost("start")]
        [AllowAnonymous]
        public async Task<IActionResult> StartPipeline([FromBody] DubbingPipelineRequest request)
        {
            if (string.IsNullOrEmpty(request.VideoPath)) return BadRequest(new { error = "VideoPath is required" });

            try
            {
                var status = await _dubbingService.StartPipelineAsync(request);
                return Ok(status);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Failed to start dubbing pipeline: " + ex.Message });
            }
        }

        [HttpGet("status/{jobId}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetStatus(string jobId)
        {
            try
            {
                var status = await _dubbingService.GetStatusAsync(jobId);
                return Ok(status);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Failed to get status: " + ex.Message });
            }
        }
        
        [HttpGet("{jobId}/download")]
        [AllowAnonymous]
        public async Task<IActionResult> DownloadVideo(string jobId)
        {
            try
            {
                var status = await _dubbingService.GetStatusAsync(jobId);
                
                if (status.Status != "completed" || string.IsNullOrEmpty(status.OutputVideoPath))
                {
                    return BadRequest(new { error = "Video is not ready yet." });
                }

                if (!System.IO.File.Exists(status.OutputVideoPath))
                {
                    return NotFound(new { error = "File not found on server." });
                }

                var stream = new FileStream(status.OutputVideoPath, FileMode.Open, FileAccess.Read, FileShare.Read);
                return File(stream, "video/mp4", Path.GetFileName(status.OutputVideoPath), enableRangeProcessing: true);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Failed to download video: " + ex.Message });
            }
        }
    }
}
