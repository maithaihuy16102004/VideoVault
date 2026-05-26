from __future__ import annotations

from collections import Counter, defaultdict
from typing import Any


def _num(value: Any, default: float = 0.0) -> float:
    try:
        if value is None or value == "":
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _avg(rows: list[dict[str, Any]], key: str) -> float:
    values = [_num(row.get(key), 0.0) for row in rows if row.get(key) is not None]
    return round(sum(values) / max(len(values), 1), 4)


class RetentionTruthEngine:
    """Prefer private analytics retention. Fall back to predicted retention with explicit source labels."""

    def evaluate(self, video_data: dict[str, Any], predicted: dict[str, Any]) -> dict[str, Any]:
        private_keys = ("retention_1s", "retention_3s", "avg_watch_time", "completion_rate", "replay_rate")
        has_private = any(video_data.get(key) is not None for key in private_keys)

        retention_1s = _num(video_data.get("retention_1s"), _num(predicted.get("retention_at_1s"), 0))
        retention_3s = _num(video_data.get("retention_3s"), _num(predicted.get("retention_at_3s"), 0))
        avg_watch_time = _num(video_data.get("avg_watch_time"), 0)
        completion = _num(video_data.get("completion_rate"), _num(predicted.get("predicted_completion_rate"), 0))
        replay = _num(video_data.get("replay_rate"), _num(predicted.get("replay_probability"), 0) * 100)

        if retention_3s and retention_3s < 25:
            scale_signal = "BLOCK_SCALE"
            reason = "Retention 3s thấp, nguy cơ TikTok phân phối paid kém."
        elif completion and completion >= 45 and retention_3s >= 45:
            scale_signal = "RETENTION_OK"
            reason = "Retention đủ tốt cho test paid nhỏ."
        else:
            scale_signal = "NEED_MORE_RETENTION_DATA" if not has_private else "RETENTION_MIXED"
            reason = "Chưa đủ retention thật để kết luận scale."

        return {
            "source": "PRIVATE_ANALYTICS" if has_private else "HEURISTIC_PREDICTION",
            "retention_1s": round(retention_1s, 2),
            "retention_3s": round(retention_3s, 2),
            "avg_watch_time": round(avg_watch_time, 2),
            "completion_rate": round(completion, 2),
            "replay_rate": round(replay, 2),
            "scale_signal": scale_signal,
            "reason": reason,
            "timeline_diagnosis": RetentionTimelineDiagnosisEngine().diagnose(video_data, predicted, has_private),
        }


class CommentPsychologyEngine:
    """Score buying intent and conversion risk from available comment/text signals."""

    BUYING_TERMS = ("xin link", "mua", "bao nhiêu", "gia", "giá", "ở đâu", "size", "inbox", "ib", "shop", "link bio")
    NEGATIVE_TERMS = ("cringe", "nhảm", "ảo", "xấu", "lừa", "fake", "không thật", "chê")

    def analyze(self, video_data: dict[str, Any]) -> dict[str, Any]:
        text = " ".join([
            str(video_data.get("title") or ""),
            str(video_data.get("description") or ""),
            " ".join(str(tag) for tag in video_data.get("hashtags", []) or []),
            " ".join(str(comment) for comment in video_data.get("comment_samples", []) or []),
        ]).lower()

        buying_hits = [term for term in self.BUYING_TERMS if term in text]
        negative_hits = [term for term in self.NEGATIVE_TERMS if term in text]
        explicit_buying_rate = _num(video_data.get("buying_comment_rate"), 0) * 100
        comment_count = _num(video_data.get("comments"), 0)
        view_count = max(_num(video_data.get("views"), 0), 1)
        comment_rate = comment_count / view_count * 100

        buying_intent = min(100, explicit_buying_rate * 1.5 + len(buying_hits) * 18 + min(comment_rate * 6, 25))
        negative_intent = min(100, len(negative_hits) * 25 + _num(video_data.get("negative_comment_rate"), 0) * 100)
        conversion_signal = "HIGH_BUYING_INTENT" if buying_intent >= 60 else "LOW_BUYING_INTENT"
        if negative_intent >= 50:
            conversion_signal = "NEGATIVE_SENTIMENT_RISK"

        return {
            "source": "COMMENT_SAMPLES" if video_data.get("comment_samples") else "TEXT_AND_PUBLIC_COUNTS",
            "buying_intent_score": int(round(buying_intent)),
            "negative_intent_score": int(round(negative_intent)),
            "conversion_signal": conversion_signal,
            "buying_terms_found": buying_hits[:5],
            "negative_terms_found": negative_hits[:5],
        }


