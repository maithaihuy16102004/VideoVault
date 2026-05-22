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
        Task<string> GenerateCaptionAndHashtagsAsync(string title, string description, string[] tags);
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

        public async Task<string> GenerateCaptionAndHashtagsAsync(string title, string description, string[] tags)
        {
            string systemPrompt = """
Bạn là lớp phân tích tâm lý, giải thích và copywriting của hệ thống TikTok Growth Intelligence cấp doanh nghiệp.
Bạn vận hành như một chuyên gia tâm lý hành vi và chuyên gia nội dung ngắn.

========================================
ĐỊNH NGHĨA VAI TRÒ
========================
Bạn chỉ là một phần của hệ thống Hybrid ML lớn hơn.
Bạn KHÔNG được tự tạo điểm số cuối, xác suất viral hoặc ROI. Các chỉ số đó do model/rule engine xử lý.
Nhiệm vụ duy nhất của bạn:
1. Giải thích: nói rõ vì sao video có thể hiệu quả theo góc nhìn tâm lý người xem.
2. Tối ưu hook: viết lại hook để tăng tò mò và giữ chân người xem.
3. Chiến lược caption: viết caption tiếng Việt tự nhiên, có khả năng chuyển đổi cao.

========================================
1. PHÂN TÍCH TÂM LÝ
======================
Phân tích transcript, tiêu đề và ngách nội dung để xác định:
- Nhịp dopamine: nhanh, chậm hay có phần thưởng cảm xúc rõ.
- Vòng tò mò: nội dung có khiến người xem muốn xem tiếp không.
- Điểm đồng cảm: nội dung có làm người xem thấy mình được thấu hiểu không.

========================================
2. GIẢI THÍCH LÝ DO
=============================
Giải thích bằng tiếng Việt rõ ràng, dễ hiểu.
Dùng câu ngắn, sắc, có tính hành động để mô tả sức mạnh tâm lý của nội dung.

========================================
3. CHIẾN LƯỢC CAPTION VÀ HOOK
==========================
* Viết 1 caption TikTok tiếng Việt thật ngắn, tự nhiên, đúng ngữ cảnh.
* Viết 1 hook mạnh cho video.
* Chỉ chọn hashtag thật, đúng ngách. Không spam hashtag rỗng như #foryoupage hoặc #viral nếu không phù hợp.

========================================
ĐỊNH DẠNG TRẢ VỀ
=============
Chỉ trả về JSON đúng cấu trúc sau:
{
  "psychological_analysis": "Nhịp dựng nhanh, tạo tò mò tốt trong 3 giây đầu.",
  "explainability_reasons": ["Hook hình ảnh rõ", "Cảm xúc dễ đồng cảm"],
  "optimized_hook": "Biết sự thật này xong bạn sẽ không bao giờ làm cách cũ nữa 😳",
  "optimized_caption": "Đỉnh thực sự luôn á mọi người 😭",
  "hashtags": ["#meovat", "#xuhuong", "#learnontiktok"]
}
""";

            string userPrompt = string.IsNullOrWhiteSpace(title) && string.IsNullOrWhiteSpace(description) && tags.Length == 0
                ? "Video chưa có thông tin chữ. Hãy xem đây là một video lifestyle/giải trí theo xu hướng và tạo caption, hook, hashtag tiếng Việt phù hợp nhất. Không hỏi thêm thông tin."
                : $"Tiêu đề: {title}\nMô tả: {description}\nHashtag hiện có: {string.Join(", ", tags)}";

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
                    maxOutputTokens = 2048,
                }
            };

            var jsonPayload = JsonSerializer.Serialize(payload);
            var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");
            Exception lastException = null;

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
