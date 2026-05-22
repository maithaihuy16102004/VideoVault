from typing import Dict, Any

class RetentionSimulationEngine:
    """
    Simulates viewer retention drops and replay loops.
    Replaces LLM for retention scoring with programmatic ML-like rules.
    """
    
    def predict_retention(self, duration: float, hook_strength: float = 1.0, pacing_score: float = 1.0) -> Dict[str, Any]:
        # Base dropoff for typical TikTok (20-30% drop in first 3s)
        base_0_3s_drop = 0.25
        
        # Adjust based on hook strength (0.5 to 1.5)
        adjusted_0_3s_drop = max(0.05, base_0_3s_drop / hook_strength)
        
        # Pacing affects 3-5s drop
        base_3_5s_drop = 0.15
        adjusted_3_5s_drop = max(0.02, base_3_5s_drop / pacing_score)
        
        remaining_at_5s = 1.0 - adjusted_0_3s_drop - adjusted_3_5s_drop
        
        # Shorter videos have higher completion rates
        duration_factor = max(0.1, 15.0 / max(duration, 1.0))
        predicted_completion = min(0.95, remaining_at_5s * duration_factor)
        
        # Replay loops usually happen for short videos with high completion
        replay_prob = 0.0
        if duration < 10 and predicted_completion > 0.7:
            replay_prob = 0.3 * hook_strength
            
        return {
            "drop_0_to_3s": round(adjusted_0_3s_drop, 3),
            "drop_3_to_5s": round(adjusted_3_5s_drop, 3),
            "predicted_completion_rate": round(predicted_completion, 3),
            "replay_probability": round(replay_prob, 3),
            "predicted_watch_time": round(duration * predicted_completion * (1.0 + replay_prob), 1)
        }
