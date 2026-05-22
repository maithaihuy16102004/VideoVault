import sys
import re
import time
import logging
import json
import requests
from datetime import datetime, timezone
from typing import Any
import concurrent.futures  # kept for potential future use
import yt_dlp
from yt_dlp.utils import DownloadError
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from engines.smart_metric_recovery import SmartMetricRecoveryEngine
from engines.baseline_engagement import BaselineEngagementEngine
from engines.retention_simulation import RetentionSimulationEngine
from engines.viral_probability import ViralProbabilityEngine
from engines.data_reliability import DataReliabilityLayer
from engines.velocity import VelocityEngine
from engines.confidence import ConfidenceScoringEngine
from engines.content_extraction import ContentExtractionEngine
from engines.visual_hook import VisualHookAI
from engines.retention_predictor import RetentionPredictionEngine
from engines.hashtag_clustering import HashtagClusteringEngine
from engines.trend_momentum import TrendMomentumEngine
from engines.creator_dna import CreatorDNAEngine
from engines.promote_roi import PromoteROIEngine
from engines.drift_detection import DriftDetectionEngine
from engines.account_health import AccountHealthEngine
from engines.automation_pipeline import AutomationPipelineEngine
from engines.promotion_decision_engine import PromotionDecisionEngine, ScorePack
import mlflow
import os

# MLflow setup (Dummy basic config)
os.environ["MLFLOW_TRACKING_URI"] = "sqlite:///mlflow.db"
try:
    mlflow.set_experiment("TikTok_Growth_Intelligence")
except Exception:
    pass

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("tiktok_analyzer")

# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(title="TikTok Analyzer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# AI Setup
# ---------------------------------------------------------------------------
GEMINI_API_KEY = "AIzaSyDFOitpuYFGGBiDxTMpnuK4MrXL99zgp_8"

# ---------------------------------------------------------------------------
# In-memory cache  (key -> (timestamp, data))  TTL = 300 s
# ---------------------------------------------------------------------------
CACHE_TTL = 300
_cache: dict[str, tuple[float, dict[str, Any]]] = {}
_gemini_disabled_until = 0.0

def _purge_expired() -> None:
    now = time.time()
    expired = [k for k, (ts, _) in _cache.items() if now - ts > CACHE_TTL]
    for k in expired:
        del _cache[k]

def _cache_get(url: str) -> dict[str, Any] | None:
    _purge_expired()
    entry = _cache.get(url)
    if entry is None:
        return None
    ts, data = entry
    if time.time() - ts > CACHE_TTL:
        del _cache[url]
        return None
    return data

def _cache_set(url: str, data: dict[str, Any]) -> None:
    _cache[url] = (time.time(), data)

# ---------------------------------------------------------------------------
# Link detection helpers
# ---------------------------------------------------------------------------
def _is_video_url(url: str) -> bool:
    return "/video/" in url

def _is_channel_url(url: str) -> bool:
    if "/video/" in url:
        return False
    return bool(re.search(r"/@[\w.]+", url))

# ---------------------------------------------------------------------------
# Duration & Date formatting
# ---------------------------------------------------------------------------
def _format_duration(seconds: int | float | str | None) -> str:
    if seconds is None:
        return "0:00"
    try:
        if isinstance(seconds, str):
            s = seconds.strip()
            if not s:
                return "0:00"
            # Accept "MM:SS" or "HH:MM:SS" strings.
            if ":" in s:
                parts = [int(p) for p in s.split(":")]
                if len(parts) == 2:
                    seconds = parts[0] * 60 + parts[1]
                elif len(parts) == 3:
                    seconds = parts[0] * 3600 + parts[1] * 60 + parts[2]
                else:
                    return "0:00"
            else:
                seconds = float(s)
        if float(seconds) <= 0:
            return "0:00"
        seconds = int(float(seconds))
    except (ValueError, TypeError):
        return "0:00"

    m, s = divmod(seconds, 60)
    return f"{m}:{s:02d}"

def _relative_time(upload_date_str: str | None) -> str:
    if not upload_date_str:
        return "Gần đây"
    try:
        dt = datetime.strptime(upload_date_str, "%Y%m%d").replace(tzinfo=timezone.utc)
        diff = datetime.now(timezone.utc) - dt
        days = diff.days

        if days <= 0: return "Hôm nay"
        if days == 1: return "Hôm qua"
        if days < 7: return f"{days} ngày trước"
        if days < 30: return f"{days // 7} tuần trước"
        if days < 365: return f"{days // 30} tháng trước"
        return f"{days // 365} năm trước"
    except (ValueError, TypeError):
        return "Gần đây"

def _extract_hashtags(title: str | None, description: str | None) -> list[str]:
    text = f"{title or ''} {description or ''}"
    tags = re.findall(r"#[\w\u00C0-\u024F\u1E00-\u1EFF]+", text)
    seen: set[str] = set()
    unique: list[str] = []
    for t in tags:
        low = t.lower()
        if low not in seen:
            seen.add(low)
            unique.append(t)
    return unique[:10]

# ---------------------------------------------------------------------------
# Channel scraping for real-time accurate stats
# ---------------------------------------------------------------------------
def _scrape_channel_stats(url: str) -> dict[str, int]:
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
        }
        res = requests.get(url, headers=headers, timeout=10)
        text = res.text
        followers = 0
        following = 0
        likes = 0
        follower_match = re.search(r'"followerCount":(\d+)', text)
        following_match = re.search(r'"followingCount":(\d+)', text)
        heart_match = re.search(r'"heartCount":(\d+)', text)
        if follower_match: followers = int(follower_match.group(1))
        if following_match: following = int(following_match.group(1))
        if heart_match: likes = int(heart_match.group(1))
        return {"followers": followers, "following": following, "likes": likes}
    except Exception as e:
        logger.warning(f"Failed to scrape accurate stats: {e}")
        return {"followers": 0, "following": 0, "likes": 0}

# ---------------------------------------------------------------------------
# AI Metrics & Target estimation
# ---------------------------------------------------------------------------
def _estimate_metrics(views: int, likes: int, comments: int, shares: int, duration: int | float | None) -> dict[str, Any]:
    # --- TikTok Anti-Bot Bypass ---
    # If yt-dlp fails to scrape likes/comments (returns 0) but we have views,
    # we estimate realistic baseline metrics so the AI doesn't wrongly punish the video.
    if views > 0:
        if likes == 0: likes = int(views * 0.075)     # ~7.5% avg like ratio
        if comments == 0: comments = int(views * 0.005) # ~0.5% avg comment ratio
        if shares == 0: shares = int(views * 0.01)      # ~1% avg share ratio

    safe_views = views + 1
    likes_ratio = likes / safe_views
    base_retention = 45 + likes_ratio * 200
    comment_boost = min(10, (comments / safe_views) * 500)
    retention = min(92, max(25, base_retention + comment_boost))
    dur = duration if duration and duration > 0 else 15
    dur_factor = 1.0 if dur <= 15 else (0.9 if dur <= 30 else (0.75 if dur <= 60 else 0.6))
    completion = min(95, max(15, retention * dur_factor))
    saves = max(1, int(likes * 0.12 + comments * 0.3))
    engagement = (likes + comments + shares) / safe_views * 100
    share_rate = shares / safe_views * 100
    return {
        "retentionRate": round(retention),
        "completionRate": round(completion),
        "saves": saves,
        "engagementRate": round(engagement, 1),
        "shareRate": round(share_rate, 1),
    }

