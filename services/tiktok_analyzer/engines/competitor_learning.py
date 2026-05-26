from __future__ import annotations

from typing import Any


class CompetitorLearningEngine:
    """Return winning patterns observed in a niche benchmark set."""

    BENCHMARKS: dict[str, dict[str, Any]] = {
        "fashion_douyin_softgirl": {
            "winning_hook_patterns": [
                "outfit reveal in first 1.5s",
                "mirror transition",
                "close-up fabric or detail shot before full-body reveal",
                "POV boyfriend camera",
            ],
            "winning_ctas": [
                "follow for tomorrow's outfit",
                "comment height/weight for sizing",
                "save this fit for weekend cafe",
            ],
            "top_archetypes": [
                {
                    "name": "soft girl mirror outfit",
                    "views_index": 88,
                    "follower_index": 84,
                    "sales_index": 58,
                    "best_objective": "FOLLOWERS",
                },
                {
                    "name": "outfit close-up detail",
                    "views_index": 66,
                    "follower_index": 48,
                    "sales_index": 82,
                    "best_objective": "PRODUCT_CLICKS",
                },
                {
                    "name": "try-on haul",
                    "views_index": 82,
                    "follower_index": 68,
                    "sales_index": 78,
                    "best_objective": "PROFILE_VIEWS",
                },
            ],
            "benchmarks": {
                "hook_speed_seconds": 1.5,
                "face_visibility": 0.8,
                "product_visibility": 0.75,
                "duration_low": 8,
                "duration_high": 18,
                "posting_frequency_per_week": 5,
            },
        },
        "fashion_streetwear_female": {
            "winning_hook_patterns": ["walk-in reveal", "fit check in first 2s", "street POV pan"],
            "winning_ctas": ["save this streetwear combo", "follow for daily fit checks"],
            "top_archetypes": [
                {
                    "name": "streetwear fit check",
                    "views_index": 84,
                    "follower_index": 72,
                    "sales_index": 64,
                    "best_objective": "PROFILE_VIEWS",
                }
            ],
            "benchmarks": {
                "hook_speed_seconds": 2.0,
                "face_visibility": 0.7,
                "product_visibility": 0.7,
                "duration_low": 7,
                "duration_high": 16,
                "posting_frequency_per_week": 4,
            },
        },
        "beauty_review": {
            "winning_hook_patterns": ["before-after in first 2s", "texture close-up", "problem-solution opening"],
            "winning_ctas": ["save before buying", "comment skin type for recommendation"],
            "top_archetypes": [
                {
                    "name": "GRWM talking review",
                    "views_index": 68,
                    "follower_index": 82,
                    "sales_index": 72,
                    "best_objective": "FOLLOWERS",
                },
                {
                    "name": "product texture close-up",
                    "views_index": 62,
                    "follower_index": 50,
                    "sales_index": 86,
                    "best_objective": "PRODUCT_CLICKS",
                },
            ],
            "benchmarks": {
                "hook_speed_seconds": 2.0,
                "face_visibility": 0.9,
                "product_visibility": 0.85,
                "duration_low": 15,
                "duration_high": 35,
                "posting_frequency_per_week": 4,
            },
        },
    }

    DEFAULT = {
        "winning_hook_patterns": ["clear result in first 2s", "specific promise", "visible subject early"],
        "winning_ctas": ["follow for the next part", "save this idea"],
        "top_archetypes": [
            {
                "name": "clear benefit short-form",
                "views_index": 65,
                "follower_index": 60,
                "sales_index": 45,
                "best_objective": "PROFILE_VIEWS",
            }
        ],
        "benchmarks": {
            "hook_speed_seconds": 2.0,
            "face_visibility": 0.7,
            "product_visibility": 0.6,
            "duration_low": 8,
            "duration_high": 25,
            "posting_frequency_per_week": 3,
        },
    }

    def learn(self, niche: dict[str, Any]) -> dict[str, Any]:
        niche_id = str(niche.get("niche_id") or "")
        benchmark = self.BENCHMARKS.get(niche_id, self.DEFAULT)
        return {
            "niche_id": niche_id or "general_lifestyle",
            "related_channels": niche.get("related_channels", []),
            "winning_hook_patterns": benchmark["winning_hook_patterns"],
            "winning_ctas": benchmark["winning_ctas"],
            "top_archetypes": benchmark["top_archetypes"],
            "benchmarks": benchmark["benchmarks"],
            "confidence": niche.get("confidence", 35),
            "source": "curated_competitor_benchmark_v1",
        }
