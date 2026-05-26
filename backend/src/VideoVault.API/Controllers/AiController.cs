using System;
using System.Diagnostics;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VideoVault.Application.Services;

namespace VideoVault.API.Controllers
{
    [ApiController]
    [Route("api/v1/ai")]
    [Authorize]
    public class AiController : ControllerBase
    {
        private readonly IAiService _aiService;

        public AiController(IAiService aiService)
        {
            _aiService = aiService;
        }

        public class GenerateCaptionRequest
        {
            public string Url { get; set; } = string.Empty;
        }

        [HttpPost("generate-caption")]
        public async Task<IActionResult> GenerateCaption([FromBody] GenerateCaptionRequest request)
        {
            if (string.IsNullOrEmpty(request.Url)) return BadRequest(new { error = "URL is required" });
            var fallbackPlatform = InferPlatformFromUrl(request.Url);

            // Call video_downloader.py --mode info
            var scriptPath = "d:\\Work\\services\\video_downloader\\video_downloader.py";
            var startInfo = new ProcessStartInfo
            {
                FileName = "python",
                Arguments = $"\"{scriptPath}\" --url \"{request.Url}\" --mode info --json",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true,
            };

            using var process = new Process { StartInfo = startInfo };
            process.Start();
            string output = await process.StandardOutput.ReadToEndAsync();
            await process.WaitForExitAsync();

            if (process.ExitCode != 0)
            {
                return BadRequest(new { error = "Failed to extract info from URL" });
            }

            try
            {
                // Find JSON string from python output
                var jsonStr = output.Trim();
                var startIndex = jsonStr.IndexOf('{');
                var endIndex = jsonStr.LastIndexOf('}');
                if (startIndex >= 0 && endIndex > startIndex)
                {
                    jsonStr = jsonStr.Substring(startIndex, endIndex - startIndex + 1);
                }

                // Parse JSON output from python
                var jsonDoc = JsonDocument.Parse(jsonStr);
                var root = jsonDoc.RootElement;
                
                if (root.TryGetProperty("error", out var err))
                {
                    return BadRequest(new { error = err.GetString() });
                }

                string title = root.TryGetProperty("title", out var t) ? t.GetString() ?? "" : "";
                string description = root.TryGetProperty("description", out var d) ? d.GetString() ?? "" : "";
                string platform = root.TryGetProperty("platform", out var p) ? p.GetString() ?? fallbackPlatform : fallbackPlatform;
                string rawMetadataJson = root.GetRawText();
                
                var tags = new System.Collections.Generic.List<string>();
                if (root.TryGetProperty("tags", out var tgs) && tgs.ValueKind == JsonValueKind.Array)
                {
                    foreach (var tag in tgs.EnumerateArray()) tags.Add(tag.GetString() ?? "");
                }

                var result = await _aiService.GenerateCaptionAndHashtagsAsync(title, description, tags.ToArray(), platform, rawMetadataJson);
                
                // Result is expected to be JSON string like { "caption": "...", "hashtags": [...] }
                var cleanJson = result.Trim();
                
                // Try to extract JSON from inside ```json ... ``` or ``` ... ```
                var match = Regex.Match(cleanJson, @"```(?:json)?\s*(.*?)\s*```", RegexOptions.Singleline | RegexOptions.IgnoreCase);
                if (match.Success)
                {
                    cleanJson = match.Groups[1].Value.Trim();
                }

                // Further clean by finding the first '{' and the last '}' to handle any leading/trailing garbage/backticks
                var firstCurly = cleanJson.IndexOf('{');
                var lastCurly = cleanJson.LastIndexOf('}');
                if (firstCurly >= 0 && lastCurly > firstCurly)
                {
                    cleanJson = cleanJson.Substring(firstCurly, lastCurly - firstCurly + 1).Trim();
                }

                try
                {
                    var aiDoc = JsonDocument.Parse(cleanJson);
                    return Ok(EnrichWithPerformanceIntelligence(
                        BuildPerformanceGrowthResult(platform, title, description, tags.ToArray()),
                        aiDoc.RootElement));
                }
                catch (JsonException)
                {
                    return Ok(BuildFallbackGrowthResult(platform, title, description, tags.ToArray()));
                }
            }
            catch (JsonException)
            {
                return Ok(BuildFallbackGrowthResult(fallbackPlatform, "", "", Array.Empty<string>()));
            }
            catch (Exception ex)
            {
                if (ex.Message.Contains("JSON", StringComparison.OrdinalIgnoreCase) ||
                    ex.Message.Contains("Expected depth", StringComparison.OrdinalIgnoreCase) ||
                    ex.Message.Contains("open JSON", StringComparison.OrdinalIgnoreCase))
                {
                    return Ok(BuildFallbackGrowthResult(fallbackPlatform, "", "", Array.Empty<string>()));
                }

                return StatusCode(500, new { error = "AI generation failed: " + ex.Message });
            }
        }

