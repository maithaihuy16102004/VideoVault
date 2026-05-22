from typing import Dict, Any, List
from datetime import datetime, timezone

class AccountHealthEngine:
    """
    Calculates Account Health Score, Consistency, and Audience Overlap
    based on historical videos data.
    """
    
    def calculate_health(self, videos: List[Dict[str, Any]], channel_stats: Dict[str, Any]) -> Dict[str, Any]:
        if not videos:
            return {
                "health_score": 0,
                "consistency_score": 0,
                "retention_stability": "UNKNOWN",
                "audience_profile": "N/A",
                "health_tier": "POOR"
            }
            
        # 1. Posting Consistency
        # Calculate days between posts if we had real dates. For now we use a heuristic based on count.
        consistency_score = min(100, len(videos) * 15)
        
        # 2. Retention Stability
        # Measure variance in retention rates across videos
        retentions = [v.get("retentionRate", 0) for v in videos if "retentionRate" in v]
        if len(retentions) > 1:
            mean_ret = sum(retentions) / len(retentions)
            variance = sum((r - mean_ret) ** 2 for r in retentions) / len(retentions)
            stability = max(0, 100 - (variance ** 0.5))
        else:
            stability = 50
            
        if stability >= 80:
            retention_stability = "HIGHLY_STABLE"
        elif stability >= 50:
            retention_stability = "MODERATE"
        else:
            retention_stability = "VOLATILE"
            
        # 3. Overall Health Score
        engagement_rates = [v.get("engagementRate", 0) for v in videos if "engagementRate" in v]
        avg_engagement = sum(engagement_rates) / len(engagement_rates) if engagement_rates else 0
        
        health_score = int((consistency_score * 0.3) + (stability * 0.3) + (min(100, avg_engagement * 10) * 0.4))
        
        health_tier = "EXCELLENT" if health_score >= 80 else ("GOOD" if health_score >= 60 else "FAIR" if health_score >= 40 else "POOR")
        
        # 4. Audience Profile (Heuristic based on views/engagement)
        if avg_engagement > 5.0 and stability >= 60:
            audience_profile = "LTT_LOYAL (Returning core audience)"
        elif avg_engagement <= 2.0 and stability < 50:
            audience_profile = "CASUAL_SCROLLERS (Low retention, high bounce)"
        else:
            audience_profile = "MIXED_AUDIENCE"
            
        return {
            "health_score": health_score,
            "consistency_score": consistency_score,
            "retention_stability": retention_stability,
            "audience_profile": audience_profile,
            "health_tier": health_tier
        }
