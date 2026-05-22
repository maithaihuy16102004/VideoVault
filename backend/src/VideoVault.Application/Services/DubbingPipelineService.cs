using System.Net.Http;
using System.Net.Http.Json;
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
            
            var response = await _httpClient.PostAsJsonAsync($"{PipelineBaseUrl}/start", request);
            response.EnsureSuccessStatusCode();
            
            var result = await response.Content.ReadFromJsonAsync<DubbingPipelineStatus>();
            return result ?? new DubbingPipelineStatus { Status = "failed", ErrorMessage = "Failed to parse response" };
        }

        public async Task<DubbingPipelineStatus> GetStatusAsync(string jobId)
        {
            var response = await _httpClient.GetAsync($"{PipelineBaseUrl}/status/{jobId}");
            response.EnsureSuccessStatusCode();
            
            var result = await response.Content.ReadFromJsonAsync<DubbingPipelineStatus>();
            return result ?? new DubbingPipelineStatus { Status = "failed", ErrorMessage = "Failed to parse response" };
        }
    }
}