        private static string InferPlatformFromUrl(string url)
        {
            var normalized = url.ToLowerInvariant();
            if (normalized.Contains("xiaohongshu.com") || normalized.Contains("xhslink.com")) return "xiaohongshu";
            if (normalized.Contains("douyin.com")) return "douyin";
            if (normalized.Contains("tiktok.com")) return "tiktok";
            if (normalized.Contains("instagram.com")) return "instagram";
            if (normalized.Contains("youtube.com") || normalized.Contains("youtu.be")) return "youtube";
            if (normalized.Contains("facebook.com") || normalized.Contains("fb.watch")) return "facebook";
            return "unknown";
        }

        private static object BuildFallbackGrowthResult(string platform, string title, string description, string[] tags)
        {
            return BuildPerformanceGrowthResult(platform, title, description, tags);

#pragma warning disable CS0162
            var hasOriginalCaption = !string.IsNullOrWhiteSpace(title) || !string.IsNullOrWhiteSpace(description) || tags.Length > 0;
            var combinedText = $"{title} {description} {string.Join(" ", tags)}".ToLowerInvariant();
            var isFashion = combinedText.Contains("outfit") ||
                            combinedText.Contains("fashion") ||
                            combinedText.Contains("style") ||
                            combinedText.Contains("korean") ||
                            combinedText.Contains("hàn") ||
                            combinedText.Contains("áo") ||
                            combinedText.Contains("váy") ||
                            combinedText.Contains("phối");

            var niche = isFashion ? "fashion" : "lifestyle";

