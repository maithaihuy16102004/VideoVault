from __future__ import annotations

from typing import Any


class BusinessStageEngine:
    """Classify account stage so promotion objectives are not one-size-fits-all."""

    def classify(self, channel_stats: dict[str, Any], video_data: dict[str, Any]) -> dict[str, Any]:
        followers = int(channel_stats.get("followers") or 0)
        total_likes = int(channel_stats.get("likes") or 0)
        text = " ".join([
            str(video_data.get("title") or ""),
            str(video_data.get("description") or ""),
            " ".join(video_data.get("hashtags") or []),
        ]).lower()

        shop_signals = ["bio", "shop", "mua", "ib", "inbox", "link", "san pham", "sản phẩm", "deal"]
        is_shop = any(signal in text for signal in shop_signals)

        if followers >= 500_000:
            stage = "CELEBRITY"
        elif followers >= 100_000:
            stage = "BRAND" if is_shop else "GROWING_CREATOR"
        elif is_shop:
            stage = "SMALL_SHOP"
        elif followers >= 10_000 or total_likes >= 200_000:
            stage = "GROWING_CREATOR"
        else:
            stage = "NEW_CREATOR"

        objective_bias = {
            "NEW_CREATOR": ["PROFILE_VIEWS", "FOLLOWERS"],
            "SMALL_SHOP": ["MESSAGES", "PRODUCT_CLICKS", "PROFILE_VIEWS"],
            "GROWING_CREATOR": ["FOLLOWERS", "PROFILE_VIEWS"],
            "BRAND": ["PRODUCT_CLICKS", "MESSAGES", "PROFILE_VIEWS"],
            "CELEBRITY": ["PROFILE_VIEWS", "PRODUCT_CLICKS", "MESSAGES"],
        }[stage]

        return {
            "accountStage": stage,
            "followers": followers,
            "is_shop_like": is_shop,
            "objective_bias": objective_bias,
            "rule": "Objective is selected by account maturity, shop intent, and conversion readiness.",
        }
