"""
VisualHookAI — Phase 2
Analyzes the first 3 seconds of a video to determine scroll-stop power.

In production this would use:
    - FFmpeg to extract frames at 0.0s, 0.5s, 1.0s, 1.5s, 2.0s, 2.5s, 3.0s
    - CLIP embeddings for visual novelty
    - InsightFace for face detection, emotion, eye contact
    - Luminance/contrast analysis via OpenCV

For MVP, we estimate from content features and engagement signals.
"""
import math
from typing import Dict, Any


class VisualHookAI:
    """
    Estimates the 'scroll-stop power' of a video's first 3 seconds.
    This is the single most important factor for TikTok retention.
    
    TikTok's algorithm decides swipe/hold/continue in ~1.5-3s.
    """

    def analyze_hook(self, content_features: Dict[str, Any], engagement_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Score the visual hook strength based on content features.
        
        Args:
            content_features: Output from ContentExtractionEngine
            engagement_data: {views, likes, comments, shares, retention_rate}
        """
        # --- Component scores (0.0 to 1.0) ---

        # 1. Face visibility impact (fashion/beauty = critical)
        face_score = content_features.get("face_visibility", 0.5)

        # 2. Motion onset (fast pacing = stronger hook)
        pacing = content_features.get("pacing_score", 1.0)
        motion_score = min(1.0, pacing / 2.5)  # Normalize against max pacing

        # 3. Curiosity gap in title/text overlay
        curiosity = content_features.get("curiosity_score", 0.0)
        text_hook_score = min(1.0, curiosity * 2)  # Double weight

        # 4. Visual quality signal
        visual_quality = content_features.get("visual_quality_signal", 0.5)

        # 5. Luminance/contrast estimation
        # High engagement in first impressions suggests good visual contrast
        views = engagement_data.get("views", 0)
        likes = engagement_data.get("likes", 0)
        like_rate = likes / max(views, 1)
        # Fashion/beauty with high like rate = strong visual
        luminance_score = min(1.0, like_rate * 8) if content_features.get("niche") in (
            "fashion", "beauty", "dance"
        ) else min(1.0, like_rate * 5)

        # 6. Text overlay density (too much = bad, some = good)
        subtitle_density = content_features.get("subtitle_density", 0.5)
        # Optimal is 0.3-0.6, penalize extremes
        text_overload_penalty = 0.0
        if subtitle_density > 0.7:
            text_overload_penalty = (subtitle_density - 0.7) * 2
        elif subtitle_density < 0.15:
            text_overload_penalty = 0.2  # No text at all is also bad

        # --- Weighted composite score ---
        weights = {
            "face": 0.25,
            "motion": 0.20,
            "curiosity": 0.15,
            "visual_quality": 0.15,
            "luminance": 0.15,
            "emoji_bonus": 0.10,
        }

        emoji_bonus = 0.7 if content_features.get("has_emoji") else 0.3

        raw_score = (
            face_score * weights["face"]
            + motion_score * weights["motion"]
            + text_hook_score * weights["curiosity"]
            + visual_quality * weights["visual_quality"]
            + luminance_score * weights["luminance"]
            + emoji_bonus * weights["emoji_bonus"]
        )

        # Apply text overload penalty
        raw_score = max(0.0, raw_score - text_overload_penalty)

        # Scale to 0-10
        hook_strength = round(min(10.0, raw_score * 10), 1)

        # Determine scroll-stop power level
        if hook_strength >= 7.5:
            power_level = "HIGH"
        elif hook_strength >= 5.0:
            power_level = "MEDIUM"
        else:
            power_level = "LOW"

        # --- Diagnostic breakdown ---
        diagnostics = []
        if face_score < 0.5:
            diagnostics.append("Low face visibility — consider showing face in first frame")
        if motion_score < 0.3:
            diagnostics.append("Slow motion onset — add movement or transition in first 1s")
        if text_hook_score < 0.3:
            diagnostics.append("Weak curiosity gap — title lacks emotional trigger or pattern interrupt")
        if luminance_score < 0.3:
            diagnostics.append("Low visual contrast — improve lighting or color grading")
        if text_overload_penalty > 0.3:
            diagnostics.append("Text overload in first frame — reduce subtitle density")
        if not diagnostics:
            diagnostics.append("Strong visual hook — first frame captures attention effectively")

        return {
            "hook_strength": hook_strength,
            "scroll_stop_power": power_level,
            "component_scores": {
                "face_visibility": round(face_score, 2),
                "motion_onset": round(motion_score, 2),
                "curiosity_gap": round(text_hook_score, 2),
                "visual_quality": round(visual_quality, 2),
                "luminance_contrast": round(luminance_score, 2),
            },
            "text_overload_penalty": round(text_overload_penalty, 2),
            "diagnostics": diagnostics,
            "model_version": "2.0-heuristic",
        }