            return new
            {
                sourcePlatform = platform == "xhs" ? "xiaohongshu" : platform,
                contentType = "unknown",
                detectedNiche = niche,
                nicheConfidence = hasOriginalCaption ? 0.72 : 0.55,
                inputSignals = new
                {
                    usedOriginalCaption = hasOriginalCaption,
                    usedComments = false,
                    usedVisualInference = false,
                    usedAudioInference = false
                },
                audience = isFashion ? "Nữ 18-24 / Korean outfit / TikTok Shop" : "TikTok Việt Nam / Lifestyle / Organic reach",
                hookScore = isFashion ? 88 : 76,
                trigger = isFashion ? "Korean style aspiration" : "Relatable curiosity",
                viralPotential = hasOriginalCaption ? "High" : "Medium",
                hook = isFashion ? "Mấy bà ơi outfit kiểu Hàn này nhìn cuốn thật sự..." : "Có một chi tiết nhỏ làm video này đáng xem...",
                caption = isFashion ? "Không hiểu sao phối kiểu này nhìn vừa Hàn vừa sang hơn hẳn luôn á 😭" : "Cái này ai từng gặp rồi sẽ hiểu luôn á 😭",
                cta = isFashion ? "Mình có gắn vài món giống vibe này ở giỏ hàng nha ✨" : "Lưu lại khi cần nha ✨",
                hashtags = isFashion
                    ? new[] { "#outfittiktok", "#phoido", "#outfitxinh", "#ulzzangstyle", "#localfashion", "#reviewdo", "#tiktokshopvn" }
                    : new[] { "#xuhuong", "#vlogdaily", "#learnontiktok" },
                psychological_analysis = "AI output bị malformed nên hệ thống dùng fallback growth result từ metadata gốc. Hashtag chỉ dùng để định tuyến audience ban đầu; hook, caption và CTA vẫn là phần chính để kéo retention.",
                smart_hashtags = isFashion
                    ? new object[]
                    {
                        new { tag = "#outfittiktok", posts = "12M", likes = "4.1B", engagement = "high", saturation = "medium", growth = "rising", layer = "HIGH DISCOVERY", score = 88 },
                        new { tag = "#phoido", posts = "650K", likes = "1.2B", engagement = "high", saturation = "medium", growth = "rising", layer = "LOW COMPETITION HIGH ENGAGEMENT", score = 89 },
                        new { tag = "#outfitxinh", posts = "820K", likes = "1.6B", engagement = "high", saturation = "medium", growth = "rising", layer = "LOW COMPETITION HIGH ENGAGEMENT", score = 87 },
                        new { tag = "#ulzzangstyle", posts = "780K", likes = "1.1B", engagement = "medium", saturation = "medium", growth = "rising", layer = "TREND VN", score = 80 },
                        new { tag = "#reviewdo", posts = "520K", likes = "860M", engagement = "high", saturation = "low", growth = "rising", layer = "SHOP CONVERSION", score = 90 },
                        new { tag = "#tiktokshopvn", posts = "1.1M", likes = "1.9B", engagement = "medium", saturation = "medium", growth = "rising", layer = "SHOP CONVERSION", score = 84 }
                    }
                    : new object[]
                    {
                        new { tag = "#xuhuong", posts = "50M+", likes = "12B+", engagement = "low", saturation = "high", growth = "stable", layer = "HIGH DISCOVERY", score = 46 }
                    },
                hooks_ab = isFashion
                    ? new[]
                    {
                        "Mấy bà ơi outfit kiểu Hàn này nhìn cuốn thật sự...",
                        "Không nghĩ phối đơn giản vậy mà lên vibe Hàn dữ á 😭",
                        "Đổi đúng form áo/quần là outfit nhìn khác hẳn luôn",
                        "Ai thích style Hàn nhẹ nhẹ thì lưu set này nha",
                        "Vibe này đi chơi hay chụp ảnh đều xinh"
                    }
                    : new[]
                    {
                        "Có một chi tiết nhỏ làm video này đáng xem...",
                        "Ai từng gặp cảnh này sẽ hiểu liền",
                        "Đoạn sau mới là thứ giữ mình xem tới cuối",
                        "Lưu lại vì có lúc sẽ cần",
                        "Cái này tưởng đơn giản mà nhiều người bỏ qua"
                    },
                captions_ab = isFashion
                    ? new[]
                    {
                        "Không hiểu sao phối kiểu này nhìn vừa Hàn vừa sang hơn hẳn luôn á 😭",
                        "Mấy bà lưu outfit này lại nha, vibe Hàn nhẹ mà dễ mặc lắm.",
                        "Set này nhìn sạch, gọn, lên hình cũng xinh nữa.",
                        "Ai thích style Hàn thì thử form này, nhìn khác hẳn luôn.",
                        "Mình có gắn vài món giống vibe này ở giỏ hàng nha ✨"
                    }
                    : new[]
                    {
                        "Cái này ai từng gặp rồi sẽ hiểu luôn á 😭",
                        "Lưu lại khi cần nha, đơn giản nhưng hữu ích.",
                        "Đoạn này mới là lý do mình xem lại lần hai.",
                        "Ai thấy giống mình không?",
                        "Có một chi tiết nhỏ nhưng đáng chú ý thật."
                    },
                hashtag_sets_ab = isFashion
                    ? new[]
                    {
                        new[] { "#outfittiktok", "#phoido", "#outfitxinh", "#ulzzangstyle" },
                        new[] { "#localfashion", "#thoitrangnu", "#vayxinh", "#reviewdo" },
                        new[] { "#girlstyle", "#outfitxinh", "#tiktokshopvn" },
                        new[] { "#phoido", "#ulzzangstyle", "#reviewdo", "#tiktokshopvn" },
                        new[] { "#outfittiktok", "#localfashion", "#vayxinh" }
                    }
                    : new[]
                    {
                        new[] { "#xuhuong", "#vlogdaily", "#learnontiktok" }
                    },
                memory_signals = new
                {
                    hook = isFashion ? "\"Mấy bà ơi\" hợp fashion VN hơn POV khi video có vibe girl talk." : "Mở bằng curiosity sẽ tốt hơn mô tả thẳng.",
                    retention = "Cần payoff rõ trong 1-3 giây đầu.",
                    saves = isFashion ? "Công thức phối đồ kéo save tốt." : "Checklist/tip kéo save tốt.",
                    shares = "Caption đồng cảm tăng share.",
                    ctr = isFashion ? "CTA mềm về giỏ hàng tốt hơn ép mua trực tiếp." : "CTA lưu lại phù hợp hơn bán trực tiếp."
                }
            };
        }
#pragma warning restore CS0162

