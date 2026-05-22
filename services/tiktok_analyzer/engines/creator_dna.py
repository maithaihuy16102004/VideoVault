"""
CreatorDNAEngine — Phase 3
Profiles creator archetypes to calibrate baselines and recommendations.

Different creator types have fundamentally different:
    - Optimal pacing
    - Hook styles
    - Retention curves
    - Engagement patterns
    - Hashtag strategies

Comparing a fashion aesthetic creator to a comedy creator is meaningless.
This engine ensures fair comparison within archetype clusters.
"""
from typing import Dict, Any, List
import re


class CreatorDNAEngine:
    """
    Detects the creator archetype from their content patterns.
    Used to calibrate baselines so AI doesn't penalize a
    talking-head creator for having slower pacing than a dance creator.
    """

    # Creator archetype definitions with signature patterns
    ARCHETYPES = {
        "fashion_aesthetic": {
            "signals": ["ootd", "outfit", "phoidoxinh", "lookbook", "style", "fashion",
                       "phoidonu", "phoidonam", "vayday", "trendy"],
            "expected_pacing": 1.8,
            "expected_retention": 0.45,
            "expected_like_rate": 0.08,
            "description": "Visual-first content, outfit transitions, aesthetic shots",
            "strengths": ["Visual hook", "Trend alignment", "Shareability"],
            "weaknesses": ["Low comments", "Short lifecycle"],
        },
        "storytelling": {
            "signals": ["story", "kehoach", "review", "chia se", "tamsu", "kinhnghiem",
                       "hoilam", "thatbai", "thanhcong"],
            "expected_pacing": 0.8,
            "expected_retention": 0.55,
            "expected_like_rate": 0.06,
            "description": "Narrative-driven, talking head, personal stories",
            "strengths": ["High retention", "Deep engagement", "Follower loyalty"],
            "weaknesses": ["Slower reach", "Less shareable"],
        },
        "fast_cut_transition": {
            "signals": ["transition", "edit", "fastcut", "zoom", "effect", "trending",
                       "douyin", "xiaohongshu", "dance"],
            "expected_pacing": 2.5,
            "expected_retention": 0.35,
            "expected_like_rate": 0.12,
            "description": "Rapid transitions, effects-heavy, TikTok-native editing",
            "strengths": ["High virality", "Strong first impression", "Replay potential"],
            "weaknesses": ["Low follower conversion", "Trend dependent"],
        },
        "educational": {
            "signals": ["tip", "meo", "cach", "huongdan", "tutorial", "howto",
                       "review", "sosanh", "danhgia", "toplist"],
            "expected_pacing": 0.6,
            "expected_retention": 0.50,
            "expected_like_rate": 0.05,
            "description": "How-to, tips, reviews, comparisons",
            "strengths": ["Save rate", "Long-tail views", "Authority building"],
            "weaknesses": ["Lower virality", "Niche audience"],
        },
        "luxury_lifestyle": {
            "signals": ["luxury", "oldmoney", "quietluxury", "premium", "brand",
                       "designer", "highend", "sangchanh", "xedep"],
            "expected_pacing": 1.2,
            "expected_retention": 0.50,
            "expected_like_rate": 0.10,
            "description": "Aspirational content, brand showcase, luxury aesthetic",
            "strengths": ["High save rate", "Premium audience", "Brand deals"],
            "weaknesses": ["Niche reach", "High production cost"],
        },
        "thirst_trap": {
            "signals": ["gai xinh", "hotgirl", "hotboy", "body", "gym",
                       "sexy", "xinh", "dep", "cute", "slay"],
            "expected_pacing": 1.5,
            "expected_retention": 0.40,
            "expected_like_rate": 0.15,
            "description": "Appearance-focused, high visual impact",
            "strengths": ["Extremely high likes", "Viral potential", "Quick growth"],
            "weaknesses": ["Low follower quality", "Shadow risk", "Low conversion"],
        },
    }

    def detect_archetype(
        self,
        hashtags: List[str],
        title: str = "",
        description: str = "",
    ) -> Dict[str, Any]:
        """
        Detect the most likely creator archetype from content signals.
        Returns archetype, confidence, and calibrated baselines.
        """
        # Combine all text signals
        all_text = " ".join([
            (title or "").lower(),
            (description or "").lower(),
            " ".join(h.lower().replace("#", "") for h in (hashtags or [])),
        ])

        # Score each archetype
        scores = {}
        for archetype, config in self.ARCHETYPES.items():
            match_count = sum(1 for s in config["signals"] if s in all_text)
            scores[archetype] = match_count

        # Find best match
        if not any(scores.values()):
            return self._unknown_result()

        best_archetype = max(scores, key=scores.get)
        best_score = scores[best_archetype]
        total_signals = sum(scores.values())

        # Confidence = how strongly this matches vs others
        confidence = round(best_score / max(total_signals, 1), 2)

        config = self.ARCHETYPES[best_archetype]

        # Get runner-up for hybrid detection
        sorted_types = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        secondary = sorted_types[1] if len(sorted_types) > 1 and sorted_types[1][1] > 0 else None

        return {
            "primary_archetype": best_archetype,
            "confidence": confidence,
            "description": config["description"],
            "strengths": config["strengths"],
            "weaknesses": config["weaknesses"],
            "calibrated_baselines": {
                "expected_pacing": config["expected_pacing"],
                "expected_retention": config["expected_retention"],
                "expected_like_rate": config["expected_like_rate"],
            },
            "secondary_archetype": secondary[0] if secondary else None,
            "all_scores": scores,
            "model_version": "3.0-signal-matching",
        }

    def _unknown_result(self) -> Dict[str, Any]:
        return {
            "primary_archetype": "unknown",
            "confidence": 0.0,
            "description": "Cannot determine archetype — insufficient signals",
            "strengths": [],
            "weaknesses": [],
            "calibrated_baselines": {
                "expected_pacing": 1.2,
                "expected_retention": 0.45,
                "expected_like_rate": 0.08,
            },
            "secondary_archetype": None,
            "all_scores": {},
            "model_version": "3.0-signal-matching",
        }