class AudioMomentumEngine:
    """Classify audio momentum. Real sound velocity requires TikTok/Creative Center data."""

    def analyze(self, video_data: dict[str, Any], trend_analysis: dict[str, Any]) -> dict[str, Any]:
        sound_id = video_data.get("sound_id") or video_data.get("audio_id") or video_data.get("track")
        velocity = _num(video_data.get("sound_velocity_24h"), 0)
        saturation = _num(video_data.get("sound_saturation"), 0)
        trend_alignment = _num(trend_analysis.get("trend_alignment_score"), 0)

        if sound_id and velocity > 0:
            source = "LIVE_SOUND_DATA"
            if velocity >= 20 and saturation < 70:
                status = "RISING"
            elif saturation >= 85:
                status = "OVERUSED"
            else:
                status = "STABLE"
        else:
            source = "HEURISTIC"
            status = "LIKELY_COMPATIBLE" if trend_alignment >= 55 else "UNKNOWN"

        return {
            "source": source,
            "sound_id": sound_id,
            "momentum_status": status,
            "sound_velocity_24h": round(velocity, 2),
            "saturation_score": round(saturation, 2),
            "niche_fit_score": int(min(100, trend_alignment)),
            "warning": None if source == "LIVE_SOUND_DATA" else "Chưa có dữ liệu live sound velocity; audio chỉ được đánh giá heuristic.",
        }


