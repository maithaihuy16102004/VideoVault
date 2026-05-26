import sys
import re
import time
import logging
import json
import requests
from datetime import datetime, timezone
from typing import Any, Literal
import concurrent.futures  # kept for potential future use
import yt_dlp
from yt_dlp.utils import DownloadError
from fastapi import FastAPI, HTTPException, Query, Request
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
from engines.niche_discovery import NicheDiscoveryEngine
from engines.competitor_learning import CompetitorLearningEngine
from engines.strategy_match import StrategyMatchEngine
from engines.business_stage import BusinessStageEngine
from engines.saturation_return import SaturationReturnEngine
from engines.source_reliability import SourceReliabilityEngine
from engines.real_competitor_crawler import RealCompetitorCrawler
from engines.objective_mix import ObjectiveMixEngine
from engines.campaign_learning import CampaignLearningLoop
from engines.learning_intelligence import (
    AutonomousBudgetAllocator,
    AudioMomentumEngine,
    BanditPolicyEngine,
    CommentEmotionEngine,
    CommentPsychologyEngine,
    CreativeCenterIngestionContract,
    CreativeFatigueEngine,
    EvolutionaryMemoryEngine,
    FrameVisualAIContract,
    NextContentStrategyEngine,
    PortfolioOptimizationEngine,
    ROIAttributionEngine,
    RetentionTruthEngine,
    SelfLearningPromotionEngine,
    WinnerDNAEngine,
    WhyScaleEngine,
)
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
AnalysisMode = Literal["QUICK_SCAN", "FULL_CHANNEL_ANALYSIS"]
CAMPAIGN_LEARNING_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "storage", "campaign_learning.json")
)
_decision_audit_log: list[dict[str, Any]] = []
_monitoring_metrics: dict[str, Any] = {
    "crawler_errors": 0,
    "gemini_rate_limits": 0,
    "fallback_mode_calls": 0,
    "missing_field_events": 0,
    "scale_blocked_count": 0,
    "decision_count": 0,
    "decision_latency_ms_avg": 0,
}


def _increment_monitor(metric: str, amount: int = 1) -> None:
    _monitoring_metrics[metric] = int(_monitoring_metrics.get(metric, 0) or 0) + amount


def _record_decision_latency(started_at: float) -> None:
    elapsed_ms = int((time.perf_counter() - started_at) * 1000)
    count = int(_monitoring_metrics.get("decision_count", 0) or 0) + 1
    previous_avg = float(_monitoring_metrics.get("decision_latency_ms_avg", 0) or 0)
    _monitoring_metrics["decision_count"] = count
    _monitoring_metrics["decision_latency_ms_avg"] = int(((previous_avg * (count - 1)) + elapsed_ms) / count)


def _record_decision_audit(video_data: dict[str, Any], analysis_mode: AnalysisMode, decision: dict[str, Any]) -> None:
    audit = decision.get("decision_audit")
    if not isinstance(audit, dict):
        return

    rules = audit.get("rules_triggered") or []
    reason_codes = decision.get("reasonCodes") or []
    if any(rule in rules for rule in ("EVIDENCE_BLOCK_SCALE", "MISSING_EVIDENCE_LEVEL_BLOCK_SCALE")) or "QUICK_SCAN_BLOCK_SCALE" in reason_codes:
        _increment_monitor("scale_blocked_count")

    _decision_audit_log.append({
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "video_id": video_data.get("id") or decision.get("video_id"),
        "title": video_data.get("title", ""),
        "analysis_mode": analysis_mode,
        "evidenceLevel": decision.get("source_reliability", {}).get("evidenceLevel"),
        "before_guardrail": audit.get("before_guardrail", {}),
        "after_guardrail": audit.get("after_guardrail", {}),
        "rules_triggered": rules,
        "why_objective_changed": audit.get("why_objective_changed", []),
        "budget_allocation": decision.get("budget_allocation", {}),
        "scale_explanation": decision.get("scale_explanation", {}),
        "warnings": decision.get("warnings", []),
    })
    if len(_decision_audit_log) > 300:
        del _decision_audit_log[:-300]


def _admin_promotion_snapshot() -> dict[str, Any]:
    campaign_store = CampaignLearningLoop(CAMPAIGN_LEARNING_PATH)
    history = campaign_store.history()
    learning_summary = campaign_store.summarize(None)
    recent_audits = list(reversed(_decision_audit_log[-100:]))
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "monitoring": dict(_monitoring_metrics),
        "audit_count": len(_decision_audit_log),
        "recent_decisions": recent_audits,
        "campaign_learning": learning_summary,
        "self_learning": SelfLearningPromotionEngine().analyze(history, "", None),
        "bandit_policy": BanditPolicyEngine().propose(history, []),
        "policy": {
            "scale_requires": "PAID_HISTORY_VERIFIED",
            "quick_scan_allows_scale": False,
            "curated_benchmark_is_live_market_data": False,
            "ai_guarantees_followers_or_revenue": False,
        },
    }


def _repair_mojibake_text(value: str) -> str:
    """Repair common UTF-8-as-Windows-1252 mojibake before returning JSON."""
    chars = (
        "àáảãạăằắẳẵặâầấẩẫậ"
        "èéẻẽẹêềếểễệ"
        "ìíỉĩị"
        "òóỏõọôồốổỗộơờớởỡợ"
        "ùúủũụưừứửữự"
        "ỳýỷỹỵđ"
        "ÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬ"
        "ÈÉẺẼẸÊỀẾỂỄỆ"
        "ÌÍỈĨỊ"
        "ÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢ"
        "ÙÚỦŨỤƯỪỨỬỮỰ"
        "ỲÝỶỸỴĐ"
    )
    replacements: dict[str, str] = {}
    for char in chars:
        variants = {char}
        current = char
        for _ in range(2):
            try:
                current = current.encode("utf-8").decode("cp1252")
            except UnicodeDecodeError:
                break
            variants.add(current)
        for variant in variants:
            if variant != char:
                replacements[variant] = char

    repaired = value
    for _ in range(3):
        before = repaired
        for bad, good in replacements.items():
            repaired = repaired.replace(bad, good)
        repaired = repaired.replace("Â ", " ").replace("Â", "")
        if repaired == before:
            break
    return repaired


def _repair_response_text(value: Any) -> Any:
    if isinstance(value, str):
        return _repair_mojibake_text(value)
    if isinstance(value, list):
        return [_repair_response_text(item) for item in value]
    if isinstance(value, dict):
        return {key: _repair_response_text(item) for key, item in value.items()}
    return value

def _purge_expired() -> None:
    now = time.time()
    expired = [k for k, (ts, _) in _cache.items() if now - ts > CACHE_TTL]
    for k in expired:
        del _cache[k]

def _cache_get(cache_key: str) -> dict[str, Any] | None:
    _purge_expired()
    entry = _cache.get(cache_key)
    if entry is None:
        return None
    ts, data = entry
    if time.time() - ts > CACHE_TTL:
        del _cache[cache_key]
        return None
    return data

def _cache_set(cache_key: str, data: dict[str, Any]) -> None:
    _cache[cache_key] = (time.time(), data)

