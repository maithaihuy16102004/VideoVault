from __future__ import annotations

from typing import Any


class NicheDiscoveryEngine:
    """Map creator/video signals to a niche cluster and seed competitor set."""

    NICHE_CLUSTERS: dict[str, dict[str, Any]] = {
        "fashion_douyin_softgirl": {
            "keywords": ["douyin", "softgirl", "phoidoxinh", "phoidonu", "ootd", "outfit", "vay", "style"],
            "label": "Fashion Douyin / soft girl outfit",
            "related_channels": [
                {"handle": "@chic.outfit.vn", "role": "local reference"},
                {"handle": "@outfitdaily.vn", "role": "OOTD benchmark"},
                {"handle": "@softgirl.lookbook", "role": "creative pattern benchmark"},
            ],
            "trend_terms": ["mirror transition", "full-body reveal", "fabric close-up", "soft girl OOTD"],
        },
        "fashion_streetwear_female": {
            "keywords": ["streetwear", "genz", "cargo", "jacket", "sneaker", "outfitcheck"],
            "label": "Female streetwear / Gen Z outfit",
            "related_channels": [
                {"handle": "@streetfit.vn", "role": "streetwear benchmark"},
                {"handle": "@genz.outfit", "role": "youth style benchmark"},
            ],
            "trend_terms": ["walk-in reveal", "fit check", "wide angle full-body", "street POV"],
        },
        "beauty_review": {
            "keywords": ["makeup", "skincare", "son", "lamdep", "review", "beauty"],
            "label": "Beauty review / tutorial",
            "related_channels": [
                {"handle": "@beautyreview.vn", "role": "review benchmark"},
                {"handle": "@skincare.tips", "role": "routine benchmark"},
            ],
            "trend_terms": ["before-after", "texture close-up", "routine steps", "price reveal"],
        },
    }

    def discover(self, hashtags: list[str], title: str, description: str, creator_archetype: str) -> dict[str, Any]:
        text = " ".join([title or "", description or "", creator_archetype or "", " ".join(hashtags or [])]).lower()
        best_id = "general_lifestyle"
        best_score = 0
        best_cluster: dict[str, Any] = {
            "label": "General lifestyle",
            "related_channels": [],
            "trend_terms": [],
            "keywords": [],
        }

        for niche_id, cluster in self.NICHE_CLUSTERS.items():
            score = sum(1 for keyword in cluster["keywords"] if keyword in text)
            if score > best_score:
                best_id = niche_id
                best_score = score
                best_cluster = cluster

        confidence = min(95, 40 + best_score * 12) if best_score else 35
        return {
            "niche_id": best_id,
            "label": best_cluster["label"],
            "confidence": confidence,
            "matched_signals": [kw for kw in best_cluster["keywords"] if kw in text][:8],
            "related_channels": best_cluster["related_channels"],
            "trend_terms": best_cluster["trend_terms"],
            "source": "curated_benchmark_v1",
        }
