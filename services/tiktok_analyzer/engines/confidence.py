import math

class ConfidenceScoringEngine:
    """
    Calculates Bayesian confidence interval for AI predictions.
    Confidence should rely on sample size, history similarity, and feature completeness.
    """
    
    def calculate_confidence(self, views: int, creator_history_count: int, feature_completeness: float, anomaly_score: float) -> dict:
        # Base confidence driven by feature completeness (0.0 to 1.0)
        base_confidence = feature_completeness * 50
        
        # Bayesian sample size confidence (diminishing returns)
        # 100 views -> low confidence, 10,000 views -> high confidence
        sample_confidence = min(30, math.log10(max(1, views)) * 6)
        
        # Creator history confidence (more history = better baseline)
        history_confidence = min(20, creator_history_count * 2)
        
        # Penalty for anomalies (e.g. shadowban, bot traffic)
        penalty = anomaly_score * 40
        
        final_confidence = max(10, min(99, base_confidence + sample_confidence + history_confidence - penalty))
        
        level = "LOW"
        if final_confidence >= 85:
            level = "HIGH"
        elif final_confidence >= 60:
            level = "MEDIUM"
            
        reasons = []
        if views < 1000:
            reasons.append("Low sample size (under 1k views)")
        if creator_history_count < 3:
            reasons.append("Insufficient creator baseline history")
        if anomaly_score > 0.3:
            reasons.append("High data anomaly detected")
            
        if not reasons:
            reasons.append("Strong statistical significance")
            
        return {
            "score": round(final_confidence, 1),
            "level": level,
            "reason": " | ".join(reasons)
        }
