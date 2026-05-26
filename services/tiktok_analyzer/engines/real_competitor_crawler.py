from __future__ import annotations

from typing import Any


class RealCompetitorCrawler:
    """Live competitor crawl contract.

    The service keeps live crawling opt-in because TikTok search/crawl can be slow,
    rate-limited, or unavailable in local development. When disabled/unavailable,
    callers must label competitor evidence as curated rather than live market data.
    """

    def crawl(self, niche: dict[str, Any], max_channels: int = 10, enable_live: bool = False) -> dict[str, Any]:
        if not enable_live:
            return {
                "live_data_available": False,
                "source": "curated_benchmark_v1",
                "message": "Competitive data: curated benchmark, not live market data.",
                "channels": niche.get("related_channels", [])[:max_channels],
                "videos": [],
            }

        # Placeholder for production integration:
        # 1. Search TikTok by niche trend terms.
        # 2. Select 10-30 creator profiles.
        # 3. Crawl their top recent public videos.
        # 4. Build rolling benchmark tables by objective and archetype.
        return {
            "live_data_available": False,
            "source": "live_crawler_not_configured",
            "message": "Live competitor crawler is not configured in this environment.",
            "channels": [],
            "videos": [],
        }
