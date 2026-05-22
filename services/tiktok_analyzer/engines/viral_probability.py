from typing import Dict, Any

class ViralProbabilityEngine:
    """
    Calculates the final deterministic Viral Score (XGBoost mock).
    Combines Retention, Velocity, and Baseline Engagement.
    """
    
    def calculate_score(self, retention_data: Dict[str, Any], engagement_data: Dict[str, Any], baseline_data: Dict[str, Any]) -> Dict[str, Any]:
        # Core weights mimicking TikTok FYP Ranking
        WEIGHT_RETENTION = 0.50
        WEIGHT_VELOCITY = 0.30
        WEIGHT_ENGAGEMENT = 0.20
        
        # Score Retention (0-100)
        retention_score = min(100, (retention_data["predicted_completion_rate"] * 100) + (retention_data["replay_probability"] * 50))
        
        # Score Velocity
        velocity_score = min(100, baseline_data["velocity_multiplier"] * 30)
        
        # Score Engagement vs Baseline (Using Weighted Engagement Score)
        # Engagement Score = Like*1 + Comment*4 + Share*8 + Save*10 + Follow conversion*12
        actual_score = 0.0
        if engagement_data["views"] > 0:
            likes = engagement_data.get("likes", 0)
            comments = engagement_data.get("comments", 0)
            shares = engagement_data.get("shares", 0)
            saves = engagement_data.get("saves", 0)
            # Estimate followers gained from video if not explicitly provided
            follows = engagement_data.get("follows", int(likes * 0.02))
            
            weighted_engagement = (likes * 1) + (comments * 4) + (shares * 8) + (saves * 10) + (follows * 12)
            actual_score = weighted_engagement / engagement_data["views"]
            
        engagement_performance = actual_score / max(baseline_data["expected_rate"] * 3, 0.01) # Baseline needs to be scaled up as we are using a weighted score
        engagement_score = min(100, engagement_performance * 50)
        
        # Final ML-based Ranking Score
        final_score = (retention_score * WEIGHT_RETENTION) + (velocity_score * WEIGHT_VELOCITY) + (engagement_score * WEIGHT_ENGAGEMENT)
        
        # Priorities
        priority = "LOW_PRIORITY"
        if final_score >= 80:
            priority = "HIGH_PRIORITY"
        elif final_score >= 50:
            priority = "MEDIUM_PRIORITY"
            
        return {
            "viral_probability": round(final_score / 100, 3),
            "overall_score": round(final_score, 1),
            "recommendation_level": priority
        }
