"""
RetentionPredictionEngine — Phase 2
Predicts per-second retention curve using tabular features.

In production, this would use a trained LightGBM model.
For MVP, we use a physics-inspired decay model calibrated to TikTok benchmarks.

TikTok retention science:
    - 0-1s: Thumbnail/autoplay → swipe decision (biggest single drop)
    - 1-3s: Hook evaluation → curiosity check (second biggest drop)
    - 3-5s: Value confirmation → stay or leave
    - 5s+: Content quality drives gradual decay
    - Last 2s: CTA zone → replay/follow decision
"""
import math
from typing import Dict, Any, List


class RetentionPredictionEngine:
    """
    Predicts a granular retention curve (not just a single %).
    Output is a list of (second, retention_pct) datapoints that can
    be plotted as a retention timeline chart on the frontend.
    
    Architecture ready for LightGBM swap:
        - Input: feature vector from ContentExtractionEngine
        - Output: predicted retention at each checkpoint
    """

    # TikTok benchmark retention drops by segment
    # Source: aggregated from creator analytics research
    BENCHMARK_DROPS = {
        "0_to_1s": 0.12,   # 12% drop in first second (autoplay decision)
        "1_to_3s": 0.22,   # 22% cumulative drop by 3s (hook evaluation)
        "3_to_5s": 0.08,   # 8% more drop (value confirmation)
        "5_to_mid": 0.15,  # 15% gradual decay to midpoint
        "mid_to_end": 0.10, # 10% decay to end
    }

    def predict_retention_curve(
        self,
        content_features: Dict[str, Any],
        hook_analysis: Dict[str, Any],
        duration_seconds: int,
    ) -> Dict[str, Any]:
        """
        Generate a per-second retention prediction.
        
        Args:
            content_features: from ContentExtractionEngine
            hook_analysis: from VisualHookAI
            duration_seconds: video length in seconds
        """
        duration = max(5, duration_seconds)

        # --- Calibrate drops based on hook strength ---
        hook_strength = hook_analysis.get("hook_strength", 5.0) / 10.0  # Normalize to 0-1
        face_vis = content_features.get("face_visibility", 0.5)
        motion = content_features.get("motion_intensity", 0.5)
        curiosity = content_features.get("curiosity_score", 0.0)
        pacing = content_features.get("pacing_score", 1.0)

        # Better hook = less drop in 0-3s
        hook_modifier = 1.0 - (hook_strength * 0.4)  # Strong hook reduces drop by up to 40%
        
        # Face visibility reduces early drop (especially fashion)
        face_modifier = 1.0 - (face_vis * 0.15)

        # Fast pacing reduces mid-content drop
        pacing_modifier = 1.0 - (min(pacing, 2.0) / 2.0 * 0.2)

        # Adjusted drops
        drop_0_1 = self.BENCHMARK_DROPS["0_to_1s"] * hook_modifier * face_modifier
        drop_1_3 = self.BENCHMARK_DROPS["1_to_3s"] * hook_modifier
        drop_3_5 = self.BENCHMARK_DROPS["3_to_5s"] * (1.0 - curiosity * 0.3)
        drop_5_mid = self.BENCHMARK_DROPS["5_to_mid"] * pacing_modifier
        drop_mid_end = self.BENCHMARK_DROPS["mid_to_end"] * pacing_modifier

        # --- Build retention curve ---
        checkpoints = self._generate_checkpoints(duration)
        retention_curve = []
        current_retention = 100.0

        for i, sec in enumerate(checkpoints):
            if sec == 0:
                retention_curve.append({"second": 0, "retention": 100.0, "event": "Start"})
                continue

            # Determine which segment we're in
            if sec <= 1:
                drop_rate = drop_0_1
                event = "Autoplay Decision"
            elif sec <= 3:
                drop_rate = drop_1_3 * (sec - 1) / 2
                event = "Hook Evaluation"
            elif sec <= 5:
                drop_rate = drop_3_5 * (sec - 3) / 2
                event = "Value Confirmation"
            elif sec <= duration * 0.5:
                progress = (sec - 5) / max(duration * 0.5 - 5, 1)
                drop_rate = drop_5_mid * progress
                event = "Content Delivery"
            elif sec <= duration * 0.85:
                progress = (sec - duration * 0.5) / max(duration * 0.35, 1)
                drop_rate = drop_mid_end * progress
                event = "Story Resolution"
            else:
                drop_rate = 0.02  # Minimal drop in CTA zone (survivors are committed)
                event = "CTA / Replay Zone"

            current_retention = max(5.0, current_retention - (drop_rate * 100))
            retention_curve.append({
                "second": sec,
                "retention": round(current_retention, 1),
                "event": event,
            })

        # --- Summary metrics ---
        retention_at_3s = self._interpolate(retention_curve, 3)
        retention_at_5s = self._interpolate(retention_curve, 5)
        completion_rate = retention_curve[-1]["retention"] if retention_curve else 30.0

        # Predicted replay: if end retention > 25% and hook is strong, replay is likely
        replay_probability = min(0.8, (completion_rate / 100) * hook_strength * 1.5)

        # Simulated Rewatch Spikes
        rewatch_spikes = []
        if hook_strength > 0.8:
            rewatch_spikes.append({"second": 2, "intensity": "HIGH", "reason": "Strong visual hook replay"})
        if completion_rate > 40:
            rewatch_spikes.append({"second": duration - 2, "intensity": "MEDIUM", "reason": "End CTA replay"})
            
        # Simulated Scene Correlation
        scene_correlation = {
            "best_scene": "0s-3s (Hook Phase)" if hook_strength > 0.6 else "5s-10s (Value Phase)",
            "worst_scene": self._find_biggest_drop(retention_curve),
            "key_element": "Fast pacing" if pacing > 1.2 else "Face visibility" if face_vis > 0.7 else "Curiosity"
        }

        return {
            "retention_curve": retention_curve,
            "drop_0_to_1s": round(drop_0_1, 4),
            "drop_1_to_3s": round(drop_1_3, 4),
            "drop_3_to_5s": round(drop_3_5, 4),
            "retention_at_3s": round(retention_at_3s, 1),
            "retention_at_5s": round(retention_at_5s, 1),
            "predicted_completion_rate": round(completion_rate, 1),
            "replay_probability": round(replay_probability, 3),
            "biggest_drop_window": self._find_biggest_drop(retention_curve),
            "rewatch_spikes": rewatch_spikes,
            "scene_correlation": scene_correlation,
            "model_version": "2.0-physics-decay",
        }

    def _generate_checkpoints(self, duration: int) -> List[int]:
        """Generate time checkpoints for the retention curve."""
        points = [0, 1, 2, 3, 5]
        
        # Add midpoint markers
        mid = int(duration * 0.5)
        q3 = int(duration * 0.75)
        near_end = int(duration * 0.9)
        
        for p in [mid, q3, near_end, duration]:
            if p > 5 and p not in points:
                points.append(p)
        
        points.sort()
        return points

    def _interpolate(self, curve: List[Dict], target_second: int) -> float:
        """Interpolate retention at a specific second from the curve."""
        for i, point in enumerate(curve):
            if point["second"] == target_second:
                return point["retention"]
            if point["second"] > target_second and i > 0:
                prev = curve[i - 1]
                curr = point
                ratio = (target_second - prev["second"]) / max(curr["second"] - prev["second"], 1)
                return prev["retention"] + (curr["retention"] - prev["retention"]) * ratio
        return curve[-1]["retention"] if curve else 50.0

    def _find_biggest_drop(self, curve: List[Dict]) -> str:
        """Find the time window with the steepest drop."""
        if len(curve) < 2:
            return "0s-3s"
        
        max_drop = 0.0
        max_window = "0s-3s"
        
        for i in range(1, len(curve)):
            drop = curve[i - 1]["retention"] - curve[i]["retention"]
            if drop > max_drop:
                max_drop = drop
                max_window = f"{curve[i-1]['second']}s-{curve[i]['second']}s"
        
        return max_window
