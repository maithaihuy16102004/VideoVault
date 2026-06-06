using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using VideoVault.Contracts.Automation;

namespace VideoVault.Application.Services
{
    public interface IDubbingPipelineService
    {
        Task<DubbingPipelineStatus> StartPipelineAsync(DubbingPipelineRequest request);
        Task<DubbingPipelineStatus> GetStatusAsync(string jobId);
    }

    public class DubbingPipelineService : IDubbingPipelineService
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<DubbingPipelineService> _logger;
        private const string PipelineBaseUrl = "http://localhost:5060/api/pipeline";

        public DubbingPipelineService(HttpClient httpClient, ILogger<DubbingPipelineService> logger)
        {
            _httpClient = httpClient;
            _logger = logger;
        }

        public async Task<DubbingPipelineStatus> StartPipelineAsync(DubbingPipelineRequest request)
        {
            _logger.LogInformation($"Starting Dubbing Pipeline for {request.VideoPath}");

            var pipelineRequest = new
            {
                video_path = request.VideoPath,
                target_language = request.TargetLanguage,
                tts_engine = request.TtsEngine,
                enable_voice_clone = request.EnableVoiceClone,
                enable_emotion = request.EnableEmotion
            };

            var response = await _httpClient.PostAsJsonAsync($"{PipelineBaseUrl}/start", pipelineRequest);
            response.EnsureSuccessStatusCode();
            
            var result = await response.Content.ReadFromJsonAsync<PythonDubbingPipelineStatus>();
            return result?.ToContract() ?? new DubbingPipelineStatus { Status = "failed", ErrorMessage = "Failed to parse response" };
        }

        public async Task<DubbingPipelineStatus> GetStatusAsync(string jobId)
        {
            var response = await _httpClient.GetAsync($"{PipelineBaseUrl}/status/{jobId}");
            response.EnsureSuccessStatusCode();
            
            var result = await response.Content.ReadFromJsonAsync<PythonDubbingPipelineStatus>();
            return result?.ToContract() ?? new DubbingPipelineStatus { Status = "failed", ErrorMessage = "Failed to parse response" };
        }

        private class PythonDubbingPipelineStatus
        {
            [JsonPropertyName("job_id")]
            public string JobId { get; set; } = string.Empty;
            [JsonPropertyName("status")]
            public string Status { get; set; } = "queued";
            [JsonPropertyName("progress")]
            public double Progress { get; set; }
            [JsonPropertyName("current_stage")]
            public string CurrentStage { get; set; } = string.Empty;
            [JsonPropertyName("output_video_path")]
            public string? OutputVideoPath { get; set; }
            [JsonPropertyName("subtitle_path")]
            public string? SubtitlePath { get; set; }
            [JsonPropertyName("error_message")]
            public string? ErrorMessage { get; set; }

            public DubbingPipelineStatus ToContract() => new()
            {
                JobId = JobId,
                Status = Status,
                Progress = Progress,
                CurrentStage = CurrentStage,
                OutputVideoPath = OutputVideoPath,
                SubtitlePath = SubtitlePath,
                ErrorMessage = ErrorMessage
            };
        }
    }
}
