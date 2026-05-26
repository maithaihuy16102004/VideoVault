import sys
import tempfile
import unittest
from pathlib import Path

SERVICES_DIR = Path(__file__).resolve().parents[1] / "services" / "tiktok_analyzer"
sys.path.insert(0, str(SERVICES_DIR))

import api
from engines.business_stage import BusinessStageEngine
from engines.campaign_learning import CampaignLearningLoop
from engines.learning_intelligence import (
    AutonomousBudgetAllocator,
    CommentEmotionEngine,
    CommentPsychologyEngine,
    CreativeCenterIngestionContract,
    EvolutionaryMemoryEngine,
    FrameVisualAIContract,
    NextContentStrategyEngine,
    PortfolioOptimizationEngine,
    RetentionTruthEngine,
    SelfLearningPromotionEngine,
    WinnerDNAEngine,
)
from engines.objective_mix import ObjectiveMixEngine
from engines.saturation_return import SaturationReturnEngine


def _base_decision(**overrides):
    decision = {
        "action": "SCALE",
        "objective": "VIDEO_VIEWS",
        "confidence": 82,
        "scores": {
            "viewBoost": 90,
            "followerGrowth": 70,
            "profilePull": 75,
            "salesIntent": 20,
            "risk": 25,
        },
        "budgetPlan": {
            "dailyBudgetMin": 100_000,
            "dailyBudgetMax": 300_000,
            "durationDays": 2,
            "scaleRule": "Default scale rule.",
        },
        "warnings": [],
        "reasonCodes": [],
        "reasons": [],
        "requiredFixesBeforePromote": [],
        "dataQuality": {"blockedObjectives": []},
    }
    decision.update(overrides)
    return decision


def _strategy_match(objective="VIDEO_VIEWS", match_score=82):
    return {
        "recommended_objective": objective,
        "match_score": match_score,
        "matched_archetype": "soft girl mirror outfit",
        "reason": ["Video matches a niche winner pattern."],
        "competitor_insights": ["Top creators reveal outfit in the first 2s."],
        "fixes_before_promote": [],
        "gap_analysis": [],
        "conversion_pattern": {"views": 88, "followers": 84, "sales": 58},
    }


def _source(level="ESTIMATED", can_scale=False):
    return {
        "evidenceLevel": level,
        "score": 20,
        "can_scale_strong": can_scale,
        "warning": "Strong scale requires paid history verification.",
    }


