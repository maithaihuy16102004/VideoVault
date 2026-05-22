from typing import Dict, Any, Optional

class VelocityEngine:
    """
    Calculates the true growth momentum (derivative of the growth curve).
    TikTok's algorithm favors view acceleration over absolute view count.
    """
    
    def calculate_velocity(self, current_metrics: Dict[str, int], previous_metrics: Optional[Dict[str, int]], delta_time_minutes: float) -> Dict[str, Any]:
        if not previous_metrics or delta_time_minutes <= 0:
            # Cold start or no history
            return {
                "views_velocity_per_min": 0.0,
                "engagement_velocity_per_min": 0.0,
                "momentum_score": 0.0,
                "acceleration_status": "COLD_START"
            }
            
        views_delta = current_metrics.get("views", 0) - previous_metrics.get("views", 0)
        
        # Calculate weighted engagement delta
        def calc_we(metrics: Dict[str, int]) -> float:
            likes = metrics.get("likes", 0)
            comments = metrics.get("comments", 0)
            shares = metrics.get("shares", 0)
            saves = metrics.get("saves", 0)
            follows = metrics.get("follows", int(likes * 0.02))
            return (likes * 1) + (comments * 4) + (shares * 8) + (saves * 10) + (follows * 12)
            
        we_current = calc_we(current_metrics)
        we_prev = calc_we(previous_metrics)
        engagement_delta = we_current - we_prev
        
        # Calculate velocities
        v_vel = max(0, views_delta / delta_time_minutes)
        e_vel = max(0, engagement_delta / delta_time_minutes)
        
        # Momentum Score (Logarithmic scaling to prevent hyper-inflation from viral hits)
        import math
        momentum = math.log10(v_vel + 1) * 10 + math.log10(e_vel + 1) * 5
        
        status = "STAGNANT"
        if momentum > 30:
            status = "VIRAL_ACCELERATION"
        elif momentum > 15:
            status = "GAINING_TRACTION"
        elif momentum > 5:
            status = "WARM"
            
        return {
            "views_velocity_per_min": round(v_vel, 2),
            "engagement_velocity_per_min": round(e_vel, 2),
            "momentum_score": round(momentum, 2),
            "acceleration_status": status
        }
