using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace VideoVault.Application.Services
{
    public interface IAiService
    {
        Task<string> RewriteTextAsync(string text, string tone, string targetLanguage = "vi");
        Task<string> TranslateAsync(string text, string targetLanguage);
    }

    public class AiService : IAiService
    {
        private readonly HttpClient _httpClient;
        private readonly string _apiKey;
        private readonly ILogger<AiService> _logger;

        public AiService(HttpClient httpClient, IConfiguration configuration, ILogger<AiService> logger)
        {
            _httpClient = httpClient;
            _apiKey = configuration["GeminiAI:ApiKey"] ?? throw new ArgumentNullException("Gemini API Key is missing");
            _logger = logger;
        }

        public async Task<string> RewriteTextAsync(string text, string tone, string targetLanguage = "vi")
        {
            string systemPrompt = GetPromptByTone(tone, targetLanguage);
            string userPrompt = $"Text to rewrite:\n{text}";

            return await CallGeminiApiAsync(systemPrompt, userPrompt);
        }

        public async Task<string> TranslateAsync(string text, string targetLanguage)
        {
            string systemPrompt = $"You are a professional translator. Translate the following text accurately into {targetLanguage}. Maintain the original meaning. Respond ONLY with the translated text.";
            string userPrompt = text;

            return await CallGeminiApiAsync(systemPrompt, userPrompt);
        }

        private string GetPromptByTone(string tone, string targetLanguage)
        {
            string lang = targetLanguage.ToLower() == "vi" ? "Vietnamese" : targetLanguage;
            
            return tone.ToLower() switch
            {
                "viral" => $"You are an expert TikTok/Douyin content creator. Rewrite the following text into {lang} to make it highly viral, engaging, and catchy. Use hooks, short sentences, and relevant emojis. Respond ONLY with the rewritten text.",
                "emotional" => $"Rewrite the following text into {lang} to make it deeply emotional, relatable, and touching. Connect with the reader's feelings. Respond ONLY with the rewritten text.",
                "sales" => $"Rewrite the following text into {lang} to make it highly persuasive and conversion-focused. Emphasize product benefits, urgency, and include a strong call-to-action (CTA). Respond ONLY with the rewritten text.",
                "genz" => $"Rewrite the following text into {lang} using modern Gen Z slang, trendy internet language, and a casual, fun vibe. Use emojis. Respond ONLY with the rewritten text.",
                "professional" => $"Rewrite the following text into {lang} to be highly professional, authoritative, and formal. Use clear, articulate business language. Respond ONLY with the rewritten text.",
                _ => $"Rewrite the following text clearly and naturally into {lang}. Respond ONLY with the rewritten text."
            };
        }

        private async Task<string> CallGeminiApiAsync(string systemInstruction, string prompt)
        {
            var requestUrl = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={_apiKey}";

            var payload = new
            {
                system_instruction = new
                {
                    parts = new[] { new { text = systemInstruction } }
                },
                contents = new[]
                {
                    new
                    {
                        parts = new[] { new { text = prompt } }
                    }
                },
                generationConfig = new
                {
                    temperature = 0.7,
                    topK = 40,
                    topP = 0.95,
                    maxOutputTokens = 2048,
                }
            };

            var jsonPayload = JsonSerializer.Serialize(payload);
            var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");

            try
            {
                var response = await _httpClient.PostAsync(requestUrl, content);
                var responseBody = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError("Gemini API Error: {StatusCode} - {Body}", response.StatusCode, responseBody);
                    throw new Exception("Failed to call AI API");
                }

                using var document = JsonDocument.Parse(responseBody);
                var root = document.RootElement;
                
                if (root.TryGetProperty("candidates", out var candidates) && candidates.GetArrayLength() > 0)
                {
                    var textOutput = candidates[0]
                        .GetProperty("content")
                        .GetProperty("parts")[0]
                        .GetProperty("text")
                        .GetString();
                        
                    return textOutput?.Trim() ?? string.Empty;
                }

                return string.Empty;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Exception while calling Gemini API");
                throw;
            }
        }
    }
}
