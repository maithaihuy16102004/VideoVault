from __future__ import annotations

from typing import Any


class SourceReliabilityEngine:
    """Grade evidence quality for each paid recommendation."""

    ORDER = {
        "ESTIMATED": 1,
        "PUBLIC_ONLY": 2,
        "COMPETITOR_BENCHMARK": 3,
        "PRIVATE_ANALYTICS": 4,
        "PAID_HISTORY_VERIFIED": 5,
    }
    MAX_DECISION_CONFIDENCE = {
        "ESTIMATED": 55,
        "PUBLIC_ONLY": 60,
        "COMPETITOR_BENCHMARK": 65,
        "PRIVATE_ANALYTICS": 80,
        "PAID_HISTORY_VERIFIED": 95,
    }

    def evaluate(
        self,
        has_private_conversion_data: bool,
        competitor_live_ready: bool,
        paid_history_ready: bool,
        uses_estimated_metrics: bool,
    ) -> dict[str, Any]:
        if paid_history_ready:
            level = "PAID_HISTORY_VERIFIED"
        elif has_private_conversion_data:
            level = "PRIVATE_ANALYTICS"
        elif competitor_live_ready:
            level = "COMPETITOR_BENCHMARK"
        elif uses_estimated_metrics:
            level = "ESTIMATED"
        else:
            level = "PUBLIC_ONLY"

        can_scale = level == "PAID_HISTORY_VERIFIED"
        return {
            "evidenceLevel": level,
            "score": self.ORDER[level] * 20,
            "max_decision_confidence": self.MAX_DECISION_CONFIDENCE[level],
            "can_scale_strong": can_scale,
            "sources": {
                "user_channel_public": True,
                "curated_benchmark": True,
                "competitor_live": competitor_live_ready,
                "private_analytics": has_private_conversion_data,
                "paid_history": paid_history_ready,
                "estimated_metrics": uses_estimated_metrics,
            },
            "warning": None
            if can_scale
            else "Curated benchmark or public/estimated data can guide tests only. Strong scale requires paid history verification.",
        }
