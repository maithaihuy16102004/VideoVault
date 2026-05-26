from __future__ import annotations

from typing import Any


class ObjectiveMixEngine:
    """Build objective-specific Top 6 lists and a balanced final mix."""

    def rank(self, videos: list[dict[str, Any]], business_stage: str = "NEW_CREATOR") -> dict[str, Any]:
        def decision(video: dict[str, Any]) -> dict[str, Any]:
            return ((video.get("aiStrategy") or {}).get("promotion_decision") or {})

        def is_promotable(video: dict[str, Any]) -> bool:
            item = decision(video)
            return item.get("action") in ("SCALE", "TEST_SMALL") and bool(item.get("objective"))

        def score(video: dict[str, Any], key: str) -> int:
            scores = decision(video).get("scores") or {}
            return int(scores.get(key, 0) or 0)

        def composite(video: dict[str, Any]) -> int:
            item = decision(video)
            scores = item.get("scores") or {}
            confidence = int(item.get("confidence", 0) or 0)
            risk = int(scores.get("risk", 100) or 100)
            return int(
                (score(video, "viewBoost") * 0.25)
                + (score(video, "followerGrowth") * 0.25)
                + (score(video, "profilePull") * 0.25)
                + (score(video, "salesIntent") * 0.15)
                + (confidence * 0.2)
                - (risk * 0.25)
            )

        eligible = [video for video in videos if is_promotable(video)]
        pool_source = eligible or videos
        awareness = sorted(pool_source, key=lambda v: score(v, "viewBoost"), reverse=True)[:6]
        follower = sorted(pool_source, key=lambda v: score(v, "followerGrowth"), reverse=True)[:6]
        profile = sorted(pool_source, key=lambda v: score(v, "profilePull"), reverse=True)[:6]
        sales_source = [
            video for video in pool_source
            if score(video, "salesIntent") >= 60
            or decision(video).get("objective") in ("MESSAGES", "PRODUCT_CLICKS", "SALES")
        ]
        sales = sorted(sales_source, key=lambda v: score(v, "salesIntent"), reverse=True)[:6]

        final_mix: list[dict[str, Any]] = []
        recipe = ["awareness", "awareness", "follower", "profile", "sales", "sales"]
        if business_stage in ("NEW_CREATOR", "GROWING_CREATOR"):
            recipe = ["awareness", "follower", "follower", "profile", "profile", "sales"]
        elif business_stage in ("SMALL_SHOP", "BRAND"):
            recipe = ["awareness", "profile", "sales", "sales", "sales", "follower"]

        pools = {
            "awareness": awareness,
            "follower": follower,
            "profile": profile,
            "sales": sales,
        }
        objective_map = {
            "awareness": "VIDEO_VIEWS",
            "follower": "FOLLOWERS",
            "profile": "PROFILE_VIEWS",
            "sales": "MESSAGES" if business_stage in ("SMALL_SHOP", "BRAND") else "PROFILE_VIEWS",
            "best_fit": None,
        }
        seen: set[str] = set()
        for objective in recipe:
            if objective == "sales" and not sales:
                objective = "profile" if profile else "awareness"
            for video in pools[objective]:
                video_id = str(video.get("id") or "")
                if video_id and video_id not in seen:
                    final_mix.append({
                        "video_id": video_id,
                        "objective_bucket": objective,
                        "objective": objective_map[objective],
                    })
                    seen.add(video_id)
                    break

        for video in sorted(eligible, key=composite, reverse=True):
            video_id = str(video.get("id") or "")
            if len(final_mix) >= 6:
                break
            if video_id and video_id not in seen:
                final_mix.append({
                    "video_id": video_id,
                    "objective_bucket": "best_fit",
                    "objective": decision(video).get("objective") or "PROFILE_VIEWS",
                })
                seen.add(video_id)

        def ids(items: list[dict[str, Any]]) -> list[str]:
            return [str(v.get("id") or "") for v in items if v.get("id")]

        return {
            "top6_awareness": ids(awareness),
            "top6_followers": ids(follower),
            "top6_profile": ids(profile),
            "top6_sales_messages": ids(sales),
            "final_mix": final_mix[:6],
            "business_stage": business_stage,
        }