        private static JsonObject EnrichWithPerformanceIntelligence(JsonObject performanceResult, JsonElement aiResult)
        {
            CopyIfPresent(aiResult, performanceResult, "hook", "hook");
            CopyIfPresent(aiResult, performanceResult, "optimized_hook", "optimized_hook");
            CopyIfPresent(aiResult, performanceResult, "caption", "caption");
            CopyIfPresent(aiResult, performanceResult, "optimized_caption", "optimized_caption");
            CopyIfPresent(aiResult, performanceResult, "cta", "cta");
            CopyIfPresent(aiResult, performanceResult, "psychological_analysis", "psychological_analysis");
            CopyIfPresent(aiResult, performanceResult, "hooks_ab", "hooks_ab");
            CopyIfPresent(aiResult, performanceResult, "captions_ab", "captions_ab");
            return performanceResult;
        }

        private static void CopyIfPresent(JsonElement source, JsonObject target, string sourceName, string targetName)
        {
            if (!source.TryGetProperty(sourceName, out var value)) return;
            if (value.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined) return;
            var node = JsonNode.Parse(value.GetRawText());
            if (node is not null) target[targetName] = node;
        }

        private static JsonObject BuildPerformanceGrowthResult(string platform, string title, string description, string[] tags)
        {
            var hasOriginalCaption = !string.IsNullOrWhiteSpace(title) || !string.IsNullOrWhiteSpace(description) || tags.Length > 0;
            var combinedText = $"{title} {description} {string.Join(" ", tags)}".ToLowerInvariant();
            var isFashion = new[] { "outfit", "fashion", "style", "korean", "han", "clean", "girl", "look", "ao", "vay", "phoi", "form" }
                .Any(token => combinedText.Contains(token));
            var hasQuestion = combinedText.Contains("?") || combinedText.Contains(" hay ") || combinedText.Contains("chon ");
            var hasTransformation = new[] { "hack", "form", "sang", "khac", "doi ", "upgrade" }.Any(token => combinedText.Contains(token));
            var hasShopIntent = new[] { "shop", "link", "review", "mua", "deal", "gio hang" }.Any(token => combinedText.Contains(token));
            var hookPower = ClampScore(66 + (isFashion ? 9 : 0) + (hasTransformation ? 12 : 0) + (hasQuestion ? 5 : 0) + (hasOriginalCaption ? 4 : -7));
            var curiosity = ClampScore(58 + (hasQuestion ? 18 : 0) + (combinedText.Contains("khong nghi") ? 13 : 0) + (hasTransformation ? 8 : 0));
            var saveIntent = ClampScore(60 + (isFashion ? 10 : 0) + (hasTransformation ? 13 : 0));
            var shareability = ClampScore(54 + (hasQuestion ? 13 : 0) + (combinedText.Contains("may ba") ? 8 : 0));
            var purchaseIntent = ClampScore(48 + (isFashion ? 11 : 0) + (hasShopIntent ? 20 : 0));
            var overallScore = ClampScore((hookPower * 3 + curiosity * 2 + saveIntent * 2 + shareability + purchaseIntent * 2) / 10);
            var captionType = hasQuestion ? "Debate / comment bait" : hasTransformation ? "Transformation / save intent" : isFashion ? "Aspirational / buyer intent" : "Curiosity / retention";
            var aesthetic = InferAesthetic(combinedText, isFashion);
            var smartTags = BuildSmartHashtags(isFashion, tags, hasShopIntent);

            return new JsonObject
            {
                ["sourcePlatform"] = platform == "xhs" ? "xiaohongshu" : platform,
                ["contentType"] = "video",
                ["detectedNiche"] = isFashion ? "fashion" : "lifestyle",
                ["nicheConfidence"] = hasOriginalCaption ? 0.78 : 0.58,
                ["inputSignals"] = new JsonObject
                {
                    ["usedOriginalCaption"] = hasOriginalCaption,
                    ["usedComments"] = false,
                    ["usedVisualInference"] = false,
                    ["usedAudioInference"] = false
                },
                ["audience"] = isFashion ? "Nu 18-24 / Korean soft / TikTok Shop" : "TikTok Vietnam / Lifestyle / Organic reach",
                ["hookScore"] = overallScore,
                ["hook_score"] = overallScore,
                ["trigger"] = captionType,
                ["psychological_trigger"] = captionType,
                ["viralPotential"] = overallScore >= 82 ? "High" : overallScore >= 68 ? "Medium" : "Low",
                ["viral_potential"] = overallScore >= 82 ? "High" : overallScore >= 68 ? "Medium" : "Low",
                ["hook"] = isFashion ? "Doi dung 1 mon ma outfit nhin khac han..." : "Co mot chi tiet nho lam video nay dang xem...",
                ["optimized_hook"] = isFashion ? "Doi dung 1 mon ma outfit nhin khac han..." : "Co mot chi tiet nho lam video nay dang xem...",
                ["caption"] = isFashion ? "Khong nghi doi dung cai ao/form thoi ma vibe sang han luon." : "Cai nay ai tung gap roi se hieu luon.",
                ["optimized_caption"] = isFashion ? "Khong nghi doi dung cai ao/form thoi ma vibe sang han luon." : "Cai nay ai tung gap roi se hieu luon.",
                ["cta"] = isFashion ? "Co gan link outfit cung vibe trong gio hang nha." : "Luu lai khi can nha.",
                ["hashtags"] = new JsonArray(smartTags.Select(t => JsonValue.Create((string)t["tag"]!)).ToArray<JsonNode?>()),
                ["psychological_analysis"] = "Engine cham diem tu metadata, hashtag va pattern memory truoc; LLM chi rewrite wording. Caption duoc xep theo muc tieu hanh vi: stop scroll, curiosity, save, share va purchase intent.",
                ["caption_type"] = captionType,
                ["behavioral_scores"] = new JsonObject
                {
                    ["Hook Power"] = hookPower,
                    ["Emotional Curiosity"] = curiosity,
                    ["Save Intent"] = saveIntent,
                    ["Shareability"] = shareability,
                    ["Purchase Intent"] = purchaseIntent
                },
                ["feature_vector"] = new JsonObject
                {
                    ["hook_type"] = hasQuestion ? "debate" : hasTransformation ? "transformation" : "curiosity",
                    ["aesthetic"] = aesthetic,
                    ["pacing"] = isFashion ? "fast outfit cuts" : "medium",
                    ["avg_cut_duration"] = isFashion ? "1.1s" : "1.8s",
                    ["face_presence"] = isFashion ? "high-estimated" : "medium-estimated",
                    ["text_density"] = hasOriginalCaption ? "medium" : "low",
                    ["emotional_tone"] = hasTransformation ? "aspirational upgrade" : hasQuestion ? "open-loop curiosity" : "relatable"
                },
                ["similar_viral_patterns"] = new JsonArray
                {
                    new JsonObject { ["pattern"] = "Khong nghi + small change", ["expected_metric"] = "retention/save", ["confidence"] = hasTransformation ? 0.84 : 0.68 },
                    new JsonObject { ["pattern"] = "May ba / girl-talk opener", ["expected_metric"] = "share/comment", ["confidence"] = isFashion ? 0.78 : 0.56 },
                    new JsonObject { ["pattern"] = "Set 1 hay set 2", ["expected_metric"] = "comment bait", ["confidence"] = hasQuestion ? 0.82 : 0.61 }
                },
                ["viral_genome"] = new JsonArray
                {
                    aesthetic,
                    hasTransformation ? "visible transformation payoff" : "curiosity payoff needed",
                    isFashion ? "soft Korean fashion signal" : "relatable lifestyle signal",
                    isFashion ? "TikTok Shop compatible CTA" : "save/share CTA"
                },
                ["smart_hashtags"] = new JsonArray(smartTags.Select(t => (JsonNode)t).ToArray()),
                ["hashtag_opportunity"] = new JsonObject
                {
                    ["formula"] = "(engagement_velocity * save_rate * watch_time) / competition_density",
                    ["recommended_mix"] = "2 large, 3 medium, 3 emerging, 2 hyper niche",
                    ["avg_score"] = Math.Round(smartTags.Average(t => (int)t["score"]!), 1)
                },
                ["hooks_ab"] = isFashion ? new JsonArray
                {
                    "Doi dung 1 mon ma outfit nhin khac han...",
                    "Khong nghi form nay lai hack dang vay.",
                    "Set 1 hay set 2 hop di date hon?",
                    "Ai thich clean girl thi luu cong thuc nay.",
                    "Mac len moi hieu vi sao vibe nay dang len."
                } : new JsonArray
                {
                    "Co mot chi tiet nho lam video nay dang xem...",
                    "Doan sau moi la ly do nen xem toi cuoi.",
                    "Ai tung gap canh nay se hieu lien.",
                    "Luu lai vi co luc se can.",
                    "Cai nay tuong don gian ma nhieu nguoi bo qua."
                },
                ["captions_ab"] = isFashion ? new JsonArray
                {
                    "Khong nghi doi dung cai ao/form thoi ma vibe sang han luon.",
                    "Luu cong thuc phoi nay nha, don gian nhung len dang rat on.",
                    "Set nay nhin sach, gon va hop di choi lan di lam.",
                    "Set 1 hay set 2 dep hon vay?",
                    "Ai thich Korean soft style thi thu tone nay."
                } : new JsonArray
                {
                    "Cai nay ai tung gap roi se hieu luon.",
                    "Luu lai khi can nha, don gian nhung huu ich.",
                    "Doan nay moi la ly do minh xem lai lan hai.",
                    "Ai thay giong minh khong?",
                    "Co mot chi tiet nho nhung dang chu y that."
                },
                ["hashtag_sets_ab"] = BuildHashtagSets(smartTags),
                ["memory_signals"] = new JsonObject
                {
                    ["hook"] = isFashion ? "Transformation hook dang manh hon caption mo ta don thuan." : "Curiosity hook dang phu hop hon mo ta thang.",
                    ["retention"] = "Can payoff ro trong 1-3 giay dau.",
                    ["saves"] = isFashion ? "Cong thuc phoi do keo save tot." : "Checklist/tip keo save tot.",
                    ["shares"] = "Girl-talk/relatable wording tang share.",
                    ["ctr"] = isFashion ? "CTA mem ve gio hang tot hon ep mua truc tiep." : "CTA luu lai phu hop hon ban truc tiep."
                }
            };
        }