def _to_int(value: Any, default: int = 0) -> int:
    try:
        if value is None:
            return default
        if isinstance(value, str):
            s = value.strip().replace(",", "").replace(" ", "")
            if not s:
                return default
            multiplier = 1
            suffix = s[-1].lower()
            if suffix in ("k", "m", "b"):
                multiplier = {"k": 1_000, "m": 1_000_000, "b": 1_000_000_000}[suffix]
                s = s[:-1]
            return int(float(s) * multiplier)
        return int(float(value))
    except (ValueError, TypeError):
        return default

def _to_float(value: Any, default: float | None = 0.0) -> float | None:
    try:
        if value is None:
            return default
        if isinstance(value, str):
            s = value.strip().replace(",", "").replace(" ", "")
            if not s:
                return default
            multiplier = 1.0
            suffix = s[-1].lower()
            if suffix in ("k", "m", "b"):
                multiplier = {"k": 1_000.0, "m": 1_000_000.0, "b": 1_000_000_000.0}[suffix]
                s = s[:-1]
            return float(s) * multiplier
        return float(value)
    except (ValueError, TypeError):
        return default

def _attach_channel_baselines(channel_stats: dict[str, Any], videos: list[dict[str, Any]]) -> None:
    import statistics

    view_values = [_to_int(v.get("views"), 0) for v in videos if _to_int(v.get("views"), 0) > 0]
    engagement_values = [
        float(v.get("engagementRate", 0) or 0)
        for v in videos
        if v.get("engagementRate") is not None
    ]

    channel_stats["median_views"] = statistics.median(view_values) if view_values else 0
    channel_stats["avg_views"] = round(sum(view_values) / max(len(view_values), 1)) if view_values else 0
    channel_stats["avg_engagement"] = round(sum(engagement_values) / max(len(engagement_values), 1), 2) if engagement_values else 0

def _build_organic_verdict(video_data: dict[str, Any], channel_stats: dict[str, Any]) -> dict[str, Any]:
    views = _to_int(video_data.get("views"), 0)
    engagement = float(video_data.get("engagementRate", 0) or 0)
    median_views = float(channel_stats.get("median_views") or channel_stats.get("avg_views") or 0)
    avg_engagement = float(channel_stats.get("avg_engagement") or engagement or 0)

    if median_views <= 0:
        median_views = max(views, 1)
    if avg_engagement <= 0:
        avg_engagement = max(engagement, 1)

    relative_views = views / max(median_views, 1)
    relative_engagement = engagement / max(avg_engagement, 0.01)

    if views < 100:
        rank = "WEAK"
    elif relative_views >= 3:
        rank = "BREAKOUT"
    elif relative_views >= 1.5:
        rank = "VIRAL"
    elif relative_views >= 0.8:
        rank = "NORMAL"
    else:
        rank = "WEAK"

    reasons = [
        f"Video đạt {views:,} views, bằng {relative_views:.2f} lần median kênh.",
        f"Engagement public bằng {relative_engagement:.2f} lần baseline kênh.",
    ]
    if rank in ("VIRAL", "BREAKOUT"):
        reasons.append("Public performance rất mạnh, nhưng chưa thay thế được dữ liệu paid/private.")

    return {
        "rank": rank,
        "relativeViews": round(relative_views, 2),
        "relativeEngagement": round(relative_engagement, 2),
        "reasons": reasons,
    }

def _vn_status(value: str) -> str:
    mapping = {
        "HIGH": "Cao",
        "MEDIUM": "Trung bình",
        "LOW": "Thấp",
        "WEAK": "Yếu",
        "STRONG": "Mạnh",
        "NORMAL": "Bình thường",
        "FAST": "Nhanh",
        "SLOW": "Chậm",
        "CLEAR": "Rõ",
        "AVERAGE": "Trung bình",
        "STATIC": "Tĩnh",
        "CLUTTERED": "Rối",
        "NONE": "Không có",
    }
    return mapping.get(str(value).upper(), str(value))

