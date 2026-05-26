from __future__ import annotations

from typing import Any


class SaturationReturnEngine:
    """Detect when more paid views are likely to have weak marginal return."""

    def evaluate(self, video_data: dict[str, Any], channel_stats: dict[str, Any], objective: str | None) -> dict[str, Any]:
        views = int(video_data.get("views") or 0)
        p90_views = int(channel_stats.get("p90_views") or channel_stats.get("max_views") or 0)
        median_views = int(channel_stats.get("median_views") or 0)

        if p90_views <= 0:
            saturation = 25
        elif views >= p90_views:
            saturation = 90
        elif median_views > 0 and views >= median_views * 2:
            saturation = 75
        elif median_views > 0 and views >= median_views:
            saturation = 55
        else:
            saturation = 30

        suppress_video_views = saturation >= 75 and objective == "VIDEO_VIEWS"
        remap_to = None
        if suppress_video_views:
            remap_to = "PROFILE_VIEWS"

        return {
            "saturationScore": saturation,
            "diminishingReturnRisk": "HIGH" if saturation >= 75 else "MEDIUM" if saturation >= 55 else "LOW",
            "channel_p90_views": p90_views,
            "suppress_video_views": suppress_video_views,
            "remap_to": remap_to,
            "reason": "Video is already near or above channel p90 views; paid views may add weak marginal value."
            if suppress_video_views
            else "No strong saturation signal.",
        }
