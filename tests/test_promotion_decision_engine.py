import sys
import unittest
from pathlib import Path

SERVICES_DIR = Path(__file__).resolve().parents[1] / "services" / "tiktok_analyzer"
sys.path.insert(0, str(SERVICES_DIR))

from engines.promotion_decision_engine import PromotionDecisionEngine, ScorePack


def _scores(**overrides):
    values = dict(
        organicPotential=70,
        viewBoost=80,
        followerGrowth=75,
        profilePull=80,
        salesIntent=75,
        risk=30,
        dataConfidence=80,
        conversionConfidence=80,
        creativeConfidence=80,
    )
    values.update(overrides)
    return ScorePack(**values)


class PromotionDecisionEngineTests(unittest.TestCase):
    def test_estimated_conversion_data_blocks_scale(self):
        decision = PromotionDecisionEngine.generate(
            video_id="v1",
            confidence=90,
            scores=_scores(risk=20),
            metrics={
                "sample_size": 5000,
                "follow_ctr": 1.5,
                "profile_ctr": 4.0,
                "product_ctr": 1.0,
                "uses_estimated_metrics": True,
                "has_private_conversion_data": False,
                "cta_present": True,
                "product_visible": True,
            },
        )

        self.assertNotEqual(decision["action"], "SCALE")
        self.assertEqual(decision["dataQuality"]["trustLevel"], "ESTIMATED_ONLY")

    def test_zero_product_ctr_blocks_sales_objective(self):
        decision = PromotionDecisionEngine.generate(
            video_id="v2",
            confidence=85,
            scores=_scores(salesIntent=90, risk=20),
            metrics={
                "sample_size": 2000,
                "follow_ctr": 1.2,
                "profile_ctr": 5.0,
                "product_ctr": 0,
                "uses_estimated_metrics": False,
                "has_private_conversion_data": True,
                "cta_present": True,
                "product_visible": True,
            },
        )

        self.assertNotEqual(decision["objective"], "PRODUCT_CLICKS")
        self.assertNotEqual(decision["objective"], "SALES")

    def test_high_risk_requires_creative_fix(self):
        decision = PromotionDecisionEngine.generate(
            video_id="v3",
            confidence=80,
            scores=_scores(risk=72),
            metrics={
                "sample_size": 3000,
                "follow_ctr": 1.0,
                "profile_ctr": 3.0,
                "product_ctr": 0.5,
                "uses_estimated_metrics": False,
                "has_private_conversion_data": True,
                "cta_present": False,
                "product_visible": False,
            },
            risk_breakdown={
                "dataRisk": 20,
                "creativeRisk": 78,
                "moneyRisk": 60,
                "objectiveMismatchRisk": 30,
            },
        )

        self.assertEqual(decision["action"], "FIX_CREATIVE_FIRST")
        self.assertTrue(decision["requiredFixesBeforePromote"])

    def test_public_breakout_with_estimated_data_is_test_small_not_creative_fix(self):
        decision = PromotionDecisionEngine.generate(
            video_id="v4",
            confidence=95,
            scores=_scores(risk=72, viewBoost=86, organicPotential=90),
            metrics={
                "sample_size": 10_900_000,
                "follow_ctr": 1.0,
                "profile_ctr": 2.5,
                "product_ctr": 0.0,
                "uses_estimated_metrics": True,
                "has_private_conversion_data": False,
                "cta_present": False,
                "product_visible": False,
                "completion_rate": 60,
            },
            organic_verdict={
                "rank": "BREAKOUT",
                "relativeViews": 5.4,
                "relativeEngagement": 1.2,
                "reasons": ["Video vượt median kênh 5.4 lần."],
            },
            risk_breakdown={
                "dataRisk": 82,
                "creativeRisk": 35,
                "moneyRisk": 72,
                "objectiveMismatchRisk": 55,
            },
        )

        self.assertEqual(decision["action"], "TEST_SMALL")
        self.assertEqual(decision["objective"], "VIDEO_VIEWS")
        self.assertEqual(decision["organicVerdict"]["rank"], "BREAKOUT")
        self.assertEqual(decision["dataQuality"]["trustLevel"], "ORGANIC_STRONG_BUT_PAID_UNVERIFIED")
        self.assertFalse(decision["requiredFixesBeforePromote"])

    def test_under_100_views_requires_private_analytics_and_zero_budget(self):
        decision = PromotionDecisionEngine.generate(
            video_id="v5",
            confidence=70,
            scores=_scores(risk=35, viewBoost=70),
            metrics={
                "sample_size": 99,
                "follow_ctr": 0.5,
                "profile_ctr": 1.5,
                "product_ctr": 0.0,
                "uses_estimated_metrics": True,
                "has_private_conversion_data": False,
                "cta_present": True,
                "product_visible": True,
            },
        )

        self.assertEqual(decision["action"], "NEED_PRIVATE_ANALYTICS")
        self.assertIsNone(decision["objective"])
        self.assertEqual(decision["budgetPlan"]["dailyBudgetMax"], 0)
        self.assertIn("LOW_SAMPLE_SIZE", decision["reasonCodes"])
        self.assertIn("confidenceBreakdown", decision)


if __name__ == "__main__":
    unittest.main()
