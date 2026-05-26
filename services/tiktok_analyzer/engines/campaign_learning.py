from __future__ import annotations

import json
from pathlib import Path
from typing import Any


class CampaignLearningLoop:
    """Persist paid campaign results and expose lightweight archetype learnings."""

    def __init__(self, store_path: str | Path = "campaign_learning.json") -> None:
        self.store_path = Path(store_path)

    def record(self, result: dict[str, Any]) -> dict[str, Any]:
        result = self._normalize_result(result)
        history = self._load()
        history.append(result)
        self.store_path.parent.mkdir(parents=True, exist_ok=True)
        self.store_path.write_text(json.dumps(history[-1000:], ensure_ascii=False, indent=2), encoding="utf-8")
        return {"saved": True, "history_count": len(history[-1000:])}

    def summarize(self, archetype: str | None = None) -> dict[str, Any]:
        history = self._load()
        if archetype:
            history = [row for row in history if row.get("archetype") == archetype]

        if not history:
            return {
                "paid_history_ready": False,
                "sample_size": 0,
                "message": "No paid campaign history yet.",
            }

        def avg(key: str) -> float:
            vals = [float(row.get(key) or 0) for row in history if row.get(key) is not None]
            return round(sum(vals) / max(len(vals), 1), 4)

        return {
            "paid_history_ready": len(history) >= 5,
            "sample_size": len(history),
            "avg_cpv": avg("CPV"),
            "avg_cpf": avg("CPF"),
            "avg_cost_per_profile_view": avg("cost_per_profile_view"),
            "avg_cost_per_message": avg("cost_per_message"),
            "avg_ctr": avg("CTR"),
            "objective_success_rate": avg("objective_success"),
        }

    def history(self, limit: int = 1000) -> list[dict[str, Any]]:
        """Return recent paid campaign truth rows for downstream learning engines."""
        return self._load()[-limit:]

    def _load(self) -> list[dict[str, Any]]:
        if not self.store_path.exists():
            return []
        try:
            data = json.loads(self.store_path.read_text(encoding="utf-8"))
            return data if isinstance(data, list) else []
        except Exception:
            return []

    @staticmethod
    def _normalize_result(result: dict[str, Any]) -> dict[str, Any]:
        normalized = dict(result)
        aliases = {
            "cpf": "CPF",
            "cpv": "CPV",
            "ctr": "CTR",
            "costPerProfileView": "cost_per_profile_view",
            "cost_per_profile": "cost_per_profile_view",
            "costPerMessage": "cost_per_message",
            "objectiveSuccess": "objective_success",
            "watchTime": "watch_time",
            "avgWatchTime": "watch_time",
        }
        for src, dst in aliases.items():
            if src in normalized and dst not in normalized:
                normalized[dst] = normalized[src]

        spend = float(normalized.get("spend") or normalized.get("budget") or 0)
        views = float(normalized.get("views") or 0)
        followers = float(normalized.get("followers") or normalized.get("follows") or 0)
        messages = float(normalized.get("messages") or 0)
        profile_views = float(normalized.get("profile_views") or normalized.get("profileViews") or 0)
        if spend > 0 and views > 0 and not normalized.get("CPV"):
            normalized["CPV"] = round(spend / views, 4)
        if spend > 0 and followers > 0 and not normalized.get("CPF"):
            normalized["CPF"] = round(spend / followers, 4)
        if spend > 0 and profile_views > 0 and not normalized.get("cost_per_profile_view"):
            normalized["cost_per_profile_view"] = round(spend / profile_views, 4)
        if spend > 0 and messages > 0 and not normalized.get("cost_per_message"):
            normalized["cost_per_message"] = round(spend / messages, 4)

        if "objective_success" not in normalized:
            objective = str(normalized.get("objective") or "").upper()
            if objective == "FOLLOWERS":
                normalized["objective_success"] = 1 if followers > 0 and (not normalized.get("CPF") or float(normalized["CPF"]) <= 1500) else 0
            elif objective in ("MESSAGES", "PRODUCT_CLICKS", "SALES"):
                normalized["objective_success"] = 1 if messages > 0 or float(normalized.get("conversions") or 0) > 0 else 0
            elif objective == "PROFILE_VIEWS":
                normalized["objective_success"] = 1 if profile_views > 0 else 0
            else:
                normalized["objective_success"] = 1 if views >= 1000 else 0
        return normalized
