from __future__ import annotations

from typing import Any


class StrategyMatchEngine:
    """Compare a user video against niche winners and derive promotion intent."""

    def match(
        self,
        video_data: dict[str, Any],
        content_features: dict[str, Any],
        creator_dna: dict[str, Any],
        competitor_learning: dict[str, Any],
        scores: dict[str, int],
    ) -> dict[str, Any]:
        benchmarks = competitor_learning.get("benchmarks", {})
        top_archetypes = competitor_learning.get("top_archetypes", [])
        matched = self._pick_archetype(top_archetypes, scores)

        duration = float(content_features.get("duration_seconds", 0) or 0)
        hook_speed_target = float(benchmarks.get("hook_speed_seconds", 2.0) or 2.0)
        avg_scene_duration = float(content_features.get("avg_scene_duration", hook_speed_target + 1) or 0)
        face_visibility = float(content_features.get("face_visibility", 0) or 0)
        product_visibility = float(content_features.get("product_visibility", 0) or 0)
        cta_present = bool(content_features.get("cta_present", False))
        hashtag_count = int(content_features.get("hashtag_count", 0) or 0)

        hook_match = 100 if avg_scene_duration <= hook_speed_target else max(20, 100 - int((avg_scene_duration - hook_speed_target) * 25))
        face_match = self._ratio_score(face_visibility, float(benchmarks.get("face_visibility", 0.7) or 0.7))
        product_match = self._ratio_score(product_visibility, float(benchmarks.get("product_visibility", 0.6) or 0.6))
        duration_match = 100 if benchmarks.get("duration_low", 0) <= duration <= benchmarks.get("duration_high", 999) else 55
        cta_match = 100 if cta_present else 35
        caption_match = 55 if hashtag_count > 7 else 80

        match_score = round(
            hook_match * 0.22
            + face_match * 0.16
            + product_match * 0.18
            + duration_match * 0.14
            + cta_match * 0.18
            + caption_match * 0.12
        )

        gap_table = [
            self._gap("Tốc độ hook", f"Trung bình cảnh {avg_scene_duration:.1f}s", f"<= {hook_speed_target:.1f}s", hook_match),
            self._gap("Độ rõ khuôn mặt", f"{face_visibility:.0%}", f"{float(benchmarks.get('face_visibility', 0.7)):.0%}", face_match),
            self._gap("Độ rõ sản phẩm/outfit", f"{product_visibility:.0%}", f"{float(benchmarks.get('product_visibility', 0.6)):.0%}", product_match),
            self._gap("CTA", "Rõ" if cta_present else "Yếu", "CTA follow/lưu/bình luận rõ", cta_match),
            self._gap("Caption", f"{hashtag_count} hashtag", "Caption dẫn hành động, không spam hashtag", caption_match),
        ]

        fixes = []
        if hook_match < 70:
            fixes.append("Đưa outfit/kết quả xuất hiện trong 1-2 giây đầu.")
        if product_match < 70:
            fixes.append("Thêm cảnh cận sản phẩm/chất liệu trước đoạn full-body reveal.")
        if cta_match < 70:
            fixes.append("Thêm CTA rõ: follow, lưu video hoặc bình luận nhận tư vấn.")
        if caption_match < 70:
            fixes.append("Giảm spam hashtag và biến dòng caption đầu thành CTA.")

        competitor_insights = []
        for pattern in competitor_learning.get("winning_hook_patterns", [])[:3]:
            competitor_insights.append(f"Mẫu benchmark tham chiếu: {self._translate_pattern(pattern)}.")
        for cta in competitor_learning.get("winning_ctas", [])[:2]:
            competitor_insights.append(f"Mẫu CTA benchmark: {self._translate_pattern(cta)}.")

        recommended_objective = matched.get("best_objective", "PROFILE_VIEWS")
        if scores.get("salesIntent", 0) >= 70 and product_match >= 70:
            recommended_objective = "PRODUCT_CLICKS"
        elif scores.get("followerGrowth", 0) >= 65 and match_score >= 70:
            recommended_objective = "FOLLOWERS"
        elif scores.get("profilePull", 0) >= 60:
            recommended_objective = "PROFILE_VIEWS"

        return {
            "matched_archetype": matched.get("name", creator_dna.get("primary_archetype", "unknown")),
            "match_score": int(match_score),
            "recommended_objective": recommended_objective,
            "reason": [
                f"Điểm tương đồng niche ước lượng: {int(match_score)}/100, dựa trên metadata public và tín hiệu creative heuristic.",
                f"Archetype benchmark gần nhất: {self._translate_pattern(matched.get('name', 'unknown'))}.",
                f"Chỉ số khuynh hướng benchmark: xem={matched.get('views_index', 0)}/100, kéo follower={matched.get('follower_index', 0)}/100, sales intent={matched.get('sales_index', 0)}/100.",
            ],
            "competitor_insights": competitor_insights,
            "fixes_before_promote": fixes,
            "gap_analysis": gap_table,
            "conversion_pattern": {
                "views": matched.get("views_index", 0),
                "followers": matched.get("follower_index", 0),
                "sales": matched.get("sales_index", 0),
            },
        }

    @staticmethod
    def _ratio_score(actual: float, target: float) -> int:
        if target <= 0:
            return 50
        return int(max(10, min(100, (actual / target) * 100)))

    @staticmethod
    def _gap(feature: str, user_value: str, top_value: str, score: int) -> dict[str, Any]:
        status = "MATCH" if score >= 80 else "GAP" if score < 65 else "PARTIAL"
        return {
            "feature": feature,
            "user": user_value,
            "top_niche": top_value,
            "score": int(score),
            "status": status,
        }

    @staticmethod
    def _pick_archetype(top_archetypes: list[dict[str, Any]], scores: dict[str, int]) -> dict[str, Any]:
        if not top_archetypes:
            return {"name": "unknown", "best_objective": "PROFILE_VIEWS"}

        sales = scores.get("salesIntent", 0)
        followers = scores.get("followerGrowth", 0)
        profiles = scores.get("profilePull", 0)
        target = "sales_index" if sales >= max(followers, profiles) else "follower_index" if followers >= profiles else "views_index"
        return max(top_archetypes, key=lambda item: int(item.get(target, 0) or 0))

    @staticmethod
    def _translate_pattern(text: str) -> str:
        mapping = {
            "outfit reveal in first 1.5s": "outfit xuất hiện trong 1.5 giây đầu",
            "mirror transition": "chuyển cảnh qua gương",
            "POV boyfriend camera": "góc quay POV đời thường",
            "soft girl mirror outfit": "soft girl mirror outfit",
            "aesthetic outfit edit": "edit outfit thẩm mỹ",
            "try-on haul": "try-on haul",
            "Follow for daily outfit ideas": "Follow để xem gợi ý outfit mỗi ngày",
            "Comment size for link": "Bình luận size để nhận link/tư vấn",
            "Save this outfit combo": "Lưu lại combo outfit này",
            "unknown": "chưa xác định",
        }
        return mapping.get(str(text), str(text).replace("_", " "))
