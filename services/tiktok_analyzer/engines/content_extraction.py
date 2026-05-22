"""
ContentExtractionEngine — Phase 2
Converts raw video data into machine-readable features for ML models.
In production, this would use FFmpeg + PySceneDetect + PaddleOCR.
For MVP, we use heuristic estimation from available metadata.
"""
import math
import re
from typing import Dict, Any, List, Optional


class ContentExtractionEngine:
    """
    Extracts structured content features from video metadata.
    
    Production pipeline (future):
        Video → FFmpeg decode → PySceneDetect (cuts) → PaddleOCR (subtitles)
                             → InsightFace (face/emotion) → Feature Vector
    
    MVP pipeline (current):
        Metadata → Heuristic estimation → Feature Vector
    """

    # TikTok niche-specific pacing benchmarks (cuts per second)
    NICHE_PACING = {
        "fashion": 1.8,    # Fast transitions, outfit changes
        "comedy": 1.2,     # Medium cuts, talking head + reaction
        "education": 0.6,  # Slow, screen recordings, talking head
        "dance": 2.2,      # Very fast, choreography cuts
        "food": 1.0,       # Medium, cooking steps
        "beauty": 1.5,     # Medium-fast, tutorials
        "tech": 0.8,       # Slow, screen recordings
        "default": 1.2,
    }

    def extract_features(
        self,
        title: str,
        description: str,
        hashtags: List[str],
        duration_seconds: int,
        views: int,
        likes: int,
        comments: int,
        shares: int,
        niche: str = "default",
    ) -> Dict[str, Any]:
        """
        Extract a full feature vector from video metadata.
        Returns normalized features ready for ML model input.
        """
        niche_lower = niche.lower() if niche else "default"

        # --- Text features ---
        title_len = len(title) if title else 0
        desc_len = len(description) if description else 0
        hashtag_count = len(hashtags) if hashtags else 0
        has_emoji = bool(re.search(r'[\U00010000-\U0010ffff]', title or ""))
        has_question = "?" in (title or "")
        has_number = bool(re.search(r'\d', title or ""))

        # Curiosity gap detection (Vietnamese + English patterns)
        curiosity_patterns = [
            r'(?:bí mật|sự thật|không ngờ|hack|mẹo|cách|bất ngờ)',
            r'(?:secret|truth|hack|tip|way|surprising|shocking)',
            r'(?:thử|challenge|review|so sánh|đánh giá)',
            r'\.\.\.',
            r'(?:auto|siêu|cực|max|đỉnh|slay)',
        ]
        curiosity_score = sum(
            1 for p in curiosity_patterns
            if re.search(p, (title or "").lower())
        ) / len(curiosity_patterns)

        # --- Engagement features ---
        view_safe = max(views, 1)
        like_rate = likes / view_safe
        comment_rate = comments / view_safe
        share_rate = shares / view_safe
        engagement_rate = (likes + comments + shares) / view_safe

        # --- Pacing estimation (heuristic) ---
        # Fashion/dance = faster cuts, education = slower
        expected_pacing = self.NICHE_PACING.get(niche_lower, 1.2)
        # Estimate scene count from duration and niche
        estimated_scene_count = max(1, int(duration_seconds * expected_pacing))
        avg_scene_duration = duration_seconds / max(estimated_scene_count, 1)

        # --- Subtitle density estimation ---
        # Estimate from title length and niche (fashion = less text, education = more)
        text_density_factor = {
            "fashion": 0.3, "dance": 0.2, "beauty": 0.5,
            "education": 0.8, "tech": 0.7, "comedy": 0.5,
            "food": 0.4, "default": 0.5,
        }
        subtitle_density = text_density_factor.get(niche_lower, 0.5)

        # --- Face visibility estimation ---
        face_niche_factor = {
            "fashion": 0.85, "dance": 0.9, "beauty": 0.95,
            "comedy": 0.8, "education": 0.7, "tech": 0.3,
            "food": 0.4, "default": 0.6,
        }
        face_visibility = face_niche_factor.get(niche_lower, 0.6)

        # --- Motion intensity ---
        motion_factor = {
            "fashion": 0.7, "dance": 0.95, "beauty": 0.5,
            "comedy": 0.6, "education": 0.3, "tech": 0.2,
            "food": 0.5, "default": 0.5,
        }
        motion_intensity = motion_factor.get(niche_lower, 0.5)

        # --- Brightness / contrast estimation (heuristic from engagement) ---
        # Higher engagement in visual niches suggests better visual quality
        visual_quality_signal = min(1.0, engagement_rate * 10) if niche_lower in (
            "fashion", "beauty", "dance"
        ) else 0.5

        return {
            # Text features
            "title_length": title_len,
            "description_length": desc_len,
            "hashtag_count": hashtag_count,
            "has_emoji": has_emoji,
            "has_question": has_question,
            "has_number": has_number,
            "curiosity_score": round(curiosity_score, 3),

            # Engagement features (normalized)
            "like_rate": round(like_rate, 5),
            "comment_rate": round(comment_rate, 5),
            "share_rate": round(share_rate, 5),
            "engagement_rate": round(engagement_rate, 5),

            # Video structure features
            "duration_seconds": duration_seconds,
            "estimated_scene_count": estimated_scene_count,
            "avg_scene_duration": round(avg_scene_duration, 2),
            "pacing_score": round(expected_pacing, 2),

            # Visual features (estimated)
            "subtitle_density": round(subtitle_density, 2),
            "face_visibility": round(face_visibility, 2),
            "motion_intensity": round(motion_intensity, 2),
            "visual_quality_signal": round(visual_quality_signal, 3),

            # Metadata
            "niche": niche_lower,
            "feature_version": "2.0-heuristic",
        }
