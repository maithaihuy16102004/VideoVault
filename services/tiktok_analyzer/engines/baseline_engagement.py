from typing import Dict

class BaselineEngagementEngine:
    """
    Calculates expected baseline engagement patterns based on account size,
    video age, and niche. Prevents punishing small creators.
    """
    
    def get_expected_baseline(self, creator_followers: int, video_age_hours: float) -> Dict[str, float]:
        # Small creators have higher percentage engagement but lower raw numbers
        expected_engagement_rate = 0.15
        
        if creator_followers > 10000:
            expected_engagement_rate = 0.10
        if creator_followers > 100000:
            expected_engagement_rate = 0.05
        if creator_followers > 1000000:
            expected_engagement_rate = 0.02
            
        # Velocity multiplier based on age
        velocity_multiplier = 1.0
        if video_age_hours < 2:
            velocity_multiplier = 3.0 # Golden window
        elif video_age_hours < 24:
            velocity_multiplier = 1.5
            
        return {
            "expected_rate": expected_engagement_rate,
            "velocity_multiplier": velocity_multiplier,
            "is_golden_window": video_age_hours < 2
        }
