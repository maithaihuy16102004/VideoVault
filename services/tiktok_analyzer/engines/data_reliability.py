import time
from typing import Dict, Any

class DataReliabilityLayer:
    """
    Evaluates the freshness and detects anomalies in scraped TikTok data.
    Ensures that ML models don't ingest corrupted or heavily delayed metrics.
    """
    
    def __init__(self):
        self.MAX_ACCEPTABLE_DELAY = 3600  # 1 hour
        
    def evaluate_reliability(self, video_data: Dict[str, Any], last_updated_timestamp: float) -> Dict[str, Any]:
        current_time = time.time()
        delay_seconds = current_time - last_updated_timestamp
        
        # Calculate Freshness Score (1.0 = brand new, 0.0 = completely stale)
        freshness_score = max(0.0, 1.0 - (delay_seconds / self.MAX_ACCEPTABLE_DELAY))
        
        # Anomaly Detection (e.g. 1M likes but only 100 views)
        views = video_data.get('views', 0)
        likes = video_data.get('likes', 0)
        comments = video_data.get('comments', 0)
        
        anomaly_score = 0.0
        anomaly_reasons = []
        
        if views > 0:
            like_ratio = likes / views
            if like_ratio > 0.4:
                anomaly_score += 0.5
                anomaly_reasons.append("Suspiciously high like/view ratio (>40%)")
                
            if comments > likes and likes > 100:
                anomaly_score += 0.3
                anomaly_reasons.append("Comments exceed likes")
                
        if views == 0 and (likes > 0 or comments > 0):
            anomaly_score += 1.0
            anomaly_reasons.append("API suppression: 0 views but has engagement")
            
        anomaly_score = min(1.0, anomaly_score)
        
        return {
            "freshness_score": round(freshness_score, 3),
            "anomaly_score": round(anomaly_score, 3),
            "is_reliable": anomaly_score < 0.5 and freshness_score > 0.2,
            "anomaly_reasons": anomaly_reasons,
            "delay_seconds": int(delay_seconds)
        }
