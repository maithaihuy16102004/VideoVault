import random
import math
from typing import Dict, Any

class SmartMetricRecoveryEngine:
    """
    Recovers shadow-suppressed metrics when TikTok anti-bot systems
    hide likes/comments (returns 0) but views are growing.
    Uses probabilistic estimation based on niche baselines and momentum.
    """
    
    def __init__(self):
        # Default Engagement Ratios by Niche (Likes per View)
        self.niche_baselines = {
            "comedy": 0.12,
            "education": 0.08,
            "dance": 0.15,
            "tech": 0.06,
            "beauty": 0.10,
            "default": 0.09
        }
        self.base_rates = {
            "comedy": {"like_rate": 0.12, "comment_rate": 0.005, "share_rate": 0.02},
            "education": {"like_rate": 0.08, "comment_rate": 0.008, "share_rate": 0.01},
            "dance": {"like_rate": 0.15, "comment_rate": 0.004, "share_rate": 0.03},
            "tech": {"like_rate": 0.06, "comment_rate": 0.006, "share_rate": 0.015},
            "beauty": {"like_rate": 0.10, "comment_rate": 0.005, "share_rate": 0.02},
            "default": {"like_rate": 0.09, "comment_rate": 0.005, "share_rate": 0.015}
        }
        
    def recover_metrics(self, raw_views: int, raw_likes: int, raw_comments: int, raw_shares: int, niche: str) -> dict:
        """
        Khôi phục metrics thực sự dựa trên tỷ lệ trung bình của ngành.
        Lưu giữ 3 luồng dữ liệu rõ ràng: raw, estimated, corrected.
        """
        # Nếu view đủ lớn, không cần phục hồi (Corrected = Raw)
        if raw_views > 100:
            return {
                "is_recovered": False,
                "raw": {"views": raw_views, "likes": raw_likes, "comments": raw_comments, "shares": raw_shares},
                "estimated": None,
                "corrected": {"views": raw_views, "likes": raw_likes, "comments": raw_comments, "shares": raw_shares},
                "recovery_reason": "Organic data sufficient"
            }

        # Nếu có tương tác nhưng không có view (hoặc view rất nhỏ do lỗi API / shadowban)
        is_suppressed = raw_views <= 10 and (raw_likes > 0 or raw_comments > 0 or raw_shares > 0)
        
        rates = self.base_rates.get(niche, self.base_rates["default"])
        
        estimated_views = raw_views
        if raw_likes > 0:
            estimated_views = max(estimated_views, int(raw_likes / rates["like_rate"]))
        if raw_comments > 0:
            estimated_views = max(estimated_views, int(raw_comments / rates["comment_rate"]))
        if raw_shares > 0:
            estimated_views = max(estimated_views, int(raw_shares / rates["share_rate"]))
            
        # Add a floor to the estimate based on typical base distribution
        estimated_views = max(estimated_views, 150 if is_suppressed else raw_views)

        estimated_likes = max(raw_likes, int(estimated_views * rates["like_rate"]))
        estimated_comments = max(raw_comments, int(estimated_views * rates["comment_rate"]))
        estimated_shares = max(raw_shares, int(estimated_views * rates["share_rate"]))

        return {
            "is_recovered": is_suppressed or estimated_views > raw_views,
            "raw": {"views": raw_views, "likes": raw_likes, "comments": raw_comments, "shares": raw_shares},
            "estimated": {"views": estimated_views, "likes": estimated_likes, "comments": estimated_comments, "shares": estimated_shares},
            "corrected": {
                "views": estimated_views,
                "likes": estimated_likes,
                "comments": estimated_comments,
                "shares": estimated_shares
            },
            "recovery_reason": "API suppression / Cold-start anomaly detected" if is_suppressed else "Algorithmic adjustment applied"
        }
