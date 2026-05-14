using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VideoVault.Application.Services;
using VideoVault.Contracts.Ai;
using System.Threading.Tasks;

namespace VideoVault.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    // [Authorize] // Uncomment this in production to require auth
    public class AiController : ControllerBase
    {
        private readonly IAiService _aiService;

        public AiController(IAiService aiService)
        {
            _aiService = aiService;
        }

        [HttpPost("rewrite")]
        public async Task<IActionResult> Rewrite([FromBody] RewriteRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Text))
            {
                return BadRequest("Text is required.");
            }

            try
            {
                var rewrittenText = await _aiService.RewriteTextAsync(request.Text, request.Tone, request.TargetLanguage);
                return Ok(new RewriteResponse
                {
                    OriginalText = request.Text,
                    RewrittenText = rewrittenText,
                    Tone = request.Tone
                });
            }
            catch (System.Exception ex)
            {
                return StatusCode(500, new { message = "AI processing failed", error = ex.Message });
            }
        }

        [HttpPost("translate")]
        public async Task<IActionResult> Translate([FromBody] TranslateRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Text))
            {
                return BadRequest("Text is required.");
            }

            try
            {
                var translatedText = await _aiService.TranslateAsync(request.Text, request.TargetLanguage);
                return Ok(new TranslateResponse
                {
                    TranslatedText = translatedText
                });
            }
            catch (System.Exception ex)
            {
                return StatusCode(500, new { message = "AI processing failed", error = ex.Message });
            }
        }
    }
}
