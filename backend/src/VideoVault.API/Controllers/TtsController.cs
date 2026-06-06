using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using VideoVault.Application.Services;
using VideoVault.Contracts.Automation;

namespace VideoVault.API.Controllers
{
    /// <summary>
    /// TTS Engine Registry API — ITtsProvider contract: GetVoices, GenerateAsync, PreviewAsync.
    /// New engines can be hot-plugged without changing this controller.
    /// </summary>
    [ApiController]
    [Route("api/v1/tts")]
    [AllowAnonymous]
    public class TtsController : ControllerBase
    {
        private readonly ITtsProvider _ttsProvider;
        private readonly ILogger<TtsController> _logger;

        public TtsController(ITtsProvider ttsProvider, ILogger<TtsController> logger)
        {
            _ttsProvider = ttsProvider;
            _logger = logger;
        }

        /// <summary>Get engine registry: available engines, voices, active engine status.</summary>
        [HttpGet("registry")]
        public async Task<IActionResult> GetRegistry()
        {
            try
            {
                var registry = await _ttsProvider.GetEngineRegistryAsync();
                return Ok(registry);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get TTS engine registry");
                return StatusCode(500, new { error = "Failed to get engine registry" });
            }
        }

        /// <summary>Get available voices (optionally filtered by engine).</summary>
        [HttpGet("voices")]
        public async Task<IActionResult> GetVoices([FromQuery] string? engine = null)
        {
            try
            {
                var voices = await _ttsProvider.GetVoicesAsync(engine);
                return Ok(voices);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get TTS voices");
                return StatusCode(500, new { error = "Failed to get voices" });
            }
        }

        /// <summary>Generate TTS audio from text using specified engine and voice.</summary>
        [HttpPost("generate")]
        public async Task<IActionResult> Generate([FromBody] TtsGenerateRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Text))
                return BadRequest(new { error = "Text is required" });

            try
            {
                _logger.LogInformation("TTS Generate: engine={Engine}, voice={Voice}, text={Text}",
                    request.Engine, request.VoiceId, request.Text[..Math.Min(50, request.Text.Length)]);

                var audioBytes = await _ttsProvider.GenerateAsync(request);
                return File(audioBytes, "audio/mpeg", $"tts_{DateTime.UtcNow:yyyyMMddHHmmss}.mp3");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "TTS generation failed");
                return StatusCode(500, new { error = "TTS generation failed: " + ex.Message });
            }
        }

        /// <summary>Quick preview of a voice.</summary>
        [HttpPost("preview")]
        public async Task<IActionResult> Preview([FromBody] TtsPreviewRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Text))
                return BadRequest(new { error = "Text is required" });

            try
            {
                var audioBytes = await _ttsProvider.PreviewAsync(request);
                return File(audioBytes, "audio/wav");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "TTS preview failed");
                return StatusCode(500, new { error = "TTS preview failed: " + ex.Message });
            }
        }

        /// <summary>Clone a voice from a source audio sample.</summary>
        [HttpPost("clone")]
        public async Task<IActionResult> CloneVoice([FromBody] VoiceCloneRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.SourceAudioBase64))
                return BadRequest(new { error = "Source audio is required" });

            if (string.IsNullOrWhiteSpace(request.Text))
                return BadRequest(new { error = "Text is required" });

            try
            {
                _logger.LogInformation("Voice Clone: lang={Lang}, accent={Accent}",
                    request.TargetLanguage, request.PreserveAccent);

                var audioBytes = await _ttsProvider.CloneVoiceAsync(request);
                return File(audioBytes, "audio/mpeg", "cloned_voice.mp3");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Voice cloning failed");
                return StatusCode(500, new { error = "Voice cloning failed: " + ex.Message });
            }
        }
    }
}
