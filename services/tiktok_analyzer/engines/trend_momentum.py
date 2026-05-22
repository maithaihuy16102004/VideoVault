"""
TrendMomentumEngine — Phase 3
Tracks trend lifecycle: emerging → peak → saturated → dead.

TikTok trends (especially fashion) have extremely short half-lives.
A trend like "office siren" can go from 0 → peak → dead in 2-4 weeks.

In production:
    - Time-series data from TikTok Creative Center API
    - Prophet forecasting for trend decay prediction
    - Sentence-transformer embeddings for semantic trend matching

For MVP:
    - Curated trend database with lifecycle stage assignments
    - Heuristic momentum scoring
"""
from typing import Dict, Any, List
import time


class TrendMomentumEngine:
    """
    Evaluates trend lifecycle stage and momentum for hashtags/topics.
    Critical for fashion niche where trend half-life is extremely short.
    """

    # Curated trend database with lifecycle stages
    # In production, this would be populated by a daily scraper + Prophet model
    TREND_DB = {
        # Format: "keyword": {"stage": ..., "momentum": ..., "peak_date": ..., "half_life_days": ...}
        "officesiren": {"stage": "PEAK", "momentum": 0.85, "half_life_days": 14, "region": "global"},
        "coquette": {"stage": "DECLINING", "momentum": 0.45, "half_life_days": 21, "region": "global"},
        "cleangirl": {"stage": "SATURATED", "momentum": 0.20, "half_life_days": 60, "region": "global"},
        "oldmoney": {"stage": "DECLINING", "momentum": 0.35, "half_life_days": 30, "region": "global"},
        "quietluxury": {"stage": "PEAK", "momentum": 0.80, "half_life_days": 21, "region": "global"},
        "mobwife": {"stage": "DECLINING", "momentum": 0.30, "half_life_days": 14, "region": "global"},
        "balletcore": {"stage": "EMERGING", "momentum": 0.70, "half_life_days": 21, "region": "global"},
        "softgirlvn": {"stage": "GROWING", "momentum": 0.75, "half_life_days": 30, "region": "VN"},
        "ulzzangstyle": {"stage": "STABLE", "momentum": 0.55, "half_life_days": 90, "region": "VN"},
        "minimalfit": {"stage": "GROWING", "momentum": 0.65, "half_life_days": 45, "region": "VN"},
        "douyin": {"stage": "STABLE", "momentum": 0.60, "half_life_days": 120, "region": "VN"},
        "y2k": {"stage": "DECLINING", "momentum": 0.30, "half_life_days": 60, "region": "global"},
        "darkacademia": {"stage": "STABLE", "momentum": 0.50, "half_life_days": 90, "region": "global"},
        "cottagecore": {"stage": "SATURATED", "momentum": 0.15, "half_life_days": 120, "region": "global"},
        "phoidoxinh": {"stage": "STABLE", "momentum": 0.55, "half_life_days": 180, "region": "VN"},
        "slaygirl": {"stage": "GROWING", "momentum": 0.70, "half_life_days": 30, "region": "VN"},
    }

    # Lifecycle stage definitions
    STAGE_META = {
        "EMERGING":  {"emoji": "🌱", "action": "RIDE NOW — First mover advantage", "risk": "LOW"},
        "GROWING":   {"emoji": "📈", "action": "JOIN — Still early enough for organic reach", "risk": "LOW"},
        "PEAK":      {"emoji": "🔥", "action": "CAPITALIZE — Maximum reach but competition high", "risk": "MEDIUM"},
        "STABLE":    {"emoji": "📊", "action": "USE SELECTIVELY — Reliable but not explosive", "risk": "LOW"},
        "DECLINING": {"emoji": "📉", "action": "PHASE OUT — Shift to next trend", "risk": "MEDIUM"},
        "SATURATED": {"emoji": "💀", "action": "AVOID — Algorithm deprioritizing", "risk": "HIGH"},
        "UNKNOWN":   {"emoji": "❓", "action": "MONITOR — Insufficient data", "risk": "UNKNOWN"},
    }

    def analyze_trends(self, hashtags: List[str]) -> Dict[str, Any]:
        """
        Analyze the trend momentum of a set of hashtags.
        Returns per-tag lifecycle analysis and overall trend alignment score.
        """
        if not hashtags:
            return {"trend_tags": [], "trend_alignment_score": 0, "recommendations": ["No hashtags to analyze"]}

        import re
        cleaned = [re.sub(r'^#', '', h.lower().strip()) for h in hashtags if h]

        trend_tags = []
        total_momentum = 0.0
        matched_count = 0

        for tag in cleaned:
            # Look up in trend DB
            trend_info = self.TREND_DB.get(tag)
            if trend_info:
                stage = trend_info["stage"]
                meta = self.STAGE_META[stage]
                trend_tags.append({
                    "tag": f"#{tag}",
                    "stage": stage,
                    "emoji": meta["emoji"],
                    "momentum": trend_info["momentum"],
                    "half_life_days": trend_info["half_life_days"],
                    "action": meta["action"],
                    "risk": meta["risk"],
                    "region": trend_info["region"],
                })
                total_momentum += trend_info["momentum"]
                matched_count += 1
            else:
                # Unknown trend — check against generic patterns
                if any(kw in tag for kw in ["vn", "vietnam", "viet"]):
                    trend_tags.append({
                        "tag": f"#{tag}",
                        "stage": "UNKNOWN",
                        "emoji": "❓",
                        "momentum": 0.40,
                        "half_life_days": None,
                        "action": "MONITOR — Regional tag, check TikTok Creative Center",
                        "risk": "UNKNOWN",
                        "region": "VN",
                    })

        # Overall trend alignment score
        if matched_count > 0:
            avg_momentum = total_momentum / matched_count
            # Bonus for having emerging/growing trends
            emerging_bonus = sum(
                0.1 for t in trend_tags if t["stage"] in ("EMERGING", "GROWING")
            )
            # Penalty for saturated trends
            saturated_penalty = sum(
                0.15 for t in trend_tags if t["stage"] == "SATURATED"
            )
            trend_alignment_score = round(
                min(100, (avg_momentum + emerging_bonus - saturated_penalty) * 100), 1
            )
        else:
            trend_alignment_score = 0.0

        # Recommendations
        recommendations = self._generate_trend_recs(trend_tags, matched_count, len(cleaned))

        return {
            "trend_tags": trend_tags,
            "trend_alignment_score": trend_alignment_score,
            "matched_trends": matched_count,
            "total_checked": len(cleaned),
            "recommendations": recommendations,
            "model_version": "3.0-curated-lifecycle",
        }

    def _generate_trend_recs(self, trend_tags: List, matched: int, total: int) -> List[str]:
        recs = []
        stages = [t["stage"] for t in trend_tags]
        
        if "SATURATED" in stages:
            dead_tags = [t["tag"] for t in trend_tags if t["stage"] == "SATURATED"]
            recs.append(f"💀 Bỏ ngay: {', '.join(dead_tags)} — đã bão hòa")

        if "EMERGING" in stages or "GROWING" in stages:
            hot_tags = [t["tag"] for t in trend_tags if t["stage"] in ("EMERGING", "GROWING")]
            recs.append(f"🔥 Giữ chắc: {', '.join(hot_tags)} — đang lên mạnh")

        if matched == 0:
            recs.append("⚠️ Không có hashtag nào match trend database — thêm trend tags")

        if not any(s in stages for s in ("EMERGING", "GROWING", "PEAK")):
            recs.append("📈 Thiếu trend đang hot — check TikTok Creative Center cho VN")

        if not recs:
            recs.append("✅ Trend alignment tốt — đang đi đúng sóng")

        return recs
