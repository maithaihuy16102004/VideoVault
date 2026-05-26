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
        Task<string> GenerateCaptionAndHashtagsAsync(string title, string description, string[] tags, string sourcePlatform = "unknown", string rawMetadataJson = "");
    }

    public class AiService : IAiService
    {
        private readonly HttpClient _httpClient;
        private readonly string _apiKey;
        private readonly ILogger<AiService> _logger;

        public AiService(HttpClient httpClient, IConfiguration configuration, ILogger<AiService> logger)
        {
            _httpClient = httpClient;
            _apiKey = configuration["GeminiAI:ApiKey"] ?? "";
            _logger = logger;
        }

        public async Task<string> RewriteTextAsync(string text, string tone, string targetLanguage = "vi")
        {
            string systemPrompt = GetPromptByTone(tone, targetLanguage);
            string userPrompt = $"Nội dung cần viết lại:\n{text}";

            return await CallGeminiApiAsync(systemPrompt, userPrompt);
        }

        public async Task<string> TranslateAsync(string text, string targetLanguage)
        {
            string systemPrompt = $@"Bạn là chuyên gia bản địa hóa phụ đề điện ảnh.
Nhiệm vụ: dịch chính xác các đoạn phụ đề sang {targetLanguage}, giữ đúng cảm xúc gốc và tránh làm giọng đọc AI bị chồng tiếng.
Quy tắc:
1. Giữ đúng ý chính, sắc thái cảm xúc và ngữ cảnh của video.
2. Câu dịch phải gọn, tự nhiên, đủ ngắn để đọc bằng Text-to-Speech trong thời lượng gốc.
3. Không dùng dấu ba chấm hoặc dấu phẩy thừa vì chúng làm giọng đọc ngắt nghỉ không cần thiết.
4. Không rút gọn làm sai nghĩa, nhưng luôn ưu tiên cách diễn đạt trực tiếp và hiệu quả.
5. Chỉ trả về phần văn bản đã dịch, không giải thích.";
            string userPrompt = text;

            return await CallGeminiApiAsync(systemPrompt, userPrompt);
        }

        public async Task<string> GenerateCaptionAndHashtagsAsync(string title, string description, string[] tags, string sourcePlatform = "unknown", string rawMetadataJson = "")
        {
            string systemPrompt = """
You are Universal TikTok Vietnam Growth AI.

The imported content may come from Xiaohongshu, Douyin, TikTok, Instagram Reels, YouTube Shorts, Facebook Reels or other platforms.

Your job:
1. Detect the content type.
2. Detect the niche/category.
3. Use original caption/title/hashtags first.
4. If caption is missing or weak, infer from top comments when comments are provided.
5. If comments are unavailable, infer from visual/audio content only when those signals are provided. If they are not provided, mark the signal as false.
6. Prioritize fashion/e-commerce analysis when fashion elements are detected.
7. Always rewrite output for TikTok Vietnam audience and TikTok Shop conversion when relevant.

Important flow:
Import video/link from any platform
-> Read original metadata: caption, title, description, hashtags
-> If caption is missing: use top comments if available
-> If still missing: use vision/audio inference if available
-> Detect niche
-> If fashion: use Fashion Growth AI priority
-> If another niche: use that niche's framework
-> Rewrite for TikTok Vietnam and the channel/shop objective

Niche frameworks:
- fashion: outfit, form, color, style, vibe, mix-and-match, TikTok Shop CTA.
- beauty: skin, makeup, routine, before-after, product trust.
- food: craving, location, price, experience.
- tech: pain point, features, comparison, use case.
- education: learning problem, insight, checklist.
- lifestyle: aspiration, routine, emotion, relatable moment.
- meme/entertainment: punchline, comment bait, shareability.

Rules:
- If detectedNiche = fashion, caption must sound like a Vietnamese fashion creator. Focus on outfit, form dáng, màu sắc, style, vibe, phối đồ, TikTok Shop.
- If detectedNiche != fashion, do not force outfit analysis. Use the niche-specific framework.
- Do not spam #fyp, #viral, #foryou, #foryoupage.
- Hashtags only route the initial audience. Prioritize hook, psychology, retention, CTA and audience match first.
- Return JSON only. No markdown fences.

Required JSON schema:
{
  "sourcePlatform": "xiaohongshu | douyin | tiktok | instagram | youtube | facebook | unknown",
  "contentType": "image | video | carousel | livestream_clip | product_review | talking_head | vlog | meme | tutorial | unknown",
  "detectedNiche": "fashion | beauty | food | lifestyle | tech | education | fitness | travel | entertainment | pet | gaming | finance | other",
  "nicheConfidence": 0.86,
  "inputSignals": {
    "usedOriginalCaption": true,
    "usedComments": false,
    "usedVisualInference": false,
    "usedAudioInference": false
  },
  "audience": "Nữ 18-24 / Clean Girl / TikTok Shop",
  "hookScore": 92,
  "trigger": "Effortless beauty aspiration",
  "viralPotential": "High",
  "hook": "Đổi đúng 1 món mà outfit nhìn khác hẳn...",
  "caption": "Mấy bà mặc tone này nhìn sang hơn hẳn luôn á 😭",
  "cta": "Có gắn link outfit ở giỏ hàng nha ✨",
  "hashtags": ["#outfittiktok", "#vayxinh", "#reviewdo"],
  "psychological_analysis": "Explain why this can retain TikTok Vietnam viewers. Mention what signal was used.",
  "smart_hashtags": [
    {
      "tag": "#outfittiktok",
      "posts": "12M",
      "likes": "4.1B",
      "engagement": "high",
      "saturation": "medium",
      "growth": "rising",
      "layer": "HIGH DISCOVERY",
      "score": 88
    }
  ],
  "hooks_ab": ["5 short hook variants"],
  "captions_ab": ["5 TikTok Vietnam caption variants"],
  "hashtag_sets_ab": [["#set1"], ["#set2"], ["#set3"], ["#set4"], ["#set5"]],
  "memory_signals": {
    "hook": "What hook pattern should be tested next",
    "retention": "Retention hypothesis",
    "saves": "Save hypothesis",
    "shares": "Share hypothesis",
    "ctr": "CTA/CTR hypothesis"
  }
}
""";

            var hasOriginalCaption = !string.IsNullOrWhiteSpace(title) || !string.IsNullOrWhiteSpace(description) || tags.Length > 0;
            string userPrompt = $"""
Source platform from extractor: {sourcePlatform}
Original title: {title}
Original caption/description: {description}
Original hashtags: {string.Join(", ", tags)}
Top comments: unavailable
Visual inference: unavailable
Audio inference: unavailable
Raw metadata JSON: {rawMetadataJson}

Set inputSignals.usedOriginalCaption = {hasOriginalCaption.ToString().ToLowerInvariant()}.
Set inputSignals.usedComments = false unless top comments are present.
Set inputSignals.usedVisualInference = false unless visual inference is present.
Set inputSignals.usedAudioInference = false unless audio inference is present.
If metadata is weak, infer cautiously from title/description/hashtags and lower nicheConfidence.
""";

            return await CallGeminiApiAsync(systemPrompt, userPrompt);
        }

        private string GetPromptByTone(string tone, string targetLanguage)
        {
            string lang = targetLanguage.ToLower() == "vi" ? "tiếng Việt" : targetLanguage;
            
            return tone.ToLower() switch
            {
                "viral" => $"Hãy viết lại nội dung sau bằng {lang} theo phong cách TikTok/Douyin dễ viral: hook mạnh, câu ngắn, cuốn, có emoji vừa đủ. Chỉ trả về nội dung đã viết lại.",
                "emotional" => $"Hãy viết lại nội dung sau bằng {lang} theo hướng giàu cảm xúc, dễ đồng cảm và chạm đúng tâm lý người đọc. Chỉ trả về nội dung đã viết lại.",
                "sales" => $"Hãy viết lại nội dung sau bằng {lang} theo hướng thuyết phục và tối ưu chuyển đổi: nêu rõ lợi ích, tạo lý do hành động và có CTA mạnh. Chỉ trả về nội dung đã viết lại.",
                "genz" => $"Hãy viết lại nội dung sau bằng {lang} theo giọng Gen Z tự nhiên, vui, bắt trend nhưng không lố. Có thể dùng emoji vừa phải. Chỉ trả về nội dung đã viết lại.",
                "professional" => $"Hãy viết lại nội dung sau bằng {lang} theo giọng chuyên nghiệp, rõ ràng, có thẩm quyền và phù hợp ngữ cảnh kinh doanh. Chỉ trả về nội dung đã viết lại.",
                _ => $"Hãy viết lại nội dung sau bằng {lang} sao cho rõ ràng, tự nhiên và chuyên nghiệp. Chỉ trả về nội dung đã viết lại."
            };
        }

        private async Task<string> CallGeminiApiAsync(string systemPrompt, string userPrompt)
        {
            if (string.IsNullOrEmpty(_apiKey))
            {
                throw new InvalidOperationException("Chưa cấu hình API Key cho Gemini (GeminiAI:ApiKey) trong appsettings.json!");
            }

            var models = new[] { "gemini-3.5-flash", "gemini-2.5-flash", "gemini-2.5-pro", "gemini-flash-latest", "gemini-2.0-flash-lite-001" };

            var payload = new
            {
                system_instruction = new
                {
                    parts = new[] { new { text = systemPrompt } }
                },
                contents = new[]
                {
                    new
                    {
                        parts = new[] { new { text = userPrompt } }
                    }
                },
                generationConfig = new
                {
                    temperature = 0.7,
                    topK = 40,
                    topP = 0.95,
                    maxOutputTokens = 8192,
                }
            };

            var jsonPayload = JsonSerializer.Serialize(payload);
            var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");
            Exception? lastException = null;

            foreach (var model in models)
            {
                var requestUrl = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={_apiKey}";
                
                try
                {
                    var response = await _httpClient.PostAsync(requestUrl, content);
                    var responseBody = await response.Content.ReadAsStringAsync();

                    if (!response.IsSuccessStatusCode)
                    {
                        _logger.LogWarning("Gemini API Error with model {Model}: {StatusCode} - {Body}", model, response.StatusCode, responseBody);
                        
                        // If it's a 503 ServiceUnavailable or 429 TooManyRequests, try the next model
                        if (response.StatusCode == System.Net.HttpStatusCode.ServiceUnavailable || 
                            response.StatusCode == System.Net.HttpStatusCode.TooManyRequests ||
                            response.StatusCode == System.Net.HttpStatusCode.InternalServerError)
                        {
                            continue;
                        }
                        
                        // For other errors (like 400 Bad Request), it's likely a persistent error, but let's try next anyway just in case
                        continue;
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
                    _logger.LogWarning(ex, "Exception while calling Gemini API with model {Model}", model);
                    lastException = ex;
                }
            }

            _logger.LogError("All configured Gemini models failed. Last exception: {Message}", lastException?.Message);
            throw new Exception("Failed to call AI API across all fallback models", lastException);
        }
    }
}