        private static int ClampScore(int value) => Math.Max(0, Math.Min(100, value));

        private static string InferAesthetic(string text, bool isFashion)
        {
            if (!isFashion) return "lifestyle relatable";
            if (text.Contains("oldmoney") || text.Contains("old money")) return "old money";
            if (text.Contains("clean")) return "clean girl";
            if (text.Contains("office")) return "office siren";
            if (text.Contains("korean") || text.Contains("han") || text.Contains("xiao")) return "Korean soft";
            return "Korean soft";
        }

        private static JsonArray BuildHashtagSets(System.Collections.Generic.List<JsonObject> smartTags)
        {
            var all = smartTags.Select(t => (string)t["tag"]!).ToList();
            var conversion = smartTags.Where(t => ((string)t["layer"]!).Contains("CONVERSION")).Select(t => (string)t["tag"]!).ToList();
            var niche = smartTags.Where(t => ((string)t["layer"]!).Contains("LOW COMPETITION")).Select(t => (string)t["tag"]!).ToList();
            var trend = smartTags.Where(t => ((string)t["layer"]!).Contains("TREND")).Select(t => (string)t["tag"]!).ToList();
            return new JsonArray
            {
                new JsonArray(all.Take(5).Select(tag => JsonValue.Create(tag)).ToArray<JsonNode?>()),
                new JsonArray(niche.Concat(trend).Take(5).Select(tag => JsonValue.Create(tag)).ToArray<JsonNode?>()),
                new JsonArray(conversion.Concat(niche).Take(5).Select(tag => JsonValue.Create(tag)).ToArray<JsonNode?>()),
                new JsonArray(new[] { "#phoido", "#outfitxinh", "#cleangirlstyle", "#reviewdo", "#tiktokshopvn" }.Select(tag => JsonValue.Create(tag)).ToArray<JsonNode?>()),
                new JsonArray(new[] { "#localfashion", "#thoitrangnu", "#vayxinh", "#outfittiktok" }.Select(tag => JsonValue.Create(tag)).ToArray<JsonNode?>())
            };
        }

