"""
PromoteROIEngine — Phase 4
Calculates the expected financial and algorithmic return of a TikTok Promote campaign.

TikTok's Promote algorithm works as an amplifier. If organic retention is bad,
spending $100 will just show the video to people who will quickly swipe away,
resulting in massive CPMs and zero followers.
If organic retention is good, $100 acts as rocket fuel.

In production: This would use XGBoost trained on actual promote spend vs outcomes.
For MVP: We use a probabilistic financial model based on known TikTok ad benchmarks.
"""
from typing import Dict, Any


class PromoteROIEngine:
    """
    Evaluates whether a video is financially viable for TikTok Promote
    and predicts the expected outcome ranges.
    """

    # Baseline Costs by Niche (Vietnam Market Estimate)
    # Measured in CPM (Cost Per 1000 Views) in USD
    BASE_CPM_USD = {
        "fashion": 0.8,
        "beauty": 1.0,
        "tech": 1.2,
        "education": 0.7,
        "dance": 0.5,
        "comedy": 0.6,
        "luxury_lifestyle": 1.5,
        "default": 0.8,
    }

    # Follower Conversion Rates by Archetype
    FOLLOWER_CVR = {
        "fashion_aesthetic": 0.015,
        "storytelling": 0.035,       # High trust = higher conversion
        "educational": 0.040,        # High value = highest conversion
        "fast_cut_transition": 0.005, # Good for views, bad for followers
        "thirst_trap": 0.008,
        "default": 0.015,
    }

    def calculate_roi(
        self,
        overall_score: int,
        retention_at_5s: float,
        hook_strength: float,
        archetype: str,
        niche: str,
        budget_usd: float = 50.0,
    ) -> Dict[str, Any]:
        """
        Calculate expected ROI for a given budget.
        """
        # 1. Calculate Quality Multiplier (Amplification Effect)
        # TikTok rewards high-quality videos with cheaper CPMs
        quality_factor = overall_score / 100.0
        hook_factor = hook_strength / 10.0
        retention_factor = min(1.0, retention_at_5s / 40.0) # 40% at 5s is excellent
        
        # If the video is fundamentally bad, the algorithm penalizes the ad cost
        if quality_factor < 0.5 or hook_factor < 0.4:
            cpm_multiplier = 1.8 # Very expensive
            cvr_multiplier = 0.3 # People won't follow a bad promoted video
            amplification = 0.5
        elif quality_factor >= 0.75 and hook_factor >= 0.7:
            cpm_multiplier = 0.6 # Algorithm heavily discounts good content
            cvr_multiplier = 1.5 # High conversion
            amplification = 2.5 # Organic spillover effect (Ads trigger organic algo)
        else:
            cpm_multiplier = 1.0
            cvr_multiplier = 1.0
            amplification = 1.2

        # 2. Financial Calculations
        base_cpm = self.BASE_CPM_USD.get(niche, self.BASE_CPM_USD["default"])
        effective_cpm = base_cpm * cpm_multiplier

        # Expected Views directly from budget
        paid_views = (budget_usd / effective_cpm) * 1000
        
        # Organic spillover (Ads push the video back into the FYP organically)
        organic_spillover = paid_views * (amplification - 1) if amplification > 1 else 0
        
        total_expected_views = paid_views + organic_spillover

        # 3. Conversion Calculations
        base_cvr = self.FOLLOWER_CVR.get(archetype, self.FOLLOWER_CVR["default"])
        effective_cvr = base_cvr * cvr_multiplier

        expected_followers = total_expected_views * effective_cvr

        # 4. Cost Per Acquisition (CPA)
        cpa_follower = budget_usd / max(expected_followers, 1)

        # 5. Recommendation Logic
        is_hero = overall_score >= 65
        should_promote = is_hero and hook_factor >= 0.6
        
        if should_promote:
            if quality_factor > 0.85:
                verdict = "STRONG YES — Rót ngân sách mạnh ($100+). Video có Amplification Effect cao, CPM sẽ rất rẻ."
                risk = "LOW"
            else:
                verdict = "YES — Có thể chạy mồi ($20-50). Đạt chuẩn cơ bản của thuật toán."
                risk = "MEDIUM"
        else:
            if hook_factor < 0.5:
                verdict = "NO — Đừng đốt tiền. Hook quá yếu, chạy Ads sẽ bị tính phí CPM cực kỳ đắt."
            else:
                verdict = "NO — Retention không đủ tốt. Chạy Ads sẽ mang lại view rỗng (không ra follower)."
            risk = "HIGH"

        # Provide outcome ranges (Pessimistic to Optimistic)
        return {
            "financial_metrics": {
                "budget_usd": budget_usd,
                "effective_cpm": round(effective_cpm, 2),
                "cost_per_follower": round(cpa_follower, 3),
            },
            "expected_outcomes": {
                "total_views": {
                    "low": int(total_expected_views * 0.8),
                    "expected": int(total_expected_views),
                    "high": int(total_expected_views * 1.5) # Viral breakout possibility
                },
                "followers_gained": {
                    "low": int(expected_followers * 0.6),
                    "expected": int(expected_followers),
                    "high": int(expected_followers * 1.4)
                },
                "organic_spillover_views": int(organic_spillover)
            },
            "amplification_effect": {
                "multiplier": round(amplification, 2),
                "status": "POSITIVE" if amplification > 1 else "NEGATIVE"
            },
            "decision": {
                "should_promote": should_promote,
                "verdict": verdict,
                "risk_level": risk
            },
            "model_version": "4.0-probabilistic-roi"
        }
