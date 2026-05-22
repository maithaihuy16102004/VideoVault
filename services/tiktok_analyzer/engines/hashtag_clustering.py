"""
HashtagClusteringEngine — Phase 3
Classifies hashtags into 5 strategic tiers and calculates saturation scores.

Fashion TikTok CANNOT just use #fyp #viral.
It needs layered hashtag strategy:
    - Discovery: Broad reach (#ootd, #fashion)
    - Niche: Targeted audience (#ulzzangstyle, #minimalfit)
    - Identity: Community building (#softgirlvn, #fashiontiktokvn)
    - Trend: Algorithm riding (#officesiren, #coquette)
    - Commercial: Purchase intent (#reviewdo, #maudo)
"""
import re
from typing import Dict, Any, List


class HashtagClusteringEngine:
    """
    Classifies hashtags into strategic tiers for TikTok growth.
    In production, this would use sentence-transformers + FAISS + HDBSCAN.
    For MVP, uses curated keyword databases for Vietnamese fashion niche.
    """

    # Curated hashtag databases by tier (Vietnamese fashion focused)
    TIER_PATTERNS = {
        "discovery": {
            "keywords": [
                "ootd", "outfit", "fashion", "style", "thoitrang",
                "phoidoxinh", "phoidonu", "phoidonam", "streetstyle",
                "fashiontiktok", "outfitoftheday", "lookbook",
            ],
            "purpose": "Mở rộng reach đến audience mới",
            "weight": 0.15,
        },
        "niche": {
            "keywords": [
                "ulzzangstyle", "minimalfit", "koreanstyle", "japanesestyle",
                "vintagefit", "casualstyle", "elegantlook", "dailyoutfit",
                "workwear", "coffeestyle", "henstylevn", "phoidodihoc",
                "phoidodicafe", "phoidodilamcung", "outfitmuadong",
                "outfitmuahe", "vaybody", "vaycroptopcute",
            ],
            "purpose": "Đúng audience mục tiêu",
            "weight": 0.30,
        },
        "identity": {
            "keywords": [
                "softgirlvn", "fashiontiktokvn", "ootdvn", "thoitrangvn",
                "reviewdovn", "phoidovietnam", "stylevn", "beautyvn",
                "tiktokvietnam", "genvn", "genzvn",
            ],
            "purpose": "Xây dựng cộng đồng & brand identity",
            "weight": 0.20,
        },
        "trend": {
            "keywords": [
                "officesiren", "coquette", "cleangirl", "oldmoney",
                "quietluxury", "mobwife", "balletcore", "coastalgrandmother",
                "tenniscore", "blokecore", "darkacademia", "lightacademia",
                "cottagecore", "fairycore", "grunge", "y2k",
                "slaygirl", "douyin", "xiaohongshu",
            ],
            "purpose": "Ăn thuật toán theo trend cycle",
            "weight": 0.25,
        },
        "commercial": {
            "keywords": [
                "reviewdo", "maudo", "shopee", "lazada", "tiktokshop",
                "muasam", "giamgia", "sale", "deal", "recommend",
                "musthave", "affiliate", "linkinbio", "whattobuy",
            ],
            "purpose": "Tăng tỷ lệ mua hàng & conversion",
            "weight": 0.10,
        },
    }

    # Saturated tags that reduce algorithmic boost
    SATURATED_TAGS = {
        "fyp", "foryou", "foryoupage", "viral", "xuhuong",
        "viralvideo", "trending", "trend", "hot", "fypシ",
        "tiktok", "tiktokviral", "fypdongggggg",
    }

    def classify_hashtags(self, hashtags: List[str]) -> Dict[str, Any]:
        """
        Classify a list of hashtags into strategic tiers.
        Returns tier distribution, saturation warnings, and recommendations.
        """
        if not hashtags:
            return self._empty_result()

        # Normalize hashtags
        cleaned = [re.sub(r'^#', '', h.lower().strip()) for h in hashtags if h]

        tier_counts = {tier: 0 for tier in self.TIER_PATTERNS}
        tier_tags = {tier: [] for tier in self.TIER_PATTERNS}
        saturated_count = 0
        saturated_tags = []
        unclassified = []

        for tag in cleaned:
            classified = False

            # Check saturation first
            if tag in self.SATURATED_TAGS:
                saturated_count += 1
                saturated_tags.append(tag)
                classified = True
                continue

            # Classify into tiers
            for tier, config in self.TIER_PATTERNS.items():
                for keyword in config["keywords"]:
                    if keyword in tag or tag in keyword:
                        tier_counts[tier] += 1
                        tier_tags[tier].append(tag)
                        classified = True
                        break
                if classified:
                    break

            if not classified:
                unclassified.append(tag)

        total = len(cleaned)
        total_safe = max(total, 1)

        # Calculate tier distribution
        distribution = {}
        for tier in self.TIER_PATTERNS:
            distribution[tier] = {
                "count": tier_counts[tier],
                "percentage": round(tier_counts[tier] / total_safe * 100, 1),
                "tags": tier_tags[tier],
                "purpose": self.TIER_PATTERNS[tier]["purpose"],
            }

        # Saturation score (0 = clean, 1 = all saturated)
        saturation_score = round(saturated_count / total_safe, 2)

        # Strategy health score
        # Ideal mix: niche(30%) + trend(25%) + identity(20%) + discovery(15%) + commercial(10%)
        ideal_weights = {tier: self.TIER_PATTERNS[tier]["weight"] for tier in self.TIER_PATTERNS}
        actual_weights = {tier: tier_counts[tier] / total_safe for tier in self.TIER_PATTERNS}

        balance_penalty = sum(
            abs(ideal_weights[t] - actual_weights[t]) for t in self.TIER_PATTERNS
        )
        strategy_score = round(max(0, min(100, (1 - balance_penalty) * 100 - saturation_score * 30)), 1)

        # Generate recommendations
        recommendations = self._generate_recommendations(
            tier_counts, saturated_count, total, distribution
        )

        return {
            "total_hashtags": total,
            "distribution": distribution,
            "saturated_tags": saturated_tags,
            "saturation_score": saturation_score,
            "unclassified_tags": unclassified,
            "strategy_score": strategy_score,
            "recommendations": recommendations,
            "model_version": "3.0-curated-db",
        }

    def _generate_recommendations(
        self, tier_counts: Dict, saturated_count: int, total: int, distribution: Dict
    ) -> List[str]:
        recs = []
        if saturated_count > 2:
            recs.append(f"⚠️ Bỏ {saturated_count} tag bão hòa (#fyp, #viral...) — chúng KHÔNG giúp reach")
        if tier_counts["niche"] == 0:
            recs.append("🎯 Thêm hashtag niche: #phoidodihoc, #minimalfit, #ulzzangstyle")
        if tier_counts["trend"] == 0:
            recs.append("🔥 Thêm hashtag trend: #officesiren, #coquette, #softgirlvn")
        if tier_counts["identity"] == 0:
            recs.append("🏠 Thêm hashtag identity: #ootdvn, #fashiontiktokvn, #stylevn")
        if tier_counts["commercial"] == 0 and total > 5:
            recs.append("💰 Thêm hashtag thương mại: #reviewdo, #tiktokshop, #linkinbio")
        if not recs:
            recs.append("✅ Hashtag strategy cân bằng — tiếp tục giữ mix hiện tại")
        return recs

    def _empty_result(self) -> Dict[str, Any]:
        return {
            "total_hashtags": 0,
            "distribution": {},
            "saturated_tags": [],
            "saturation_score": 0.0,
            "unclassified_tags": [],
            "strategy_score": 0,
            "recommendations": ["⚠️ Không có hashtag — thêm 5-8 hashtag chiến lược"],
            "model_version": "3.0-curated-db",
        }