# ---------------------------------------------------------------------------
# Link detection helpers
# ---------------------------------------------------------------------------
def _normalize_input_url(url: str) -> str:
    normalized = (url or "").strip()
    if not normalized:
        return normalized
    if normalized.startswith("@"):
        return f"https://www.tiktok.com/{normalized}"
    if normalized.startswith("www."):
        return f"https://{normalized}"
    if normalized.startswith("tiktok.com/"):
        return f"https://www.{normalized}"
    if normalized.startswith("vm.tiktok.com/") or normalized.startswith("vt.tiktok.com/"):
        return f"https://{normalized}"
    return normalized


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
        return "Gáº§n Ä‘Ã¢y"
    try:
        dt = datetime.strptime(upload_date_str, "%Y%m%d").replace(tzinfo=timezone.utc)
        diff = datetime.now(timezone.utc) - dt
        days = diff.days

        if days <= 0: return "HÃ´m nay"
        if days == 1: return "HÃ´m qua"
        if days < 7: return f"{days} ngÃ y trÆ°á»›c"
        if days < 30: return f"{days // 7} tuáº§n trÆ°á»›c"
        if days < 365: return f"{days // 30} thÃ¡ng trÆ°á»›c"
        return f"{days // 365} nÄƒm trÆ°á»›c"
    except (ValueError, TypeError):
        return "Gáº§n Ä‘Ã¢y"

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
        _increment_monitor("crawler_errors")
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
    channel_stats["max_views"] = max(view_values) if view_values else 0
    if view_values:
        sorted_views = sorted(view_values)
        p90_index = min(len(sorted_views) - 1, max(0, round((len(sorted_views) - 1) * 0.9)))
        channel_stats["p90_views"] = sorted_views[p90_index]
    else:
        channel_stats["p90_views"] = 0

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
        f"Video Ä‘áº¡t {views:,} views, báº±ng {relative_views:.2f} láº§n median kÃªnh.",
        f"Engagement public báº±ng {relative_engagement:.2f} láº§n baseline kÃªnh.",
    ]
    if rank in ("VIRAL", "BREAKOUT"):
        reasons.append("Public performance ráº¥t máº¡nh, nhÆ°ng chÆ°a thay tháº¿ Ä‘Æ°á»£c dá»¯ liá»‡u paid/private.")

    return {
        "rank": rank,
        "relativeViews": round(relative_views, 2),
        "relativeEngagement": round(relative_engagement, 2),
        "reasons": reasons,
    }