class CreativeFatigueEngine:
    """Detect fatigue from repeated paid history for an archetype/format."""

    def evaluate(self, history: list[dict[str, Any]], archetype: str) -> dict[str, Any]:
        related = [row for row in history if row.get("archetype") == archetype]
        if not related:
            return {
                "source": "NO_PAID_HISTORY",
                "fatigue_score": 0,
                "risk": "UNKNOWN",
                "reason": "Chưa có paid history cho archetype này.",
            }

        recent = related[-20:]
        cpv_values = [_num(row.get("CPV"), 0) for row in recent if row.get("CPV") is not None]
        success_rate = _avg(recent, "objective_success")
        cpv_trend = 0.0
        if len(cpv_values) >= 4:
            first_half = sum(cpv_values[: len(cpv_values) // 2]) / max(len(cpv_values[: len(cpv_values) // 2]), 1)
            second_half = sum(cpv_values[len(cpv_values) // 2 :]) / max(len(cpv_values[len(cpv_values) // 2 :]), 1)
            cpv_trend = ((second_half - first_half) / max(first_half, 0.0001)) * 100

        fatigue_score = min(100, len(recent) * 3 + max(cpv_trend, 0) * 0.8 + max(0, 0.6 - success_rate) * 50)
        risk = "HIGH" if fatigue_score >= 75 else "MEDIUM" if fatigue_score >= 45 else "LOW"
        return {
            "source": "PAID_HISTORY",
            "fatigue_score": int(round(fatigue_score)),
            "risk": risk,
            "cpv_trend_pct": round(cpv_trend, 2),
            "sample_size": len(related),
            "reason": "CPV tăng hoặc success rate giảm cho archetype này." if risk != "LOW" else "Chưa thấy fatigue nghiêm trọng.",
        }


class SelfLearningPromotionEngine:
    """Convert paid campaign truth into objective/archetype learning signals."""

    def analyze(self, history: list[dict[str, Any]], archetype: str, objective: str | None) -> dict[str, Any]:
        if not history:
            return {
                "source": "NO_PAID_HISTORY",
                "learning_ready": False,
                "sample_size": 0,
                "message": "Chưa có campaign result thật; hệ thống chỉ recommend test nhỏ.",
            }

        related = [
            row for row in history
            if (not archetype or row.get("archetype") == archetype)
            and (not objective or row.get("objective") == objective)
        ]
        if not related:
            related = [row for row in history if not archetype or row.get("archetype") == archetype]
        if not related:
            related = history

        by_archetype: dict[str, list[dict[str, Any]]] = defaultdict(list)
        by_objective: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for row in history:
            by_archetype[str(row.get("archetype") or "unknown")].append(row)
            by_objective[str(row.get("objective") or "unknown")].append(row)

        def rank_group(groups: dict[str, list[dict[str, Any]]], cost_key: str) -> list[dict[str, Any]]:
            ranked = []
            for name, rows in groups.items():
                ranked.append({
                    "name": name,
                    "sample_size": len(rows),
                    "success_rate": _avg(rows, "objective_success"),
                    "avg_cpv": _avg(rows, "CPV"),
                    "avg_cpf": _avg(rows, "CPF"),
                    "avg_ctr": _avg(rows, "CTR"),
                    "avg_cost": _avg(rows, cost_key),
                })
            return sorted(ranked, key=lambda item: (-item["success_rate"], item["avg_cost"] or 999999))[:5]

        success_rate = _avg(related, "objective_success")
        sample_size = len(related)
        learning_ready = sample_size >= 5
        return {
            "source": "PAID_HISTORY",
            "learning_ready": learning_ready,
            "sample_size": sample_size,
            "objective_success_rate": success_rate,
            "avg_cpv": _avg(related, "CPV"),
            "avg_cpf": _avg(related, "CPF"),
            "avg_profile_cost": _avg(related, "cost_per_profile_view"),
            "avg_message_cost": _avg(related, "cost_per_message"),
            "avg_ctr": _avg(related, "CTR"),
            "best_archetypes": rank_group(by_archetype, "CPV"),
            "best_objectives": rank_group(by_objective, "CPV"),
            "weight_adjustments": {
                "paid_history_boost": 10 if learning_ready and success_rate >= 0.7 else 0,
                "retention_weight": 1.15 if learning_ready else 1.0,
                "conversion_weight": 1.2 if learning_ready and objective in ("MESSAGES", "PRODUCT_CLICKS", "SALES") else 1.0,
            },
        }


class ROIAttributionEngine:
    """Report real ROI only when conversion/revenue data is present."""

    def evaluate(self, video_data: dict[str, Any], paid_learning: dict[str, Any]) -> dict[str, Any]:
        spend = _num(video_data.get("ad_spend"), 0)
        revenue = _num(video_data.get("revenue"), 0)
        conversions = _num(video_data.get("conversions"), 0)
        if spend > 0 and (revenue > 0 or conversions > 0):
            return {
                "source": "ATTRIBUTED_CONVERSIONS",
                "spend": round(spend, 2),
                "revenue": round(revenue, 2),
                "roas": round(revenue / max(spend, 0.01), 3),
                "conversions": int(conversions),
                "paid_history_success_rate": paid_learning.get("objective_success_rate", 0),
            }
        return {
            "source": "MISSING_ATTRIBUTION",
            "roas": None,
            "message": "Chưa có Ads API/Pixel/Shopify conversion nên không dự báo ROAS chắc chắn.",
        }


class AutonomousBudgetAllocator:
    """Safe budget action suggestions. Does not auto-spend without verified paid history."""

    def recommend(
        self,
        decision: dict[str, Any],
        retention_truth: dict[str, Any],
        learning: dict[str, Any],
        fatigue: dict[str, Any],
        roi: dict[str, Any],
    ) -> dict[str, Any]:
        action = decision.get("action")
        can_scale = bool((decision.get("source_reliability") or {}).get("can_scale_strong"))
        rules: list[str] = []
        budget = decision.get("budgetPlan") or {}

        if retention_truth.get("scale_signal") == "BLOCK_SCALE":
            rules.append("RETENTION_BLOCK_SCALE")
            return {"mode": "KILL_OR_FIX", "recommended_daily_budget": 0, "rules": rules}
        if fatigue.get("risk") == "HIGH":
            rules.append("CREATIVE_FATIGUE_BLOCK_SCALE")
            return {"mode": "HOLD_OR_ROTATE_CREATIVE", "recommended_daily_budget": budget.get("dailyBudgetMin", 0), "rules": rules}
        if roi.get("roas") is not None and roi["roas"] < 1:
            rules.append("ROAS_NEGATIVE")
            return {"mode": "KILL_TEST", "recommended_daily_budget": 0, "rules": rules}
        if action == "SCALE" and can_scale and learning.get("learning_ready"):
            rules.append("PAID_HISTORY_VERIFIED_SCALE")
            return {
                "mode": "CONTROLLED_SCALE",
                "recommended_daily_budget": int(max(_num(budget.get("dailyBudgetMin"), 0) * 1.25, _num(budget.get("dailyBudgetMax"), 0))),
                "rules": rules,
            }

        rules.append("SAFE_SMALL_TEST")
        return {
            "mode": "SAFE_TEST_ONLY",
            "recommended_daily_budget": int(min(max(_num(budget.get("dailyBudgetMin"), 50_000), 50_000), 100_000)),
            "rules": rules,
        }


class WhyScaleEngine:
    """Generate concise evidence-backed explanation strings."""

    def explain(
        self,
        retention_truth: dict[str, Any],
        comment_psychology: dict[str, Any],
        audio_momentum: dict[str, Any],
        fatigue: dict[str, Any],
        learning: dict[str, Any],
    ) -> dict[str, list[str]]:
        scale_reasons = [
            f"Retention 3s: {retention_truth.get('retention_3s', 0)}% ({retention_truth.get('source')}).",
            f"Comment buying intent: {comment_psychology.get('buying_intent_score', 0)}/100.",
            f"Audio momentum: {audio_momentum.get('momentum_status')}.",
        ]
        failure_risks = []
        if retention_truth.get("scale_signal") == "BLOCK_SCALE":
            failure_risks.append(retention_truth.get("reason"))
        if comment_psychology.get("negative_intent_score", 0) >= 50:
            failure_risks.append("Comment sentiment có rủi ro tiêu cực.")
        if fatigue.get("risk") == "HIGH":
            failure_risks.append(fatigue.get("reason"))
        if not learning.get("learning_ready"):
            failure_risks.append("Chưa đủ paid history để scale tự động.")
        return {
            "why_this_video_can_scale": [reason for reason in scale_reasons if reason],
            "failure_prediction": [risk for risk in failure_risks if risk],
        }


class BanditPolicyEngine:
    """Bandit contract for future budget allocation, with deterministic safe output for v1."""

    def propose(self, history: list[dict[str, Any]], candidates: list[dict[str, Any]]) -> dict[str, Any]:
        if len(history) < 30:
            return {
                "policy": "SAFE_EXPLORATION",
                "algorithm": "contextual_bandit_contract",
                "ready": False,
                "reason": "Cần tối thiểu 30 campaign result thật trước khi dùng bandit allocation.",
                "allocation": [],
            }
        objective_counts = Counter(str(row.get("objective") or "unknown") for row in history)
        allocation = []
        for candidate in candidates[:6]:
            objective = str(candidate.get("objective") or "VIDEO_VIEWS")
            prior = objective_counts.get(objective, 1)
            allocation.append({
                "video_id": candidate.get("video_id"),
                "objective": objective,
                "exploration_weight": round(1 / max(prior, 1), 4),
            })
        return {
            "policy": "THOMPSON_SAMPLING_READY",
            "algorithm": "contextual_bandit_contract",
            "ready": True,
            "allocation": allocation,
        }


class RetentionTimelineDiagnosisEngine:
    """Explain where viewers likely drop and what to fix."""

    def diagnose(self, video_data: dict[str, Any], predicted: dict[str, Any], has_private: bool) -> dict[str, Any]:
        curve = video_data.get("retention_curve") or predicted.get("retention_curve") or []
        points: list[dict[str, Any]] = []
        if isinstance(curve, list) and curve:
            for point in curve:
                if not isinstance(point, dict):
                    continue
                second = int(_num(point.get("second"), 0))
                if second in (0, 1, 3, 5, 8):
                    points.append({
                        "second": second,
                        "retention": round(_num(point.get("retention"), 0), 2),
                        "event": point.get("event") or "",
                    })
        if not points:
            points = [
                {"second": 0, "retention": 100, "event": "Start"},
                {"second": 1, "retention": round(_num(video_data.get("retention_1s"), 0), 2), "event": "1s hold"},
                {"second": 3, "retention": round(_num(video_data.get("retention_3s"), _num(predicted.get("retention_at_3s"), 0)), 2), "event": "3s hold"},
                {"second": 5, "retention": round(_num(predicted.get("retention_at_5s"), 0), 2), "event": "5s hold"},
                {"second": 8, "retention": round(_num(predicted.get("predicted_completion_rate"), 0), 2), "event": "late hold"},
            ]

        biggest_drop = {"window": "unknown", "drop_pct": 0.0}
        for prev, current in zip(points, points[1:]):
            drop = _num(prev.get("retention"), 0) - _num(current.get("retention"), 0)
            if drop > biggest_drop["drop_pct"]:
                biggest_drop = {"window": f"{prev.get('second')}-{current.get('second')}s", "drop_pct": round(drop, 2)}

        if biggest_drop["window"] == "0-1s":
            diagnosis = "Viewer collapse ngay giay dau; hook/first frame chua du ro."
            fix = "Dua outfit/ket qua/diem to mo vao frame dau, bo intro cham."
        elif biggest_drop["window"] == "1-3s":
            diagnosis = "Hook co mo dau nhung thieu payoff nhanh trong 3 giay dau."
            fix = "Them chuyen dong, reveal hoac text promise ro truoc giay 3."
        elif biggest_drop["window"] in ("3-5s", "5-8s"):
            diagnosis = "Phan than video mat nhip sau hook."
            fix = "Rut ngan doan lap, tang nhip cat va dua CTA som hon."
        else:
            diagnosis = "Chua du retention timeline that de xac dinh diem roi."
            fix = "Can private analytics retention curve de ket luan chac hon."

        return {
            "source": "PRIVATE_ANALYTICS" if has_private else "HEURISTIC_PREDICTION",
            "points": points,
            "biggest_drop": biggest_drop,
            "diagnosis": diagnosis,
            "fix": fix,
        }


class CommentEmotionEngine:
    """Cluster comment psychology beyond buying/negative intent."""

    CLUSTERS = {
        "aspiration": ("xinh", "dep", "gu", "style", "me", "uoc"),
        "envy": ("body", "dang", "eo", "chan dai"),
        "comfort": ("de mac", "hop", "di choi", "cafe"),
        "trust": ("xin link", "review", "shop", "mua", "size", "chat"),
        "cringe": ("cringe", "nham", "ao", "xau"),
    }

    def analyze(self, video_data: dict[str, Any]) -> dict[str, Any]:
        text = " ".join([
            str(video_data.get("title") or ""),
            str(video_data.get("description") or ""),
            " ".join(str(tag) for tag in video_data.get("hashtags", []) or []),
            " ".join(str(comment) for comment in video_data.get("comment_samples", []) or []),
        ]).lower()
        clusters = {name: sum(1 for term in terms if term in text) for name, terms in self.CLUSTERS.items()}
        dominant = max(clusters, key=clusters.get) if any(clusters.values()) else "unknown"
        return {
            "source": "COMMENT_SAMPLES" if video_data.get("comment_samples") else "TEXT_AND_PUBLIC_COUNTS",
            "dominant_emotion": dominant,
            "emotion_clusters": clusters,
        }


class FrameVisualAIContract:
    """Frame-level visual AI adapter contract. Uses explicit fallback until CV stack is wired."""

    def analyze(self, video_data: dict[str, Any], content_features: dict[str, Any]) -> dict[str, Any]:
        if video_data.get("frame_analysis"):
            return {"source": "FRAME_LEVEL_CV", **video_data["frame_analysis"]}
        product_visibility = _num(content_features.get("product_visibility"), 0)
        motion = _num(content_features.get("motion_intensity"), 0)
        face = _num(content_features.get("face_visibility"), 0)
        estimated_reveal = 0.9 if product_visibility >= 0.7 else 2.5
        return {
            "source": "HEURISTIC_CONTRACT",
            "ready": False,
            "outfit_reveal_second": estimated_reveal,
            "motion_velocity_score": int(min(100, motion * 100)),
            "face_proximity_score": int(min(100, face * 100)),
            "mirror_shot_likelihood": int(75 if "mirror" in str(video_data.get("title", "")).lower() else 45),
            "warning": "Chua co CLIP/OpenCV/MediaPipe frame extraction; visual AI dang dung heuristic contract.",
        }


class WinnerDNAEngine:
    """Build winner DNA from user's historical top performers and score similarity."""

    def build_channel_dna(self, videos: list[dict[str, Any]]) -> dict[str, Any]:
        if not videos:
            return {"ready": False, "sample_size": 0, "patterns": []}
        ranked = sorted(videos, key=lambda video: _num(video.get("views"), 0), reverse=True)
        winners = ranked[: max(3, min(10, len(ranked) // 5 or 3))]
        hashtag_counts: Counter[str] = Counter()
        archetype_counts: Counter[str] = Counter()
        for video in winners:
            hashtag_counts.update(str(tag).lower() for tag in video.get("hashtags", []) or [])
            strategy = video.get("aiStrategy") or {}
            archetype = (
                ((strategy.get("creator_archetype") or {}).get("primary"))
                or ((strategy.get("strategy_match") or {}).get("matched_archetype"))
                or "unknown"
            )
            archetype_counts[str(archetype)] += 1
        return {
            "ready": len(winners) >= 3,
            "sample_size": len(winners),
            "top_hashtags": [item[0] for item in hashtag_counts.most_common(8)],
            "dominant_archetypes": [item[0] for item in archetype_counts.most_common(5)],
            "patterns": [
                "So sanh video moi voi hashtag/archetype thang lich su cua kenh.",
                "Uu tien video co retention va profile/follower pull vuot nhom winner.",
            ],
        }

    def score_video(self, video_data: dict[str, Any], winner_dna: dict[str, Any]) -> dict[str, Any]:
        if not winner_dna.get("ready"):
            return {"ready": False, "similarity_score": 0, "reason": "Chua du winner lich su de xay DNA kenh."}
        hashtags = {str(tag).lower() for tag in video_data.get("hashtags", []) or []}
        winner_tags = set(winner_dna.get("top_hashtags") or [])
        tag_overlap = len(hashtags & winner_tags) / max(len(winner_tags), 1)
        score = int(min(100, 35 + tag_overlap * 45))
        return {
            "ready": True,
            "similarity_score": score,
            "matched_hashtags": sorted(hashtags & winner_tags)[:6],
            "reason": "Video khop DNA winner lich su cua kenh." if score >= 65 else "Video chua khop manh voi DNA winner lich su.",
        }


class PortfolioOptimizationEngine:
    """Prevent over-allocating Top 6 budget to duplicated archetypes/objectives."""

    def optimize(self, videos: list[dict[str, Any]], final_mix: list[dict[str, Any]]) -> dict[str, Any]:
        by_id = {str(video.get("id")): video for video in videos}
        archetype_counts: Counter[str] = Counter()
        objective_counts: Counter[str] = Counter()
        warnings: list[str] = []
        for item in final_mix:
            video = by_id.get(str(item.get("video_id"))) or {}
            strategy = video.get("aiStrategy") or {}
            archetype = (
                ((strategy.get("creator_archetype") or {}).get("primary"))
                or ((strategy.get("strategy_match") or {}).get("matched_archetype"))
                or "unknown"
            )
            objective = str(item.get("objective") or "unknown")
            archetype_counts[str(archetype)] += 1
            objective_counts[objective] += 1

        for archetype, count in archetype_counts.items():
            if archetype != "unknown" and count >= 3:
                warnings.append(f"Top 6 co {count} video cung archetype '{archetype}', de tu canh tranh audience.")
        for objective, count in objective_counts.items():
            if objective != "unknown" and count >= 4:
                warnings.append(f"Objective {objective} chiem {count}/6 slot; nen phan bo them profile/view/follower.")

        return {
            "archetype_distribution": dict(archetype_counts),
            "objective_distribution": dict(objective_counts),
            "self_competition_risk": "HIGH" if warnings else "LOW",
            "warnings": warnings,
        }


class EvolutionaryMemoryEngine:
    """Track cross-video pattern evolution inside a channel."""

    def analyze(self, videos: list[dict[str, Any]]) -> dict[str, Any]:
        if len(videos) < 6:
            return {
                "ready": False,
                "message": "Can toi thieu 6 video de phan tich tien hoa pattern.",
                "rising_patterns": [],
                "fatiguing_patterns": [],
            }

        midpoint = max(1, len(videos) // 2)
        recent = videos[:midpoint]
        older = videos[midpoint:]

        def bucket(rows: list[dict[str, Any]]) -> dict[str, float]:
            grouped: dict[str, list[float]] = defaultdict(list)
            for video in rows:
                strategy = video.get("aiStrategy") or {}
                archetype = (
                    ((strategy.get("creator_archetype") or {}).get("primary"))
                    or ((strategy.get("strategy_match") or {}).get("matched_archetype"))
                    or "unknown"
                )
                grouped[str(archetype)].append(_num(video.get("views"), 0))
            return {name: sum(values) / max(len(values), 1) for name, values in grouped.items()}

        recent_perf = bucket(recent)
        older_perf = bucket(older)
        rising = []
        fatigue = []
        for name, recent_avg in recent_perf.items():
            old_avg = older_perf.get(name)
            if not old_avg:
                continue
            change = ((recent_avg - old_avg) / max(old_avg, 1)) * 100
            item = {"pattern": name, "change_pct": round(change, 2), "recent_avg_views": round(recent_avg, 2), "older_avg_views": round(old_avg, 2)}
            if change >= 15:
                rising.append(item)
            elif change <= -20:
                fatigue.append(item)

        return {
            "ready": True,
            "rising_patterns": sorted(rising, key=lambda item: item["change_pct"], reverse=True)[:5],
            "fatiguing_patterns": sorted(fatigue, key=lambda item: item["change_pct"])[:5],
            "recommendation": "Tang bien the cua pattern dang tang, giam lap lai pattern dang fatigue.",
        }


class NextContentStrategyEngine:
    """Suggest what to film next from winner DNA, gaps, and evolution."""

    def generate(
        self,
        winner_dna: dict[str, Any],
        portfolio: dict[str, Any],
        evolution: dict[str, Any],
        channel_niche: str,
    ) -> dict[str, Any]:
        top_tags = winner_dna.get("top_hashtags") or []
        dominant = winner_dna.get("dominant_archetypes") or []
        rising = evolution.get("rising_patterns") or []
        fatigue = evolution.get("fatiguing_patterns") or []
        avoid = [item.get("pattern") for item in fatigue[:3]]

        ideas = [
            {
                "title": "Outfit reveal trong 1 giay dau",
                "hook": "Bo nay mac len hack dang nhu the nao?",
                "format": "mirror reveal + full-body shot + close-up chat lieu",
                "why": "Khớp Winner DNA và giải quyết retention drop 1-3s bằng payoff nhanh.",
            },
            {
                "title": "Before/after outfit transformation",
                "hook": "Cung mot chiec ao nhung phoi 2 vibe khac nhau",
                "format": "before/after transition, text overlay ro CTA save",
                "why": "Tạo replay và profile pull tốt hơn video outfit tĩnh.",
            },
            {
                "title": "Outdoor natural light outfit",
                "hook": "Set nay ra nang len mau rat xinh",
                "format": "outdoor sunlight, close camera framing, 2-3 goc quay",
                "why": "Mở rộng biến thể creative để giảm fatigue archetype trong Top 6.",
            },
        ]
        if rising:
            ideas.insert(0, {
                "title": f"Bien the moi cua pattern dang tang: {rising[0].get('pattern')}",
                "hook": "Thu cong thuc dang len nay voi outfit moi",
                "format": "giu khung pattern thang, doi bo do/audio/CTA",
                "why": f"Pattern nay dang tang {rising[0].get('change_pct')}% so voi nhom cu.",
            })

        return {
            "niche": channel_niche,
            "source": "WINNER_DNA_AND_EVOLUTIONARY_MEMORY" if winner_dna.get("ready") else "HEURISTIC_CONTENT_STRATEGY",
            "top_winner_tags": top_tags[:6],
            "dominant_winner_archetypes": dominant[:3],
            "avoid_patterns": avoid,
            "portfolio_risk": portfolio.get("self_competition_risk"),
            "ideas": ideas[:5],
        }


class CreativeCenterIngestionContract:
    """Contract for future TikTok Creative Center ingestion."""

    def summarize(self, niche: str) -> dict[str, Any]:
        return {
            "source": "NOT_CONNECTED",
            "ready": False,
            "niche": niche,
            "required_inputs": [
                "trending_sounds",
                "sound_usage_growth",
                "hashtag_decay",
                "creator_overlap",
                "cpm_volatility",
            ],
            "message": "Chua ket noi TikTok Creative Center; sound/hashtag market intelligence van la heuristic.",
        }