def _growth_targets(views: int, likes: int, followers: int, engagement_rate: float) -> dict[str, int]:
    multiplier = 3.0 if engagement_rate >= 10 else (2.5 if engagement_rate >= 5 else (2.0 if engagement_rate >= 2 else 1.5))
    def _nice(n: int) -> int:
        if n < 100: return max(n, 50)
        magnitude = 10 ** (len(str(n)) - 1)
        return int(((n // magnitude) + 1) * magnitude)
    return {
        "targetViews": _nice(int(views * multiplier)),
        "targetLikes": _nice(int(likes * multiplier)),
        "targetFollowers": _nice(int(followers * multiplier)),
    }

# ---------------------------------------------------------------------------
# Gemini helper — with exponential backoff retry
# ---------------------------------------------------------------------------
_gemini_lock = __import__('threading').Lock()

def _call_gemini(sys_prompt: str, user_prompt: str, max_tokens: int = 4096, timeout: int = 45) -> dict | None:
    global _gemini_disabled_until

    # --- Check global circuit-breaker ---
    with _gemini_lock:
        if time.time() < _gemini_disabled_until:
            logger.info("Gemini circuit-breaker active — skipping call (fallback mode)")
            return None

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
    payload = {
        "system_instruction": {"parts": [{"text": sys_prompt}]},
        "contents": [{"parts": [{"text": user_prompt}]}],
        "generationConfig": {"temperature": 0.7, "maxOutputTokens": max_tokens},
    }

    # --- Exponential backoff: up to 3 attempts ---
    wait_times = [2, 8, 20]  # seconds between retries
    for attempt, wait in enumerate(wait_times, start=1):
        try:
            res = requests.post(url, json=payload, timeout=timeout)

            if res.status_code == 429:
                retry_after = int(res.headers.get('Retry-After', wait))
                actual_wait = max(wait, retry_after)
                if attempt < len(wait_times):
                    logger.warning(f"Gemini 429 on attempt {attempt} — waiting {actual_wait}s before retry")
                    time.sleep(actual_wait)
                    continue
                else:
                    # All retries exhausted — activate circuit-breaker for 3 min
                    with _gemini_lock:
                        _gemini_disabled_until = time.time() + 180
                    logger.warning("Gemini rate limit exhausted — circuit-breaker ON for 3 minutes")
                    return None

            res.raise_for_status()
            data = res.json()

            if "candidates" in data and len(data["candidates"]) > 0:
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                text = text.replace("```json", "").replace("```", "").strip()
                # Strip any leading/trailing non-JSON
                start = text.find('{')
                end = text.rfind('}') + 1
                if start >= 0 and end > start:
                    text = text[start:end]
                return json.loads(text)

        except json.JSONDecodeError as e:
            logger.error(f"Gemini JSON parse error (attempt {attempt}): {e}")
            if attempt < len(wait_times):
                time.sleep(wait)
                continue
        except requests.exceptions.Timeout:
            logger.warning(f"Gemini timeout on attempt {attempt}")
            if attempt < len(wait_times):
                time.sleep(wait)
                continue
        except Exception as e:
            logger.error(f"Gemini API error (attempt {attempt}): {e}")
            return None

    return None

# ---------------------------------------------------------------------------
# AI Strategy Generators
# ---------------------------------------------------------------------------
def _generate_channel_insights(channel_name: str, bio: str, top_hashtags: list[str], videos_summary: list[dict]) -> dict | None:
    sys_prompt = """Ban la chien luoc gia TikTok cap cao. Hay phan tich du lieu kenh va tra ve JSON bang tieng Viet.

Chi tra ve JSON thuan, khong markdown, dung cau truc sau:
{
    "niche": "ten ngach noi dung",
    "viralHashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5", "#tag6"],
    "affiliateHooks": [
        {"tone": "To mo", "text": "hook tieng Viet 1..."},
        {"tone": "Noi dau", "text": "hook tieng Viet 2..."},
        {"tone": "Giai phap", "text": "hook tieng Viet 3..."}
    ],
    "viral_patterns": [
        "mau hinh 1 phat hien qua cac video...",
        "mau hinh 2 phat hien qua cac video...",
        "mau hinh 3 phat hien qua cac video...",
        "mau hinh 4 phat hien qua cac video..."
    ],
    "content_dna": {
        "primary_style": "ke chuyen / huong dan / review / vlog / hai huoc",
        "emotion_trigger": "to mo / so bo lo / mong muon / bat ngo / vui ve",
        "content_pillar": "tru cot noi dung chinh",
        "editing_style": "nhanh / cham / dien anh / doi thuong",
        "cta_style": "CTA manh / CTA nhe / khong CTA / CTA ngam",
        "creator_persona": "chuyen gia / nguoi ban / reviewer / giai tri"
    }
}

Tat ca gia tri van ban phai viet bang tieng Viet. Neu khong du du lieu, noi ro la dang uoc luong.
Voi viral_patterns: phan tich tat ca video de tim diem khac nhau giua video tot va video yeu.
Voi content_dna: xac dinh dau van tay sang tao rieng cua kenh.
Voi affiliateHooks: viet tieng Viet tu nhien, co kha nang chuyen doi cao."""

    videos_text = "\n".join([
        f"- '{v.get('title','')}' | Views: {v.get('views',0)} | Likes: {v.get('likes',0)} | "
        f"Engagement: {v.get('engagementRate',0)}% | Retention: {v.get('retentionRate',0)}% | "
        f"Duration: {v.get('duration','?')} | Shares: {v.get('shares',0)}"
        for v in videos_summary
    ])

    user_prompt = f"""PHAN TICH KENH TIKTOK NAY:
- Kenh: {channel_name}
- Bio: {bio}
- Hashtag pho bien: {', '.join(top_hashtags)}

TOAN BO VIDEO:
{videos_text}

Tra ve JSON phan tich bang tieng Viet."""

    return _call_gemini(sys_prompt, user_prompt, max_tokens=2048, timeout=20)


def _generate_ai_strategy(video_data: dict, channel_stats: dict) -> dict:
    # 1. Instantiate Core ML Engines (Phase 1 & 2)
    recovery_engine = SmartMetricRecoveryEngine()
    baseline_engine = BaselineEngagementEngine()
    retention_engine = RetentionSimulationEngine()
    viral_engine = ViralProbabilityEngine()
    reliability_layer = DataReliabilityLayer()
    velocity_engine = VelocityEngine()
    confidence_engine = ConfidenceScoringEngine()

    # 2. Extract Base Metrics & Apply Data Reliability
    def to_int(v):
        return _to_int(v, 0)

    views = to_int(video_data.get('views', 0))
    likes = to_int(video_data.get('likes', 0))
    comments = to_int(video_data.get('comments', 0))
    shares = to_int(video_data.get('shares', 0))
    followers = to_int(channel_stats.get('followers', 1000))
    
    import time
    # Simulate DB fetch time vs current time for data reliability check
    last_updated_ts = time.time() - 300 # Assume data is 5 minutes old
    reliability_data = reliability_layer.evaluate_reliability(video_data, last_updated_ts)
    
    # Simulate Velocity tracking (Requires history DB in production, simulating previous state for MVP)
    prev_metrics = {"views": max(0, views - 500), "likes": max(0, likes - 50)}
    velocity_data = velocity_engine.calculate_velocity(
        current_metrics={"views": views, "likes": likes}, 
        previous_metrics=prev_metrics, 
        delta_time_minutes=60.0
    )

    try:
        dur_str = video_data.get('duration', '0:30')
        parts = dur_str.split(':')
        duration = int(parts[0]) * 60 + int(parts[1]) if len(parts) == 2 else 30
    except Exception:
        duration = 30

    # 3. Phase 2: Content Extraction → Visual Hook → Retention Prediction
    recovered_metrics = recovery_engine.recover_metrics(views, likes, comments, shares, "default")
    corrected = recovered_metrics["corrected"]
    
    # Bayesian Confidence Scoring
    confidence_data = confidence_engine.calculate_confidence(
        views=corrected["views"],
        creator_history_count=10,
        feature_completeness=0.9,
        anomaly_score=reliability_data["anomaly_score"]
    )
    
    baseline_data = baseline_engine.get_expected_baseline(followers, 24)

    # Phase 3 Pipeline: Creator DNA & Trend Intelligence
    creator_engine = CreatorDNAEngine()
    hashtag_engine = HashtagClusteringEngine()
    trend_engine = TrendMomentumEngine()

    hashtags = video_data.get("hashtags", [])
    title = video_data.get("title", "")
    description = video_data.get("description", "")

    creator_dna = creator_engine.detect_archetype(hashtags, title, description)
    hashtag_analysis = hashtag_engine.classify_hashtags(hashtags)
    trend_analysis = trend_engine.analyze_trends(hashtags)

    # Phase 2 Pipeline: Extract content features → Analyze hook → Predict retention
    content_engine = ContentExtractionEngine()
    hook_ai = VisualHookAI()
    retention_predictor = RetentionPredictionEngine()

    # Pass the detected archetype as the "niche" to calibrate pacing and face visibility
    archetype = creator_dna["primary_archetype"]
    calibrated_niche = "fashion" if "fashion" in archetype else "education" if "story" in archetype else "dance" if "fast" in archetype else "default"

    content_features = content_engine.extract_features(
        title=title,
        description=description,
        hashtags=hashtags,
        duration_seconds=duration,
        views=corrected["views"],
        likes=corrected["likes"],
        comments=corrected["comments"],
        shares=corrected["shares"],
        niche=calibrated_niche,
    )

    # Override pacing score directly from Creator DNA baselines for maximum personalization
    content_features["pacing_score"] = creator_dna["calibrated_baselines"]["expected_pacing"]

    hook_result = hook_ai.analyze_hook(
        content_features=content_features,
        engagement_data={"views": corrected["views"], "likes": corrected["likes"],
                         "comments": corrected["comments"], "shares": corrected["shares"]}
    )

    retention_prediction = retention_predictor.predict_retention_curve(
        content_features=content_features,
        hook_analysis=hook_result,
        duration_seconds=duration,
    )

    # Phase 4 & 5 Engines + Automation
    roi_engine = PromoteROIEngine()
    drift_engine = DriftDetectionEngine()
    automation_engine = AutomationPipelineEngine()

    # Also run old engines for backward compat viral score
    retention_data = retention_engine.predict_retention(duration, 1.0, 1.0)
    viral_data = viral_engine.calculate_score(retention_data, corrected, baseline_data)

    # Blend scores: Phase 2 hook + Phase 1 viral probability + Phase 3 Trend Alignment
    hook_strength_normalized = hook_result["hook_strength"] / 10.0
    base_score = viral_data["overall_score"]
    trend_bonus = trend_analysis["trend_alignment_score"] * 0.1  # Max 10 points bonus
    
    # New Phase 4 Attention Score: (3s retention * 0.5) + (scroll stop rate * 0.3) + (initial velocity * 0.2)
    ret_3s_normalized = min(100, retention_prediction["retention_at_3s"])
    scroll_stop_normalized = min(100, hook_result["hook_strength"] * 10)
    velocity_1h = velocity_data.get("views_velocity_per_min", 0.0) * 60
    initial_vel_normalized = min(100, velocity_1h * 0.5) # Heuristic for 1h velocity
    attention_score = int(ret_3s_normalized * 0.5 + scroll_stop_normalized * 0.3 + initial_vel_normalized * 0.2)
    
    # Final Score: 50% Core Viral ML, 30% Attention, 20% Trend Alignment
    raw_score = int(min(100, base_score * 0.5 + attention_score * 0.3 + trend_bonus * 2))
    
    # Confidence Penalty Modifier (If views are too low, data has high variance)
    views = _to_int(video_data.get("views", 0), 0)
    if views < 50:
        score = min(raw_score, 40)
        confidence_data["reason"] = "Quá ít view (<50). Dữ liệu có phương sai cực cao, chưa thể đưa ra dự đoán chính xác."
    elif views < 200:
        score = min(raw_score, 60)
        confidence_data["reason"] = "View thấp (<200). AI đã kích hoạt thuật toán penalty để chống false-positive."
    else:
        score = raw_score
        
    is_hero = score >= 65

    # Calculate Promote ROI (Phase 4)
    roi_prediction = roi_engine.calculate_roi(
        overall_score=score,
        retention_at_5s=retention_prediction["retention_at_5s"],
        hook_strength=hook_result["hook_strength"],
        archetype=creator_dna["primary_archetype"],
        niche=calibrated_niche,
        budget_usd=50.0 # Default MVP budget
    )
    
    # Calculate Drift (Phase 5) - MVP mock recent inferences
    mock_recent = [
        {"engagement_rate": 0.11, "completion_rate": 0.24, "score": 60},
        {"engagement_rate": 0.13, "completion_rate": 0.26, "score": 70},
        # Current inference
        {
            "engagement_rate": content_features["engagement_rate"],
            "completion_rate": retention_prediction["predicted_completion_rate"] / 100,
            "score": score
        }
    ] * 4 # Mock 12 inferences
    drift_alert = drift_engine.detect_drift(mock_recent)

    # 4. Build retention timeline from Phase 2 predictor
    retention_timeline = retention_prediction["retention_curve"]

    # 5. Base ML Strategy Payload
    
    # Generate Phase 4 Mock Temporal & Pattern Data
    mock_temporal = [
        {"time": "1h", "views": int(views * 0.1)},
        {"time": "2h", "views": int(views * 0.35)},
        {"time": "4h", "views": int(views * 0.8)}
    ]
    
    insight_text = "Khung mở đầu có sức hút, nhưng nhịp dựng chậm sau giây thứ 4 có thể làm giảm tỷ lệ giữ chân." if not is_hero else "Hook hình ảnh mạnh, độ khớp xu hướng cao và có tín hiệu được thuật toán phân phối tốt."
    
    def clamp_0_100(v: float) -> int:
        return int(max(0, min(100, round(v))))

    organic_potential = clamp_0_100(
        (retention_prediction["predicted_completion_rate"] * 0.55)
        + (retention_prediction["replay_probability"] * 100 * 0.2)
        + (min(10, video_data.get("shareRate", 0)) * 5 * 0.25)
    )
    view_boost = clamp_0_100(attention_score * 0.7 + score * 0.3)

    raw_follow_ctr = _to_float(video_data.get("follow_ctr"), None)
    raw_profile_ctr = _to_float(video_data.get("profile_ctr"), None)
    raw_product_ctr = _to_float(video_data.get("product_ctr"), None)
    has_private_conversion_data = all(v is not None for v in [raw_follow_ctr, raw_profile_ctr, raw_product_ctr])

    def estimate_follow_ctr() -> float:
        return round(max(0.1, min(1.2, (score / 100) * 1.1)), 2)

    def estimate_profile_ctr() -> float:
        return round(max(0.4, min(3.0, (attention_score / 100) * 3.0)), 2)

    def estimate_product_ctr() -> float:
        visibility = content_features.get("product_visibility", content_features.get("product_visible_ratio", 0.0))
        try:
            visibility_score = float(visibility)
        except (ValueError, TypeError):
            visibility_score = 0.0
        return round(max(0.0, min(0.8, visibility_score * 0.8)), 2)

    follow_ctr = raw_follow_ctr if raw_follow_ctr is not None else estimate_follow_ctr()
    profile_ctr = raw_profile_ctr if raw_profile_ctr is not None else estimate_profile_ctr()
    product_ctr = raw_product_ctr if raw_product_ctr is not None else estimate_product_ctr()

    follower_growth = clamp_0_100((follow_ctr * 18) + (retention_prediction["predicted_completion_rate"] * 0.45))
    profile_pull = clamp_0_100((profile_ctr * 15) + (attention_score * 0.35))
    sales_intent = clamp_0_100((product_ctr * 30) + (min(10, video_data.get("saveRate", 0) or 0) * 5))
    buying_comment_rate = _to_float(video_data.get("buying_comment_rate"), 0) or 0
    message_rate = _to_float(video_data.get("message_rate"), 0) or 0
    if product_ctr <= 0 and buying_comment_rate <= 0 and message_rate <= 0:
        sales_intent = min(sales_intent, 15)

    sample_size_penalty = 30 if views < 200 else 15 if views < 500 else 0
    low_retention_penalty = max(0, 55 - retention_prediction["predicted_completion_rate"]) * 0.9
    zero_follow_penalty = 25 if has_private_conversion_data and follow_ctr <= 0 else 15 if not has_private_conversion_data else 0
    weak_cta_penalty = 20 if not content_features.get("cta_present", False) else 0
    product_visible = bool(content_features.get("product_visible", False) or content_features.get("product_visibility", 0))
    low_product_visibility_penalty = 15 if not product_visible else 0
    estimated_data_penalty = 20 if not has_private_conversion_data else 0

    data_confidence = clamp_0_100(confidence_data.get("score", 50))
    conversion_confidence = 90 if has_private_conversion_data else 35
    creative_confidence = clamp_0_100(70 + (10 if content_features.get("cta_present", False) else -10) - (10 if not product_visible else 0))

    data_risk = clamp_0_100(
        sample_size_penalty
        + zero_follow_penalty
        + (45 if not has_private_conversion_data else 0)
        + max(0, 60 - data_confidence) * 0.35
    )
    creative_risk = clamp_0_100(
        low_retention_penalty
        + weak_cta_penalty
        + low_product_visibility_penalty
        + max(0, 50 - attention_score) * 0.35
    )
    money_risk = clamp_0_100(
        sample_size_penalty
        + estimated_data_penalty
        + (25 if not has_private_conversion_data else 0)
        + max(0, 60 - conversion_confidence) * 0.4
    )
    objective_mismatch_risk = clamp_0_100(
        (35 if not has_private_conversion_data else 0)
        + (20 if not product_visible else 0)
    )
    risk_breakdown = {
        "dataRisk": data_risk,
        "creativeRisk": creative_risk,
        "moneyRisk": money_risk,
        "objectiveMismatchRisk": objective_mismatch_risk,
    }
    risk_score = clamp_0_100(max(data_risk, creative_risk, money_risk, objective_mismatch_risk))
    organic_verdict = _build_organic_verdict(video_data, channel_stats)

    decision_scores = ScorePack(
        organicPotential=organic_potential,
        viewBoost=view_boost,
        followerGrowth=follower_growth,
        profilePull=profile_pull,
        salesIntent=sales_intent,
        risk=risk_score,
        dataConfidence=data_confidence,
        conversionConfidence=conversion_confidence,
        creativeConfidence=creative_confidence,
    )

    base_strategy = {
        "video_id": video_data.get("id", ""),
        "title": video_data.get("title", ""),
        "priority": "HIGH" if is_hero else "LOW",
        "goal": "followers" if is_hero else "views",
        "overall_score": score,
        "attention_score": attention_score,
        "hook_score": hook_result["hook_strength"],
        "retention_score": min(10, round(retention_prediction["predicted_completion_rate"] / 10, 1)),
        "viral_score": min(10, int(viral_data["viral_probability"] * 10)),
        "conversion_score": 6 if is_hero else 4,
        "scalability_score": 7 if is_hero else 4,
        "promote_worthiness": 8 if is_hero else 3,
        "first_3s_score": min(10, round(retention_prediction["retention_at_3s"] / 10, 1)),
        "scroll_stop_power": hook_result["scroll_stop_power"],
        "replayability_score": min(10, round(retention_prediction["replay_probability"] * 10, 1)),
        "pacing_quality": _vn_status("HIGH" if content_features["pacing_score"] >= creator_dna["calibrated_baselines"]["expected_pacing"] else "LOW"),
        "engagement_authenticity": _vn_status("HIGH" if not recovered_metrics["is_recovered"] else "MEDIUM"),
        
        # New Conversion Display
        "conversion_metrics": {
            "follow_ctr": follow_ctr,
            "profile_ctr": profile_ctr,
            "product_ctr": product_ctr,
            "is_estimated": not has_private_conversion_data
        },
        "data_quality": {
            "has_private_conversion_data": has_private_conversion_data,
            "uses_estimated_conversion_metrics": not has_private_conversion_data
        },
        "organic_verdict": organic_verdict,
        "risk_breakdown": risk_breakdown,
        
        # New Phase 4 Core Elements
        "ai_insight": insight_text,
        "temporal_analytics": mock_temporal,
        "patterns": {
            "visual": "Gương trong nhà, khung hình cận mặt và chủ thể rõ.",
            "outfit": "Trang phục có tín hiệu nổi bật hơn mặt bằng nội dung cùng nhóm.",
            "pose": "Tư thế trực diện giúp người xem nhận diện chủ thể nhanh.",
            "audio": "Âm thanh có độ phù hợp tốt với ngách nội dung hiện tại."
        },
        "promote_readiness": {
            "retention": "Mạnh" if retention_prediction["predicted_completion_rate"] > 50 else "Yếu",
            "product_visibility": "Trung bình",
            "cta_clarity": "Yếu"
        },
        
        "follower_conversion_probability": _vn_status("HIGH" if is_hero else "LOW"),
        "sales_conversion_probability": _vn_status("MEDIUM"),
        
        "retention_timeline": retention_timeline,
        "drop_analysis": {
            "biggest_drop_window": retention_prediction["biggest_drop_window"],
            "estimated_drop_pct": int(retention_prediction["drop_0_to_1s"] * 100 + retention_prediction["drop_1_to_3s"] * 100),
            "reason": "; ".join(hook_result["diagnostics"][:2]),
            "fix": hook_result["diagnostics"][-1] if len(hook_result["diagnostics"]) > 1 else "Tăng độ rõ của hook hình ảnh trong 3 giây đầu."
        },
        "rewatch_spikes": retention_prediction.get("rewatch_spikes", []),
        "scene_correlation": retention_prediction.get("scene_correlation", {}),
        "voice_analysis": {"voice_energy": "Trung bình", "speaking_speed": "Bình thường", "emotion_intensity": "Trung bình", "audio_hook_strength": 6, "assessment": "Cần tích hợp phân tích âm thanh chuyên sâu để đánh giá giọng nói chính xác hơn."},
        "visual_analysis": {
            "visual_hook_strength": hook_result["hook_strength"],
            "subtitle_quality": _vn_status("STRONG" if content_features["subtitle_density"] > 0.5 else "MEDIUM"),
            "motion_intensity": _vn_status("HIGH" if content_features["motion_intensity"] > 0.7 else "MEDIUM" if content_features["motion_intensity"] > 0.4 else "LOW"),
            "visual_clarity": _vn_status("CLEAR" if hook_result["component_scores"]["visual_quality"] > 0.6 else "AVERAGE"),
            "assessment": f"Độ rõ khuôn mặt: {content_features['face_visibility']:.0%} | Chuyển động: {content_features['motion_intensity']:.0%} | Khoảng tò mò: {content_features['curiosity_score']:.0%}"
        },
        "failure_diagnosis": {"primary_reason": "Giữ chân người xem còn yếu" if not is_hero else "Không có lỗi nghiêm trọng", "secondary_reason": "Chưa có dữ liệu bổ sung", "severity": _vn_status("HIGH" if not is_hero else "LOW")},
        "promote_decision": roi_prediction,
        "analysis_confidence": confidence_data,
        "drift_monitoring": drift_alert,
        
        # New Phase 3 Outputs
        "creator_archetype": {
            "primary": creator_dna["primary_archetype"],
            "confidence": creator_dna["confidence"],
            "description": creator_dna["description"]
        },
        "hashtag_strategy": {
            "strategy_score": hashtag_analysis["strategy_score"],
            "saturation_score": hashtag_analysis["saturation_score"],
            "distribution": {k: v["percentage"] for k, v in hashtag_analysis["distribution"].items()},
            "recommendations": hashtag_analysis["recommendations"]
        },
        "trend_intelligence": {
            "alignment_score": trend_analysis["trend_alignment_score"],
            "active_trends": [{"tag": t["tag"], "stage": t["stage"], "emoji": t["emoji"], "action": t["action"]} for t in trend_analysis["trend_tags"]],
            "recommendations": trend_analysis["recommendations"]
        }
    }
    
    # Automation Pipeline (Actions, Triggers)
    automation_results = automation_engine.process_automation(video_data, base_strategy, channel_stats)
    base_strategy["automation"] = automation_results

    # 6. Hybrid AI (Gemini) for Explainability & Copywriting
    sys_prompt = """Bạn là lớp phân tích tâm lý, giải thích và copywriting của hệ thống AI Growth & Promotion Decision Engine.
Bạn chỉ được giải thích, tối ưu ngôn ngữ, viết lại hook/CTA và gợi ý nội dung. Điểm số, ngân sách và quyết định quảng bá đã do rule/ML engine tính toán.
Tất cả giá trị văn bản trong JSON phải viết bằng tiếng Việt chuyên nghiệp, rõ ràng, không dùng tiếng Anh trừ thuật ngữ bắt buộc như CTA.

Trả về đúng JSON sau:
{
  "strengths": ["điểm mạnh", "điểm mạnh"],
  "weaknesses": ["điểm yếu"],
  "why_people_keep_watching": "lý do người xem tiếp tục xem",
  "why_people_swipe_away": "lý do người xem bỏ qua",
  "best_target_audience": "nhóm khán giả phù hợp nhất",
  "estimated_growth_potential": "tiềm năng tăng trưởng",
  "ad_potential": "tiềm năng chạy quảng cáo",
  "recommended_actions": ["hành động nên làm", "hành động nên làm"],
  "final_verdict": "kết luận ngắn gọn bằng tiếng Việt",
  "viral_reasoning": ["lý do viral", "lý do viral"],
  "hook_rewrites": ["hook viết lại", "hook viết lại"],
  "cta_rewrites": ["CTA viết lại", "CTA viết lại"],
  "next_video_idea": {"title": "tiêu đề", "hook": "hook", "concept": "ý tưởng", "format": "định dạng", "editing_style": "cách dựng"},
  "ab_test": {"hook_a": "hook A", "hook_b": "hook B", "cta_a": "CTA A", "cta_b": "CTA B", "test_hypothesis": "giả thuyết thử nghiệm"},
  "series_potential": {"score": 80, "reason": "lý do"},
  "algorithm_risk": ["rủi ro thuật toán"]
}"""

    user_prompt = f"Tiêu đề video: {title}\nLượt xem: {views}\nĐiểm hệ thống: {score}/100\nVideo tiềm năng cao: {is_hero}\nĐộng lực tăng trưởng: {velocity_data['momentum_score']}\nKiểu creator: {creator_dna['primary_archetype']}\nĐộ khớp xu hướng: {trend_analysis['trend_alignment_score']}"
    
    gemini_result = _call_gemini(sys_prompt, user_prompt, max_tokens=2048, timeout=45)
    
    if gemini_result:
        base_strategy.update(gemini_result)
    else:
        # Fallback text if LLM fails
        base_strategy.update({
            "strengths": ["Động lực thuật toán đang tích cực", f"Phù hợp với kiểu nội dung {creator_dna['primary_archetype']}"],
            "weaknesses": ["Cần tối ưu thêm creative trước khi mở rộng ngân sách"],
            "why_people_keep_watching": "Các chỉ số giữ chân người xem đang ở mức chấp nhận được.",
            "why_people_swipe_away": "Hook ban đầu vẫn có điểm rơi, cần làm rõ lợi ích sớm hơn.",
            "best_target_audience": "Nhóm khán giả hiện tại của kênh.",
            "estimated_growth_potential": "Trung bình đến cao.",
            "ad_potential": "Có thể test quảng cáo nhỏ nếu rủi ro được kiểm soát.",
            "recommended_actions": hashtag_analysis["recommendations"] + trend_analysis["recommendations"],
            "final_verdict": f"Hệ thống chấm {score}/100 dựa trên giữ chân người xem, hook, xu hướng và rủi ro dữ liệu.",
            "viral_reasoning": ["Tín hiệu tăng trưởng đang tích cực."],

            "hook_rewrites": [f"Biết điều này trước khi quá muộn {video_data.get('title')[:10]}..."],
            "cta_rewrites": ["Follow ngay để xem phần 2!"],
            "next_video_idea": {"title": "Phần 2", "hook": "Chưa có dữ liệu", "concept": "Chưa có dữ liệu", "format": "Chưa có dữ liệu", "editing_style": "Chưa có dữ liệu"},
            "ab_test": {"hook_a": "Phương án A", "hook_b": "Phương án B", "cta_a": "CTA A", "cta_b": "CTA B", "test_hypothesis": "So sánh 2 hook để đo tỷ lệ giữ chân trong 3 giây đầu."},
            "series_potential": {"score": 50, "reason": "Cần thêm dữ liệu để kết luận chắc hơn."},
            "algorithm_risk": ["Thuật toán có thể biến động theo thời điểm và mẫu người xem."]
        })

    promotion_decision = PromotionDecisionEngine.generate(
        video_id=video_data.get("id", ""),
        confidence=int(round(confidence_data.get("score", 50))),
        scores=decision_scores,
        metrics={
            "sample_size": float(views),
            "duration": float(duration),
            "avg_watch_time": float(video_data.get("avg_watch_time", 0) or 0),
            "completion_rate": float(retention_prediction.get("predicted_completion_rate", 0)),
            "like_rate": float(video_data.get("likeRate", 0) or 0),
            "comment_rate": float(video_data.get("commentRate", 0) or 0),
            "share_rate": float(video_data.get("shareRate", 0) or 0),
            "save_rate": float(video_data.get("saveRate", 0) or 0),
            "follow_ctr": float(follow_ctr),
            "profile_ctr": float(profile_ctr),
            "product_ctr": float(product_ctr),
            "buying_comment_rate": float(buying_comment_rate),
            "message_rate": float(message_rate),
            "has_private_conversion_data": has_private_conversion_data,
            "uses_estimated_metrics": not has_private_conversion_data,
            "cta_present": bool(content_features.get("cta_present", False)),
            "product_visible": product_visible,
            "hook_score": float(attention_score),
            "relative_views": float(organic_verdict.get("relativeViews", 1.0)),
            "relative_engagement": float(organic_verdict.get("relativeEngagement", 1.0)),
        },
        llm_explanation=base_strategy.get("final_verdict", ""),
        organic_verdict=organic_verdict,
        risk_breakdown=risk_breakdown,
    )
    base_strategy["promotion_decision"] = promotion_decision

    return base_strategy


# ---------------------------------------------------------------------------
# yt-dlp fetching
# ---------------------------------------------------------------------------
def _fetch_video(url: str) -> dict[str, Any]:
    opts = {"quiet": True, "no_warnings": True, "skip_download": True}
    with yt_dlp.YoutubeDL(opts) as ydl:
        return ydl.extract_info(url, download=False)

def _fetch_channel(url: str, max_videos: int = 6) -> dict[str, Any]:
    opts = {"extract_flat": True, "playlistend": max_videos, "quiet": True, "no_warnings": True}
    with yt_dlp.YoutubeDL(opts) as ydl:
        return ydl.extract_info(url, download=False)

# ---------------------------------------------------------------------------
# Build Response
# ---------------------------------------------------------------------------
def _build_video_obj(e: dict[str, Any], idx: int, channel_stats: dict) -> dict[str, Any]:
    views = _to_int(e.get("view_count"), 0)
    likes = _to_int(e.get("like_count"), 0)
    comments = _to_int(e.get("comment_count"), 0)
    shares = _to_int(e.get("repost_count"), 0)
    duration_sec = e.get("duration")
    metrics = _estimate_metrics(views, likes, comments, shares, duration_sec)
    thumbnails = e.get("thumbnails", [])
    thumbnail = thumbnails[-1].get("url", "") if thumbnails else ""
    title = e.get("title", "")
    description = e.get("description", "")
    hashtags = _extract_hashtags(title, description)
    targets = _growth_targets(views, likes, _to_int(channel_stats.get('followers', 1500), 1500), metrics["engagementRate"])
    video_data = {
        "id": e.get("id", f"v{idx}"),
        "title": title,
        "thumbnail": thumbnail,
        "views": views,
        "likes": likes,
        "comments": comments,
        "shares": shares,
        "saves": metrics["saves"],
        "likeRate": round(likes / (views + 1) * 100, 3),
        "commentRate": round(comments / (views + 1) * 100, 3),
        "shareRate": round(shares / (views + 1) * 100, 3),
        "saveRate": round(metrics["saves"] / (views + 1) * 100, 3),
        "postedAt": _relative_time(e.get("upload_date")),
        "duration": _format_duration(duration_sec),
        "retentionRate": metrics["retentionRate"],
        "engagementRate": metrics["engagementRate"],
        "shareRate": metrics["shareRate"],
        "completionRate": metrics["completionRate"],
        "privacy": "Public",
        "hashtags": hashtags,
        "channel_url": e.get("channel_url") or e.get("uploader_url") or "",
        "description": description,
        **targets,
    }
    video_data["aiStrategy"] = None
    return video_data

def _build_response(info: dict[str, Any], videos: list[dict[str, Any]], link_type: str, url: str) -> dict[str, Any]:
    channel_name = info.get("uploader") or info.get("title") or "Unknown Channel"
    channel_url = info.get("uploader_url") or (url if link_type == "channel" else "")
    real_stats = _scrape_channel_stats(channel_url) if channel_url else {"followers": 0, "following": 0, "likes": 0}
    followers = real_stats["followers"] or info.get("channel_follower_count") or 0
    following = real_stats["following"] or info.get("following_count") or 0
    total_likes = sum(v["likes"] for v in videos)
    if real_stats["likes"] > total_likes:
        total_likes = real_stats["likes"]
    import statistics
    views_list = [v["views"] for v in videos]
    median_views = statistics.median(views_list) if views_list else 0
    avg_views = round(sum(views_list) / max(len(videos), 1))
    avg_engagement = round(sum(v["engagementRate"] for v in videos) / max(len(videos), 1), 2)

    all_tags = []
    seen = set()
    for v in videos:
        for t in v.get("hashtags", []):
            if t.lower() not in seen:
                seen.add(t.lower())
                all_tags.append(t)
    top_hashtags = all_tags[:10] if all_tags else ["#xuhuong", "#foryou", "#tiktok"]

    bio = info.get("description") or "Chưa cập nhật tiểu sử"

    # Build videos summary for channel insights
    videos_summary = [{
        "title": v.get("title", ""),
        "views": v.get("views", 0),
        "likes": v.get("likes", 0),
        "comments": v.get("comments", 0),
        "shares": v.get("shares", 0),
        "engagementRate": v.get("engagementRate", 0),
        "retentionRate": v.get("retentionRate", 0),
        "duration": v.get("duration", "0:00"),
    } for v in videos]

    # Calculate Account Health
    health_engine = AccountHealthEngine()
    account_health = health_engine.calculate_health(videos_summary, real_stats)

    # Channel-level AI insights (includes viral_patterns + content_dna)
    ai_insights = _generate_channel_insights(channel_name, bio, top_hashtags, videos_summary)

    if ai_insights:
        niche = ai_insights.get("niche", "Tổng hợp (General)")
        viralHashtags = ai_insights.get("viralHashtags", top_hashtags[:3] + ["#xuhuong", "#viral"])
        affiliateHooks = ai_insights.get("affiliateHooks", [
            {"tone": "Tò mò", "text": "Bí mật mà không ai muốn bạn biết..."},
            {"tone": "Review", "text": "Săn deal hời kẻo lỡ!"},
            {"tone": "Giải pháp", "text": "Giúp cuộc sống dễ dàng hơn."}
        ])
        viral_patterns = ai_insights.get("viral_patterns", [])
        content_dna = ai_insights.get("content_dna", {})
    else:
        # Fallback niche detection
        tags_str = " ".join(top_hashtags).lower()
        if any(x in tags_str for x in ["outfit", "phoido", "fashion", "thoitrang", "vay"]):
            niche = "Thời trang (Fashion)"
            viralHashtags = ["#thoitrangnu", "#phoidoxinh", "#outfitcheck", "#fashiontok", "#ootd", "#thoitrang", "#macdep"]
            affiliateHooks = [
                {"tone": "Nỗi đau", "text": "Mua bộ này xong hối hận... vì không mua sớm hơn!"},
                {"tone": "Giải pháp", "text": "Bí kíp phối đồ hack thêm 5cm chiều cao."},
                {"tone": "Review", "text": "Unbox set đồ hot rần rần và cái kết bất ngờ."}
            ]
        elif any(x in tags_str for x in ["review", "skincare", "makeup", "son", "lamdep"]):
            niche = "Làm đẹp (Beauty)"
            viralHashtags = ["#reviewlamdep", "#skincare", "#goclamdep", "#beautytok", "#makeup", "#mypham"]
            affiliateHooks = [
                {"tone": "Tò mò", "text": "99% chị em bôi kem chống nắng sai cách..."},
                {"tone": "Giải pháp", "text": "Da mụn ẩn xài em này xong da căng bóng luôn!"},
                {"tone": "Review", "text": "Test thử chai tinh chất đang cực hot."}
            ]
        elif any(x in tags_str for x in ["food", "anvat", "nauan", "amthuc"]):
            niche = "Ẩm thực (Food)"
            viralHashtags = ["#ancungtiktok", "#foodreview", "#monngonmoingay", "#amthuc", "#nauan"]
            affiliateHooks = [
                {"tone": "Tò mò", "text": "Quán ăn này giấu kỹ lắm mới dám chỉ..."},
                {"tone": "Review", "text": "Trời lạnh mà có hộp này ăn thì bá cháy!"},
                {"tone": "Bắt trend", "text": "Trend mới: Thử ngay món này tại nhà siêu dễ."}
            ]
        else:
            niche = "Tổng hợp (General)"
            viralHashtags = top_hashtags[:3] + ["#xuhuong", "#learnontiktok", "#viral"]
            affiliateHooks = [
                {"tone": "Tò mò", "text": "Bí mật mà không ai muốn bạn biết..."},
                {"tone": "Review", "text": "Săn deal hời kẻo lỡ!"},
                {"tone": "Giải pháp", "text": "Giúp cuộc sống dễ dàng hơn."}
            ]
        viral_patterns = []
        content_dna = {}

    growth_rate = 25.0 if avg_engagement >= 8 else (18.0 if avg_engagement >= 4 else (12.0 if avg_engagement >= 1 else 6.0))

    return {
        "type": link_type,
        "username": info.get("uploader_id") or "user",
        "displayName": channel_name,
        "avatar": channel_name[0].upper() if channel_name else "U",
        "followers": followers,
        "following": following,
        "totalLikes": total_likes,
        "bio": bio,
        "videos": videos,
        "avgViews": avg_views,
        "medianViews": median_views,
        "avgEngagement": avg_engagement,
        "topHashtags": top_hashtags,
        "growthRate": growth_rate,
        "niche": niche,
        "viralHashtags": viralHashtags,
        "affiliateHooks": affiliateHooks,
        "viral_patterns": viral_patterns,
        "content_dna": content_dna,
        "account_health": account_health,
    }

def _populate_ai_strategies(videos: list[dict[str, Any]], channel_stats: dict) -> None:
    """Process videos SEQUENTIALLY with a delay between each Gemini call to avoid 429 rate limits."""
    for i, v in enumerate(videos):
        logger.info(f"Analyzing video {i+1}/{len(videos)}: {v.get('title', '')[:50]}")
        v["aiStrategy"] = _generate_ai_strategy(v, channel_stats)
        # Stagger requests: 2.5s gap between AI calls (Gemini free tier: ~10 RPM)
        if i < len(videos) - 1:
            time.sleep(2.5)

def _do_analyze(url: str) -> dict[str, Any]:
    try:
        # Validate URL to prevent yt-dlp crashing on local or invalid links
        valid_domains = ["tiktok.com", "douyin.com", "xiaohongshu.com"]
        if not any(domain in url.lower() for domain in valid_domains):
            raise HTTPException(status_code=400, detail="Vui lòng nhập link TikTok, Douyin hoặc Xiaohongshu hợp lệ.")

        if _is_video_url(url):
            logger.info("Detected VIDEO link: %s", url)
            info = _fetch_video(url)
            channel_url = info.get("uploader_url")
            channel_stats = _scrape_channel_stats(channel_url) if channel_url else {"followers": info.get("channel_follower_count", 0), "likes": 0}
            channel_stats["followers"] = channel_stats["followers"] or info.get("channel_follower_count", 0)
            videos = [_build_video_obj(info, 0, channel_stats)]
            _attach_channel_baselines(channel_stats, videos)
            _populate_ai_strategies(videos, channel_stats)
            return _build_response(info, videos, "video", url)

        if _is_channel_url(url):
            logger.info("Detected CHANNEL link: %s", url)
            info = _fetch_channel(url)
            channel_stats = _scrape_channel_stats(url)
            channel_stats["followers"] = channel_stats["followers"] or info.get("channel_follower_count", 0)
            entries = info.get("entries") or [info]
            videos = [_build_video_obj(e, idx, channel_stats) for idx, e in enumerate(entries)]
            _attach_channel_baselines(channel_stats, videos)
            _populate_ai_strategies(videos, channel_stats)
            return _build_response(info, videos, "channel", url)

        logger.info("Unknown link pattern, letting yt-dlp decide: %s", url)
        info = _fetch_channel(url)
        entries = info.get("entries") or [info]
        channel_url = info.get("uploader_url") or url
        channel_stats = _scrape_channel_stats(channel_url)
        channel_stats["followers"] = channel_stats["followers"] or info.get("channel_follower_count", 0)
        videos = [_build_video_obj(e, idx, channel_stats) for idx, e in enumerate(entries)]
        _attach_channel_baselines(channel_stats, videos)
        _populate_ai_strategies(videos, channel_stats)
        link_type = "channel" if "entries" in info else "video"
        return _build_response(info, videos, link_type, url)
    except DownloadError as exc:
        message = str(exc)
        if "Unsupported URL" in message:
            raise HTTPException(status_code=400, detail="Unsupported URL for this analyzer")
        if "Unable to extract secondary user ID" in message:
            raise HTTPException(
                status_code=422,
                detail=(
                    "Khong the phan tich truc tiep link kenh TikTok nay do gioi han extractor. "
                    "Vui long dan link 1 video thuoc kenh (dang /video/...) de he thong phan tich on dinh."
                ),
            )
        raise

# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@app.get("/api/analyze")
async def analyze_tiktok(url: str = Query(...)):
    if not url: raise HTTPException(status_code=400, detail="Missing url parameter")
    cached = _cache_get(url)
    if cached is not None:
        return cached
    try:
        result = _do_analyze(url)
        _cache_set(url, result)
        return result
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Error analyzing")
        raise HTTPException(status_code=500, detail=str(exc))

@app.get("/api/refresh")
async def refresh_tiktok(url: str = Query(...)):
    if not url: raise HTTPException(status_code=400, detail="Missing url parameter")
    try:
        result = _do_analyze(url)
        _cache_set(url, result)
        return result
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Error refreshing")
        raise HTTPException(status_code=500, detail=str(exc))

if __name__ == "__main__":
    port = int(os.getenv("TIKTOK_ANALYZER_PORT", "5053"))
    uvicorn.run(app, host="0.0.0.0", port=port)
