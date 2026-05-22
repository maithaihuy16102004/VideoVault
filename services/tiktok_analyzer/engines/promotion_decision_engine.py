from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any, Literal

Action = Literal[
    "SCALE",
    "TEST_SMALL",
    "FIX_CREATIVE_FIRST",
    "DO_NOT_PROMOTE",
    "NEED_PRIVATE_ANALYTICS",
]
Objective = Literal[
    "VIDEO_VIEWS",
    "PROFILE_VIEWS",
    "FOLLOWERS",
    "MESSAGES",
    "PRODUCT_CLICKS",
    "WEBSITE_TRAFFIC",
    "LEADS",
    "SALES",
]
RiskLevel = Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
OrganicRank = Literal["WEAK", "NORMAL", "STRONG", "VIRAL", "BREAKOUT"]
Op = Literal[">", "<", ">=", "<="]
StopAction = Literal["PAUSE", "REDUCE_BUDGET", "CHANGE_OBJECTIVE"]


@dataclass
class ScorePack:
    organicPotential: int
    viewBoost: int
    followerGrowth: int
    profilePull: int
    salesIntent: int
    risk: int
    dataConfidence: int
    conversionConfidence: int
    creativeConfidence: int


@dataclass
class RiskBreakdown:
    dataRisk: int
    creativeRisk: int
    moneyRisk: int
    objectiveMismatchRisk: int


@dataclass
class OrganicVerdict:
    rank: OrganicRank
    relativeViews: float
    relativeEngagement: float
    reasons: list[str]


@dataclass
class BudgetPlan:
    dailyBudgetMin: int
    dailyBudgetMax: int
    durationDays: int
    scaleRule: str


@dataclass
class StopCondition:
    metric: str
    operator: Op
    value: float
    windowHours: int
    action: StopAction


@dataclass
class PromotionDecision:
    videoId: str
    action: Action
    objective: Objective | None
    confidence: int
    riskLevel: RiskLevel
    scores: ScorePack
    organicVerdict: OrganicVerdict
    riskBreakdown: RiskBreakdown
    budgetPlan: BudgetPlan
    stopConditions: list[StopCondition]
    reasons: list[str]
    reasonCodes: list[str]
    warnings: list[str]
    requiredFixesBeforePromote: list[str]
    confidenceBreakdown: dict[str, int]
    confidenceExplanation: str
    tiktokPromoteSetup: dict[str, str] | None
    recommendedAudience: dict[str, Any] | None
    dataQuality: dict[str, Any]
    llmExplanation: str


def _clamp_0_100(value: float) -> int:
    return int(max(0, min(100, round(value))))


def _coerce_risk_breakdown(value: RiskBreakdown | dict[str, Any] | None, scores: ScorePack, metrics: dict[str, Any]) -> RiskBreakdown:
    if isinstance(value, RiskBreakdown):
        return value
    if isinstance(value, dict):
        return RiskBreakdown(
            dataRisk=_clamp_0_100(float(value.get("dataRisk", value.get("data_risk", 0)) or 0)),
            creativeRisk=_clamp_0_100(float(value.get("creativeRisk", value.get("creative_risk", 0)) or 0)),
            moneyRisk=_clamp_0_100(float(value.get("moneyRisk", value.get("money_risk", 0)) or 0)),
            objectiveMismatchRisk=_clamp_0_100(float(value.get("objectiveMismatchRisk", value.get("objective_mismatch_risk", 0)) or 0)),
        )

    uses_estimated = bool(metrics.get("uses_estimated_metrics", True))
    completion_rate = float(metrics.get("completion_rate", 0) or 0)
    data_risk = 80 if uses_estimated else max(0, 100 - scores.dataConfidence)
    creative_risk = _clamp_0_100(max(0, 55 - completion_rate) + (20 if not metrics.get("cta_present", False) else 0))
    money_risk = _clamp_0_100(scores.risk)
    mismatch_risk = 35 if uses_estimated else 0
    return RiskBreakdown(data_risk, creative_risk, money_risk, mismatch_risk)


