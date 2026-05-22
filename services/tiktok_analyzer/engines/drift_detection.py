"""
DriftDetectionEngine — Phase 5
Monitors the TikTok algorithm for silent changes (Data Drift & Concept Drift).

TikTok's algorithm changes constantly. If we trained a model that says
"#fyp" is good, and tomorrow TikTok bans "#fyp", our model is drifted.
This engine compares recent inference data against the historical baseline
to warn admins when the ML models need retraining.
"""
from typing import Dict, Any, List
import time


class DriftDetectionEngine:
    """
    Detects algorithmic shifts in TikTok by comparing recent distribution metrics
    against established baselines.
    """

    def __init__(self):
        # Baseline expectations (What the model was trained on)
        self.BASELINES = {
            "avg_engagement_rate": 0.12,
            "avg_completion_rate": 0.25,
            "avg_hook_drop": 0.35, # 35% drop in first 3s
            "hero_video_ratio": 0.15, # 15% of videos score > 65
        }

    def detect_drift(self, recent_inferences: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyze a batch of recent inferences (e.g., last 1000 videos)
        to detect if the algorithm is shifting.
        """
        if not recent_inferences or len(recent_inferences) < 10:
            return {
                "drift_detected": False,
                "severity": "NONE",
                "message": "Insufficient data to detect drift",
                "metrics": {}
            }

        # Calculate recent averages
        total_eng_rate = 0
        total_comp_rate = 0
        total_hero = 0

        for inf in recent_inferences:
            total_eng_rate += inf.get("engagement_rate", self.BASELINES["avg_engagement_rate"])
            total_comp_rate += inf.get("completion_rate", self.BASELINES["avg_completion_rate"])
            if inf.get("score", 0) >= 65:
                total_hero += 1

        count = len(recent_inferences)
        recent_avg_eng = total_eng_rate / count
        recent_avg_comp = total_comp_rate / count
        recent_hero_ratio = total_hero / count

        # Check for drift (Threshold: 20% deviation from baseline)
        drift_signals = []
        severity = "LOW"
        is_drifting = False

        eng_deviation = abs(recent_avg_eng - self.BASELINES["avg_engagement_rate"]) / self.BASELINES["avg_engagement_rate"]
        if eng_deviation > 0.2:
            is_drifting = True
            drift_signals.append(f"Engagement Drift: Expected {self.BASELINES['avg_engagement_rate']*100}%, saw {recent_avg_eng*100:.1f}%")
            if eng_deviation > 0.4:
                severity = "HIGH"

        comp_deviation = abs(recent_avg_comp - self.BASELINES["avg_completion_rate"]) / self.BASELINES["avg_completion_rate"]
        if comp_deviation > 0.2:
            is_drifting = True
            drift_signals.append(f"Retention Drift: Expected {self.BASELINES['avg_completion_rate']*100}%, saw {recent_avg_comp*100:.1f}%")
            if comp_deviation > 0.4:
                severity = "HIGH"
                
        hero_deviation = abs(recent_hero_ratio - self.BASELINES["hero_video_ratio"]) / self.BASELINES["hero_video_ratio"]
        if hero_deviation > 0.3: # Models might be scoring too easily or too harshly
            is_drifting = True
            drift_signals.append(f"Scoring Drift: Hero ratio changed from {self.BASELINES['hero_video_ratio']*100}% to {recent_hero_ratio*100:.1f}%")

        return {
            "drift_detected": is_drifting,
            "severity": severity if is_drifting else "NONE",
            "signals": drift_signals,
            "metrics": {
                "recent_avg_engagement": round(recent_avg_eng, 3),
                "recent_avg_completion": round(recent_avg_comp, 3),
                "recent_hero_ratio": round(recent_hero_ratio, 3)
            },
            "recommendation": "Batch retrain models immediately." if severity == "HIGH" else "Monitor trends." if is_drifting else "Models are stable."
        }
