using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using VideoVault.Contracts.Automation;

namespace VideoVault.Application.Services
{
    /// <summary>
    /// ITtsProvider contract — GetVoices, GenerateAsync, PreviewAsync.
    /// New engines can be hot-plugged without changing this interface.
    /// </summary>
    public interface ITtsProvider
    {
        /// <summary>Get the engine registry: available engines, voices, and active engine status.</summary>
        Task<TtsEngineRegistryResponse> GetEngineRegistryAsync();

        /// <summary>Get available voices for a specific engine (or all engines if null).</summary>
        Task<List<TtsVoiceInfo>> GetVoicesAsync(string? engine = null);

        /// <summary>Generate TTS audio and return the audio bytes.</summary>
        Task<byte[]> GenerateAsync(TtsGenerateRequest request);

        /// <summary>Quick preview of a voice.</summary>
        Task<byte[]> PreviewAsync(TtsPreviewRequest request);

        /// <summary>Clone a voice from a source audio sample.</summary>
        Task<byte[]> CloneVoiceAsync(VoiceCloneRequest request);
    }

    public class TtsProviderService : ITtsProvider
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<TtsProviderService> _logger;
        private const string VoiceServiceUrl = "http://localhost:5052";

        public TtsProviderService(HttpClient httpClient, ILogger<TtsProviderService> logger)
        {
            _httpClient = httpClient;
            _logger = logger;
            // Set default timeout for TTS calls (5m for long texts)
            _httpClient.Timeout = TimeSpan.FromSeconds(300);
        }

        public async Task<TtsEngineRegistryResponse> GetEngineRegistryAsync()
        {
            try
            {
                var response = await _httpClient.GetAsync($"{VoiceServiceUrl}/api/registry");
                response.EnsureSuccessStatusCode();
                var result = await response.Content.ReadFromJsonAsync<TtsEngineRegistryResponse>();
                return result ?? new TtsEngineRegistryResponse();
            }
            catch (Exception ex)
            {
                _logger.LogWarning("Failed to fetch engine registry: {Message}", ex.Message);
                // Return fallback registry so UI still works
                return GetFallbackRegistry();
            }
        }

        public async Task<List<TtsVoiceInfo>> GetVoicesAsync(string? engine = null)
        {
            try
            {
                var url = string.IsNullOrEmpty(engine)
                    ? $"{VoiceServiceUrl}/api/voices"
                    : $"{VoiceServiceUrl}/api/voices?engine={engine}";
                var response = await _httpClient.GetAsync(url);
                response.EnsureSuccessStatusCode();
                var result = await response.Content.ReadFromJsonAsync<List<TtsVoiceInfo>>();
                return result ?? new List<TtsVoiceInfo>();
            }
            catch (Exception ex)
            {
                _logger.LogWarning("Failed to fetch voices: {Message}", ex.Message);
                return new List<TtsVoiceInfo>();
            }
        }

        public async Task<byte[]> GenerateAsync(TtsGenerateRequest request)
        {
            var payload = new
            {
                text = request.Text,
                voice = request.VoiceId,
                engine = request.Engine,
                speed = request.Speed,
                max_duration = request.MaxDuration,
                emotion = request.Emotion,
                preserve_accent = request.PreserveAccent
            };

            // Use ResponseHeadersRead to start streaming immediately instead of buffering
            using var httpRequest = new HttpRequestMessage(HttpMethod.Post, $"{VoiceServiceUrl}/api/tts/generate");
            httpRequest.Content = JsonContent.Create(payload);
            var response = await _httpClient.SendAsync(httpRequest, HttpCompletionOption.ResponseHeadersRead);
            response.EnsureSuccessStatusCode();

            // Stream response directly to byte array
            await using var stream = await response.Content.ReadAsStreamAsync();
            using var ms = new MemoryStream();
            await stream.CopyToAsync(ms);
            return ms.ToArray();
        }

        public async Task<byte[]> PreviewAsync(TtsPreviewRequest request)
        {
            var payload = new
            {
                text = request.Text,
                voice = request.VoiceId,
                engine = request.Engine
            };

            // Use ResponseHeadersRead to start streaming immediately
            using var httpRequest = new HttpRequestMessage(HttpMethod.Post, $"{VoiceServiceUrl}/api/tts/preview");
            httpRequest.Content = JsonContent.Create(payload);
            var response = await _httpClient.SendAsync(httpRequest, HttpCompletionOption.ResponseHeadersRead);
            response.EnsureSuccessStatusCode();

            await using var stream = await response.Content.ReadAsStreamAsync();
            using var ms = new MemoryStream();
            await stream.CopyToAsync(ms);
            return ms.ToArray();
        }

        public async Task<byte[]> CloneVoiceAsync(VoiceCloneRequest request)
        {
            var payload = new
            {
                source_audio_base64 = request.SourceAudioBase64,
                text = request.Text,
                target_language = request.TargetLanguage,
                preserve_accent = request.PreserveAccent
            };

            var response = await _httpClient.PostAsJsonAsync($"{VoiceServiceUrl}/api/tts/clone", payload);
            response.EnsureSuccessStatusCode();
            return await response.Content.ReadAsByteArrayAsync();
        }

        private static TtsEngineRegistryResponse GetFallbackRegistry()
        {
            return new TtsEngineRegistryResponse
            {
                ActiveEngine = "edge-tts",
                Engines = new List<TtsEngineInfo>
                {
                    new()
                    {
                        Id = "edge-tts",
                        Name = "Microsoft Edge TTS",
                        Description = "Free realtime neural voices, best for fast TikTok/Reels generation.",
                        Status = "ready",
                        Capabilities = new List<string> { "Realtime", "Free", "International voices" }
                    },
                    new()
                    {
                        Id = "vieneu-ai",
                        Name = "VieNeu AI",
                        Description = "Đã kết nối adapter VieNeu giả lập qua Edge TTS với tinh chỉnh giọng.",
                        Status = "ready",
                        Capabilities = new List<string> { "Giả lập giọng", "Tinh chỉnh Pitch/Rate", "Giữ đúng engine" }
                    },
                    new()
                    {
                        Id = "viettts",
                        Name = "VietTTS",
                        Description = "Chua ket noi engine VietTTS that. Khong fallback sang Edge TTS de tranh sai giong.",
                        Status = "offline",
                        Capabilities = new List<string> { "Cho adapter VietTTS", "Khong fallback Edge TTS", "Toi uu tieng Viet" }
                    },
                    new()
                    {
                        Id = "xtts-v2",
                        Name = "XTTS-v2 Voice Clone",
                        Description = "Chua ket noi model XTTS-v2 that. Clone giong se khong dung Edge TTS gia lap.",
                        Status = "offline",
                        Capabilities = new List<string> { "Cho model XTTS-v2", "Clone zero-shot", "Khong fallback Edge TTS" }
                    }
                }
            };
        }
    }
}