def _coerce_organic_verdict(value: OrganicVerdict | dict[str, Any] | None, metrics: dict[str, Any]) -> OrganicVerdict:
    if isinstance(value, OrganicVerdict):
        return value
    if isinstance(value, dict):
        rank = str(value.get("rank", "NORMAL")).upper()
        if rank not in {"WEAK", "NORMAL", "STRONG", "VIRAL", "BREAKOUT"}:
            rank = "NORMAL"
        reasons = value.get("reasons") or value.get("reason") or []
        if isinstance(reasons, str):
            reasons = [reasons]
        return OrganicVerdict(
            rank=rank,  # type: ignore[arg-type]
            relativeViews=round(float(value.get("relativeViews", value.get("relative_views", 1.0)) or 1.0), 2),
            relativeEngagement=round(float(value.get("relativeEngagement", value.get("relative_engagement", 1.0)) or 1.0), 2),
            reasons=list(reasons),
        )

    relative_views = float(metrics.get("relative_views", 1.0) or 1.0)
    relative_engagement = float(metrics.get("relative_engagement", 1.0) or 1.0)
    if relative_views >= 3:
        rank: OrganicRank = "BREAKOUT"
    elif relative_views >= 1.5:
        rank = "VIRAL"
    elif relative_views >= 0.8:
        rank = "NORMAL"
    else:
        rank = "WEAK"
    return OrganicVerdict(
        rank=rank,
        relativeViews=round(relative_views, 2),
        relativeEngagement=round(relative_engagement, 2),
        reasons=[f"Hiệu suất organic cao hơn baseline {relative_views:.1f} lần."],
    )


class DataQualityGate:
    @staticmethod
    def evaluate(metrics: dict[str, Any], organic_verdict: OrganicVerdict) -> dict[str, Any]:
        views = float(metrics.get("sample_size", 0) or 0)
        uses_estimated = bool(metrics.get("uses_estimated_metrics", True))
        has_private_conversion = bool(metrics.get("has_private_conversion_data", False))
        missing_private = not has_private_conversion

        blocked: list[Objective] = []
        max_action: Action = "SCALE"
        trust_level = "HIGH_CONFIDENCE"

        if views < 100:
            max_action = "NEED_PRIVATE_ANALYTICS"
            trust_level = "LOW_SAMPLE"
        elif views < 200:
            max_action = "TEST_SMALL"
            trust_level = "LOW_SAMPLE"
        elif views < 500:
            max_action = "TEST_SMALL"
            trust_level = "LIMITED_SAMPLE"
        elif uses_estimated and organic_verdict.rank in ("VIRAL", "BREAKOUT"):
            max_action = "TEST_SMALL"
            trust_level = "ORGANIC_STRONG_BUT_PAID_UNVERIFIED"
        elif uses_estimated:
            max_action = "TEST_SMALL"
            trust_level = "ESTIMATED_ONLY"

        if missing_private:
            blocked.extend(["FOLLOWERS", "SALES", "PRODUCT_CLICKS", "MESSAGES", "LEADS"])

        if not metrics.get("cta_present", False):
            blocked.extend(["FOLLOWERS", "SALES", "PRODUCT_CLICKS", "MESSAGES", "LEADS"])

        if not metrics.get("product_visible", False):
            blocked.extend(["SALES", "PRODUCT_CLICKS"])

        return {
            "trustLevel": trust_level,
            "maxAllowedAction": max_action,
            "blockedObjectives": sorted(set(blocked)),
            "has_private_conversion_data": has_private_conversion,
            "uses_estimated_conversion_metrics": uses_estimated,
        }


class ObjectiveEngine:
    @staticmethod
    def choose(
        scores: ScorePack,
        metrics: dict[str, Any],
        data_quality: dict[str, Any],
        organic_verdict: OrganicVerdict,
        risk_breakdown: RiskBreakdown,
    ) -> Objective | None:
        if risk_breakdown.creativeRisk >= 70:
            return None

        if float(metrics.get("sample_size", 0) or 0) < 100:
            return None

        blocked = set(data_quality.get("blockedObjectives", []))
        has_private_conversion = bool(metrics.get("has_private_conversion_data", False))

        if has_private_conversion:
            if "PRODUCT_CLICKS" not in blocked and scores.salesIntent >= 70 and metrics.get("product_ctr", 0) > 0.4:
                return "PRODUCT_CLICKS"

            if "FOLLOWERS" not in blocked and scores.followerGrowth >= 70 and metrics.get("follow_ctr", 0) >= 1.0:
                return "FOLLOWERS"

            if "PROFILE_VIEWS" not in blocked and scores.profilePull >= 65:
                return "PROFILE_VIEWS"

        if "VIDEO_VIEWS" not in blocked and (scores.viewBoost >= 50 or organic_verdict.rank in ("STRONG", "VIRAL", "BREAKOUT")):
            return "VIDEO_VIEWS"

        return None