def _vn_status(value: str) -> str:
    mapping = {
        "HIGH": "Cao",
        "MEDIUM": "Trung bÃ¬nh",
        "LOW": "Tháº¥p",
        "WEAK": "Yáº¿u",
        "STRONG": "Máº¡nh",
        "NORMAL": "BÃ¬nh thÆ°á»ng",
        "FAST": "Nhanh",
        "SLOW": "Cháº­m",
        "CLEAR": "RÃµ",
        "AVERAGE": "Trung bÃ¬nh",
        "STATIC": "TÄ©nh",
        "CLUTTERED": "Rá»‘i",
        "NONE": "KhÃ´ng cÃ³",
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
# Gemini helper â€” with exponential backoff retry
# ---------------------------------------------------------------------------
_gemini_lock = __import__('threading').Lock()

def _call_gemini(sys_prompt: str, user_prompt: str, max_tokens: int = 4096, timeout: int = 45) -> dict | None:
    global _gemini_disabled_until

    # --- Check global circuit-breaker ---
    with _gemini_lock:
        if time.time() < _gemini_disabled_until:
            logger.info("Gemini circuit-breaker active â€” skipping call (fallback mode)")
            _increment_monitor("fallback_mode_calls")
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
                _increment_monitor("gemini_rate_limits")
                retry_after = int(res.headers.get('Retry-After', wait))
                actual_wait = max(wait, retry_after)
                if attempt < len(wait_times):
                    logger.warning(f"Gemini 429 on attempt {attempt} â€” waiting {actual_wait}s before retry")
                    time.sleep(actual_wait)
                    continue
                else:
                    # All retries exhausted â€” activate circuit-breaker for 3 min
                    with _gemini_lock:
                        _gemini_disabled_until = time.time() + 180
                    logger.warning("Gemini rate limit exhausted â€” circuit-breaker ON for 3 minutes")
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


def _generate_ai_strategy(
    video_data: dict,
    channel_stats: dict,
    analysis_mode: AnalysisMode = "QUICK_SCAN",
    enable_live_competitor: bool = False,
    use_llm: bool = True,
) -> dict:
    decision_started_at = time.perf_counter()
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

    # 3. Phase 2: Content Extraction â†’ Visual Hook â†’ Retention Prediction
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

    # Phase 2 Pipeline: Extract content features â†’ Analyze hook â†’ Predict retention
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
    text_signals = " ".join([title or "", description or "", " ".join(hashtags or [])]).lower()
    cta_terms = ["follow", "save", "comment", "bio", "link", "mua", "lưu", "theo dõi", "ib", "inbox"]
    product_terms = ["outfit", "set", "vay", "ao", "quần", "phối đồ", "bio", "sản phẩm", "fabric", "try-on"]
    content_features["cta_present"] = any(term in text_signals for term in cta_terms)
    content_features["product_visible"] = calibrated_niche in ("fashion", "beauty") or any(term in text_signals for term in product_terms)
    content_features["product_visibility"] = 0.72 if content_features["product_visible"] else 0.18

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
        confidence_data["reason"] = "QuÃ¡ Ã­t view (<50). Dá»¯ liá»‡u cÃ³ phÆ°Æ¡ng sai cá»±c cao, chÆ°a thá»ƒ Ä‘Æ°a ra dá»± Ä‘oÃ¡n chÃ­nh xÃ¡c."
    elif views < 200:
        score = min(raw_score, 60)
        confidence_data["reason"] = "View tháº¥p (<200). AI Ä‘Ã£ kÃ­ch hoáº¡t thuáº­t toÃ¡n penalty Ä‘á»ƒ chá»‘ng false-positive."
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
    
    insight_text = "Khung má»Ÿ Ä‘áº§u cÃ³ sá»©c hÃºt, nhÆ°ng nhá»‹p dá»±ng cháº­m sau giÃ¢y thá»© 4 cÃ³ thá»ƒ lÃ m giáº£m tá»· lá»‡ giá»¯ chÃ¢n." if not is_hero else "Hook hÃ¬nh áº£nh máº¡nh, Ä‘á»™ khá»›p xu hÆ°á»›ng cao vÃ  cÃ³ tÃ­n hiá»‡u Ä‘Æ°á»£c thuáº­t toÃ¡n phÃ¢n phá»‘i tá»‘t."
    
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
    if not has_private_conversion_data:
        _increment_monitor("missing_field_events")

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

    niche_engine = NicheDiscoveryEngine()
    competitor_engine = CompetitorLearningEngine()
    match_engine = StrategyMatchEngine()
    niche_intelligence = niche_engine.discover(hashtags, title, description, creator_dna["primary_archetype"])
    competitor_learning = competitor_engine.learn(niche_intelligence)
    strategy_match = match_engine.match(
        video_data=video_data,
        content_features=content_features,
        creator_dna=creator_dna,
        competitor_learning=competitor_learning,
        scores={
            "organicPotential": organic_potential,
            "viewBoost": view_boost,
            "followerGrowth": follower_growth,
            "profilePull": profile_pull,
            "salesIntent": sales_intent,
            "risk": risk_score,
        },
    )
    business_stage = BusinessStageEngine().classify(channel_stats, video_data)
    competitor_live = RealCompetitorCrawler().crawl(niche_intelligence, max_channels=10, enable_live=enable_live_competitor)
    campaign_learning_store = CampaignLearningLoop(CAMPAIGN_LEARNING_PATH)
    paid_learning = campaign_learning_store.summarize(strategy_match["matched_archetype"])
    campaign_history = campaign_learning_store.history()
    self_learning = SelfLearningPromotionEngine().analyze(
        campaign_history,
        strategy_match["matched_archetype"],
        strategy_match["recommended_objective"],
    )
    retention_truth = RetentionTruthEngine().evaluate(video_data, retention_prediction)
    comment_psychology = CommentPsychologyEngine().analyze(video_data)
    comment_emotion = CommentEmotionEngine().analyze(video_data)
    comment_psychology["emotion_intelligence"] = comment_emotion
    frame_visual_ai = FrameVisualAIContract().analyze(video_data, content_features)
    audio_momentum = AudioMomentumEngine().analyze(video_data, trend_analysis)
    creative_fatigue = CreativeFatigueEngine().evaluate(campaign_history, strategy_match["matched_archetype"])
    roi_attribution = ROIAttributionEngine().evaluate(video_data, paid_learning)
    source_reliability = SourceReliabilityEngine().evaluate(
        has_private_conversion_data=has_private_conversion_data,
        competitor_live_ready=bool(competitor_live.get("live_data_available")),
        paid_history_ready=bool(paid_learning.get("paid_history_ready")),
        uses_estimated_metrics=not has_private_conversion_data,
    )
    saturation = SaturationReturnEngine().evaluate(
        video_data=video_data,
        channel_stats=channel_stats,
        objective=strategy_match["recommended_objective"],
    )
    if saturation["suppress_video_views"] and strategy_match["recommended_objective"] == "VIDEO_VIEWS":
        strategy_match["recommended_objective"] = saturation["remap_to"] or "PROFILE_VIEWS"

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
            "visual": "GÆ°Æ¡ng trong nhÃ , khung hÃ¬nh cáº­n máº·t vÃ  chá»§ thá»ƒ rÃµ.",
            "outfit": "Trang phá»¥c cÃ³ tÃ­n hiá»‡u ná»•i báº­t hÆ¡n máº·t báº±ng ná»™i dung cÃ¹ng nhÃ³m.",
            "pose": "TÆ° tháº¿ trá»±c diá»‡n giÃºp ngÆ°á»i xem nháº­n diá»‡n chá»§ thá»ƒ nhanh.",
            "audio": "Ã‚m thanh cÃ³ Ä‘á»™ phÃ¹ há»£p tá»‘t vá»›i ngÃ¡ch ná»™i dung hiá»‡n táº¡i."
        },
        "promote_readiness": {
            "retention": "Máº¡nh" if retention_prediction["predicted_completion_rate"] > 50 else "Yáº¿u",
            "product_visibility": "Trung bÃ¬nh",
            "cta_clarity": "Yáº¿u"
        },
        
        "follower_conversion_probability": _vn_status("HIGH" if is_hero else "LOW"),
        "sales_conversion_probability": _vn_status("MEDIUM"),
        
        "retention_timeline": retention_timeline,
        "drop_analysis": {
            "biggest_drop_window": retention_prediction["biggest_drop_window"],
            "estimated_drop_pct": int(retention_prediction["drop_0_to_1s"] * 100 + retention_prediction["drop_1_to_3s"] * 100),
            "reason": "; ".join(hook_result["diagnostics"][:2]),
            "fix": hook_result["diagnostics"][-1] if len(hook_result["diagnostics"]) > 1 else "TÄƒng Ä‘á»™ rÃµ cá»§a hook hÃ¬nh áº£nh trong 3 giÃ¢y Ä‘áº§u."
        },
        "rewatch_spikes": retention_prediction.get("rewatch_spikes", []),
        "scene_correlation": retention_prediction.get("scene_correlation", {}),
        "voice_analysis": {"voice_energy": "Trung bÃ¬nh", "speaking_speed": "BÃ¬nh thÆ°á»ng", "emotion_intensity": "Trung bÃ¬nh", "audio_hook_strength": 6, "assessment": "Cáº§n tÃ­ch há»£p phÃ¢n tÃ­ch Ã¢m thanh chuyÃªn sÃ¢u Ä‘á»ƒ Ä‘Ã¡nh giÃ¡ giá»ng nÃ³i chÃ­nh xÃ¡c hÆ¡n."},
        "visual_analysis": {
            "visual_hook_strength": hook_result["hook_strength"],
            "subtitle_quality": _vn_status("STRONG" if content_features["subtitle_density"] > 0.5 else "MEDIUM"),
            "motion_intensity": _vn_status("HIGH" if content_features["motion_intensity"] > 0.7 else "MEDIUM" if content_features["motion_intensity"] > 0.4 else "LOW"),
            "visual_clarity": _vn_status("CLEAR" if hook_result["component_scores"]["visual_quality"] > 0.6 else "AVERAGE"),
            "assessment": f"Äá»™ rÃµ khuÃ´n máº·t: {content_features['face_visibility']:.0%} | Chuyá»ƒn Ä‘á»™ng: {content_features['motion_intensity']:.0%} | Khoáº£ng tÃ² mÃ²: {content_features['curiosity_score']:.0%}"
        },
        "failure_diagnosis": {"primary_reason": "Giá»¯ chÃ¢n ngÆ°á»i xem cÃ²n yáº¿u" if not is_hero else "KhÃ´ng cÃ³ lá»—i nghiÃªm trá»ng", "secondary_reason": "ChÆ°a cÃ³ dá»¯ liá»‡u bá»• sung", "severity": _vn_status("HIGH" if not is_hero else "LOW")},
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
        },
        "niche_intelligence": niche_intelligence,
        "real_competitor_crawler": competitor_live,
        "competitor_learning": competitor_learning,
        "strategy_match": strategy_match,
        "business_stage": business_stage,
        "saturation_intelligence": saturation,
        "source_reliability": source_reliability,
        "campaign_learning": paid_learning,
        "self_learning": self_learning,
        "retention_truth": retention_truth,
        "comment_psychology": comment_psychology,
        "frame_visual_ai": frame_visual_ai,
        "audio_momentum": audio_momentum,
        "creative_fatigue": creative_fatigue,
        "roi_attribution": roi_attribution,
        "competitive_promotion_intelligence": {
            "promotion_goal": strategy_match["recommended_objective"],
            "confidence": min(95, int((strategy_match["match_score"] * 0.5) + (source_reliability["score"] * 0.3) + (niche_intelligence["confidence"] * 0.2))),
            "evidenceLevel": source_reliability["evidenceLevel"],
            "reason": strategy_match["reason"],
            "competitor_insights": strategy_match["competitor_insights"],
            "fixes_before_promote": strategy_match["fixes_before_promote"],
            "competitive_data_notice": competitor_live["message"],
        },
    }
    
    # Automation Pipeline (Actions, Triggers)
    automation_results = automation_engine.process_automation(video_data, base_strategy, channel_stats)
    base_strategy["automation"] = automation_results

    # 6. Hybrid AI (Gemini) for Explainability & Copywriting
    sys_prompt = """Báº¡n lÃ  lá»›p phÃ¢n tÃ­ch tÃ¢m lÃ½, giáº£i thÃ­ch vÃ  copywriting cá»§a há»‡ thá»‘ng AI Growth & Promotion Decision Engine.
Báº¡n chá»‰ Ä‘Æ°á»£c giáº£i thÃ­ch, tá»‘i Æ°u ngÃ´n ngá»¯, viáº¿t láº¡i hook/CTA vÃ  gá»£i Ã½ ná»™i dung. Äiá»ƒm sá»‘, ngÃ¢n sÃ¡ch vÃ  quyáº¿t Ä‘á»‹nh quáº£ng bÃ¡ Ä‘Ã£ do rule/ML engine tÃ­nh toÃ¡n.
Táº¥t cáº£ giÃ¡ trá»‹ vÄƒn báº£n trong JSON pháº£i viáº¿t báº±ng tiáº¿ng Viá»‡t chuyÃªn nghiá»‡p, rÃµ rÃ ng, khÃ´ng dÃ¹ng tiáº¿ng Anh trá»« thuáº­t ngá»¯ báº¯t buá»™c nhÆ° CTA.

Tráº£ vá» Ä‘Ãºng JSON sau:
{
  "strengths": ["Ä‘iá»ƒm máº¡nh", "Ä‘iá»ƒm máº¡nh"],
  "weaknesses": ["Ä‘iá»ƒm yáº¿u"],
  "why_people_keep_watching": "lÃ½ do ngÆ°á»i xem tiáº¿p tá»¥c xem",
  "why_people_swipe_away": "lÃ½ do ngÆ°á»i xem bá» qua",
  "best_target_audience": "nhÃ³m khÃ¡n giáº£ phÃ¹ há»£p nháº¥t",
  "estimated_growth_potential": "tiá»m nÄƒng tÄƒng trÆ°á»Ÿng",
  "ad_potential": "tiá»m nÄƒng cháº¡y quáº£ng cÃ¡o",
  "recommended_actions": ["hÃ nh Ä‘á»™ng nÃªn lÃ m", "hÃ nh Ä‘á»™ng nÃªn lÃ m"],
  "final_verdict": "káº¿t luáº­n ngáº¯n gá»n báº±ng tiáº¿ng Viá»‡t",
  "viral_reasoning": ["lÃ½ do viral", "lÃ½ do viral"],
  "hook_rewrites": ["hook viáº¿t láº¡i", "hook viáº¿t láº¡i"],
  "cta_rewrites": ["CTA viáº¿t láº¡i", "CTA viáº¿t láº¡i"],
  "next_video_idea": {"title": "tiÃªu Ä‘á»", "hook": "hook", "concept": "Ã½ tÆ°á»Ÿng", "format": "Ä‘á»‹nh dáº¡ng", "editing_style": "cÃ¡ch dá»±ng"},
  "ab_test": {"hook_a": "hook A", "hook_b": "hook B", "cta_a": "CTA A", "cta_b": "CTA B", "test_hypothesis": "giáº£ thuyáº¿t thá»­ nghiá»‡m"},
  "series_potential": {"score": 80, "reason": "lÃ½ do"},
  "algorithm_risk": ["rá»§i ro thuáº­t toÃ¡n"]
}"""

    user_prompt = f"TiÃªu Ä‘á» video: {title}\nLÆ°á»£t xem: {views}\nÄiá»ƒm há»‡ thá»‘ng: {score}/100\nVideo tiá»m nÄƒng cao: {is_hero}\nÄá»™ng lá»±c tÄƒng trÆ°á»Ÿng: {velocity_data['momentum_score']}\nKiá»ƒu creator: {creator_dna['primary_archetype']}\nÄá»™ khá»›p xu hÆ°á»›ng: {trend_analysis['trend_alignment_score']}"
    
    gemini_result = _call_gemini(sys_prompt, user_prompt, max_tokens=2048, timeout=45) if use_llm else None
    
    if gemini_result:
        base_strategy.update(gemini_result)
    else:
        # Fallback text if LLM fails
        base_strategy.update({
            "strengths": ["Äá»™ng lá»±c thuáº­t toÃ¡n Ä‘ang tÃ­ch cá»±c", f"PhÃ¹ há»£p vá»›i kiá»ƒu ná»™i dung {creator_dna['primary_archetype']}"],
            "weaknesses": ["Cáº§n tá»‘i Æ°u thÃªm creative trÆ°á»›c khi má»Ÿ rá»™ng ngÃ¢n sÃ¡ch"],
            "why_people_keep_watching": "CÃ¡c chá»‰ sá»‘ giá»¯ chÃ¢n ngÆ°á»i xem Ä‘ang á»Ÿ má»©c cháº¥p nháº­n Ä‘Æ°á»£c.",
            "why_people_swipe_away": "Hook ban Ä‘áº§u váº«n cÃ³ Ä‘iá»ƒm rÆ¡i, cáº§n lÃ m rÃµ lá»£i Ã­ch sá»›m hÆ¡n.",
            "best_target_audience": "NhÃ³m khÃ¡n giáº£ hiá»‡n táº¡i cá»§a kÃªnh.",
            "estimated_growth_potential": "Trung bÃ¬nh Ä‘áº¿n cao.",
            "ad_potential": "CÃ³ thá»ƒ test quáº£ng cÃ¡o nhá» náº¿u rá»§i ro Ä‘Æ°á»£c kiá»ƒm soÃ¡t.",
            "recommended_actions": hashtag_analysis["recommendations"] + trend_analysis["recommendations"],
            "final_verdict": f"Há»‡ thá»‘ng cháº¥m {score}/100 dá»±a trÃªn giá»¯ chÃ¢n ngÆ°á»i xem, hook, xu hÆ°á»›ng vÃ  rá»§i ro dá»¯ liá»‡u.",
            "viral_reasoning": ["TÃ­n hiá»‡u tÄƒng trÆ°á»Ÿng Ä‘ang tÃ­ch cá»±c."],

            "hook_rewrites": [f"Biáº¿t Ä‘iá»u nÃ y trÆ°á»›c khi quÃ¡ muá»™n {video_data.get('title')[:10]}..."],
            "cta_rewrites": ["Follow ngay Ä‘á»ƒ xem pháº§n 2!"],
            "next_video_idea": {"title": "Pháº§n 2", "hook": "ChÆ°a cÃ³ dá»¯ liá»‡u", "concept": "ChÆ°a cÃ³ dá»¯ liá»‡u", "format": "ChÆ°a cÃ³ dá»¯ liá»‡u", "editing_style": "ChÆ°a cÃ³ dá»¯ liá»‡u"},
            "ab_test": {"hook_a": "PhÆ°Æ¡ng Ã¡n A", "hook_b": "PhÆ°Æ¡ng Ã¡n B", "cta_a": "CTA A", "cta_b": "CTA B", "test_hypothesis": "So sÃ¡nh 2 hook Ä‘á»ƒ Ä‘o tá»· lá»‡ giá»¯ chÃ¢n trong 3 giÃ¢y Ä‘áº§u."},
            "series_potential": {"score": 50, "reason": "Cáº§n thÃªm dá»¯ liá»‡u Ä‘á»ƒ káº¿t luáº­n cháº¯c hÆ¡n."},
            "algorithm_risk": ["Thuáº­t toÃ¡n cÃ³ thá»ƒ biáº¿n Ä‘á»™ng theo thá»i Ä‘iá»ƒm vÃ  máº«u ngÆ°á»i xem."]
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
    promotion_decision = _apply_final_promotion_guardrails(
        promotion_decision=promotion_decision,
        strategy_match=strategy_match,
        business_stage=business_stage,
        saturation=saturation,
        source_reliability=source_reliability,
        paid_learning=paid_learning,
        competitor_live=competitor_live,
    )
    promotion_decision["retention_truth"] = retention_truth
    promotion_decision["comment_psychology"] = comment_psychology
    promotion_decision["frame_visual_ai"] = frame_visual_ai
    promotion_decision["audio_momentum"] = audio_momentum
    promotion_decision["creative_fatigue"] = creative_fatigue
    promotion_decision["roi_attribution"] = roi_attribution
    promotion_decision["self_learning"] = self_learning
    promotion_decision["scale_explanation"] = WhyScaleEngine().explain(
        retention_truth=retention_truth,
        comment_psychology=comment_psychology,
        audio_momentum=audio_momentum,
        fatigue=creative_fatigue,
        learning=self_learning,
    )
    promotion_decision["budget_allocation"] = AutonomousBudgetAllocator().recommend(
        decision=promotion_decision,
        retention_truth=retention_truth,
        learning=self_learning,
        fatigue=creative_fatigue,
        roi=roi_attribution,
    )
    if promotion_decision["budget_allocation"]["mode"] in ("KILL_TEST", "KILL_OR_FIX"):
        promotion_decision["action"] = "FIX_CREATIVE_FIRST"
        promotion_decision.setdefault("warnings", []).append(
            "Learning engine chặn test paid vì retention/ROAS/fatigue có rủi ro cao."
        )
        audit = promotion_decision.get("decision_audit")
        if isinstance(audit, dict):
            rules = audit.get("rules_triggered") if isinstance(audit.get("rules_triggered"), list) else []
            rules.append("LEARNING_ENGINE_BLOCK_PAID_TEST")
            audit["rules_triggered"] = sorted(set(rules))
            audit["after_guardrail"] = {
                "action": promotion_decision.get("action"),
                "objective": promotion_decision.get("objective"),
                "confidence": promotion_decision.get("confidence"),
                "budgetPlan": promotion_decision.get("budgetPlan"),
            }
    base_strategy["promotion_decision"] = promotion_decision
    _apply_analysis_scope_guardrail(base_strategy, analysis_mode)
    _record_decision_latency(decision_started_at)
    _record_decision_audit(video_data, analysis_mode, base_strategy["promotion_decision"])

    return base_strategy


# ---------------------------------------------------------------------------
# yt-dlp fetching
# ---------------------------------------------------------------------------
def _fetch_video(url: str) -> dict[str, Any]:
    opts = {"quiet": True, "no_warnings": True, "skip_download": True}
    with yt_dlp.YoutubeDL(opts) as ydl:
        return ydl.extract_info(url, download=False)

def _fetch_channel(url: str, max_videos: int | None = 6) -> dict[str, Any]:
    # Fetch a wider window, then sort by recency ourselves for stable "latest N" behavior.
    opts: dict[str, Any] = {"extract_flat": True, "quiet": True, "no_warnings": True}
    if max_videos is not None:
        fetch_window = max(max_videos, 30)
        opts["playlistend"] = fetch_window
    with yt_dlp.YoutubeDL(opts) as ydl:
        return ydl.extract_info(url, download=False)


def _entry_recency_key(entry: dict[str, Any]) -> int:
    ts = entry.get("timestamp")
    if ts:
        return _to_int(ts, 0)

    upload_date = str(entry.get("upload_date") or "").strip()
    if len(upload_date) == 8 and upload_date.isdigit():
        return _to_int(upload_date, 0)
    return 0


def _select_latest_entries(info: dict[str, Any], max_videos: int | None = 6) -> list[dict[str, Any]]:
    entries = list(info.get("entries") or [info])
    entries = [
        entry for entry in entries
        if isinstance(entry, dict) and (entry.get("id") or entry.get("url") or entry.get("webpage_url") or entry.get("title"))
    ]
    entries.sort(key=_entry_recency_key, reverse=True)
    if max_videos is None:
        return entries
    return entries[:max_videos]


def _ensure_real_videos(videos: list[dict[str, Any]], url: str) -> None:
    if not videos:
        raise HTTPException(
            status_code=422,
            detail="Không lấy được video public từ link này. Hãy dán link đầy đủ dạng https://www.tiktok.com/@username hoặc link một video cụ thể.",
        )

    has_usable_video = any(
        (video.get("title") or video.get("thumbnail") or _to_int(video.get("views"), 0) > 0)
        and str(video.get("id") or "").strip() not in ("", "v0")
        for video in videos
    )
    if not has_usable_video:
        logger.warning("Extractor returned empty TikTok metadata for %s", url)
        raise HTTPException(
            status_code=422,
            detail="TikTok trả metadata rỗng cho link này. Hãy thử link đầy đủ có https://www.tiktok.com/@username hoặc dán link video mới nhất của kênh.",
        )


def _build_analysis_scope(
    mode: AnalysisMode,
    video_count: int,
    baseline_built: bool,
    historical_patterns_ready: bool,
    all_public_videos_attempted: bool = False,
) -> dict[str, Any]:
    scope: dict[str, Any] = {
        "mode": mode,
        "video_count": video_count,
        "sort_by": "all_public_latest_first" if all_public_videos_attempted else "latest",
        "all_public_videos_attempted": all_public_videos_attempted,
        "strategy_ready": mode == "FULL_CHANNEL_ANALYSIS" and historical_patterns_ready,
        "is_enough_for_scale": mode == "FULL_CHANNEL_ANALYSIS" and baseline_built and historical_patterns_ready,
    }
    if mode == "FULL_CHANNEL_ANALYSIS":
        scope["baseline_built"] = baseline_built
        scope["historical_patterns_ready"] = historical_patterns_ready
    return scope


def _apply_analysis_scope_guardrail(strategy: dict[str, Any], mode: AnalysisMode) -> None:
    if mode != "QUICK_SCAN":
        return

    decision = strategy.get("promotion_decision")
    if not isinstance(decision, dict):
        return

    warnings = decision.get("warnings")
    if not isinstance(warnings, list):
        warnings = []
    quick_scan_warning = "Quick Scan chá»‰ phÃ¢n tÃ­ch video má»›i nháº¥t, khÃ´ng Ä‘á»§ Ä‘á»ƒ scale ngÃ¢n sÃ¡ch."
    if quick_scan_warning not in warnings:
        warnings.append(quick_scan_warning)
    decision["warnings"] = warnings

    decision["max_action"] = "TEST_SMALL"
    action = str(decision.get("action") or "")
    if action == "SCALE":
        decision["action"] = "TEST_SMALL"
        reason_codes = decision.get("reasonCodes")
        if not isinstance(reason_codes, list):
            reason_codes = []
        if "QUICK_SCAN_BLOCK_SCALE" not in reason_codes:
            reason_codes.append("QUICK_SCAN_BLOCK_SCALE")
        decision["reasonCodes"] = reason_codes
        audit = decision.get("decision_audit")
        if isinstance(audit, dict):
            rules = audit.get("rules_triggered")
            if not isinstance(rules, list):
                rules = []
            if "QUICK_SCAN_BLOCK_SCALE" not in rules:
                rules.append("QUICK_SCAN_BLOCK_SCALE")
            audit["rules_triggered"] = sorted(set(rules))
    elif action not in ("TEST_SMALL", "NEED_PRIVATE_ANALYTICS"):
        decision["action"] = "NEED_PRIVATE_ANALYTICS"

    audit = decision.get("decision_audit")
    if isinstance(audit, dict):
        audit["after_guardrail"] = {
            "action": decision.get("action"),
            "objective": decision.get("objective"),
            "confidence": decision.get("confidence"),
            "budgetPlan": decision.get("budgetPlan"),
        }


def _apply_final_promotion_guardrails(
    promotion_decision: dict[str, Any],
    strategy_match: dict[str, Any],
    business_stage: dict[str, Any],
    saturation: dict[str, Any],
    source_reliability: dict[str, Any],
    paid_learning: dict[str, Any],
    competitor_live: dict[str, Any],
) -> dict[str, Any]:
    before_guardrail = {
        "action": promotion_decision.get("action"),
        "objective": promotion_decision.get("objective"),
        "confidence": promotion_decision.get("confidence"),
        "budgetPlan": dict(promotion_decision.get("budgetPlan") or {}),
    }
    rules_triggered: list[str] = []
    objective_changes: list[dict[str, Any]] = []

    promotion_decision["promotion_goal"] = strategy_match["recommended_objective"]
    promotion_decision["niche_match_score"] = strategy_match["match_score"]
    promotion_decision["matched_niche_archetype"] = strategy_match["matched_archetype"]
    promotion_decision["competitive_reason"] = strategy_match["reason"]
    promotion_decision["competitor_insights"] = strategy_match["competitor_insights"]
    promotion_decision["fixes_before_promote"] = strategy_match["fixes_before_promote"]
    promotion_decision["gap_analysis"] = strategy_match["gap_analysis"]
    promotion_decision["conversion_pattern"] = strategy_match["conversion_pattern"]
    promotion_decision["business_stage"] = business_stage
    promotion_decision["saturation"] = saturation
    promotion_decision["source_reliability"] = source_reliability
    promotion_decision["campaign_learning"] = paid_learning
    promotion_decision["competitive_data_notice"] = competitor_live["message"]
    promotion_decision["reasons"] = strategy_match["reason"] + promotion_decision.get("reasons", [])
    promotion_decision["requiredFixesBeforePromote"] = (
        strategy_match["fixes_before_promote"] + promotion_decision.get("requiredFixesBeforePromote", [])
    )

    evidence_level = str(source_reliability.get("evidenceLevel") or "ESTIMATED")
    confidence_caps = {
        "ESTIMATED": 55,
        "PUBLIC_ONLY": 60,
        "COMPETITOR_BENCHMARK": 65,
        "PRIVATE_ANALYTICS": 80,
        "PAID_HISTORY_VERIFIED": 95,
    }
    max_confidence = int(
        source_reliability.get("max_decision_confidence")
        or confidence_caps.get(evidence_level, 55)
    )
    current_confidence = int(promotion_decision.get("confidence", 0) or 0)
    if current_confidence > max_confidence:
        promotion_decision["confidence"] = max_confidence
        rules_triggered.append("EVIDENCE_CONFIDENCE_DECAY")
        promotion_decision.setdefault("warnings", []).append(
            f"Decision confidence capped at {max_confidence}/100 because evidence level is {evidence_level}."
        )

    blocked_objectives = set(promotion_decision.get("dataQuality", {}).get("blockedObjectives", []))
    recommended_objective = strategy_match["recommended_objective"]
    if promotion_decision.get("action") in ("TEST_SMALL", "SCALE") and recommended_objective not in blocked_objectives:
        previous_objective = promotion_decision.get("objective")
        promotion_decision["objective"] = recommended_objective
        if previous_objective != recommended_objective:
            rules_triggered.append("STRATEGY_MATCH_OBJECTIVE")
            objective_changes.append({
                "from": previous_objective,
                "to": recommended_objective,
                "reason": "Strategy match selected the strongest objective for this niche archetype.",
            })

    stage = business_stage.get("accountStage")
    scores = promotion_decision.get("scores", {})
    if stage == "SMALL_SHOP" and scores.get("salesIntent", 0) >= 60:
        for candidate in ("MESSAGES", "PRODUCT_CLICKS", "PROFILE_VIEWS"):
            if candidate not in blocked_objectives:
                previous_objective = promotion_decision.get("objective")
                promotion_decision["objective"] = candidate
                promotion_decision["promotion_goal"] = candidate
                if previous_objective != candidate:
                    rules_triggered.append("BUSINESS_STAGE_COMMERCE_REMAP")
                    objective_changes.append({
                        "from": previous_objective,
                        "to": candidate,
                        "reason": "Small shop with buying intent should optimize for commerce/profile action, not generic views.",
                    })
                break

    if saturation.get("suppress_video_views") and promotion_decision.get("objective") == "VIDEO_VIEWS":
        previous_objective = promotion_decision.get("objective")
        promotion_decision["objective"] = saturation["remap_to"] or "PROFILE_VIEWS"
        promotion_decision["promotion_goal"] = promotion_decision["objective"]
        promotion_decision.setdefault("warnings", []).append(saturation["reason"])
        rules_triggered.append("SATURATION_SUPPRESS_VIDEO_VIEWS")
        objective_changes.append({
            "from": previous_objective,
            "to": promotion_decision["objective"],
            "reason": saturation["reason"],
        })

    if not source_reliability["can_scale_strong"]:
        if promotion_decision.get("action") == "SCALE":
            promotion_decision["action"] = "TEST_SMALL"
            rules_triggered.append("EVIDENCE_BLOCK_SCALE")
        promotion_decision.setdefault("warnings", []).append(source_reliability["warning"])
        reason_codes = promotion_decision.setdefault("reasonCodes", [])
        if "EVIDENCE_NOT_PAID_HISTORY_VERIFIED" not in reason_codes:
            reason_codes.append("EVIDENCE_NOT_PAID_HISTORY_VERIFIED")
    else:
        success_rate = float(paid_learning.get("objective_success_rate", 0) or 0)
        scores = promotion_decision.get("scores", {})
        risk = int(scores.get("risk", 100) or 100)
        sales_intent = int(scores.get("salesIntent", 0) or 0)
        warnings_text = " ".join(str(w).lower() for w in promotion_decision.get("warnings", []))
        conflict_risk = (
            risk >= 60
            or sales_intent < 20
            or saturation.get("diminishingReturnRisk") == "HIGH"
            or "negative" in warnings_text
            or "tiêu cực" in warnings_text
        )
        if conflict_risk:
            if promotion_decision.get("action") == "SCALE":
                promotion_decision["action"] = "TEST_SMALL"
            rules_triggered.append("CONFLICT_RISK_BLOCKS_PAID_HISTORY_BOOST")
            promotion_decision.setdefault("warnings", []).append(
                "Paid history is positive, but current risk/saturation/intent conflict blocks scale."
            )
        elif success_rate >= 0.7 and promotion_decision.get("action") == "TEST_SMALL":
            promotion_decision["action"] = "SCALE"
            rules_triggered.append("PAID_HISTORY_BOOST_SCALE")
        if success_rate >= 0.7:
            promotion_decision["confidence"] = min(max_confidence, int(promotion_decision.get("confidence", 0) or 0) + 10)
            budget = promotion_decision.get("budgetPlan") or {}
            if budget:
                budget["dailyBudgetMax"] = int(max(budget.get("dailyBudgetMax", 0), budget.get("dailyBudgetMin", 0) * 2))
                budget["scaleRule"] = "Paid history verified: scale only while objective KPI remains above historical benchmark."
                rules_triggered.append("PAID_HISTORY_BUDGET_CONFIDENCE_BOOST")

    if not source_reliability.get("evidenceLevel"):
        if promotion_decision.get("action") == "SCALE":
            promotion_decision["action"] = "TEST_SMALL"
        rules_triggered.append("MISSING_EVIDENCE_LEVEL_BLOCK_SCALE")

    promotion_decision["decision_audit"] = {
        "before_guardrail": before_guardrail,
        "after_guardrail": {
            "action": promotion_decision.get("action"),
            "objective": promotion_decision.get("objective"),
            "confidence": promotion_decision.get("confidence"),
            "budgetPlan": promotion_decision.get("budgetPlan"),
        },
        "rules_triggered": sorted(set(rules_triggered)),
        "why_objective_changed": objective_changes,
    }

    return promotion_decision

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

def _build_response(
    info: dict[str, Any],
    videos: list[dict[str, Any]],
    link_type: str,
    url: str,
    analysis_scope: dict[str, Any] | None = None,
) -> dict[str, Any]:
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

    bio = info.get("description") or "ChÆ°a cáº­p nháº­t tiá»ƒu sá»­"

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
        niche = ai_insights.get("niche", "Tá»•ng há»£p (General)")
        viralHashtags = ai_insights.get("viralHashtags", top_hashtags[:3] + ["#xuhuong", "#viral"])
        affiliateHooks = ai_insights.get("affiliateHooks", [
            {"tone": "TÃ² mÃ²", "text": "BÃ­ máº­t mÃ  khÃ´ng ai muá»‘n báº¡n biáº¿t..."},
            {"tone": "Review", "text": "SÄƒn deal há»i káº»o lá»¡!"},
            {"tone": "Giáº£i phÃ¡p", "text": "GiÃºp cuá»™c sá»‘ng dá»… dÃ ng hÆ¡n."}
        ])
        viral_patterns = ai_insights.get("viral_patterns", [])
        content_dna = ai_insights.get("content_dna", {})
    else:
        # Fallback niche detection
        tags_str = " ".join(top_hashtags).lower()
        if any(x in tags_str for x in ["outfit", "phoido", "fashion", "thoitrang", "vay"]):
            niche = "Thá»i trang (Fashion)"
            viralHashtags = ["#thoitrangnu", "#phoidoxinh", "#outfitcheck", "#fashiontok", "#ootd", "#thoitrang", "#macdep"]
            affiliateHooks = [
                {"tone": "Ná»—i Ä‘au", "text": "Mua bá»™ nÃ y xong há»‘i háº­n... vÃ¬ khÃ´ng mua sá»›m hÆ¡n!"},
                {"tone": "Giáº£i phÃ¡p", "text": "BÃ­ kÃ­p phá»‘i Ä‘á»“ hack thÃªm 5cm chiá»u cao."},
                {"tone": "Review", "text": "Unbox set Ä‘á»“ hot ráº§n ráº§n vÃ  cÃ¡i káº¿t báº¥t ngá»."}
            ]
        elif any(x in tags_str for x in ["review", "skincare", "makeup", "son", "lamdep"]):
            niche = "LÃ m Ä‘áº¹p (Beauty)"
            viralHashtags = ["#reviewlamdep", "#skincare", "#goclamdep", "#beautytok", "#makeup", "#mypham"]
            affiliateHooks = [
                {"tone": "TÃ² mÃ²", "text": "99% chá»‹ em bÃ´i kem chá»‘ng náº¯ng sai cÃ¡ch..."},
                {"tone": "Giáº£i phÃ¡p", "text": "Da má»¥n áº©n xÃ i em nÃ y xong da cÄƒng bÃ³ng luÃ´n!"},
                {"tone": "Review", "text": "Test thá»­ chai tinh cháº¥t Ä‘ang cá»±c hot."}
            ]
        elif any(x in tags_str for x in ["food", "anvat", "nauan", "amthuc"]):
            niche = "áº¨m thá»±c (Food)"
            viralHashtags = ["#ancungtiktok", "#foodreview", "#monngonmoingay", "#amthuc", "#nauan"]
            affiliateHooks = [
                {"tone": "TÃ² mÃ²", "text": "QuÃ¡n Äƒn nÃ y giáº¥u ká»¹ láº¯m má»›i dÃ¡m chá»‰..."},
                {"tone": "Review", "text": "Trá»i láº¡nh mÃ  cÃ³ há»™p nÃ y Äƒn thÃ¬ bÃ¡ chÃ¡y!"},
                {"tone": "Báº¯t trend", "text": "Trend má»›i: Thá»­ ngay mÃ³n nÃ y táº¡i nhÃ  siÃªu dá»…."}
            ]
        else:
            niche = "Tá»•ng há»£p (General)"
            viralHashtags = top_hashtags[:3] + ["#xuhuong", "#learnontiktok", "#viral"]
            affiliateHooks = [
                {"tone": "TÃ² mÃ²", "text": "BÃ­ máº­t mÃ  khÃ´ng ai muá»‘n báº¡n biáº¿t..."},
                {"tone": "Review", "text": "SÄƒn deal há»i káº»o lá»¡!"},
                {"tone": "Giáº£i phÃ¡p", "text": "GiÃºp cuá»™c sá»‘ng dá»… dÃ ng hÆ¡n."}
            ]
        viral_patterns = []
        content_dna = {}

    growth_rate = 25.0 if avg_engagement >= 8 else (18.0 if avg_engagement >= 4 else (12.0 if avg_engagement >= 1 else 6.0))
    first_strategy = (videos[0].get("aiStrategy") if videos else None) or {}
    first_business_stage = (
        (first_strategy.get("business_stage") or {}).get("accountStage")
        or ((first_strategy.get("promotion_decision") or {}).get("business_stage") or {}).get("accountStage")
        or "NEW_CREATOR"
    )
    winner_dna_engine = WinnerDNAEngine()
    winner_dna = winner_dna_engine.build_channel_dna(videos)
    for video in videos:
        strategy = video.get("aiStrategy") or {}
        decision = strategy.get("promotion_decision") or {}
        if isinstance(decision, dict):
            decision["winner_dna_match"] = winner_dna_engine.score_video(video, winner_dna)
    objective_top6 = ObjectiveMixEngine().rank(videos, business_stage=first_business_stage)
    portfolio_optimization = PortfolioOptimizationEngine().optimize(videos, objective_top6.get("final_mix", []))
    evolutionary_memory = EvolutionaryMemoryEngine().analyze(videos)
    next_content_strategy = NextContentStrategyEngine().generate(
        winner_dna=winner_dna,
        portfolio=portfolio_optimization,
        evolution=evolutionary_memory,
        channel_niche=str(niche),
    )
    creative_center_intelligence = CreativeCenterIngestionContract().summarize(str(niche))
    bandit_candidates = [
        {
            "video_id": item.get("video_id"),
            "objective": item.get("objective"),
        }
        for item in objective_top6.get("final_mix", [])
    ]
    bandit_policy = BanditPolicyEngine().propose(
        CampaignLearningLoop(CAMPAIGN_LEARNING_PATH).history(limit=300),
        bandit_candidates,
    )

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
        "analysis_scope": analysis_scope or {},
        "objective_top6": objective_top6,
        "winner_dna": winner_dna,
        "portfolio_optimization": portfolio_optimization,
        "evolutionary_memory": evolutionary_memory,
        "next_content_strategy": next_content_strategy,
        "creative_center_intelligence": creative_center_intelligence,
        "bandit_policy": bandit_policy,
    }

def _populate_ai_strategies(
    videos: list[dict[str, Any]],
    channel_stats: dict,
    analysis_mode: AnalysisMode = "QUICK_SCAN",
    enable_live_competitor: bool = False,
    max_llm_videos: int = 12,
) -> None:
    """Process videos SEQUENTIALLY with a delay between each Gemini call to avoid 429 rate limits."""
    for i, v in enumerate(videos):
        logger.info(f"Analyzing video {i+1}/{len(videos)}: {v.get('title', '')[:50]}")
        use_llm = i < max_llm_videos
        v["aiStrategy"] = _generate_ai_strategy(
            v,
            channel_stats,
            analysis_mode=analysis_mode,
            enable_live_competitor=enable_live_competitor,
            use_llm=use_llm,
        )
        # Stagger only LLM calls. Rule/ML-only decisions can run without artificial delay.
        if use_llm and i < min(len(videos), max_llm_videos) - 1:
            time.sleep(2.5)

def _do_analyze(
    url: str,
    mode: AnalysisMode = "FULL_CHANNEL_ANALYSIS",
    video_limit: int | None = None,
    live_competitor: bool = False,
) -> dict[str, Any]:
    try:
        url = _normalize_input_url(url)
        if mode not in ("QUICK_SCAN", "FULL_CHANNEL_ANALYSIS"):
            raise HTTPException(status_code=400, detail="Invalid analysis mode")

        # Validate URL to prevent yt-dlp crashing on local or invalid links
        valid_domains = ["tiktok.com", "douyin.com", "xiaohongshu.com"]
        if not any(domain in url.lower() for domain in valid_domains):
            raise HTTPException(status_code=400, detail="Vui lòng nh?p link TikTok, Douyin ho?c Xiaohongshu h?p l?.")

        all_public_videos_attempted = False
        if mode == "QUICK_SCAN":
            selected_limit: int | None = 6 if video_limit is None else max(6, min(12, int(video_limit)))
            fetch_limit: int | None = selected_limit
        else:
            if video_limit is None or int(video_limit) <= 0:
                selected_limit = None
                fetch_limit = None
                all_public_videos_attempted = True
            else:
                selected_limit = max(50, min(500, int(video_limit)))
                fetch_limit = selected_limit

        if _is_video_url(url):
            logger.info("Detected VIDEO link: %s", url)
            info = _fetch_video(url)
            channel_url = info.get("uploader_url")
            channel_stats = _scrape_channel_stats(channel_url) if channel_url else {"followers": info.get("channel_follower_count", 0), "likes": 0}
            channel_stats["followers"] = channel_stats["followers"] or info.get("channel_follower_count", 0)
            videos = [_build_video_obj(info, 0, channel_stats)]
            _ensure_real_videos(videos, url)
            _attach_channel_baselines(channel_stats, videos)
            _populate_ai_strategies(videos, channel_stats, analysis_mode=mode, enable_live_competitor=live_competitor)
            scope = _build_analysis_scope(
                mode=mode,
                video_count=len(videos),
                baseline_built=mode == "FULL_CHANNEL_ANALYSIS" and len(videos) >= 6,
                historical_patterns_ready=mode == "FULL_CHANNEL_ANALYSIS" and len(videos) >= 6,
                all_public_videos_attempted=False,
            )
            return _build_response(info, videos, "video", url, analysis_scope=scope)

        if _is_channel_url(url):
            logger.info("Detected CHANNEL link: %s", url)
            info = _fetch_channel(url, max_videos=fetch_limit)
            channel_stats = _scrape_channel_stats(url)
            channel_stats["followers"] = channel_stats["followers"] or info.get("channel_follower_count", 0)
            entries = _select_latest_entries(info, max_videos=selected_limit)
            videos = [_build_video_obj(e, idx, channel_stats) for idx, e in enumerate(entries)]
            _ensure_real_videos(videos, url)
            _attach_channel_baselines(channel_stats, videos)
            _populate_ai_strategies(videos, channel_stats, analysis_mode=mode, enable_live_competitor=live_competitor)
            scope = _build_analysis_scope(
                mode=mode,
                video_count=len(videos),
                baseline_built=mode == "FULL_CHANNEL_ANALYSIS" and len(videos) >= 6,
                historical_patterns_ready=mode == "FULL_CHANNEL_ANALYSIS" and len(videos) >= 6,
                all_public_videos_attempted=all_public_videos_attempted,
            )
            return _build_response(info, videos, "channel", url, analysis_scope=scope)

        logger.info("Unknown link pattern, letting yt-dlp decide: %s", url)
        info = _fetch_channel(url, max_videos=fetch_limit)
        entries = _select_latest_entries(info, max_videos=selected_limit)
        channel_url = info.get("uploader_url") or url
        channel_stats = _scrape_channel_stats(channel_url)
        channel_stats["followers"] = channel_stats["followers"] or info.get("channel_follower_count", 0)
        videos = [_build_video_obj(e, idx, channel_stats) for idx, e in enumerate(entries)]
        _ensure_real_videos(videos, url)
        _attach_channel_baselines(channel_stats, videos)
        _populate_ai_strategies(videos, channel_stats, analysis_mode=mode, enable_live_competitor=live_competitor)
        link_type = "channel" if "entries" in info else "video"
        scope = _build_analysis_scope(
            mode=mode,
            video_count=len(videos),
            baseline_built=mode == "FULL_CHANNEL_ANALYSIS" and len(videos) >= 6,
            historical_patterns_ready=mode == "FULL_CHANNEL_ANALYSIS" and len(videos) >= 6,
            all_public_videos_attempted=all_public_videos_attempted,
        )
        return _build_response(info, videos, link_type, url, analysis_scope=scope)
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
async def analyze_tiktok(
    url: str = Query(...),
    mode: AnalysisMode = Query("FULL_CHANNEL_ANALYSIS"),
    video_limit: int | None = Query(None),
    live_competitor: bool = Query(False),
):
    if not url:
        raise HTTPException(status_code=400, detail="Missing url parameter")
    url = _normalize_input_url(url)

    cache_key = f"{mode}|{video_limit}|{live_competitor}|{url}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    try:
        result = _repair_response_text(_do_analyze(url, mode=mode, video_limit=video_limit, live_competitor=live_competitor))
        _cache_set(cache_key, result)
        return result
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Error analyzing")
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/api/refresh")
async def refresh_tiktok(
    url: str = Query(...),
    mode: AnalysisMode = Query("QUICK_SCAN"),
    video_limit: int | None = Query(None),
    live_competitor: bool = Query(False),
):
    if not url:
        raise HTTPException(status_code=400, detail="Missing url parameter")
    url = _normalize_input_url(url)
    try:
        cache_key = f"{mode}|{video_limit}|{live_competitor}|{url}"
        result = _repair_response_text(_do_analyze(url, mode=mode, video_limit=video_limit, live_competitor=live_competitor))
        _cache_set(cache_key, result)
        return result
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Error refreshing")
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/campaign-result")
async def record_campaign_result(request: Request):
    payload = await request.json()
    required = ["video_id", "objective"]
    missing = [key for key in required if key not in payload]
    if "spend" not in payload and "budget" not in payload:
        missing.append("spend or budget")
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing fields: {', '.join(missing)}")
    result = CampaignLearningLoop(CAMPAIGN_LEARNING_PATH).record(payload)
    return result


@app.get("/api/admin/promotion-audit")
async def get_promotion_audit():
    return _repair_response_text(_admin_promotion_snapshot())

if __name__ == "__main__":
    port = int(os.getenv("TIKTOK_ANALYZER_PORT", "5053"))
    uvicorn.run(app, host="0.0.0.0", port=port)