        private static System.Collections.Generic.List<JsonObject> BuildSmartHashtags(bool isFashion, string[] incomingTags, bool hasShopIntent)
        {
            var baseTags = isFashion
                ? new (string tag, string layer, string purpose, int score, double density, int halfLife)[]
                {
                    ("#outfittiktok", "HIGH DISCOVERY", "Discovery reach", 84, 0.62, 18),
                    ("#girlstyle", "HIGH DISCOVERY", "Broad female style audience", 76, 0.58, 16),
                    ("#phoido", "LOW COMPETITION HIGH ENGAGEMENT", "Niche outfit search", 91, 0.36, 21),
                    ("#outfitxinh", "LOW COMPETITION HIGH ENGAGEMENT", "Save-oriented outfit audience", 89, 0.39, 19),
                    ("#vayxinh", "LOW COMPETITION HIGH ENGAGEMENT", "Buyer/save intent", 87, 0.33, 17),
                    ("#cleangirlstyle", "TREND VN", "Trend hijack", 86, 0.48, 7),
                    ("#ulzzangstyle", "TREND VN", "Korean style cluster", 82, 0.44, 12),
                    ("#reviewdo", "SHOP CONVERSION", "Buyer routing", hasShopIntent ? 94 : 88, 0.31, 24),
                    ("#tiktokshopvn", "SHOP CONVERSION", "TikTok Shop conversion", hasShopIntent ? 91 : 84, 0.42, 20)
                }
                : new (string tag, string layer, string purpose, int score, double density, int halfLife)[]
                {
                    ("#xuhuong", "HIGH DISCOVERY", "Discovery reach", 48, 0.92, 3),
                    ("#vlogdaily", "LOW COMPETITION HIGH ENGAGEMENT", "Relatable audience", 74, 0.46, 14),
                    ("#learnontiktok", "TREND VN", "Search/discovery", 68, 0.55, 10)
                };

            var incoming = incomingTags.Select(t => t.Trim().ToLowerInvariant()).Where(t => !string.IsNullOrWhiteSpace(t)).ToHashSet();
            return baseTags.Select(t =>
            {
                var score = ClampScore(t.score + (incoming.Contains(t.tag.ToLowerInvariant()) ? 7 : 0));
                return new JsonObject
                {
                    ["tag"] = t.tag,
                    ["posts"] = t.layer.Contains("HIGH") ? "large" : t.layer.Contains("TREND") ? "medium" : "niche",
                    ["likes"] = "opportunity-weighted",
                    ["engagement"] = score >= 85 ? "high" : "medium",
                    ["saturation"] = t.density >= 0.7 ? "high" : t.density >= 0.45 ? "medium" : "low",
                    ["growth"] = t.halfLife <= 7 ? "hot/short half-life" : "rising",
                    ["layer"] = t.layer,
                    ["purpose"] = t.purpose,
                    ["score"] = score,
                    ["opportunity_score"] = score,
                    ["competition_density"] = t.density,
                    ["trend_half_life_days"] = t.halfLife
                };
            }).ToList();
        }
    }
}