class PromotionGuardrailService:
    @staticmethod
    def apply(
        action: Action,
        objective: Objective | None,
        confidence: int,
        scores: ScorePack,
        metrics: dict[str, Any],
        budget: BudgetPlan,
        data_quality: dict[str, Any],
        risk_breakdown: RiskBreakdown,
        organic_verdict: OrganicVerdict,
    ) -> tuple[Action, Objective | None, BudgetPlan, list[str], list[str]]:
        warnings: list[str] = []
        fixes: list[str] = []

        sample_size = float(metrics.get("sample_size", 0) or 0)

        if sample_size < 100:
            action = "NEED_PRIVATE_ANALYTICS"
            objective = None
            budget.dailyBudgetMin = 0
            budget.dailyBudgetMax = 0
            budget.durationDays = 0
            warnings.append("Chưa đủ mẫu dữ liệu, cần thêm view tự nhiên trước khi test quảng bá.")
            return action, objective, budget, warnings, fixes

        if sample_size < 200:
            action = "TEST_SMALL" if objective else "NEED_PRIVATE_ANALYTICS"
            budget.dailyBudgetMax = min(budget.dailyBudgetMax, 100_000)
            warnings.append("Mẫu dữ liệu dưới 200 view, chỉ được phép test rất nhỏ hoặc yêu cầu thêm dữ liệu.")

        if confidence < 50:
            action = "TEST_SMALL" if action == "SCALE" else action
            budget.dailyBudgetMax = min(budget.dailyBudgetMax, 100_000)
            warnings.append("Độ tin cậy thấp, hệ thống đã giới hạn ngân sách.")

        if metrics.get("uses_estimated_metrics", True):
            if action == "SCALE":
                action = "TEST_SMALL"
            budget.dailyBudgetMax = min(budget.dailyBudgetMax, 100_000)
            warnings.append("Chỉ số chuyển đổi đang là ước lượng, không cho phép scale trước khi có dữ liệu TikTok Analytics thật.")

        if data_quality.get("maxAllowedAction") == "TEST_SMALL" and action == "SCALE":
            action = "TEST_SMALL"
            budget.dailyBudgetMax = min(budget.dailyBudgetMax, 100_000)

        if risk_breakdown.creativeRisk >= 70:
            action = "FIX_CREATIVE_FIRST"
            objective = None
            fixes.extend([
                "Cải thiện hook trong 3 giây đầu.",
                "Bổ sung lời kêu gọi hành động rõ ràng.",
                "Làm sản phẩm hoặc chủ thể chính nổi bật hơn trong khung hình.",
            ])

        if objective == "FOLLOWERS" and metrics.get("follow_ctr", 0) <= 0:
            action = "FIX_CREATIVE_FIRST"
            objective = "PROFILE_VIEWS"
            warnings.append("Tín hiệu follow yếu, chuyển sang mục tiêu xem hồ sơ.")

        if objective in ("SALES", "PRODUCT_CLICKS", "MESSAGES") and metrics.get("product_ctr", 0) <= 0:
            action = "FIX_CREATIVE_FIRST"
            objective = "VIDEO_VIEWS"
            warnings.append("Chưa có tín hiệu click sản phẩm, không nên chạy mục tiêu bán hàng.")

        if (
            data_quality.get("trustLevel") == "ORGANIC_STRONG_BUT_PAID_UNVERIFIED"
            and organic_verdict.rank in ("VIRAL", "BREAKOUT")
            and risk_breakdown.creativeRisk < 70
        ):
            action = "TEST_SMALL"
            objective = objective or "VIDEO_VIEWS"
            budget.dailyBudgetMin = 50_000
            budget.dailyBudgetMax = min(max(budget.dailyBudgetMax, 100_000), 100_000)
            budget.durationDays = max(1, min(budget.durationDays or 1, 1))
            warnings.append("Organic rất mạnh nhưng paid chưa được xác minh, chỉ cho phép test nhỏ với mục tiêu lượt xem video.")

        return action, objective, budget, warnings, fixes