class PromotionIntelligenceGuardrailTests(unittest.TestCase):
    def test_viral_without_paid_history_never_scales(self):
        decision = api._apply_final_promotion_guardrails(
            promotion_decision=_base_decision(action="SCALE"),
            strategy_match=_strategy_match("VIDEO_VIEWS", 95),
            business_stage={"accountStage": "GROWING_CREATOR"},
            saturation={"suppress_video_views": False, "remap_to": None, "reason": ""},
            source_reliability=_source("COMPETITOR_BENCHMARK", False),
            paid_learning={"paid_history_ready": False},
            competitor_live={"message": "Competitive data: curated benchmark, not live market data."},
        )

        self.assertEqual(decision["action"], "TEST_SMALL")
        self.assertIn("EVIDENCE_NOT_PAID_HISTORY_VERIFIED", decision["reasonCodes"])

    def test_large_channel_above_p90_remaps_video_views(self):
        saturation = SaturationReturnEngine().evaluate(
            video_data={"views": 120_000},
            channel_stats={"p90_views": 100_000, "median_views": 40_000},
            objective="VIDEO_VIEWS",
        )
        decision = api._apply_final_promotion_guardrails(
            promotion_decision=_base_decision(objective="VIDEO_VIEWS", action="TEST_SMALL"),
            strategy_match=_strategy_match("VIDEO_VIEWS"),
            business_stage={"accountStage": "BRAND"},
            saturation=saturation,
            source_reliability=_source(),
            paid_learning={"paid_history_ready": False},
            competitor_live={"message": "Competitive data: curated benchmark, not live market data."},
        )

        self.assertTrue(saturation["suppress_video_views"])
        self.assertNotEqual(decision["objective"], "VIDEO_VIEWS")
        self.assertEqual(decision["objective"], "PROFILE_VIEWS")

    def test_small_shop_with_buying_intent_prefers_commerce_objective(self):
        stage = BusinessStageEngine().classify(
            channel_stats={"followers": 1500, "likes": 20_000},
            video_data={"title": "Set do xinh co link bio", "description": "comment size de shop tu van", "hashtags": ["#ootd"]},
        )
        decision = api._apply_final_promotion_guardrails(
            promotion_decision=_base_decision(
                action="TEST_SMALL",
                objective="VIDEO_VIEWS",
                scores={"viewBoost": 55, "followerGrowth": 50, "profilePull": 65, "salesIntent": 78, "risk": 30},
                dataQuality={"blockedObjectives": []},
            ),
            strategy_match=_strategy_match("PROFILE_VIEWS"),
            business_stage=stage,
            saturation={"suppress_video_views": False, "remap_to": None, "reason": ""},
            source_reliability=_source(),
            paid_learning={"paid_history_ready": False},
            competitor_live={"message": "Competitive data: curated benchmark, not live market data."},
        )

        self.assertEqual(stage["accountStage"], "SMALL_SHOP")
        self.assertIn(decision["objective"], {"MESSAGES", "PRODUCT_CLICKS", "PROFILE_VIEWS"})
        self.assertNotEqual(decision["objective"], "VIDEO_VIEWS")

    def test_objective_mix_uses_objective_specific_scores(self):
        videos = [
            {"id": "awareness", "aiStrategy": {"promotion_decision": {"scores": {"viewBoost": 99, "followerGrowth": 1, "profilePull": 1, "salesIntent": 1}}}},
            {"id": "followers", "aiStrategy": {"promotion_decision": {"scores": {"viewBoost": 1, "followerGrowth": 99, "profilePull": 1, "salesIntent": 1}}}},
            {"id": "profile", "aiStrategy": {"promotion_decision": {"scores": {"viewBoost": 1, "followerGrowth": 1, "profilePull": 99, "salesIntent": 1}}}},
            {"id": "sales", "aiStrategy": {"promotion_decision": {"scores": {"viewBoost": 1, "followerGrowth": 1, "profilePull": 1, "salesIntent": 99}}}},
        ]
        mix = ObjectiveMixEngine().rank(videos, business_stage="SMALL_SHOP")

        self.assertEqual(mix["top6_awareness"][0], "awareness")
        self.assertEqual(mix["top6_followers"][0], "followers")
        self.assertEqual(mix["top6_profile"][0], "profile")
        self.assertEqual(mix["top6_sales_messages"][0], "sales")

    def test_objective_mix_diversifies_and_hides_sales_without_buying_intent(self):
        videos = [
            {
                "id": f"v{i}",
                "aiStrategy": {
                    "promotion_decision": {
                        "action": "TEST_SMALL",
                        "objective": "FOLLOWERS",
                        "confidence": 60 + i,
                        "scores": {
                            "viewBoost": 70 - i,
                            "followerGrowth": 90 - i,
                            "profilePull": 75 - i,
                            "salesIntent": 20,
                            "risk": 20,
                        },
                    }
                },
            }
            for i in range(8)
        ]
        mix = ObjectiveMixEngine().rank(videos, business_stage="NEW_CREATOR")
        buckets = {item["objective_bucket"] for item in mix["final_mix"]}
        objectives = {item.get("objective") for item in mix["final_mix"]}

        self.assertIn("awareness", buckets)
        self.assertIn("follower", buckets)
        self.assertIn("profile", buckets)
        self.assertNotIn("sales", buckets)
        self.assertNotIn("MESSAGES", objectives)

    def test_paid_history_boosts_confidence_and_budget(self):
        with tempfile.TemporaryDirectory() as tmp:
            store = Path(tmp) / "campaign_learning.json"
            learning = CampaignLearningLoop(store)
            for i in range(5):
                learning.record({
                    "video_id": f"v{i}",
                    "objective": "FOLLOWERS",
                    "spend": 100_000,
                    "CPF": 0.4,
                    "CPV": 0.02,
                    "CTR": 0.08,
                    "objective_success": 1,
                    "archetype": "soft girl mirror outfit",
                })
            paid = learning.summarize("soft girl mirror outfit")

        decision = api._apply_final_promotion_guardrails(
            promotion_decision=_base_decision(action="TEST_SMALL", confidence=72),
            strategy_match=_strategy_match("FOLLOWERS"),
            business_stage={"accountStage": "GROWING_CREATOR"},
            saturation={"suppress_video_views": False, "remap_to": None, "reason": ""},
            source_reliability=_source("PAID_HISTORY_VERIFIED", True),
            paid_learning=paid,
            competitor_live={"message": "Live competitor and paid history available."},
        )

        self.assertTrue(paid["paid_history_ready"])
        self.assertEqual(decision["action"], "SCALE")
        self.assertGreater(decision["confidence"], 72)
        self.assertGreaterEqual(decision["budgetPlan"]["dailyBudgetMax"], 300_000)
        self.assertIn("decision_audit", decision)
        self.assertIn("PAID_HISTORY_BOOST_SCALE", decision["decision_audit"]["rules_triggered"])

    def test_conflict_risk_beats_good_paid_history(self):
        decision = api._apply_final_promotion_guardrails(
            promotion_decision=_base_decision(
                action="SCALE",
                confidence=85,
                objective="VIDEO_VIEWS",
                scores={"viewBoost": 90, "followerGrowth": 60, "profilePull": 65, "salesIntent": 8, "risk": 72},
                warnings=["Negative comments are rising."],
            ),
            strategy_match=_strategy_match("VIDEO_VIEWS", 90),
            business_stage={"accountStage": "BRAND"},
            saturation={
                "suppress_video_views": True,
                "remap_to": "PROFILE_VIEWS",
                "diminishingReturnRisk": "HIGH",
                "reason": "Video is already above p90 views.",
            },
            source_reliability=_source("PAID_HISTORY_VERIFIED", True),
            paid_learning={"paid_history_ready": True, "objective_success_rate": 0.9},
            competitor_live={"message": "Live competitor and paid history available."},
        )

        self.assertEqual(decision["action"], "TEST_SMALL")
        self.assertNotEqual(decision["objective"], "VIDEO_VIEWS")
        self.assertIn("CONFLICT_RISK_BLOCKS_PAID_HISTORY_BOOST", decision["decision_audit"]["rules_triggered"])
        self.assertIn("SATURATION_SUPPRESS_VIDEO_VIEWS", decision["decision_audit"]["rules_triggered"])

    def test_missing_data_does_not_crash_or_scale_by_default(self):
        decision = api._apply_final_promotion_guardrails(
            promotion_decision=_base_decision(
                action="SCALE",
                objective="VIDEO_VIEWS",
                dataQuality={},
                warnings=[],
            ),
            strategy_match={
                "recommended_objective": "VIDEO_VIEWS",
                "match_score": 0,
                "matched_archetype": "unknown",
                "reason": [],
                "competitor_insights": [],
                "fixes_before_promote": [],
                "gap_analysis": [],
                "conversion_pattern": {"views": 0, "followers": 0, "sales": 0},
            },
            business_stage={},
            saturation={},
            source_reliability={"can_scale_strong": False, "warning": "Missing evidence level."},
            paid_learning={},
            competitor_live={"message": "Competitive data unavailable."},
        )

        self.assertEqual(decision["action"], "TEST_SMALL")
        self.assertIn("decision_audit", decision)
        self.assertIn("EVIDENCE_BLOCK_SCALE", decision["decision_audit"]["rules_triggered"])

    def test_campaign_result_normalizes_real_paid_fields_for_learning(self):
        with tempfile.TemporaryDirectory() as tmp:
            store = Path(tmp) / "campaign_learning.json"
            learning = CampaignLearningLoop(store)
            learning.record({
                "video_id": "v1",
                "objective": "FOLLOWERS",
                "budget": 100_000,
                "views": 12_000,
                "followers": 83,
                "cpf": 1204,
                "ctr": 2.8,
                "watch_time": 6.2,
                "archetype": "soft girl mirror outfit",
            })
            row = learning.history()[0]
            summary = SelfLearningPromotionEngine().analyze(
                learning.history(),
                "soft girl mirror outfit",
                "FOLLOWERS",
            )

        self.assertEqual(row["CPF"], 1204)
        self.assertEqual(row["CTR"], 2.8)
        self.assertEqual(row["objective_success"], 1)
        self.assertEqual(summary["source"], "PAID_HISTORY")

    def test_retention_truth_blocks_scale_when_private_retention_collapses(self):
        retention = RetentionTruthEngine().evaluate(
            {"retention_3s": 18, "completion_rate": 20, "avg_watch_time": 1.4},
            {"retention_at_3s": 55, "predicted_completion_rate": 60},
        )
        budget = AutonomousBudgetAllocator().recommend(
            decision={
                "action": "SCALE",
                "source_reliability": {"can_scale_strong": True},
                "budgetPlan": {"dailyBudgetMin": 100_000, "dailyBudgetMax": 200_000},
            },
            retention_truth=retention,
            learning={"learning_ready": True},
            fatigue={"risk": "LOW"},
            roi={"roas": 2.0},
        )

        self.assertEqual(retention["source"], "PRIVATE_ANALYTICS")
        self.assertEqual(retention["scale_signal"], "BLOCK_SCALE")
        self.assertEqual(budget["mode"], "KILL_OR_FIX")

    def test_comment_psychology_detects_buying_intent(self):
        signal = CommentPsychologyEngine().analyze({
            "title": "Set đồ xinh, comment size để shop gửi link bio",
            "description": "Mua ở đâu inbox mình nhé",
            "views": 1000,
            "comments": 40,
        })

        self.assertGreaterEqual(signal["buying_intent_score"], 60)
        self.assertEqual(signal["conversion_signal"], "HIGH_BUYING_INTENT")

    def test_retention_timeline_diagnoses_early_collapse(self):
        retention = RetentionTruthEngine().evaluate(
            {"retention_1s": 40, "retention_3s": 20, "completion_rate": 15},
            {"retention_curve": []},
        )

        self.assertEqual(retention["scale_signal"], "BLOCK_SCALE")
        self.assertIn("0-1s", retention["timeline_diagnosis"]["biggest_drop"]["window"])

    def test_visual_contract_and_comment_emotion_are_explicit_fallbacks(self):
        visual = FrameVisualAIContract().analyze({"title": "mirror outfit"}, {"product_visibility": 0.8, "motion_intensity": 0.5, "face_visibility": 0.6})
        emotion = CommentEmotionEngine().analyze({"title": "set do xinh de mac di cafe xin link", "views": 1000})

        self.assertEqual(visual["source"], "HEURISTIC_CONTRACT")
        self.assertFalse(visual["ready"])
        self.assertEqual(emotion["dominant_emotion"], "comfort")

    def test_winner_dna_and_portfolio_detect_duplicate_mix(self):
        videos = [
            {"id": "v1", "views": 1000, "hashtags": ["#ootd"], "aiStrategy": {"creator_archetype": {"primary": "mirror"}}},
            {"id": "v2", "views": 900, "hashtags": ["#ootd"], "aiStrategy": {"creator_archetype": {"primary": "mirror"}}},
            {"id": "v3", "views": 800, "hashtags": ["#ootd"], "aiStrategy": {"creator_archetype": {"primary": "mirror"}}},
        ]
        dna = WinnerDNAEngine().build_channel_dna(videos)
        score = WinnerDNAEngine().score_video({"hashtags": ["#ootd"]}, dna)
        portfolio = PortfolioOptimizationEngine().optimize(
            videos,
            [
                {"video_id": "v1", "objective": "FOLLOWERS"},
                {"video_id": "v2", "objective": "FOLLOWERS"},
                {"video_id": "v3", "objective": "FOLLOWERS"},
            ],
        )

        self.assertTrue(dna["ready"])
        self.assertGreater(score["similarity_score"], 35)
        self.assertEqual(portfolio["self_competition_risk"], "HIGH")

    def test_evolutionary_memory_and_next_content_strategy(self):
        videos = [
            {"id": "r1", "views": 2000, "hashtags": ["#ootd"], "aiStrategy": {"creator_archetype": {"primary": "mirror"}}},
            {"id": "r2", "views": 1800, "hashtags": ["#ootd"], "aiStrategy": {"creator_archetype": {"primary": "mirror"}}},
            {"id": "r3", "views": 1600, "hashtags": ["#ootd"], "aiStrategy": {"creator_archetype": {"primary": "mirror"}}},
            {"id": "o1", "views": 500, "hashtags": ["#ootd"], "aiStrategy": {"creator_archetype": {"primary": "mirror"}}},
            {"id": "o2", "views": 450, "hashtags": ["#ootd"], "aiStrategy": {"creator_archetype": {"primary": "mirror"}}},
            {"id": "o3", "views": 400, "hashtags": ["#ootd"], "aiStrategy": {"creator_archetype": {"primary": "mirror"}}},
        ]
        dna = WinnerDNAEngine().build_channel_dna(videos)
        portfolio = PortfolioOptimizationEngine().optimize(videos, [{"video_id": "r1", "objective": "FOLLOWERS"}])
        evolution = EvolutionaryMemoryEngine().analyze(videos)
        strategy = NextContentStrategyEngine().generate(dna, portfolio, evolution, "fashion")
        creative_center = CreativeCenterIngestionContract().summarize("fashion")

        self.assertTrue(evolution["ready"])
        self.assertTrue(evolution["rising_patterns"])
        self.assertTrue(strategy["ideas"])
        self.assertFalse(creative_center["ready"])


if __name__ == "__main__":
    unittest.main()