class BudgetPlanner:
    @staticmethod
    def plan(action: Action, confidence: int, risk: int) -> BudgetPlan:
        if action in ("DO_NOT_PROMOTE", "FIX_CREATIVE_FIRST", "NEED_PRIVATE_ANALYTICS"):
            return BudgetPlan(0, 0, 0, "Không chạy ngân sách cho đến khi đủ điều kiện.")

        if confidence < 50 or risk >= 60:
            return BudgetPlan(50_000, 100_000, 1, "Không scale khi KPI chưa đạt.")

        if confidence < 75:
            return BudgetPlan(100_000, 300_000, 2, "Tăng 20% mỗi ngày nếu KPI đạt.")

        return BudgetPlan(300_000, 1_000_000, 3, "Tăng 25% mỗi ngày, tối đa 3 ngày liên tiếp.")


class StopConditionBuilder:
    @staticmethod
    def build(objective: Objective | None) -> list[StopCondition]:
        if objective == "PROFILE_VIEWS":
            return [StopCondition("cost_per_profile_view", ">", 1.5, 24, "PAUSE")]
        if objective == "FOLLOWERS":
            return [StopCondition("cost_per_follower", ">", 1.5, 24, "PAUSE")]
        if objective in ("PRODUCT_CLICKS", "SALES", "MESSAGES"):
            return [StopCondition("cost_per_click", ">", 2.0, 24, "CHANGE_OBJECTIVE")]
        if objective == "VIDEO_VIEWS":
            return [StopCondition("cost_per_view", ">", 0.12, 24, "REDUCE_BUDGET")]
        return []


class TikTokPromoteSetupBuilder:
    @staticmethod
    def build(action: Action, objective: Objective | None) -> dict[str, str] | None:
        if action in ("NEED_PRIVATE_ANALYTICS", "FIX_CREATIVE_FIRST", "DO_NOT_PROMOTE") or objective is None:
            return None

        option_map = {
            "VIDEO_VIEWS": "Nhiều lượt xem video hơn",
            "PROFILE_VIEWS": "Nhiều lượt xem hồ sơ hơn",
            "FOLLOWERS": "Tăng người theo dõi",
            "MESSAGES": "Nhiều tin nhắn hơn",
            "PRODUCT_CLICKS": "Nhiều lượt click sản phẩm hơn",
            "WEBSITE_TRAFFIC": "Nhiều lượt truy cập website hơn",
            "LEADS": "Thu thập khách hàng tiềm năng",
            "SALES": "Tăng doanh số",
        }
        package = "Gói thấp / Tùy chỉnh" if action == "TEST_SMALL" else "Gói tùy chỉnh"
        instruction = "Chọn ngân sách thấp nhất trong 24 giờ." if action == "TEST_SMALL" else "Chỉ tăng 20-25% ngân sách mỗi ngày nếu KPI đạt."
        return {
            "tab": "Thúc đẩy tài khoản",
            "option": option_map.get(objective, "Nhiều lượt xem video hơn"),
            "package": package,
            "instruction": instruction,
        }


class PromotionDecisionEngine:
    @staticmethod
    def generate(
        video_id: str,
        confidence: int,
        scores: ScorePack,
        metrics: dict[str, Any],
        llm_explanation: str = "",
        organic_verdict: OrganicVerdict | dict[str, Any] | None = None,
        risk_breakdown: RiskBreakdown | dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        organic = _coerce_organic_verdict(organic_verdict, metrics)
        risks = _coerce_risk_breakdown(risk_breakdown, scores, metrics)
        data_quality = DataQualityGate.evaluate(metrics, organic)
        objective = ObjectiveEngine.choose(scores, metrics, data_quality, organic, risks)
        sample_size = float(metrics.get("sample_size", 0) or 0)

        if sample_size < 100:
            action: Action = "NEED_PRIVATE_ANALYTICS"
            objective = None
        elif risks.creativeRisk >= 70:
            action = "FIX_CREATIVE_FIRST"
        elif objective is None:
            action = "NEED_PRIVATE_ANALYTICS" if risks.dataRisk >= 70 else "DO_NOT_PROMOTE"
        elif risks.dataRisk >= 70 and organic.rank in ("VIRAL", "BREAKOUT"):
            action = "TEST_SMALL"
        elif risks.dataRisk >= 70:
            action = "TEST_SMALL" if objective == "VIDEO_VIEWS" else "NEED_PRIVATE_ANALYTICS"
        elif scores.risk >= 60:
            action = "TEST_SMALL"
        elif confidence >= 75 and scores.risk < 40:
            action = "SCALE"
        else:
            action = "TEST_SMALL"

        budget = BudgetPlanner.plan(action, confidence, scores.risk)
        action, objective, budget, warnings, fixes = PromotionGuardrailService.apply(
            action,
            objective,
            confidence,
            scores,
            metrics,
            budget,
            data_quality,
            risks,
            organic,
        )
        stops = StopConditionBuilder.build(objective)
        tiktok_setup = TikTokPromoteSetupBuilder.build(action, objective)

        confidence_breakdown = {
            "data": _clamp_0_100(scores.dataConfidence),
            "sampleSize": _clamp_0_100(20 if sample_size < 100 else 60 if sample_size < 500 else 85 if sample_size < 2000 else 95),
            "creative": _clamp_0_100(scores.creativeConfidence),
            "conversion": _clamp_0_100(scores.conversionConfidence),
        }
        confidence_explanation_parts: list[str] = []
        if confidence_breakdown["sampleSize"] < 70:
            confidence_explanation_parts.append("mẫu view còn nhỏ")
        if confidence_breakdown["conversion"] < 50:
            confidence_explanation_parts.append("thiếu dữ liệu follow/profile/product thật từ TikTok Analytics")
        if confidence_breakdown["creative"] < 60:
            confidence_explanation_parts.append("creative còn rủi ro")
        confidence_explanation = (
            "Tin cậy thấp vì " + ", ".join(confidence_explanation_parts) + "."
            if confidence_explanation_parts
            else "Độ tin cậy đủ tốt vì mẫu dữ liệu, creative và tín hiệu chuyển đổi đều ở mức chấp nhận được."
        )

        reasons = [
            f"Tín hiệu organic: {organic.rank} ({organic.relativeViews:.2f}x median views).",
            f"Mục tiêu paid phù hợp nhất: {objective or 'CHƯA ĐỦ DỮ LIỆU'}.",
            f"Rủi ro dữ liệu/creative/tiền: {risks.dataRisk}/{risks.creativeRisk}/{risks.moneyRisk}.",
            f"Độ tin cậy quyết định: {confidence}/100.",
        ]
        reasons.extend(organic.reasons[:2])

        reason_codes: list[str] = []
        if sample_size < 100:
            reason_codes.append("LOW_SAMPLE_SIZE")
        elif sample_size < 500:
            reason_codes.append("LIMITED_SAMPLE_SIZE")
        if metrics.get("uses_estimated_metrics", True):
            reason_codes.append("ESTIMATED_CONVERSION_DATA")
        if organic.rank in ("STRONG", "VIRAL", "BREAKOUT"):
            reason_codes.append("ORGANIC_SIGNAL_STRONG")
        if metrics.get("product_ctr", 0) <= 0:
            reason_codes.append("NO_PRODUCT_CLICK_SIGNAL")
        if not metrics.get("cta_present", False):
            reason_codes.append("CTA_WEAK")
        if risks.creativeRisk >= 70:
            reason_codes.append("CREATIVE_RISK_HIGH")
        if action == "NEED_PRIVATE_ANALYTICS":
            reason_codes.append("NEED_PRIVATE_ANALYTICS")

        if risks.dataRisk >= 70 and risks.creativeRisk < 70:
            warnings.append("Rủi ro chính là thiếu dữ liệu paid/private, không phải creative yếu.")

        risk_level: RiskLevel = "LOW"
        if scores.risk >= 80:
            risk_level = "CRITICAL"
        elif scores.risk >= 60:
            risk_level = "HIGH"
        elif scores.risk >= 40:
            risk_level = "MEDIUM"

        decision = PromotionDecision(
            videoId=video_id,
            action=action,
            objective=objective,
            confidence=confidence,
            riskLevel=risk_level,
            scores=scores,
            organicVerdict=organic,
            riskBreakdown=risks,
            budgetPlan=budget,
            stopConditions=stops,
            reasons=reasons,
            reasonCodes=sorted(set(reason_codes)),
            warnings=warnings,
            requiredFixesBeforePromote=fixes,
            confidenceBreakdown=confidence_breakdown,
            confidenceExplanation=confidence_explanation,
            tiktokPromoteSetup=tiktok_setup,
            recommendedAudience=None,
            dataQuality=data_quality,
            llmExplanation=llm_explanation,
        )

        return asdict(decision)
