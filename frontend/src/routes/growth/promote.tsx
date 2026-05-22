import React, { useState, useCallback, useMemo, useEffect, useRef, memo } from 'react';
import { createPortal } from 'react-dom';
import {
    Megaphone, Search, TrendingUp, Eye, Heart, MessageCircle,
    Play, Sparkles, ChevronRight, X, Check, Zap,
    Clock, UserPlus, FileText,
    Crown, Target, DollarSign, AlertCircle, Share2,
    ArrowUpRight, ArrowDownRight, RefreshCw, ChevronDown,
    ShoppingBag, Users, Link2, Video,
    Activity, Bookmark, ExternalLink, Copy, CheckCircle2,
    Timer, Wifi
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';

// ─── Types ───────────────────────────────────────────────────────────
type PromoteGoal = 'engagement' | 'views' | 'followers' | 'profile' | 'sales';
type TabKey = 'all' | 'recommended' | 'history';
type LinkType = 'video' | 'channel' | 'unknown';
type Phase = 'input' | 'analyzing' | 'results';

interface AnalysisConfidence {
    score: number;
    level: 'HIGH' | 'MEDIUM' | 'LOW';
    reason: string;
}

interface FailureDiagnosis {
    primary_reason: string;
    secondary_reason: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface PromoteDecision {
    financial_metrics: {
        budget_usd: number;
        effective_cpm: number;
        cost_per_follower: number;
    };
    expected_outcomes: {
        total_views: { low: number, expected: number, high: number };
        followers_gained: { low: number, expected: number, high: number };
        organic_spillover_views: number;
    };
    amplification_effect: {
        multiplier: number;
        status: string;
    };
    decision: {
        should_promote: boolean;
        verdict: string;
        risk_level: string;
    };
}

interface PromotionScorePack {
    organicPotential: number;
    viewBoost: number;
    followerGrowth: number;
    profilePull: number;
    salesIntent: number;
    risk: number;
    dataConfidence?: number;
    conversionConfidence?: number;
    creativeConfidence?: number;
}

interface PromotionBudgetPlan {
    dailyBudgetMin: number;
    dailyBudgetMax: number;
    durationDays: number;
    scaleRule: string;
}

interface PromotionStopCondition {
    metric: string;
    operator: '>' | '<' | '>=' | '<=';
    value: number;
    windowHours: number;
    action: 'PAUSE' | 'REDUCE_BUDGET' | 'CHANGE_OBJECTIVE';
}

interface PromotionDataQuality {
    trustLevel: string;
    maxAllowedAction: string;
    blockedObjectives: string[];
    has_private_conversion_data: boolean;
    uses_estimated_conversion_metrics: boolean;
}

interface OrganicVerdict {
    rank: 'WEAK' | 'NORMAL' | 'STRONG' | 'VIRAL' | 'BREAKOUT';
    relativeViews: number;
    relativeEngagement: number;
    reasons: string[];
}

interface PromotionRiskBreakdown {
    dataRisk: number;
    creativeRisk: number;
    moneyRisk: number;
    objectiveMismatchRisk: number;
}

interface PromotionDecision {
    videoId: string;
    action: 'SCALE' | 'TEST_SMALL' | 'FIX_CREATIVE_FIRST' | 'DO_NOT_PROMOTE' | 'NEED_PRIVATE_ANALYTICS';
    objective: string | null;
    confidence: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    scores: PromotionScorePack;
    organicVerdict?: OrganicVerdict;
    riskBreakdown?: PromotionRiskBreakdown;
    budgetPlan: PromotionBudgetPlan;
    stopConditions: PromotionStopCondition[];
    reasons: string[];
    reasonCodes?: string[];
    warnings: string[];
    requiredFixesBeforePromote: string[];
    confidenceBreakdown?: {
        data: number;
        sampleSize: number;
        creative: number;
        conversion: number;
    };
    confidenceExplanation?: string;
    tiktokPromoteSetup?: {
        tab: string;
        option: string;
        package: string;
        instruction: string;
    } | null;
    dataQuality: PromotionDataQuality;
    llmExplanation: string;
}

interface CreatorArchetype {
    primary: string;
    confidence: number;
    description: string;
}

interface HashtagStrategy {
    strategy_score: number;
    saturation_score: number;
    distribution: Record<string, number>;
    recommendations: string[];
}

interface TrendIntelligence {
    alignment_score: number;
    active_trends: Array<{tag: string, stage: string, emoji: string, action: string}>;
    recommendations: string[];
}

interface DriftMonitoring {
    drift_detected: boolean;
    severity: string;
    signals: string[];
    metrics: Record<string, number>;
    recommendation: string;
}

interface SeriesPotential {
    score: number;
    reason: string;
}

interface ContentDNA {
    primary_style: string;
    emotion_trigger: string;
    content_pillar: string;
    editing_style: string;
    cta_style: string;
    creator_persona: string;
}

// vNext Ultimate interfaces
interface RetentionPoint {
    second: number;
    retention: number;
    event: string;
}

interface DropAnalysis {
    biggest_drop_window: string;
    estimated_drop_pct: number;
    reason: string;
    fix: string;
}

interface VoiceAnalysis {
    voice_energy: 'HIGH' | 'MEDIUM' | 'LOW';
    speaking_speed: 'FAST' | 'NORMAL' | 'SLOW' | 'TOO SLOW';
    emotion_intensity: 'HIGH' | 'MEDIUM' | 'LOW';
    audio_hook_strength: number;
    assessment: string;
}

interface VisualAnalysis {
    visual_hook_strength: number;
    subtitle_quality: 'STRONG' | 'MEDIUM' | 'WEAK' | 'NONE';
    motion_intensity: 'HIGH' | 'MEDIUM' | 'LOW' | 'STATIC';
    visual_clarity: 'CLEAR' | 'CLUTTERED' | 'AVERAGE';
    assessment: string;
}

interface NextVideoIdea {
    title: string;
    hook: string;
    concept: string;
    format: string;
    editing_style: string;
}

interface AbTest {
    hook_a: string;
    hook_b: string;
    cta_a: string;
    cta_b: string;
    test_hypothesis: string;
}

interface AiStrategy {
    video_id: string;
    title: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    goal: PromoteGoal;
    overall_score: number;
    hook_score: number;
    retention_score: number;
    viral_score: number;
    conversion_score: number;
    scalability_score: number;
    promote_worthiness: number;
    // vNext scores
    first_3s_score?: number;
    scroll_stop_power?: string;
    replayability_score?: number;
    pacing_quality?: string;
    engagement_authenticity?: string;
    follower_conversion_probability?: string;
    sales_conversion_probability?: string;
    strengths: string[];
    weaknesses: string[];
    why_people_keep_watching: string;
    why_people_swipe_away: string;
    best_target_audience: string;
    estimated_growth_potential: string;
    ad_potential: string;
    recommended_actions: string[];
    final_verdict: string;
    // Enterprise v1 Features
    analysis_confidence: AnalysisConfidence;
    failure_diagnosis: FailureDiagnosis;
    promote_decision: PromoteDecision;
    promotion_decision?: PromotionDecision;
    organic_verdict?: OrganicVerdict;
    risk_breakdown?: PromotionRiskBreakdown;
    hook_rewrites: string[];
    series_potential: SeriesPotential;
    algorithm_risk: string[];
    // Enterprise vNext Ultimate Features
    retention_timeline?: RetentionPoint[];
    rewatch_spikes?: number[];
    scene_correlation?: Record<string, number>;
    drop_analysis?: DropAnalysis;
    viral_reasoning?: string[];
    voice_analysis?: VoiceAnalysis;
    visual_analysis?: VisualAnalysis;
    cta_rewrites?: string[];
    next_video_idea?: NextVideoIdea;
    ab_test?: AbTest;
    
    // Enterprise Phase 3-5 Outputs
    creator_archetype?: CreatorArchetype;
    hashtag_strategy?: HashtagStrategy;
    trend_intelligence?: TrendIntelligence;
    drift_monitoring?: DriftMonitoring;
    automation?: {
        recommended_actions: { type: string, action: string, impact: string }[];
        auto_promote_trigger: boolean;
        auto_kill_trigger: boolean;
        status: string;
    };
    
    // Phase 4: Creator Intelligence Upgrades
    attention_score?: number;
    conversion_metrics?: { follow_ctr: number; profile_ctr: number; product_ctr: number; is_estimated?: boolean; };
    ai_insight?: string;
    temporal_analytics?: { time: string; views: number; }[];
    patterns?: { visual: string; outfit: string; pose: string; audio: string; };
    promote_readiness?: { retention: string; product_visibility: string; cta_clarity: string; };
}

interface VideoData {
    id: string;
    title: string;
    thumbnail: string;
    views: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    postedAt: string;
    duration: string;
    retentionRate: number;
    engagementRate: number;
    shareRate: number;
    completionRate: number;
    aiScore: number;
    aiRecommended: boolean;
    aiStrategy: AiStrategy;
    privacy: string;
    targetViews: number;
    targetLikes: number;
    targetFollowers: number;
    prevViews?: number;
    prevLikes?: number;
    prevComments?: number;
    prevShares?: number;
}

interface ChannelInfo {
    username: string;
    displayName: string;
    avatar: string;
    followers: number;
    following: number;
    totalLikes: number;
    bio: string;
    videos: VideoData[];
    avgViews: number;
    medianViews?: number;
    avgEngagement: number;
    topHashtags: string[];
    growthRate: number;
    niche: string;
    type?: 'video' | 'channel';
    // Enterprise Features
    viral_patterns?: string[];
    content_dna?: ContentDNA;
    account_health?: {
        health_score: number;
        consistency_score: number;
        retention_stability: string;
        audience_profile: string;
        health_tier: string;
    };
}

interface PromotePack {
    id: string;
    range: string;
    unit: string;
    perDay: string;
    price: number;
    recommended?: boolean;
}

interface CampaignRecord {
    id: string;
    videoTitle: string;
    goal: string;
    status: 'running' | 'completed' | 'paused';
    spent: number;
    result: string;
    date: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────
const fmt = (n: number) => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return n.toLocaleString('vi-VN');
};
const fmtVND = (n: number) => n.toLocaleString('vi-VN') + 'đ';

const detectLinkType = (url: string): LinkType => {
    if (!url.includes('tiktok.com')) return 'unknown';
    if (url.includes('/video/') || url.includes('/photo/')) return 'video';
    if (url.match(/@[\w.]+/)) return 'channel';
    return 'unknown';
};

// ─── Color gradient lookup (avoids runtime string manipulation) ─────
const barGradients: Record<string, string> = {
    'text-blue-400': '#3b82f6, #06b6d4',
    'text-pink-400': '#ec4899, #f43f5e',
    'text-green-400': '#22c55e, #10b981',
    'text-purple-400': '#a855f7, #ec4899',
    'text-amber-400': '#f59e0b, #f97316',
};

// ─── Promote Packs ──────────────────────────────────────────────────
const promotePacksMap: Record<PromoteGoal, PromotePack[]> = {
    engagement: [
        { id: 'e1', range: '140 - 545', unit: 'lượt thích và bình luận', perDay: 'trong 1 ngày', price: 23000 },
        { id: 'e2', range: '244 - 948', unit: 'lượt thích và bình luận', perDay: 'trong 1 ngày', price: 40011, recommended: true },
        { id: 'e3', range: '428 - 1.66K', unit: 'lượt thích và bình luận', perDay: 'trong 1 ngày', price: 70019 },
    ],
    views: [
        { id: 'v1', range: '500 - 1.5K', unit: 'lượt xem video', perDay: 'trong 1 ngày', price: 23000 },
        { id: 'v2', range: '1K - 3K', unit: 'lượt xem video', perDay: 'trong 1 ngày', price: 40011, recommended: true },
        { id: 'v3', range: '2K - 6K', unit: 'lượt xem video', perDay: 'trong 1 ngày', price: 70019 },
    ],
    followers: [
        { id: 'f1', range: '50 - 200', unit: 'followers mới', perDay: 'trong 3 ngày', price: 46000 },
        { id: 'f2', range: '120 - 500', unit: 'followers mới', perDay: 'trong 3 ngày', price: 92000, recommended: true },
        { id: 'f3', range: '250 - 1K', unit: 'followers mới', perDay: 'trong 3 ngày', price: 184000 },
    ],
    sales: [
        { id: 's1', range: '200 - 800', unit: 'click giỏ hàng', perDay: 'trong 3 ngày', price: 50000 },
        { id: 's2', range: '500 - 2K', unit: 'click giỏ hàng', perDay: 'trong 3 ngày', price: 100000, recommended: true },
        { id: 's3', range: '1K - 5K', unit: 'click giỏ hàng', perDay: 'trong 7 ngày', price: 200000 },
    ],
    profile: [
        { id: 'p1', range: '300 - 1K', unit: 'lượt xem hồ sơ', perDay: 'trong 1 ngày', price: 23000 },
        { id: 'p2', range: '600 - 2K', unit: 'lượt xem hồ sơ', perDay: 'trong 1 ngày', price: 40011, recommended: true },
        { id: 'p3', range: '1K - 4K', unit: 'lượt xem hồ sơ', perDay: 'trong 1 ngày', price: 70019 },
    ],
};

const goalConfig: Record<PromoteGoal, { icon: React.ElementType; label: string; desc: string; color: string; gradient: string }> = {
    engagement: { icon: Heart, label: 'Tăng tương tác', desc: 'Thúc đẩy lượt thích & bình luận', color: 'text-pink-400', gradient: 'from-pink-500 to-rose-500' },
    views: { icon: Eye, label: 'Tăng lượt xem', desc: 'Phủ sóng rộng, tăng tiếp cận', color: 'text-blue-400', gradient: 'from-blue-500 to-cyan-500' },
    followers: { icon: UserPlus, label: 'Tăng follower', desc: 'Thu hút người theo dõi mới', color: 'text-green-400', gradient: 'from-green-500 to-emerald-500' },
    sales: { icon: ShoppingBag, label: 'Doanh thu (Shop)', desc: 'Tối ưu GMV & ROAS Shop', color: 'text-amber-400', gradient: 'from-amber-500 to-orange-500' },
    profile: { icon: FileText, label: 'Xem hồ sơ', desc: 'Kéo traffic về trang cá nhân', color: 'text-violet-400', gradient: 'from-violet-500 to-purple-500' },
};

const mockCampaignHistory: CampaignRecord[] = [
    { id: 'c1', videoTitle: '#ootd #douyin #phoidoxinh...', goal: 'Tăng tương tác', status: 'completed', spent: 40011, result: '+387 thích, +42 bình luận', date: '12/05/2026' },
    { id: 'c2', videoTitle: 'outfit đi chơi đi biển...', goal: 'Tăng lượt xem', status: 'running', spent: 23000, result: '+1.2K lượt xem (đang chạy)', date: '18/05/2026' },
];

// ─── Memoized Sub Components ────────────────────────────────────────

// Animated Counter — fixed: added cancelAnimationFrame cleanup
const AnimatedNumber = memo<{ value: number; duration?: number; className?: string; format?: (n: number) => string }>(
    ({ value, duration = 1200, className, format }) => {
    const [display, setDisplay] = useState(0);
    const prevRef = useRef(0);

    useEffect(() => {
        const start = prevRef.current;
        const diff = value - start;
        if (diff === 0) return;
        const startTime = performance.now();
        let rafId: number;

        const animate = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(start + diff * eased);
            setDisplay(current);
            if (progress < 1) rafId = requestAnimationFrame(animate);
            else prevRef.current = value;
        };
        rafId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(rafId);
    }, [value, duration]);

    return <span className={className}>{format ? format(display) : fmt(display)}</span>;
});
AnimatedNumber.displayName = 'AnimatedNumber';

// Circular AI Score
const CircularScore = memo<{ score: number; size?: number }>(({ score, size = 44 }) => {
    const radius = (size - 6) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;
    const color = score >= 70 ? '#22c55e' : score >= 40 ? '#eab308' : '#ef4444';

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                <motion.circle cx={size / 2} cy={size / 2} r={radius} fill="none"
                    stroke={color} strokeWidth="3" strokeLinecap="round"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold" style={{ color }}>{score}</span>
        </div>
    );
});
CircularScore.displayName = 'CircularScore';

// Strategy Badge
const StrategyBadge = memo<{ goal: PromoteGoal; small?: boolean }>(({ goal, small }) => {
    const cfg = goalConfig[goal];
    return (
        <span className={`inline-flex items-center gap-1 font-bold text-white rounded-lg bg-gradient-to-r ${cfg.gradient} shadow-lg ${small ? 'px-1.5 py-0.5 text-[8px]' : 'px-2 py-1 text-[10px]'}`}>
            <cfg.icon size={small ? 9 : 11} />
            {cfg.label}
        </span>
    );
});
StrategyBadge.displayName = 'StrategyBadge';

// Metric Chip
const MetricChip = memo<{ label: string; value: string; impact: 'positive' | 'negative' | 'neutral' }>(({ label, value, impact }) => (
    <div className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] border ${
        impact === 'positive' ? 'bg-green-500/5 border-green-500/15 text-green-400' :
        impact === 'negative' ? 'bg-red-500/5 border-red-500/15 text-red-400' :
        'bg-white/[0.02] border-white/5 text-gray-400'
    }`}>
        <span className="text-gray-500">{label}</span>
        <span className="font-bold">{value}</span>
    </div>
));
MetricChip.displayName = 'MetricChip';

// Stat Card
const StatCard = memo<{ icon: React.ElementType; label: string; value: string; sub?: string; trend?: number; color?: string }>(
    ({ icon: Icon, label, value, sub, trend, color = 'text-primary' }) => (
    <div className="glass-card p-4 space-y-2 hover:border-white/10 transition-all">
        <div className="flex items-center justify-between">
            <div className="w-9 h-9 bg-white/5 rounded-xl flex items-center justify-center"><Icon size={16} className={color} /></div>
            {trend !== undefined && (
                <span className={`text-[10px] font-bold flex items-center gap-0.5 ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {trend >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}{Math.abs(trend)}%
                </span>
            )}
        </div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-lg font-bold">{value}</p>
        {sub && <p className="text-[10px] text-gray-600">{sub}</p>}
    </div>
));
StatCard.displayName = 'StatCard';

// Growth Progress Bar — optimized: uses barGradients lookup instead of string manipulation
const GrowthBar = memo<{ current: number; target: number; label: string; color: string; icon: React.ElementType }>(
    ({ current, target, label, color, icon: Icon }) => {
    const progress = Math.min((current / target) * 100, 100);
    const remaining = target - current;
    const gradient = barGradients[color] || '#a855f7, #ec4899';

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Icon size={13} className={color} />
                    <span className="text-xs text-gray-400">{label}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    <AnimatedNumber value={current} className="font-bold text-white" />
                    <span className="text-gray-600">/</span>
                    <span className="text-gray-500 font-medium">{fmt(target)}</span>
                    {remaining > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-white/5 rounded-full text-gray-500">
                            +{fmt(remaining)} còn lại
                        </span>
                    )}
                </div>
            </div>
            <div className="h-2.5 bg-white/5 rounded-full overflow-hidden relative">
                <motion.div
                    className="h-full rounded-full relative overflow-hidden"
                    style={{ background: `linear-gradient(90deg, ${gradient})` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1.5, ease: 'easeOut' }}
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                </motion.div>
                <div className="absolute top-0 right-0 h-full w-0.5 bg-white/20" />
            </div>
        </div>
    );
});
GrowthBar.displayName = 'GrowthBar';

// Live Pulse Indicator
const LivePulse = memo<{ active: boolean }>(({ active }) => (
    <div className="flex items-center gap-1.5">
        <span className="relative flex h-2.5 w-2.5">
            {active && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />}
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${active ? 'bg-green-400' : 'bg-gray-600'}`} />
        </span>
        <span className={`text-[10px] font-bold ${active ? 'text-green-400' : 'text-gray-600'}`}>
            {active ? 'LIVE' : 'OFFLINE'}
        </span>
    </div>
));
LivePulse.displayName = 'LivePulse';

// Trend Indicator
const TrendIndicator = memo<{ current: number; previous?: number }>(({ current, previous }) => {
    if (!previous || previous === current) return null;
    const diff = current - previous;
    const isUp = diff > 0;
    return (
        <motion.span
            initial={{ opacity: 0, y: isUp ? 5 : -5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${isUp ? 'text-green-400' : 'text-red-400'}`}
        >
            {isUp ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
            {isUp ? '+' : ''}{fmt(diff)}
        </motion.span>
    );
});
TrendIndicator.displayName = 'TrendIndicator';

// Shimmer Loading Skeleton
const ShimmerSkeleton = memo<{ className?: string }>(({ className = '' }) => (
    <div className={`relative overflow-hidden bg-white/5 rounded-lg ${className}`}>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent animate-shimmer" />
    </div>
));
ShimmerSkeleton.displayName = 'ShimmerSkeleton';

const actionStyles: Record<string, string> = {
    SCALE: 'bg-green-500/15 text-green-300 border-green-500/25',
    TEST_SMALL: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/25',
    FIX_CREATIVE_FIRST: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
    DO_NOT_PROMOTE: 'bg-red-500/15 text-red-300 border-red-500/25',
    NEED_PRIVATE_ANALYTICS: 'bg-blue-500/15 text-blue-300 border-blue-500/25',
};

const actionLabels: Record<string, string> = {
    SCALE: 'Tăng ngân sách',
    TEST_SMALL: 'Test nhỏ',
    FIX_CREATIVE_FIRST: 'Sửa creative trước',
    DO_NOT_PROMOTE: 'Không nên quảng bá',
    NEED_PRIVATE_ANALYTICS: 'Cần dữ liệu TikTok',
    NO_DECISION: 'Chưa có quyết định',
};

const objectiveLabels: Record<string, string> = {
    VIDEO_VIEWS: 'Lượt xem video',
    PROFILE_VIEWS: 'Lượt xem hồ sơ',
    FOLLOWERS: 'Tăng người theo dõi',
    MESSAGES: 'Tin nhắn',
    PRODUCT_CLICKS: 'Click sản phẩm',
    WEBSITE_TRAFFIC: 'Truy cập website',
    LEADS: 'Khách hàng tiềm năng',
    SALES: 'Doanh số',
    NONE: 'Không có',
};

const trustLabels: Record<string, string> = {
    HIGH_CONFIDENCE: 'Dữ liệu đủ tin cậy',
    ESTIMATED_ONLY: 'Chỉ có dữ liệu ước lượng',
    ORGANIC_STRONG_BUT_PAID_UNVERIFIED: 'Organic mạnh, paid chưa xác minh',
    LOW_SAMPLE: 'Mẫu quá nhỏ',
    LIMITED_SAMPLE: 'Mẫu còn hạn chế',
    UNKNOWN: 'Chưa xác định',
};

const stopActionLabels: Record<string, string> = {
    PAUSE: 'Tạm dừng',
    REDUCE_BUDGET: 'Giảm ngân sách',
    CHANGE_OBJECTIVE: 'Đổi mục tiêu',
};

const metricLabels: Record<string, string> = {
    cost_per_profile_view: 'chi phí mỗi lượt xem hồ sơ',
    cost_per_follower: 'chi phí mỗi follower',
    cost_per_click: 'chi phí mỗi click',
    cost_per_view: 'chi phí mỗi lượt xem',
};

const organicRankLabels: Record<string, string> = {
    WEAK: 'Yếu',
    NORMAL: 'Bình thường',
    STRONG: 'Mạnh',
    VIRAL: 'Viral',
    BREAKOUT: 'Bùng nổ',
};

const reasonCodeLabels: Record<string, string> = {
    LOW_SAMPLE_SIZE: 'Chưa đủ mẫu dữ liệu',
    LIMITED_SAMPLE_SIZE: 'Mẫu dữ liệu còn hạn chế',
    ESTIMATED_CONVERSION_DATA: 'Chỉ số chuyển đổi đang là ước lượng',
    ORGANIC_SIGNAL_STRONG: 'Tín hiệu organic mạnh so với baseline kênh',
    NO_PRODUCT_CLICK_SIGNAL: 'Chưa có tín hiệu click sản phẩm',
    CTA_WEAK: 'CTA chưa đủ rõ',
    CREATIVE_RISK_HIGH: 'Rủi ro creative cao',
    NEED_PRIVATE_ANALYTICS: 'Cần dữ liệu thật từ TikTok Analytics',
};

const signalLabels: Record<string, string> = {
    HIGH: 'Cao',
    MEDIUM: 'Trung bình',
    LOW: 'Thấp',
    WEAK: 'Yếu',
    STRONG: 'Mạnh',
    NORMAL: 'Bình thường',
    FAST: 'Nhanh',
    SLOW: 'Chậm',
    'TOO SLOW': 'Quá chậm',
    STATIC: 'Tĩnh',
    CLEAR: 'Rõ',
    CLUTTERED: 'Rối',
    AVERAGE: 'Trung bình',
    NONE: 'Không có',
    N_A: 'Chưa có dữ liệu',
    'N/A': 'Chưa có dữ liệu',
};

const displaySignal = (value?: string | number | null) => {
    if (value === null || value === undefined || value === '') return 'Chưa có dữ liệu';
    const raw = String(value);
    return signalLabels[raw] || signalLabels[raw.toUpperCase()] || raw.replaceAll('_', ' ');
};

const canRunPaidTest = (decision?: PromotionDecision) =>
    Boolean(decision && ['SCALE', 'TEST_SMALL'].includes(decision.action));

const paidCtaLabel = (decision?: PromotionDecision) => {
    if (!decision) return 'Chưa có quyết định quảng bá';
    if (decision.action === 'SCALE') return 'Tăng ngân sách';
    if (decision.action === 'TEST_SMALL') return `Test nhỏ: ${objectiveLabels[decision.objective || 'VIDEO_VIEWS'] || 'Tăng lượt xem'}`;
    if (decision.action === 'NEED_PRIVATE_ANALYTICS') return 'Chưa đủ mẫu dữ liệu';
    if (decision.action === 'FIX_CREATIVE_FIRST') return 'Cần sửa creative trước';
    return 'Không nên quảng bá';
};

const DecisionPanel = memo<{ video: VideoData; expanded: boolean }>(({ video, expanded }) => {
    const decision = video.aiStrategy.promotion_decision;

    if (!decision) {
        return (
            <div className="px-2.5 py-2 rounded-lg bg-amber-500/5 border border-amber-500/15">
                <p className="text-[10px] text-amber-300 font-bold uppercase">Chưa đủ dữ liệu quyết định</p>
                <p className="text-[10px] text-gray-500 mt-1">Backend chưa trả về PromotionDecision.</p>
            </div>
        );
    }

    const budget = decision.budgetPlan;
    const stop = decision.stopConditions?.[0];
    const trust = decision.dataQuality?.trustLevel || 'UNKNOWN';
    const blocked = decision.dataQuality?.blockedObjectives || [];
    const organic = decision.organicVerdict;
    const riskBreakdown = decision.riskBreakdown;
    const isLowSample = decision.action === 'NEED_PRIVATE_ANALYTICS' || decision.reasonCodes?.includes('LOW_SAMPLE_SIZE');
    const confidenceBreakdown = decision.confidenceBreakdown;
    const tiktokSetup = decision.tiktokPromoteSetup;

    return (
        <div className="space-y-2 rounded-lg bg-white/[0.025] border border-white/7 p-2.5">
            <div className="flex items-start justify-between gap-2">
                <div>
                    <span className={`inline-flex px-2 py-1 rounded-md border text-[10px] font-black tracking-wide ${actionStyles[decision.action] || actionStyles.TEST_SMALL}`}>
                        {actionLabels[decision.action] || decision.action}
                    </span>
                    <p className="text-[11px] text-gray-300 mt-1">
                        Mục tiêu: <span className="font-bold text-white">{objectiveLabels[decision.objective || 'NONE'] || decision.objective || 'Không có'}</span>
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-[9px] text-gray-500 uppercase font-bold">Độ tin cậy</p>
                    <p className="text-[10px] text-cyan-300 font-bold">{trustLabels[trust] || trust}</p>
                </div>
            </div>

            {organic && (
                <div className="rounded-md bg-emerald-500/[0.06] border border-emerald-500/15 px-2 py-1.5">
                    <p className="text-[9px] text-emerald-300 uppercase font-black">Tín hiệu organic</p>
                    <p className="text-[11px] text-white font-bold">
                        {organicRankLabels[organic.rank] || organic.rank}
                        <span className="text-gray-400 font-medium"> · {organic.relativeViews.toFixed(2)}x median lượt xem</span>
                    </p>
                </div>
            )}

            <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="bg-black/20 rounded-md px-2 py-1.5">
                    <p className="text-gray-500">Ngân sách</p>
                    <p className="font-bold text-white">{budget.dailyBudgetMin.toLocaleString('vi-VN')} - {budget.dailyBudgetMax.toLocaleString('vi-VN')} VND/ngày</p>
                    <p className="text-gray-500">{budget.durationDays} ngày</p>
                </div>
                <div className="bg-black/20 rounded-md px-2 py-1.5">
                    <p className="text-gray-500">Rủi ro / Tin cậy</p>
                    <p className="font-bold text-white">{decision.riskLevel} / {decision.confidence}%</p>
                    <p className="text-gray-500">Điểm rủi ro {decision.scores.risk}</p>
                </div>
            </div>

            {isLowSample && (
                <div className="rounded-md bg-blue-500/[0.08] border border-blue-500/20 px-2 py-1.5">
                    <p className="text-[10px] text-blue-200 font-bold">
                        Chưa đủ mẫu dữ liệu — cần thêm view tự nhiên trước khi test quảng bá.
                    </p>
                </div>
            )}

            {confidenceBreakdown && (
                <div className="grid grid-cols-4 gap-1 text-[9px]">
                    <div className="rounded-md bg-black/20 px-1.5 py-1"><span className="text-gray-500">Dữ liệu</span><br /><b className="text-white">{confidenceBreakdown.data}</b></div>
                    <div className="rounded-md bg-black/20 px-1.5 py-1"><span className="text-gray-500">Mẫu</span><br /><b className="text-white">{confidenceBreakdown.sampleSize}</b></div>
                    <div className="rounded-md bg-black/20 px-1.5 py-1"><span className="text-gray-500">Creative</span><br /><b className="text-white">{confidenceBreakdown.creative}</b></div>
                    <div className="rounded-md bg-black/20 px-1.5 py-1"><span className="text-gray-500">Chuyển đổi</span><br /><b className="text-white">{confidenceBreakdown.conversion}</b></div>
                </div>
            )}

            {decision.confidenceExplanation && (
                <p className="text-[10px] text-gray-400">{decision.confidenceExplanation}</p>
            )}

            {stop && (
                <p className="text-[10px] text-gray-400">
                    Dừng nếu <span className="text-white">{metricLabels[stop.metric] || stop.metric}</span> {stop.operator} {stop.value} sau {stop.windowHours} giờ. Hành động: {stopActionLabels[stop.action] || stop.action}.
                </p>
            )}

            {tiktokSetup && (
                <div className="rounded-md bg-cyan-500/[0.06] border border-cyan-500/15 px-2 py-1.5">
                    <p className="text-[9px] text-cyan-300 uppercase font-black">Thiết lập trên TikTok Promote</p>
                    <p className="text-[10px] text-gray-300">
                        Chọn: <span className="text-white font-bold">{tiktokSetup.tab}</span> → <span className="text-white font-bold">{tiktokSetup.option}</span> → <span className="text-white font-bold">{tiktokSetup.package}</span>.
                    </p>
                    <p className="text-[10px] text-gray-500">{tiktokSetup.instruction}</p>
                </div>
            )}

            {expanded && (
                <div className="space-y-2 pt-1 border-t border-white/5">
                    {blocked.length > 0 && <p className="text-[10px] text-red-300">Mục tiêu bị chặn: {blocked.map((b) => objectiveLabels[b] || b).join(', ')}</p>}
                    {riskBreakdown && <p className="text-[10px] text-gray-400">Tách rủi ro: dữ liệu {riskBreakdown.dataRisk}, creative {riskBreakdown.creativeRisk}, tiền {riskBreakdown.moneyRisk}</p>}
                    {decision.reasonCodes && decision.reasonCodes.length > 0 && (
                        <p className="text-[10px] text-blue-200">Mã lý do: {decision.reasonCodes.map((code) => reasonCodeLabels[code] || code).join(', ')}</p>
                    )}
                    {decision.reasons.slice(0, 3).map((reason) => <p key={reason} className="text-[10px] text-gray-300">Lý do: {reason}</p>)}
                    {decision.warnings.slice(0, 2).map((warning) => <p key={warning} className="text-[10px] text-amber-300">Cảnh báo: {warning}</p>)}
                    {decision.requiredFixesBeforePromote.slice(0, 2).map((fix) => <p key={fix} className="text-[10px] text-cyan-200">Cần sửa: {fix}</p>)}
                </div>
            )}
        </div>
    );
});
DecisionPanel.displayName = 'DecisionPanel';

// ─── Extracted Memoized Video Card ──────────────────────────────────
const VideoCard = memo<{
    video: VideoData;
    index: number;
    isExpanded: boolean;
    isCompareMode: boolean;
    isSelectedForCompare: boolean;
    onToggleExpand: (id: string) => void;
    onPromote: (video: VideoData) => void;
    onToggleCompare: (id: string) => void;
}>(({ video, index, isExpanded, isCompareMode, isSelectedForCompare, onToggleExpand, onPromote, onToggleCompare }) => (
    <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
        transition={{ delay: index * 0.04 }}
        className={`glass-card overflow-hidden group ${video.aiRecommended ? 'ring-1 ring-purple-500/25' : ''} ${isSelectedForCompare ? 'ring-2 ring-cyan-400 bg-cyan-500/5' : ''} ${isCompareMode && !isSelectedForCompare ? 'opacity-60' : ''}`}
        onClick={() => isCompareMode && onToggleCompare(video.id)}
    >

        {/* Thumbnail */}
        <div className="relative h-44 overflow-hidden cursor-pointer" onClick={() => onToggleExpand(video.id)}>
            {video.thumbnail ? (
                <img src={video.thumbnail} alt={video.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
            ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-purple-500/10 flex items-center justify-center">
                    <Play size={36} className="text-white/20" />
                </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Play size={40} className="text-white/90 drop-shadow-lg" fill="white" />
            </div>
            <div className="absolute top-2 left-2 flex flex-col gap-1.5">
                {video.aiRecommended && (
                    <span className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-[9px] font-bold rounded-lg shadow-lg">
                        <Crown size={9} /> AI Khuyên Dùng
                    </span>
                )}
                {video.aiStrategy.trend_intelligence?.alignment_score && video.aiStrategy.trend_intelligence.alignment_score > 70 && (
                    <span className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[9px] font-bold rounded-lg shadow-lg">
                        <TrendingUp size={9} /> Độ khớp xu hướng: Cao
                    </span>
                )}
                <StrategyBadge goal={video.aiStrategy.goal} small />
            </div>
            <div className="absolute top-2 right-2">
                <span className={`px-2 py-1 rounded-lg border text-[9px] font-black ${actionStyles[video.aiStrategy.promotion_decision?.action || 'TEST_SMALL']}`}>
                    {actionLabels[video.aiStrategy.promotion_decision?.action || 'NO_DECISION']}
                </span>
            </div>
            
            {/* Thumbnail Bottom Bar */}
            <div className="absolute bottom-0 left-0 right-0">
                <div className="px-3 py-1 flex items-end justify-between relative z-10 mb-1">
                    <span className="text-[11px] text-white flex items-center gap-1 font-medium drop-shadow">
                        <Play size={10} fill="white" /> {fmt(video.views)}
                        {video.aiStrategy.temporal_analytics && video.aiStrategy.temporal_analytics.length > 0 ? (
                            <span className="text-green-400 text-[10px] ml-1 flex items-center">↑ Accel</span>
                        ) : (
                            <TrendIndicator current={video.views} previous={video.prevViews} />
                        )}
                    </span>
                    <span className="text-[10px] text-white/80 font-mono bg-black/40 px-1.5 py-0.5 rounded">{video.duration}</span>
                </div>
                {/* Mini Giữ chân Curve */}
                {video.aiStrategy.retention_timeline && video.aiStrategy.retention_timeline.length > 0 && (
                    <div className="flex items-end h-4 w-full px-1 gap-[1px] opacity-80">
                        {video.aiStrategy.retention_timeline.slice(0, 10).map((pt, i) => (
                            <div key={i} className="flex-1 bg-cyan-400/80 rounded-t" style={{ height: `${pt.retention}%` }} />
                        ))}
                    </div>
                )}
            </div>
        </div>

        {/* Info */}
        <div className="p-3.5 space-y-2.5">
            <h4 className="text-[13px] font-medium leading-snug line-clamp-2">{video.title}</h4>
            <div className="flex items-center gap-2.5 text-[11px] text-gray-500">
                <span className="flex items-center gap-1"><Eye size={11} /> {fmt(video.views)}</span>
                <span className="flex items-center gap-1"><Heart size={11} /> {fmt(video.likes)}</span>
                <span className="flex items-center gap-1"><MessageCircle size={11} /> {video.comments}</span>
                <span className="flex items-center gap-1"><Share2 size={11} /> {video.shares}</span>
                <span className="flex items-center gap-1"><Bookmark size={11} /> {video.saves}</span>
                <span className="ml-auto text-gray-600">{video.postedAt}</span>
            </div>

            <DecisionPanel video={video} expanded={isExpanded} />

            {/* Stat Chips (4 Tiers) */}
            <div className="grid grid-cols-2 gap-2">
                <div className="py-2 px-2 bg-white/[0.03] rounded-lg border border-white/5 flex flex-col justify-center">
                    <p className="text-[9px] text-gray-500 uppercase font-bold mb-1">Sức hút</p>
                    <p className={`text-[13px] font-black ${video.aiStrategy.attention_score && video.aiStrategy.attention_score >= 60 ? 'text-green-400' : 'text-yellow-400'}`}>{video.aiStrategy.attention_score || (video.aiStrategy.first_3s_score ? video.aiStrategy.first_3s_score * 10 : 0)}</p>
                </div>
                <div className="py-2 px-2 bg-white/[0.03] rounded-lg border border-white/5 flex flex-col justify-center">
                    <p className="text-[9px] text-gray-500 uppercase font-bold mb-1">Giữ chân</p>
                    <div className="flex flex-col gap-0.5">
                        <p className="text-[10px] text-gray-300"><span className="text-gray-500">TB xem:</span> 6.2s</p>
                        <p className="text-[10px] text-gray-300"><span className="text-gray-500">Hoàn tất:</span> {video.completionRate}%</p>
                        <p className="text-[10px] text-gray-300"><span className="text-gray-500">Xem lại:</span> 1.2x</p>
                    </div>
                </div>
                <div className="py-2 px-2 bg-white/[0.03] rounded-lg border border-white/5 flex flex-col justify-center">
                    <p className="text-[9px] text-gray-500 uppercase font-bold mb-1">Tương tác</p>
                    <p className={`text-[13px] font-black ${video.engagementRate >= 2 ? 'text-purple-400' : 'text-purple-300'}`}>{video.engagementRate}% <span className="text-[9px] font-normal text-gray-500">trọng số</span></p>
                </div>
                <div className="py-2 px-2 bg-white/[0.03] rounded-lg border border-white/5 flex flex-col justify-center">
                    <p className="text-[9px] text-gray-500 uppercase font-bold mb-1">Chuyển đổi</p>
                    <div className="flex flex-col gap-0.5">
                        <p className="text-[10px] text-gray-300"><span className="text-gray-500">Theo dõi:</span> {video.aiStrategy.conversion_metrics?.follow_ctr ?? 'n/a'}%</p>
                        <p className="text-[10px] text-gray-300"><span className="text-gray-500">Hồ sơ:</span> {video.aiStrategy.conversion_metrics?.profile_ctr ?? 'n/a'}%</p>
                        <p className="text-[10px] text-gray-300"><span className="text-gray-500">Sản phẩm:</span> {video.aiStrategy.conversion_metrics?.product_ctr ?? 'n/a'}%</p>
                        {video.aiStrategy.conversion_metrics?.is_estimated && <p className="text-[9px] text-amber-300">Ước lượng</p>}
                    </div>
                </div>
            </div>

            {/* Điểm quyết định */}
            <div className="px-2.5 py-2 rounded-lg bg-white/[0.02] border border-white/5">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] text-gray-400 font-bold uppercase flex items-center gap-1">
                        <Activity size={10} className="text-purple-400" /> Điểm quyết định
                    </span>
                    <span className="text-[9px] text-purple-300 font-medium">Tin cậy: {video.aiStrategy.promotion_decision?.confidence ?? video.aiStrategy.analysis_confidence?.score ?? 0}%</span>
                </div>
                <p className="text-xs font-mono text-white tracking-wide">
                    Lượt xem {video.aiStrategy.promotion_decision?.scores.viewBoost ?? 0} / Hồ sơ {video.aiStrategy.promotion_decision?.scores.profilePull ?? 0} / Bán hàng {video.aiStrategy.promotion_decision?.scores.salesIntent ?? 0}
                </p>
            </div>

            {/* AI Insight Box (Compact Mode) */}
            <div className="flex items-start gap-2 px-2.5 py-2 rounded-lg border border-cyan-500/10 bg-cyan-500/5">
                <Sparkles size={12} className="text-cyan-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-cyan-100/90 leading-relaxed line-clamp-2">
                    {video.aiStrategy.ai_insight || "Video có hook tốt, phù hợp chạy Promote."}
                </p>
            </div>

            {/* Expandable Detailed Analysis */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="p-3 rounded-xl space-y-3 mt-1 bg-white/[0.02] border border-white/5">
                            {/* Pattern Detection */}
                            {video.aiStrategy.patterns && (
                                <div className="space-y-1.5">
                                    <h5 className="text-[10px] font-bold text-gray-400 uppercase">Vì sao video này hiệu quả</h5>
                                    <div className="grid grid-cols-1 gap-1.5">
                                        <div className="flex items-start gap-2">
                                            <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded shrink-0">Hình ảnh</span>
                                            <span className="text-[10px] text-gray-300">{video.aiStrategy.patterns.visual}</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="text-[10px] bg-pink-500/20 text-pink-300 px-1.5 py-0.5 rounded shrink-0">Outfit</span>
                                            <span className="text-[10px] text-gray-300">{video.aiStrategy.patterns.outfit}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Hành động đề xuất */}
                            {video.aiStrategy.automation?.recommended_actions && video.aiStrategy.automation.recommended_actions.length > 0 && (
                                <div className="space-y-1.5">
                                    <h5 className="text-[10px] font-bold text-amber-400 uppercase">Hành động đề xuất</h5>
                                    <ul className="space-y-1">
                                        {video.aiStrategy.automation.recommended_actions.slice(0, 2).map((act, i) => (
                                            <li key={i} className="flex items-start gap-1.5 text-[10px] text-amber-100/80">
                                                <span className="text-amber-400 mt-0.5">•</span> {act.action}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <button onClick={() => onToggleExpand(video.id)}
                    className="w-full flex items-center justify-center gap-1 text-[10px] text-gray-600 hover:text-purple-400 transition-colors py-0.5">
                    <Sparkles size={9} />{isExpanded ? 'Ẩn phân tích' : 'Xem phân tích AI chi tiết'}
                    <ChevronDown size={10} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
            {canRunPaidTest(video.aiStrategy.promotion_decision) ? (
                <div className="space-y-1.5">
                    <button onClick={() => onPromote(video)}
                        className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] ${
                            video.aiStrategy.promotion_decision?.action === 'SCALE'
                                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/15 hover:shadow-xl hover:shadow-green-500/25'
                                : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/15 hover:shadow-xl hover:shadow-cyan-500/25'
                        }`}>
                        <Megaphone size={12} />
                        {paidCtaLabel(video.aiStrategy.promotion_decision)}
                    </button>
                    <p className="text-[9px] text-gray-500 text-center">AI chỉ khuyến nghị test, không cam kết tăng follower/doanh số.</p>
                </div>
            ) : (
                <div className="rounded-xl border border-blue-500/15 bg-blue-500/[0.06] px-3 py-2">
                    <p className="text-[10px] text-blue-200 font-bold">{paidCtaLabel(video.aiStrategy.promotion_decision)}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Chưa đủ mẫu dữ liệu — cần thêm view tự nhiên trước khi test quảng bá.</p>
                </div>
            )}
        </div>
    </motion.div>
));
VideoCard.displayName = 'VideoCard';

// ─── Floating Orb (input phase background) ──────────────────────────
const FloatingOrb = memo<{ color: string; size: string; position: string; delay: number }>(
    ({ color, size, position, delay }) => (
    <motion.div
        className={`absolute rounded-full blur-3xl opacity-20 pointer-events-none ${size} ${position}`}
        style={{ background: color }}
        animate={{
            y: [0, -30, 0, 20, 0],
            x: [0, 15, -10, 5, 0],
            scale: [1, 1.1, 0.95, 1.05, 1],
        }}
        transition={{ duration: 8, repeat: Infinity, delay, ease: 'easeInOut' }}
    />
));
FloatingOrb.displayName = 'FloatingOrb';

// ─── Main Component ─────────────────────────────────────────────────
const TikTokPromote: React.FC = () => {
    const [channelUrl, setChannelUrl] = useState('');
    const [phase, setPhase] = useState<Phase>('input');
    const [channel, setChannel] = useState<ChannelInfo | null>(null);
    const [analyzeProgress, setAnalyzeProgress] = useState(0);
    const [analyzeStep, setAnalyzeStep] = useState('');
    const [activeTab, setActiveTab] = useState<TabKey>('all');
    const [sortBy, setSortBy] = useState<'aiScore' | 'views' | 'likes' | 'comments'>('aiScore');
    const [expandedVideo, setExpandedVideo] = useState<string | null>(null);
    const [showPromoteModal, setShowPromoteModal] = useState(false);
    const [selectedVideo, setSelectedVideo] = useState<VideoData | null>(null);
    const [isCompareMode, setIsCompareMode] = useState(false);
    const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
    const [selectedGoal, setSelectedGoal] = useState<PromoteGoal>('engagement');
    const [selectedPack, setSelectedPack] = useState<string | null>(null);
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [linkType, setLinkType] = useState<LinkType>('unknown');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [copiedUrl, setCopiedUrl] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [completedSteps, setCompletedSteps] = useState<number[]>([]);

    const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const refreshDataRef = useRef<(() => Promise<void>) | null>(null);

    // Auto-detect link type on input change
    useEffect(() => {
        setLinkType(detectLinkType(channelUrl));
    }, [channelUrl]);

    // Process API response
    const processApiData = useCallback((data: any, prevChannel: ChannelInfo | null): ChannelInfo => {
        const processedVideos: VideoData[] = data.videos.map((v: any) => {
            const strategy: AiStrategy = v.aiStrategy || {
                video_id: v.id || "",
                title: v.title || "",
                priority: "LOW" as const,
                goal: "views" as PromoteGoal,
                overall_score: 50,
                hook_score: 5, retention_score: 5, viral_score: 5,
                conversion_score: 5, scalability_score: 5, promote_worthiness: 5,
                first_3s_score: 5, scroll_stop_power: "MEDIUM",
                replayability_score: 4, pacing_quality: "MEDIUM",
                engagement_authenticity: "MEDIUM",
                follower_conversion_probability: "LOW", sales_conversion_probability: "LOW",
                strengths: ["Dữ liệu dự phòng"],
                weaknesses: ["Chưa được AI phân tích chi tiết"],
                why_people_keep_watching: "Nội dung cơ bản.",
                why_people_swipe_away: "Thiếu điểm nhấn đột phá.",
                best_target_audience: "người theo dõi hiện tại",
                estimated_growth_potential: "Thấp",
                ad_potential: "Chưa rõ",
                recommended_actions: ["Đợi AI phân tích xong"],
                final_verdict: "Lý giải AI không khả dụng.",
                analysis_confidence: { score: 30, level: "LOW" as const, reason: "Chế độ dự phòng - AI chưa phân tích" },
                failure_diagnosis: { primary_reason: "Chưa có dữ liệu AI", secondary_reason: "N/A", severity: "LOW" as const },
                promote_decision: { should_promote: false, recommended_budget: "0đ", promote_objective: "Chưa có", best_audience: "Chưa có dữ liệu", risk_level: "Cao", expected_outcome: "Chưa có dữ liệu" },
                hook_rewrites: [], cta_rewrites: [],
                series_potential: { score: 50, reason: "Chưa đánh giá" },
                algorithm_risk: [],
                retention_timeline: [], drop_analysis: undefined,
                viral_reasoning: [], voice_analysis: undefined, visual_analysis: undefined,
                next_video_idea: undefined, ab_test: undefined,
            };
            const prevVideo = prevChannel?.videos?.find((pv: VideoData) => pv.id === v.id);

            return {
                ...v,
                aiScore: strategy.overall_score || 50,
                aiRecommended: strategy.promotion_decision
                    ? ['SCALE', 'TEST_SMALL'].includes(strategy.promotion_decision.action)
                    : strategy.overall_score >= 60 && strategy.priority !== 'LOW',
                aiStrategy: strategy,
                targetViews: v.targetViews || Math.round(v.views * 1.5),
                targetLikes: v.targetLikes || Math.round(v.likes * 1.5),
                targetFollowers: v.targetFollowers || 50,
                prevViews: prevVideo?.views,
                prevLikes: prevVideo?.likes,
                prevComments: prevVideo?.comments,
                prevShares: prevVideo?.shares,
            };
        });

        return {
            ...data,
            videos: processedVideos,
        };
    }, []);

    // Refresh data (real-time update)
    const refreshData = useCallback(async () => {
        if (!channelUrl.trim() || isRefreshing) return;
        setIsRefreshing(true);

        try {
            const res = await fetch(`http://localhost:5054/api/refresh?url=${encodeURIComponent(channelUrl)}`);
            if (!res.ok) throw new Error('Refresh failed');
            const data = await res.json();
            const processed = processApiData(data, channel);
            setChannel(processed);
            setLastRefresh(new Date());
        } catch {
            try {
                const res = await fetch(`http://localhost:5054/api/analyze?url=${encodeURIComponent(channelUrl)}`);
                if (res.ok) {
                    const data = await res.json();
                    const processed = processApiData(data, channel);
                    setChannel(processed);
                    setLastRefresh(new Date());
                }
            } catch { /* Silent fail */ }
        } finally {
            setIsRefreshing(false);
        }
    }, [channelUrl, channel, isRefreshing, processApiData]);

    // Keep ref updated for interval usage (avoids stale closure)
    useEffect(() => {
        refreshDataRef.current = refreshData;
    }, [refreshData]);

    // Auto-refresh polling — uses ref to avoid recreating interval on every channel change
    useEffect(() => {
        if (phase === 'results' && autoRefresh && channel) {
            refreshIntervalRef.current = setInterval(() => {
                refreshDataRef.current?.();
            }, 60000);

            return () => {
                if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
            };
        }
        return () => {
            if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
        };
    }, [phase, autoRefresh, channel]);

    // Main analyze function
    const analyzeContent = useCallback(async (url?: string) => {
        const targetUrl = url || channelUrl;
        if (!targetUrl.trim()) return;

        setPhase('analyzing');
        setAnalyzeProgress(0);
        setCompletedSteps([]);

        const type = detectLinkType(targetUrl);
        const isVideo = type === 'video';

        const steps = isVideo ? [
            '🔗 Kết nối TikTok API...',
            '📥 Tải metadata video...',
            '🧠 VideoVault AI Growth OS đang phân tích hook...',
            '📊 Đánh giá đường giữ chân và điểm rơi...',
            '🎯 Tính toán Promote Decision & A/B Test...',
            '🎬 Sinh ý tưởng video tiếp theo và phiên bản hook...',
            '✅ Hoàn tất! Dữ liệu sẵn sàng ✨'
        ] : [
            '🔗 Kết nối TikTok API...',
            '📥 Tải metadata kênh & video...',
            '🧠 AI phân tích video 1/6 — Hook & Giữ chân...',
            '🧠 AI phân tích video 2/6 — Viral Mechanics...',
            '🧠 AI phân tích video 3/6 - tín hiệu chuyển đổi...',
            '🧠 AI phân tích video 4/6 — DNA nội dung...',
            '🧠 AI phân tích video 5/6 - giọng nói và hình ảnh...',
            '🧠 AI phân tích video 6/6 — Promote Decision...',
            '🔍 Tổng hợp Viral Patterns & Channel Intelligence...',
            '✅ Hoàn tất! AI Growth Report sẵn sàng ✨'
        ];

        let step = 0;
        setError(null);
        // Sequential AI analysis takes ~8-10s per video → use ~8s intervals for channel
        const stepDuration = isVideo ? 1800 : 8000;
        const interval = setInterval(() => {
            step++;
            if (step < steps.length - 1) {
                setAnalyzeProgress(Math.min(Math.round((step / steps.length) * 100), 92));
                setAnalyzeStep(steps[step]);
                setCompletedSteps(prev => [...prev, step - 1]);
            }
        }, stepDuration);

        try {
            const res = await fetch(`http://localhost:5054/api/analyze?url=${encodeURIComponent(targetUrl)}`);
            if (!res.ok) {
                let message = `API Error (${res.status})`;
                try {
                    const errData = await res.json();
                    if (errData?.detail) message = errData.detail;
                } catch { /* keep default message */ }
                throw new Error(message);
            }
            const data = await res.json();

            clearInterval(interval);
            setAnalyzeProgress(100);
            setAnalyzeStep(steps[steps.length - 1]);
            setCompletedSteps(steps.map((_, i) => i));

            setTimeout(() => {
                const processed = processApiData(data, null);
                setChannel(processed);
                useStore.getState().setAnalyzedChannel(processed);
                setLinkType(data.type || type);
                setPhase('results');
                setLastRefresh(new Date());

                if (data.type === 'video' || isVideo) {
                    const firstVideo = processed.videos[0];
                    if (firstVideo) setExpandedVideo(firstVideo.id);
                }
            }, 600);
        } catch (err: any) {
            clearInterval(interval);
            setError(err.message || 'Lỗi khi kết nối đến server API');
            setPhase('input');
        }
    }, [channelUrl, processApiData]);

    // Paste handler — fixed: added preventDefault to avoid double pasting
    const handlePaste = useCallback((e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedText = e.clipboardData.getData('text');
        setChannelUrl(pastedText.trim());
        if (pastedText.includes('tiktok.com')) {
            setTimeout(() => {
                const type = detectLinkType(pastedText);
                if (type !== 'unknown') {
                    analyzeContent(pastedText.trim());
                }
            }, 500);
        }
    }, [analyzeContent]);

    const sortedVideos = useMemo(() => {
        const vids = channel?.videos.slice() ?? [];
        return vids.sort((a, b) => {
            if (sortBy === 'aiScore') {
                const pWeight = { high: 3, medium: 2, low: 1 };
                const pA = pWeight[(a.aiStrategy?.priority as keyof typeof pWeight)] || 0;
                const pB = pWeight[(b.aiStrategy?.priority as keyof typeof pWeight)] || 0;
                if (pA !== pB) return pB - pA;
                return (b.aiStrategy?.overall_score || 0) - (a.aiStrategy?.overall_score || 0);
            }
            return (b[sortBy] as number) - (a[sortBy] as number);
        });
    }, [channel, sortBy]);

    const displayVideos = useMemo(() =>
        activeTab === 'recommended' ? sortedVideos.filter(v => v.aiRecommended) : sortedVideos,
    [sortedVideos, activeTab]);

    const recommendedCount = useMemo(() => sortedVideos.filter(v => v.aiRecommended).length, [sortedVideos]);
    const organicHitCount = useMemo(() => sortedVideos.filter(v => {
        const rank = v.aiStrategy?.promotion_decision?.organicVerdict?.rank || v.aiStrategy?.organic_verdict?.rank;
        return rank === 'VIRAL' || rank === 'BREAKOUT';
    }).length, [sortedVideos]);
    const heroVideo = useMemo(() => (linkType === 'video' && channel?.videos?.[0]) || null, [linkType, channel]);

    // Stable callbacks for VideoCard
    const handleToggleExpand = useCallback((id: string) => {
        setExpandedVideo(prev => prev === id ? null : id);
    }, []);

    const handlePromote = useCallback((video: VideoData) => {
        if (!canRunPaidTest(video.aiStrategy.promotion_decision)) return;
        setSelectedVideo(video);
        setSelectedGoal(video.aiStrategy.goal);
        setSelectedPack(null);
        setPaymentSuccess(false);
        setShowPromoteModal(true);
    }, []);

    const handleToggleCompare = useCallback((id: string) => {
        setSelectedForCompare(prev => {
            if (prev.includes(id)) return prev.filter(v => v !== id);
            if (prev.length < 2) return [...prev, id];
            return [prev[1], id]; // Keep maximum 2 selected
        });
    }, []);

    const handlePay = useCallback(() => {
        setPaymentSuccess(true);
        setTimeout(() => { setShowPromoteModal(false); setPaymentSuccess(false); }, 3500);
    }, []);

    const copyUrl = useCallback(() => {
        navigator.clipboard.writeText(channelUrl);
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
    }, [channelUrl]);

    // ═══ PHASE: INPUT ═══
    if (phase === 'input') {
        return (
            <div className="p-6 lg:p-8 space-y-8 relative overflow-hidden">
                {/* Floating Gradient Orbs */}
                <FloatingOrb color="linear-gradient(135deg, #ec4899, #a855f7)" size="w-72 h-72" position="top-10 -left-36" delay={0} />
                <FloatingOrb color="linear-gradient(135deg, #06b6d4, #3b82f6)" size="w-64 h-64" position="top-40 -right-32" delay={2} />
                <FloatingOrb color="linear-gradient(135deg, #a855f7, #6366f1)" size="w-48 h-48" position="bottom-20 left-1/3" delay={4} />

                <div className="max-w-4xl mx-auto relative z-10">
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                        <h1 className="text-3xl font-bold">
                            <span className="bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">TikTok Promote</span>
                            <span className="text-sm font-medium text-purple-400 ml-2 px-2 py-0.5 bg-purple-500/10 rounded-lg border border-purple-500/20">AI Powered</span>
                        </h1>
                        <p className="text-gray-500 mt-2 text-sm max-w-xl">Dán link video hoặc kênh TikTok — AI phân tích real-time và đề xuất chiến lược quảng cáo tối ưu nhất.</p>
                    </motion.div>
                </div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="max-w-4xl mx-auto glass-card p-8 space-y-6 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-pink-500 via-purple-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/25">
                            <Megaphone size={26} className="text-white" />
                        </div>
                        <div>
                            <h2 className="font-bold text-lg">Phân tích & Chiến lược AI</h2>
                            <p className="text-xs text-gray-500">Dán URL video hoặc kênh TikTok — AI phân tích và đề xuất chiến lược tối ưu nhất</p>
                        </div>
                    </div>

                    <div className="relative">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 z-10" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={channelUrl}
                            onChange={(e) => setChannelUrl(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && analyzeContent()}
                            onPaste={handlePaste}
                            placeholder="Dán link video hoặc kênh TikTok tại đây..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-40 py-4.5 focus:outline-none focus:border-purple-500/50 focus:bg-white/[0.07] focus:shadow-[0_0_30px_rgba(168,85,247,0.15)] transition-all text-sm placeholder:text-gray-600"
                        />
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-2">
                            {channelUrl.trim() && (
                                <span className="text-[9px] text-gray-600 bg-white/5 px-1.5 py-0.5 rounded border border-white/5 font-mono hidden sm:inline">Enter ↵</span>
                            )}
                            <button onClick={() => analyzeContent()} disabled={!channelUrl.trim()}
                                className="px-5 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-pink-500/25 transition-all active:scale-95 disabled:opacity-30 flex items-center gap-2 text-sm">
                                <Sparkles size={15} /> Phân Tích AI
                            </button>
                        </div>
                    </div>

                    <AnimatePresence>
                        {error && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                                <AlertCircle size={16} className="text-red-400 shrink-0" />
                                <p className="text-sm text-red-400">{error}</p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Link type indicator */}
                    <AnimatePresence>
                        {linkType !== 'unknown' && channelUrl && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5">
                                {linkType === 'video' ? (
                                    <>
                                        <Video size={14} className="text-pink-400" />
                                        <span className="text-xs text-gray-400">Đã phát hiện: <strong className="text-pink-300">Link Video</strong> — AI sẽ phân tích chi tiết video này + kênh chủ sở hữu</span>
                                    </>
                                ) : (
                                    <>
                                        <Users size={14} className="text-cyan-400" />
                                        <span className="text-xs text-gray-400">Đã phát hiện: <strong className="text-cyan-300">Link Kênh</strong> — AI sẽ phân tích toàn bộ kênh và các video</span>
                                    </>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-5 border-t border-white/5">
                        {[
                            { icon: Link2, title: 'Dán link bất kỳ', desc: 'Link video đơn lẻ hoặc kênh TikTok — auto phát hiện', color: 'text-cyan-400', bg: 'from-cyan-500/10 to-blue-500/10' },
                            { icon: Activity, title: 'Phân tích thời gian thực', desc: 'Cập nhật metrics real-time mỗi 60 giây tự động', color: 'text-green-400', bg: 'from-green-500/10 to-emerald-500/10' },
                            { icon: Target, title: 'Mục tiêu tăng trưởng', desc: 'AI tính toán mục tiêu tăng trưởng tối ưu cho từng video', color: 'text-pink-400', bg: 'from-pink-500/10 to-red-500/10' },
                        ].map((f, i) => (
                            <motion.div key={f.title} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.1 }}
                                className={`p-4 rounded-xl bg-gradient-to-br ${f.bg} border border-white/5 hover:border-white/10 transition-all group cursor-default`}>
                                <div className="w-9 h-9 bg-white/5 rounded-xl flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
                                    <f.icon size={18} className={f.color} />
                                </div>
                                <p className="text-sm font-semibold mb-1">{f.title}</p>
                                <p className="text-[11px] text-gray-500 leading-relaxed">{f.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </div>
        );
    }

    // ═══ PHASE: ANALYZING ═══
    if (phase === 'analyzing') {
        const isVideo = linkType === 'video';
        const steps = isVideo ? [
            'Kết nối TikTok Data API',
            'Phân tích video sáng tạo',
            'Đánh giá Hook Power & Giữ chân',
            'Tính toán Mục tiêu tăng trưởng',
            'Thu thập thông tin kênh',
            'Chiến lược Promote tối ưu',
        ] : [
            'Kết nối TikTok Data API',
            'Thu thập metadata kênh',
            'Phân tích Giữ chân & Watch Time',
            'Đánh giá Tương tác Pattern',
            'So sánh benchmark niche',
            'Tính toán Viral Potential & ROI',
            'Chiến lược Promote tối ưu',
        ];

        return (
            <div className="p-8 flex flex-col items-center justify-center min-h-[70vh] space-y-10">
                <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative">
                    <div className="absolute inset-0 w-28 h-28 rounded-3xl bg-gradient-to-br from-pink-500 to-purple-600 blur-2xl opacity-30 animate-pulse" />
                    <div className="relative w-28 h-28 bg-gradient-to-br from-pink-500 via-purple-500 to-violet-600 rounded-3xl flex items-center justify-center shadow-2xl">
                        {isVideo ? (
                            <Video size={48} className="text-white animate-pulse" />
                        ) : (
                            <Sparkles size={48} className="text-white animate-pulse" />
                        )}
                    </div>
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: 'spring' }}
                        className="absolute -bottom-3 -right-3 w-12 h-12 bg-cyan-500 rounded-xl flex items-center justify-center shadow-xl shadow-cyan-500/30">
                        <TrendingUp size={22} className="text-white" />
                    </motion.div>
                </motion.div>

                <div className="text-center space-y-2 max-w-md">
                    <h2 className="text-2xl font-bold">
                        {isVideo ? '🧠 VideoVault AI đang phân tích' : '🧠 VideoVault AI Growth OS'}
                    </h2>
                    <motion.p key={analyzeStep} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="text-gray-400 text-sm">{analyzeStep || '🔗 Đang khởi tạo...'}</motion.p>
                    {!isVideo && (
                        <p className="text-[11px] text-gray-600">
                            ⏱ Phân tích tuần tự ~8-10s/video để đảm bảo chất lượng AI cao nhất
                        </p>
                    )}
                </div>

                <div className="w-full max-w-sm space-y-3">
                    <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                        <motion.div className="h-full rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 relative overflow-hidden"
                            initial={{ width: 0 }} animate={{ width: `${analyzeProgress}%` }} transition={{ duration: 0.6 }}>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-shimmer" />
                        </motion.div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-600">
                        <span>{isVideo ? 'Đang phân tích video...' : `Sequential AI — ${6 - Math.floor(analyzeProgress / 17)} video còn lại`}</span>
                        <span className="font-bold text-white">{analyzeProgress}%</span>
                    </div>
                </div>

                {/* Step Progress Indicators */}
                <div className="w-full max-w-md space-y-1.5">
                    {steps.map((stepText, i) => {
                        const isComplete = completedSteps.includes(i);
                        const isCurrent = !isComplete && i === completedSteps.length;
                        return (
                            <motion.div key={i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: isCurrent ? 1 : isComplete ? 0.7 : 0.3, x: 0 }}
                                transition={{ delay: i * 0.08 }}
                                className="flex items-center gap-2.5 text-xs"
                            >
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${
                                    isComplete ? 'bg-green-500/20 text-green-400' :
                                    isCurrent ? 'bg-purple-500/20 text-purple-400 ring-2 ring-purple-500/30' :
                                    'bg-white/5 text-gray-600'
                                }`}>
                                    {isComplete ? <Check size={10} /> :
                                     isCurrent ? <motion.div className="w-2 h-2 bg-purple-400 rounded-full" animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1, repeat: Infinity }} /> :
                                     <span className="text-[8px]">{i + 1}</span>}
                                </div>
                                <span className={`${isCurrent ? 'text-white font-medium' : isComplete ? 'text-gray-500' : 'text-gray-700'}`}>
                                    {stepText}
                                </span>
                                {isComplete && <span className="text-green-500 text-[10px] font-bold ml-auto">✓</span>}
                            </motion.div>
                        );
                    })}
                </div>

                <div className="w-full max-w-xl grid grid-cols-3 gap-3 opacity-30">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="glass-card p-3 space-y-2 animate-pulse">
                            <div className="h-24 bg-white/5 rounded-lg" />
                            <div className="h-2 bg-white/5 rounded w-3/4" />
                            <div className="h-2 bg-white/5 rounded w-1/2" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // ═══ PHASE: RESULTS ═══
    return (
        <div className="p-5 lg:p-7 space-y-5 max-w-[1400px] mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold flex items-center gap-2 flex-wrap">
                        <span className="bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">TikTok Promote</span>
                        <span className="text-[10px] px-2 py-0.5 bg-green-500/15 text-green-400 rounded-full font-bold border border-green-500/20">Phân tích hoàn tất</span>
                        <LivePulse active={autoRefresh} />
                    </h1>
                    <div className="flex items-center gap-3 mt-1">
                        <p className="text-gray-500 text-xs">AI đã xây dựng chiến lược tối ưu cho từng video</p>
                        {lastRefresh && (
                            <span className="text-[10px] text-gray-600 flex items-center gap-1">
                                <Clock size={9} />
                                Cập nhật: {lastRefresh.toLocaleTimeString('vi-VN')}
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setAutoRefresh(!autoRefresh)}
                        className={`flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg transition-all border ${
                            autoRefresh
                                ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                : 'bg-white/5 text-gray-500 border-white/5'
                        }`}>
                        <Wifi size={12} />
                        {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
                    </button>
                    <button onClick={refreshData} disabled={isRefreshing}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all border border-white/5 disabled:opacity-50">
                        <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
                        {isRefreshing ? 'Đang cập nhật...' : 'Refresh'}
                    </button>
                    <button onClick={() => { setPhase('input'); setChannel(null); setAutoRefresh(true); }}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs bg-gradient-to-r from-pink-500/10 to-purple-500/10 text-purple-300 hover:text-white rounded-lg transition-all border border-purple-500/20">
                        <Search size={12} /> Link khác
                    </button>
                </div>
            </div>

            {/* URL Display Bar */}
            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                <Link2 size={14} className="text-gray-600 shrink-0" />
                <span className="text-xs text-gray-500 truncate flex-1 font-mono">{channelUrl}</span>
                <button onClick={copyUrl} className="flex items-center gap-1 px-2 py-1 text-[10px] text-gray-500 hover:text-white rounded-lg hover:bg-white/5 transition-all">
                    {copiedUrl ? <CheckCircle2 size={11} className="text-green-400" /> : <Copy size={11} />}
                    {copiedUrl ? 'Đã copy!' : 'Copy'}
                </button>
                <a href={channelUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2 py-1 text-[10px] text-gray-500 hover:text-white rounded-lg hover:bg-white/5 transition-all">
                    <ExternalLink size={11} /> Mở TikTok
                </a>
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${
                    linkType === 'video' ? 'bg-pink-500/10 text-pink-400 border-pink-500/20' : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                }`}>
                    {linkType === 'video' ? '📹 Video' : '👤 Kênh'}
                </span>
            </motion.div>

            {/* ═══ VIDEO HERO CARD (for video links) ═══ */}
            {heroVideo && channel && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="glass-card overflow-hidden relative"
                    style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.03), rgba(236,72,153,0.03), rgba(6,182,212,0.03))' }}>
                    <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />

                    <div className="p-6">
                        {/* Top label */}
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg flex items-center justify-center">
                                    <Sparkles size={16} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold">Phân tích video bằng AI</h3>
                                    <p className="text-[10px] text-gray-500">Phân tích real-time • Chiến lược tối ưu</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <CircularScore score={heroVideo.aiScore} size={52} />
                                <StrategyBadge goal={heroVideo.aiStrategy.goal} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            {/* Video Preview */}
                            <div className="lg:col-span-4">
                                <div className="relative rounded-xl overflow-hidden aspect-[9/16] max-h-[320px] bg-white/5">
                                    {heroVideo.thumbnail ? (
                                        <img src={heroVideo.thumbnail} alt={heroVideo.title} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-pink-500/10 to-purple-500/10">
                                            <Play size={48} className="text-white/30" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                                    <div className="absolute bottom-3 left-3 right-3">
                                        <p className="text-white text-xs font-medium line-clamp-2 drop-shadow-lg">{heroVideo.title}</p>
                                        <div className="flex items-center gap-2 mt-1.5">
                                            <span className="text-[10px] text-white/80 bg-black/40 px-1.5 py-0.5 rounded font-mono">{heroVideo.duration}</span>
                                            <span className="text-[10px] text-white/80">{heroVideo.postedAt}</span>
                                        </div>
                                    </div>
                                    {heroVideo.aiRecommended && (
                                        <div className="absolute top-2 left-2">
                                            <span className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-[9px] font-bold rounded-lg shadow-lg">
                                                <Crown size={9} /> AI ưu tiên
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Stats & Strategy */}
                            <div className="lg:col-span-8 space-y-5">
                                {/* Real-time Stats Grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {[
                                        { icon: Eye, label: 'Lượt xem', value: heroVideo.views, prev: heroVideo.prevViews, color: 'text-blue-400', gradient: 'from-blue-500/10 to-cyan-500/10' },
                                        { icon: Heart, label: 'Lượt thích', value: heroVideo.likes, prev: heroVideo.prevLikes, color: 'text-pink-400', gradient: 'from-pink-500/10 to-rose-500/10' },
                                        { icon: MessageCircle, label: 'Bình luận', value: heroVideo.comments, prev: heroVideo.prevComments, color: 'text-green-400', gradient: 'from-green-500/10 to-emerald-500/10' },
                                        { icon: Share2, label: 'Chia sẻ', value: heroVideo.shares, prev: heroVideo.prevShares, color: 'text-amber-400', gradient: 'from-amber-500/10 to-orange-500/10' },
                                    ].map(stat => (
                                        <div key={stat.label} className={`p-3 rounded-xl bg-gradient-to-br ${stat.gradient} border border-white/5`}>
                                            <div className="flex items-center justify-between mb-1">
                                                <stat.icon size={14} className={stat.color} />
                                                <TrendIndicator current={stat.value} previous={stat.prev} />
                                            </div>
                                            <p className="text-[10px] text-gray-500">{stat.label}</p>
                                            <AnimatedNumber value={stat.value} className="text-lg font-bold text-white block mt-0.5" />
                                        </div>
                                    ))}
                                </div>

                                {/* Growth Target Bars */}
                                <div className="space-y-3 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-bold flex items-center gap-2">
                                            <Target size={13} className="text-purple-400" />
                                            Mục tiêu tăng trưởng AI
                                        </h4>
                                        <span className="text-[10px] text-gray-500 flex items-center gap-1">
                                            <Timer size={10} />
                                            Ước tính 3-7 ngày
                                        </span>
                                    </div>
                                    <GrowthBar current={heroVideo.views} target={heroVideo.targetViews} label="Lượt xem" color="text-blue-400" icon={Eye} />
                                    <GrowthBar current={heroVideo.likes} target={heroVideo.targetLikes} label="Lượt thích" color="text-pink-400" icon={Heart} />
                                    <GrowthBar current={channel.followers} target={channel.followers + heroVideo.targetFollowers} label="người theo dõis kênh" color="text-green-400" icon={UserPlus} />
                                </div>

                                {/* AI Performance Chips */}
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 text-center">
                                        <p className="text-[9px] text-gray-600 uppercase font-bold">Giữ chân</p>
                                        <p className={`text-sm font-bold mt-0.5 ${heroVideo.retentionRate >= 60 ? 'text-green-400' : heroVideo.retentionRate >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                                            {heroVideo.retentionRate}%
                                        </p>
                                    </div>
                                    <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 text-center">
                                        <p className="text-[9px] text-gray-600 uppercase font-bold">Tương tác</p>
                                        <p className={`text-sm font-bold mt-0.5 ${heroVideo.engagementRate >= 4 ? 'text-green-400' : heroVideo.engagementRate >= 2 ? 'text-yellow-400' : 'text-red-400'}`}>
                                            {heroVideo.engagementRate}%
                                        </p>
                                    </div>
                                    <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 text-center">
                                        <p className="text-[9px] text-gray-600 uppercase font-bold">Completion</p>
                                        <p className={`text-sm font-bold mt-0.5 ${heroVideo.completionRate >= 50 ? 'text-green-400' : 'text-yellow-400'}`}>
                                            {heroVideo.completionRate}%
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* AI Strategy Reasoning */}
                        <div className="mt-5 p-4 rounded-xl space-y-3" style={{ background: 'rgba(168,85,247,0.04)', border: '1px solid rgba(168,85,247,0.12)' }}>
                            <div className="flex items-center gap-2 flex-wrap">
                                <Sparkles size={14} className="text-purple-400" />
                                <span className="text-sm font-bold text-purple-300">Chiến lược AI tối ưu</span>
                                <StrategyBadge goal={heroVideo.aiStrategy.goal} />
                                <span className="text-[10px] text-gray-500 ml-auto">Điểm AI: <strong className="text-white">{heroVideo.aiStrategy.overall_score}</strong></span>
                            </div>
                            <p className="text-xs text-gray-400 leading-relaxed">{heroVideo.aiStrategy.final_verdict}</p>

                            {/* Strategy Metrics */}
                            <div className="grid grid-cols-2 gap-2 mt-4">
                                {heroVideo.aiStrategy.strengths.slice(0, 4).map((s, i) => (
                                    <div key={i} className="flex items-center gap-1.5 p-1.5 rounded bg-green-500/10 text-green-400 text-xs">
                                        <TrendingUp size={12} />
                                        <span className="truncate">{s}</span>
                                    </div>
                                ))}
                            </div>

                            {/* ROI Estimate */}
                            <div className="flex items-center gap-2 mt-4 px-3 py-2.5 rounded-lg bg-green-500/5 border border-green-500/20">
                                <TrendingUp size={14} className="text-green-400 shrink-0" />
                                <span className="text-xs text-gray-400">Tiềm năng tăng trưởng:</span>
                                <span className="text-xs text-green-400 font-semibold">{heroVideo.aiStrategy.estimated_growth_potential}</span>
                            </div>

                            {/* CTA */}
                            {canRunPaidTest(heroVideo.aiStrategy.promotion_decision) ? (
                                <div className="mt-4 space-y-1.5">
                                    <button onClick={() => handlePromote(heroVideo)}
                                        className="w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20 hover:shadow-xl hover:shadow-cyan-500/30 transition-all active:scale-[0.98]">
                                        <Megaphone size={16} />
                                        {paidCtaLabel(heroVideo.aiStrategy.promotion_decision)}
                                        <ChevronRight size={14} />
                                    </button>
                                    <p className="text-[10px] text-gray-500 text-center">AI chỉ khuyến nghị test, không cam kết tăng follower/doanh số.</p>
                                </div>
                            ) : (
                                <div className="mt-4 rounded-xl border border-blue-500/15 bg-blue-500/[0.06] px-3 py-2.5">
                                    <p className="text-xs text-blue-200 font-bold">{paidCtaLabel(heroVideo.aiStrategy.promotion_decision)}</p>
                                    <p className="text-[11px] text-gray-400 mt-0.5">Chưa đủ mẫu dữ liệu — cần thêm view tự nhiên trước khi test quảng bá.</p>
                                </div>
                            )}
                        </div>

                        {/* ═══════════════════════════════════════════════════════ */}
                        {/* MISSION CONTROL — Enterprise-Grade AI Analysis Panels */}
                        {/* ═══════════════════════════════════════════════════════ */}
                        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">

                            {/* ─── 1. CONFIDENCE ENGINE ─── */}
                            <div className="p-4 rounded-xl border border-white/5" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.04), rgba(99,102,241,0.04))' }}>
                                <div className="flex items-center gap-2 mb-3">
                                    <Activity size={14} className="text-blue-400" />
                                    <span className="text-xs font-bold text-blue-300">Confidence Engine</span>
                                    <span className={`text-[9px] ml-auto px-2 py-0.5 rounded-full font-bold ${
                                        heroVideo.aiStrategy.analysis_confidence?.level === 'HIGH' ? 'bg-green-500/15 text-green-400' :
                                        heroVideo.aiStrategy.analysis_confidence?.level === 'MEDIUM' ? 'bg-yellow-500/15 text-yellow-400' :
                                        'bg-red-500/15 text-red-400'
                                    }`}>{heroVideo.aiStrategy.analysis_confidence?.level || 'N/A'}</span>
                                </div>
                                {/* Score bar */}
                                <div className="relative h-3 bg-white/5 rounded-full overflow-hidden mb-2">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${heroVideo.aiStrategy.analysis_confidence?.score || 0}%` }}
                                        transition={{ duration: 1.2, ease: 'easeOut' }}
                                        className={`absolute inset-y-0 left-0 rounded-full ${
                                            (heroVideo.aiStrategy.analysis_confidence?.score || 0) >= 75 ? 'bg-gradient-to-r from-green-500 to-emerald-400' :
                                            (heroVideo.aiStrategy.analysis_confidence?.score || 0) >= 50 ? 'bg-gradient-to-r from-yellow-500 to-amber-400' :
                                            'bg-gradient-to-r from-red-500 to-rose-400'
                                        }`}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-2xl font-black text-white">{heroVideo.aiStrategy.analysis_confidence?.score || 0}<span className="text-xs text-gray-500">/100</span></span>
                                </div>
                                <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">{heroVideo.aiStrategy.analysis_confidence?.reason || 'N/A'}</p>
                            </div>

                            {/* ─── 2. PROMOTE ROI ENGINE (PHASE 4) ─── */}
                            <div className="p-4 rounded-xl border border-white/5" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.04), rgba(52,211,153,0.04))' }}>
                                <div className="flex items-center gap-2 mb-3">
                                    <DollarSign size={14} className="text-green-400" />
                                    <span className="text-xs font-bold text-green-300">Promote ROI Engine</span>
                                    {heroVideo.aiStrategy.promote_decision?.decision?.should_promote ? (
                                        <span className="text-[9px] ml-auto px-2 py-0.5 rounded-full font-bold bg-green-500/15 text-green-400">✓ NÊN ĐỔ TIỀN</span>
                                    ) : (
                                        <span className="text-[9px] ml-auto px-2 py-0.5 rounded-full font-bold bg-red-500/15 text-red-400">✗ GIỮ NGÂN SÁCH</span>
                                    )}
                                </div>
                                
                                {heroVideo.aiStrategy.promote_decision?.financial_metrics ? (
                                    <>
                                        <div className="grid grid-cols-3 gap-2 mb-3">
                                            <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5">
                                                <p className="text-[9px] text-gray-500">Ngân sách</p>
                                                <p className="text-xs text-white font-bold">${heroVideo.aiStrategy.promote_decision.financial_metrics.budget_usd}</p>
                                            </div>
                                            <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5">
                                                <p className="text-[9px] text-gray-500">Thực tế CPM</p>
                                                <p className="text-xs text-white font-bold">${heroVideo.aiStrategy.promote_decision.financial_metrics.effective_cpm}</p>
                                            </div>
                                            <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5">
                                                <p className="text-[9px] text-gray-500">Giá 1 người theo dõi (CPA)</p>
                                                <p className="text-xs text-white font-bold">${heroVideo.aiStrategy.promote_decision.financial_metrics.cost_per_follower}</p>
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-2 mb-3">
                                            <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5">
                                                <p className="text-[9px] text-gray-500 mb-1">Dự kiến Lượt xem</p>
                                                <div className="flex justify-between items-end">
                                                    <span className="text-[10px] text-gray-400">{fmt(heroVideo.aiStrategy.promote_decision.expected_outcomes.total_views.low)}</span>
                                                    <span className="text-[13px] text-green-400 font-black">{fmt(heroVideo.aiStrategy.promote_decision.expected_outcomes.total_views.expected)}</span>
                                                    <span className="text-[10px] text-gray-400">{fmt(heroVideo.aiStrategy.promote_decision.expected_outcomes.total_views.high)}</span>
                                                </div>
                                            </div>
                                            <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5">
                                                <p className="text-[9px] text-gray-500 mb-1">Dự kiến người theo dõi</p>
                                                <div className="flex justify-between items-end">
                                                    <span className="text-[10px] text-gray-400">{fmt(heroVideo.aiStrategy.promote_decision.expected_outcomes.followers_gained.low)}</span>
                                                    <span className="text-[13px] text-blue-400 font-black">{fmt(heroVideo.aiStrategy.promote_decision.expected_outcomes.followers_gained.expected)}</span>
                                                    <span className="text-[10px] text-gray-400">{fmt(heroVideo.aiStrategy.promote_decision.expected_outcomes.followers_gained.high)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-start gap-2 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                            <TrendingUp size={12} className="text-blue-400 mt-0.5 shrink-0" />
                                            <div>
                                                <p className="text-[10px] font-bold text-blue-300">Organic Spillover (Hiệu ứng khuếch đại)</p>
                                                <p className="text-[9px] text-blue-200/70 mt-0.5">
                                                    Video được buff x{heroVideo.aiStrategy.promote_decision.amplification_effect.multiplier} lần. Tặng kèm thêm <strong className="text-white">{fmt(heroVideo.aiStrategy.promote_decision.expected_outcomes.organic_spillover_views)} lượt xem tự nhiên</strong> không mất tiền!
                                                </p>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-gray-400 mt-3 pt-2 border-t border-white/5">
                                            <span className="text-gray-300 font-semibold">Quyết định: </span> 
                                            {heroVideo.aiStrategy.promote_decision.decision.verdict}
                                        </p>
                                    </>
                                ) : (
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { label: 'Budget', value: '$0', icon: '💰' },
                                            { label: 'Objective', value: 'None', icon: '🎯' },
                                            { label: 'Audience', value: 'N/A', icon: '👥' },
                                            { label: 'Risk', value: 'High', icon: '⚠️' },
                                        ].map(item => (
                                            <div key={item.label} className="p-2 rounded-lg bg-white/[0.03] border border-white/5">
                                                <p className="text-[9px] text-gray-600">{item.icon} {item.label}</p>
                                                <p className="text-[11px] text-white font-semibold mt-0.5 truncate">{item.value}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            
                            {/* ─── 3. CREATOR DNA & TREND INTELLIGENCE (PHASE 3) ─── */}
                            <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01]">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Activity size={14} className="text-purple-400" />
                                        <span className="text-xs font-bold text-purple-300">Creator DNA & Trend Intelligence</span>
                                    </div>
                                    <span className="text-[9px] font-bold text-gray-500 border border-white/10 px-2 py-0.5 rounded-full">
                                        {heroVideo.aiStrategy.creator_archetype?.primary.replace('_', ' ').toUpperCase() || 'UNKNOWN ARCHETYPE'}
                                    </span>
                                </div>
                                
                                {heroVideo.aiStrategy.trend_intelligence ? (
                                    <div className="space-y-3">
                                        <div className="flex flex-wrap gap-1.5">
                                            {heroVideo.aiStrategy.trend_intelligence.active_trends.map(t => (
                                                <div key={t.tag} className={`text-[9px] px-2 py-1 rounded-md border ${
                                                    t.stage === 'EMERGING' || t.stage === 'GROWING' ? 'bg-purple-500/20 border-purple-500/30 text-purple-300' :
                                                    t.stage === 'SATURATED' ? 'bg-red-500/10 border-red-500/20 text-red-300' :
                                                    'bg-white/5 border-white/10 text-gray-400'
                                                }`}>
                                                    {t.emoji} {t.tag} ({t.stage})
                                                </div>
                                            ))}
                                        </div>
                                        <div className="p-2 bg-white/5 rounded-lg">
                                            <p className="text-[9px] text-gray-400 mb-1">Hashtag Strategy (Discovery / Niche / Identity / Trend / Commercial)</p>
                                            <div className="flex gap-1 h-1.5 rounded-full overflow-hidden">
                                                {heroVideo.aiStrategy.hashtag_strategy && Object.entries(heroVideo.aiStrategy.hashtag_strategy.distribution).map(([tier, pct], i) => (
                                                    (pct as number) > 0 && <div key={tier} style={{width: `${pct}%`}} className={`h-full ${['bg-blue-400', 'bg-purple-400', 'bg-amber-400', 'bg-green-400', 'bg-red-400'][i%5]}`} />
                                                ))}
                                            </div>
                                        </div>
                                        <ul className="text-[10px] text-gray-400 space-y-1 mt-2">
                                            {heroVideo.aiStrategy.hashtag_strategy?.recommendations.slice(0, 3).map((rec, i) => (
                                                <li key={i}>• {rec}</li>
                                            ))}
                                        </ul>
                                    </div>
                                ) : (
                                    <p className="text-[10px] text-gray-500">Chưa có dữ liệu Trend & DNA.</p>
                                )}
                            </div>

                            {/* ─── 4. DRIFT MONITORING (PHASE 5) ─── */}
                            {heroVideo.aiStrategy.drift_monitoring?.drift_detected && (
                                <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5">
                                    <div className="flex items-center gap-2 mb-2">
                                        <AlertCircle size={14} className="text-red-400" />
                                        <span className="text-xs font-bold text-red-300">Cảnh báo: TikTok Algorithm Drift!</span>
                                    </div>
                                    <p className="text-[10px] text-red-200/70 mb-2">
                                        Thuật toán phân phối hiển thị đang có sự thay đổi lớn so với đường chuẩn của Model.
                                    </p>
                                    <ul className="text-[9px] text-red-300 space-y-1">
                                        {heroVideo.aiStrategy.drift_monitoring.signals.map((sig, i) => (
                                            <li key={i}>- {sig}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* ─── 3. HOOK REWRITE AI ─── */}
                            {heroVideo.aiStrategy.hook_rewrites && heroVideo.aiStrategy.hook_rewrites.length > 0 && (
                                <div className="p-4 rounded-xl border border-white/5" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.04), rgba(251,191,36,0.04))' }}>
                                    <div className="flex items-center gap-2 mb-3">
                                        <FileText size={14} className="text-amber-400" />
                                        <span className="text-xs font-bold text-amber-300">Hook Rewrite AI</span>
                                        <span className="text-[9px] ml-auto px-2 py-0.5 rounded-full font-bold bg-amber-500/15 text-amber-400">🔥 KILLER HOOKS</span>
                                    </div>
                                    <div className="space-y-2">
                                        {heroVideo.aiStrategy.hook_rewrites.map((hook, i) => (
                                            <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-white/[0.03] border border-white/5 group hover:border-amber-500/20 transition-colors cursor-pointer"
                                                onClick={() => { navigator.clipboard.writeText(hook); }}>
                                                <span className="text-[10px] font-bold text-amber-400 shrink-0 mt-0.5">#{i + 1}</span>
                                                <p className="text-[11px] text-gray-300 leading-relaxed flex-1">"{hook}"</p>
                                                <Copy size={10} className="text-gray-600 group-hover:text-amber-400 shrink-0 mt-0.5 transition-colors" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ─── 4. FAILURE DIAGNOSIS ─── */}
                            <div className="p-4 rounded-xl border border-white/5" style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.04), rgba(248,113,113,0.04))' }}>
                                <div className="flex items-center gap-2 mb-3">
                                    <AlertCircle size={14} className="text-red-400" />
                                    <span className="text-xs font-bold text-red-300">Failure Diagnosis</span>
                                    <span className={`text-[9px] ml-auto px-2 py-0.5 rounded-full font-bold ${
                                        heroVideo.aiStrategy.failure_diagnosis?.severity === 'HIGH' ? 'bg-red-500/15 text-red-400' :
                                        heroVideo.aiStrategy.failure_diagnosis?.severity === 'MEDIUM' ? 'bg-yellow-500/15 text-yellow-400' :
                                        'bg-green-500/15 text-green-400'
                                    }`}>{heroVideo.aiStrategy.failure_diagnosis?.severity || 'N/A'}</span>
                                </div>
                                <div className="space-y-2">
                                    <div className="p-2.5 rounded-lg bg-red-500/5 border border-red-500/10">
                                        <p className="text-[9px] text-red-400/60 font-bold uppercase">Primary Kill Reason</p>
                                        <p className="text-[11px] text-red-300 mt-0.5">{heroVideo.aiStrategy.failure_diagnosis?.primary_reason || 'N/A'}</p>
                                    </div>
                                    <div className="p-2.5 rounded-lg bg-orange-500/5 border border-orange-500/10">
                                        <p className="text-[9px] text-orange-400/60 font-bold uppercase">Secondary Issue</p>
                                        <p className="text-[11px] text-orange-300 mt-0.5">{heroVideo.aiStrategy.failure_diagnosis?.secondary_reason || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* ─── 5. SERIES DETECTOR ─── */}
                            <div className="p-4 rounded-xl border border-white/5" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.04), rgba(167,139,250,0.04))' }}>
                                <div className="flex items-center gap-2 mb-3">
                                    <Video size={14} className="text-violet-400" />
                                    <span className="text-xs font-bold text-violet-300">Series Detector</span>
                                    <span className="text-[9px] ml-auto font-bold text-violet-400">{heroVideo.aiStrategy.series_potential?.score || 0}/100</span>
                                </div>
                                <div className="relative h-2 bg-white/5 rounded-full overflow-hidden mb-2">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${heroVideo.aiStrategy.series_potential?.score || 0}%` }}
                                        transition={{ duration: 1, ease: 'easeOut' }}
                                        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-violet-500 to-purple-400"
                                    />
                                </div>
                                <p className="text-[10px] text-gray-400 leading-relaxed">{heroVideo.aiStrategy.series_potential?.reason || 'N/A'}</p>
                            </div>

                            {/* ─── 6. ALGORITHM RISK DETECTION ─── */}
                            {heroVideo.aiStrategy.algorithm_risk && heroVideo.aiStrategy.algorithm_risk.length > 0 && (
                                <div className="p-4 rounded-xl border border-white/5" style={{ background: 'linear-gradient(135deg, rgba(234,179,8,0.04), rgba(250,204,21,0.04))' }}>
                                    <div className="flex items-center gap-2 mb-3">
                                        <AlertCircle size={14} className="text-yellow-400" />
                                        <span className="text-xs font-bold text-yellow-300">Algorithm Risk Detection</span>
                                    </div>
                                    <div className="space-y-1.5">
                                        {heroVideo.aiStrategy.algorithm_risk.map((risk, i) => (
                                            <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-yellow-500/5 border border-yellow-500/10">
                                                <span className="text-yellow-400 text-[10px] shrink-0 mt-0.5">⚡</span>
                                                <p className="text-[11px] text-yellow-200/80">{risk}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ─── 7. AUTOMATION PIPELINE (PHASE 6) ─── */}
                        {heroVideo.aiStrategy.automation && (
                            <div className="mt-4 p-4 rounded-xl border border-white/5" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.04), rgba(16,185,129,0.04))' }}>
                                <div className="flex items-center gap-2 mb-3">
                                    <Activity size={14} className="text-emerald-400" />
                                    <span className="text-xs font-bold text-emerald-300">Automation Pipeline</span>
                                    <span className={`text-[9px] ml-auto px-2 py-0.5 rounded-full font-bold ${
                                        heroVideo.aiStrategy.automation.status === 'RUNNING' ? 'bg-emerald-500/15 text-emerald-400' :
                                        heroVideo.aiStrategy.automation.status === 'PAUSED' ? 'bg-yellow-500/15 text-yellow-400' :
                                        'bg-gray-500/15 text-gray-400'
                                    }`}>{heroVideo.aiStrategy.automation.status}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <div className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-between">
                                        <span className="text-[10px] text-emerald-400 font-bold uppercase">Auto Promote</span>
                                        <span className="text-xs">{heroVideo.aiStrategy.automation.auto_promote_trigger ? '🟢 ON' : '⚫ OFF'}</span>
                                    </div>
                                    <div className="p-2.5 rounded-lg bg-red-500/5 border border-red-500/10 flex items-center justify-between">
                                        <span className="text-[10px] text-red-400 font-bold uppercase">Auto Kill</span>
                                        <span className="text-xs">{heroVideo.aiStrategy.automation.auto_kill_trigger ? '🔴 ON' : '⚫ OFF'}</span>
                                    </div>
                                </div>
                                {heroVideo.aiStrategy.automation.recommended_actions.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Hành động đề xuất</p>
                                        {heroVideo.aiStrategy.automation.recommended_actions.map((action, i) => (
                                            <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-white/[0.03] border border-white/5">
                                                <span className="text-[10px] mt-0.5 shrink-0">
                                                    {action.type === 'PROMOTE' ? '💸' : action.type === 'KILL' ? '🛑' : '🔄'}
                                                </span>
                                                <div className="flex-1">
                                                    <p className="text-[11px] text-white font-semibold">{action.action}</p>
                                                    <p className="text-[9px] text-gray-500">{action.impact}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ─── AI SCORE RADAR ─── */}
                        <div className="mt-4 p-4 rounded-xl border border-white/5 bg-white/[0.01]">
                            <h4 className="text-xs font-bold text-gray-300 mb-3 flex items-center gap-2">
                                <Activity size={13} className="text-cyan-400" />
                                Điểm AI Breakdown
                            </h4>
                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                {[
                                    { label: 'Hook', score: heroVideo.aiStrategy.hook_score },
                                    { label: 'Giữ chân', score: heroVideo.aiStrategy.retention_score },
                                    { label: 'Viral', score: heroVideo.aiStrategy.viral_score },
                                    { label: 'Chuyển đổi', score: heroVideo.aiStrategy.conversion_score },
                                    { label: 'Scale', score: heroVideo.aiStrategy.scalability_score },
                                    { label: 'Promote', score: heroVideo.aiStrategy.promote_worthiness },
                                ].map(item => (
                                    <div key={item.label} className="text-center">
                                        <div className="relative w-12 h-12 mx-auto mb-1">
                                            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                                                <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                                                <circle cx="18" cy="18" r="16" fill="none"
                                                    stroke={item.score >= 8 ? '#10b981' : item.score >= 6 ? '#f59e0b' : '#ef4444'}
                                                    strokeWidth="3"
                                                    strokeDasharray={`${(item.score / 10) * 100.5} 100.5`}
                                                    strokeLinecap="round" className="transition-all duration-1000" />
                                            </svg>
                                            <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-white">{item.score}</span>
                                        </div>
                                        <p className="text-[9px] text-gray-500 font-bold uppercase">{item.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ══════════════════════════════════════════════════════════ */}
                        {/* VNEXT ULTIMATE — RETENTION TIMELINE + DROP ANALYSIS       */}
                        {/* ══════════════════════════════════════════════════════════ */}
                        {heroVideo.aiStrategy.retention_timeline && heroVideo.aiStrategy.retention_timeline.length > 0 && (
                            <div className="mt-4 p-4 rounded-xl border border-white/5" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.04), rgba(59,130,246,0.04))' }}>
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-xs font-bold text-cyan-300 flex items-center gap-2">
                                        <Activity size={13} className="text-cyan-400" />
                                        Giữ chân Timeline
                                    </h4>
                                    {heroVideo.aiStrategy.drop_analysis && (
                                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 font-bold">
                                            ⬇ -{heroVideo.aiStrategy.drop_analysis.estimated_drop_pct}% tại {heroVideo.aiStrategy.drop_analysis.biggest_drop_window}
                                        </span>
                                    )}
                                </div>
                                {/* Chart */}
                                <div className="relative h-24 flex items-end gap-1">
                                    {heroVideo.aiStrategy.retention_timeline.map((pt, i) => {
                                        const pct = pt.retention;
                                        const isDropZone = heroVideo.aiStrategy.drop_analysis &&
                                            `${pt.second}s` <= heroVideo.aiStrategy.drop_analysis.biggest_drop_window.split('-')[1];
                                        return (
                                            <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-black/80 text-white text-[9px] rounded px-1 py-0.5 whitespace-nowrap">
                                                    {pt.event}: {pct}%
                                                </div>
                                                <motion.div
                                                    initial={{ height: 0 }}
                                                    animate={{ height: `${pct}%` }}
                                                    transition={{ duration: 0.8, delay: i * 0.1 }}
                                                    className={`w-full rounded-t ${isDropZone ? 'ring-1 ring-red-400/40' : ''} ${pct >= 70 ? 'bg-gradient-to-t from-cyan-600 to-cyan-400' : pct >= 45 ? 'bg-gradient-to-t from-amber-600 to-amber-400' : 'bg-gradient-to-t from-red-700 to-red-500'}`}
                                                    style={{ minHeight: 4 }}
                                                />
                                                <span className="text-[8px] text-gray-600">{pt.second}s</span>
                                            </div>
                                        );
                                    })}
                                </div>
                                {/* Drop Analysis & New Insights */}
                                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {heroVideo.aiStrategy.drop_analysis && (
                                        <>
                                            <div className="p-2.5 rounded-lg bg-red-500/5 border border-red-500/10">
                                                <p className="text-[9px] text-red-400/60 font-bold uppercase mb-0.5">📉 Điểm rơi mạnh nhất</p>
                                                <p className="text-[11px] text-red-300 font-semibold">{heroVideo.aiStrategy.drop_analysis.biggest_drop_window} — {heroVideo.aiStrategy.drop_analysis.reason}</p>
                                            </div>
                                            <div className="p-2.5 rounded-lg bg-green-500/5 border border-green-500/10">
                                                <p className="text-[9px] text-green-400/60 font-bold uppercase mb-0.5">🔧 Fix</p>
                                                <p className="text-[11px] text-green-300">{heroVideo.aiStrategy.drop_analysis.fix}</p>
                                            </div>
                                        </>
                                    )}
                                    {heroVideo.aiStrategy.rewatch_spikes && heroVideo.aiStrategy.rewatch_spikes.length > 0 && (
                                        <div className="p-2.5 rounded-lg bg-purple-500/5 border border-purple-500/10">
                                            <p className="text-[9px] text-purple-400/60 font-bold uppercase mb-0.5">🔥 Điểm xem lại</p>
                                            <div className="flex gap-1 flex-wrap">
                                                {heroVideo.aiStrategy.rewatch_spikes.map(s => (
                                                    <span key={s} className="text-[10px] text-purple-300 bg-purple-500/20 px-1.5 rounded">
                                                        {s}s
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {heroVideo.aiStrategy.scene_correlation && Object.keys(heroVideo.aiStrategy.scene_correlation).length > 0 && (
                                        <div className="p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/10">
                                            <p className="text-[9px] text-blue-400/60 font-bold uppercase mb-0.5">🎬 Tương quan cảnh quay</p>
                                            <div className="flex flex-col gap-0.5">
                                                {Object.entries(heroVideo.aiStrategy.scene_correlation).slice(0, 2).map(([scene, val]) => (
                                                    <div key={scene} className="flex items-center justify-between">
                                                        <span className="text-[10px] text-blue-300 truncate">{scene.replace('_', ' ')}</span>
                                                        <span className={`text-[10px] font-bold ${(val as number) > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                            {(val as number) > 0 ? '+' : ''}{val}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ─── VIRAL REASONING ENGINE ─── */}
                        {heroVideo.aiStrategy.viral_reasoning && heroVideo.aiStrategy.viral_reasoning.length > 0 && (
                            <div className="mt-4 p-4 rounded-xl border border-white/5" style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.04), rgba(236,72,153,0.04))' }}>
                                <h4 className="text-xs font-bold text-purple-300 flex items-center gap-2 mb-3">
                                    <Zap size={13} className="text-purple-400" />
                                    Vì sao video này viral hoặc không viral
                                </h4>
                                <div className="space-y-2">
                                    {heroVideo.aiStrategy.viral_reasoning.map((reason, i) => (
                                        <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                                            <span className="text-purple-400 font-black text-sm shrink-0 leading-tight">{i + 1}</span>
                                            <p className="text-[11px] text-gray-300 leading-relaxed">{reason}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ─── VOICE + VISUAL ANALYSIS ─── */}
                        {(heroVideo.aiStrategy.voice_analysis || heroVideo.aiStrategy.visual_analysis) && (
                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {/* Voice */}
                                {heroVideo.aiStrategy.voice_analysis && (
                                    <div className="p-4 rounded-xl border border-white/5" style={{ background: 'linear-gradient(135deg, rgba(251,146,60,0.04), rgba(245,158,11,0.04))' }}>
                                        <h4 className="text-xs font-bold text-orange-300 flex items-center gap-2 mb-3">
                                            <Wifi size={12} className="text-orange-400" />
                                            Phân tích giọng nói và âm thanh
                                        </h4>
                                        <div className="grid grid-cols-2 gap-1.5 mb-2">
                                            {[
                                                { label: 'Năng lượng', value: heroVideo.aiStrategy.voice_analysis.voice_energy },
                                                { label: 'Tốc độ', value: heroVideo.aiStrategy.voice_analysis.speaking_speed },
                                                { label: 'Cảm xúc', value: heroVideo.aiStrategy.voice_analysis.emotion_intensity },
                                                { label: 'Độ mạnh hook', value: `${heroVideo.aiStrategy.voice_analysis.audio_hook_strength}/10` },
                                            ].map(item => (
                                                <div key={item.label} className="p-1.5 rounded bg-white/[0.03] border border-white/5">
                                                    <p className="text-[8px] text-gray-600 font-bold">{item.label}</p>
                                                    <p className={`text-[10px] font-bold mt-0.5 ${
                                                        item.value === 'HIGH' || item.value === 'FAST' || item.value === 'STRONG' ? 'text-green-400' :
                                                        item.value === 'LOW' || item.value === 'TOO SLOW' || item.value === 'WEAK' ? 'text-red-400' : 'text-amber-400'
                                                    }`}>{displaySignal(item.value)}</p>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-[10px] text-gray-500 leading-relaxed">{heroVideo.aiStrategy.voice_analysis.assessment}</p>
                                    </div>
                                )}
                                {/* Visual */}
                                {heroVideo.aiStrategy.visual_analysis && (
                                    <div className="p-4 rounded-xl border border-white/5" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.04), rgba(52,211,153,0.04))' }}>
                                        <h4 className="text-xs font-bold text-emerald-300 flex items-center gap-2 mb-3">
                                            <Eye size={12} className="text-emerald-400" />
                                            Phân tích hình ảnh và khung hình
                                        </h4>
                                        <div className="grid grid-cols-2 gap-1.5 mb-2">
                                            {[
                                                { label: 'Hook hình ảnh', value: `${heroVideo.aiStrategy.visual_analysis.visual_hook_strength}/10` },
                                                { label: 'Phụ đề', value: heroVideo.aiStrategy.visual_analysis.subtitle_quality },
                                                { label: 'Chuyển động', value: heroVideo.aiStrategy.visual_analysis.motion_intensity },
                                                { label: 'Độ rõ', value: heroVideo.aiStrategy.visual_analysis.visual_clarity },
                                            ].map(item => (
                                                <div key={item.label} className="p-1.5 rounded bg-white/[0.03] border border-white/5">
                                                    <p className="text-[8px] text-gray-600 font-bold">{item.label}</p>
                                                    <p className={`text-[10px] font-bold mt-0.5 ${
                                                        item.value === 'STRONG' || item.value === 'HIGH' || item.value === 'CLEAR' ? 'text-green-400' :
                                                        item.value === 'WEAK' || item.value === 'STATIC' || item.value === 'CLUTTERED' ? 'text-red-400' : 'text-amber-400'
                                                    }`}>{displaySignal(item.value)}</p>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-[10px] text-gray-500 leading-relaxed">{heroVideo.aiStrategy.visual_analysis.assessment}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ─── A/B TEST GENERATOR ─── */}
                        {heroVideo.aiStrategy.ab_test && heroVideo.aiStrategy.ab_test.hook_a !== 'N/A' && (
                            <div className="mt-4 p-4 rounded-xl border border-white/5" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.04), rgba(139,92,246,0.04))' }}>
                                <h4 className="text-xs font-bold text-indigo-300 flex items-center gap-2 mb-3">
                                    <ArrowUpRight size={13} className="text-indigo-400" />
                                    A/B Test Generator
                                    <span className="text-[9px] ml-auto px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400">🧪 MEDIA BUYER</span>
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                                    <div className="space-y-2">
                                        <p className="text-[9px] text-gray-500 font-bold uppercase">Thử nghiệm hook</p>
                                        {[heroVideo.aiStrategy.ab_test.hook_a, heroVideo.aiStrategy.ab_test.hook_b].map((hook, i) => (
                                            <div key={i} className={`p-2.5 rounded-lg border text-[11px] cursor-pointer group flex items-start gap-2 hover:border-indigo-500/30 transition-colors ${i === 0 ? 'border-blue-500/20 bg-blue-500/5' : 'border-purple-500/20 bg-purple-500/5'}`}
                                                onClick={() => navigator.clipboard.writeText(hook)}>
                                                <span className={`text-[10px] font-black shrink-0 ${i === 0 ? 'text-blue-400' : 'text-purple-400'}`}>{String.fromCharCode(65 + i)}</span>
                                                <p className={`flex-1 ${i === 0 ? 'text-blue-200' : 'text-purple-200'}`}>{hook}</p>
                                                <Copy size={9} className="text-gray-600 group-hover:text-indigo-400 shrink-0 transition-colors" />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-[9px] text-gray-500 font-bold uppercase">Thử nghiệm CTA</p>
                                        {[heroVideo.aiStrategy.ab_test.cta_a, heroVideo.aiStrategy.ab_test.cta_b].map((cta, i) => (
                                            <div key={i} className={`p-2.5 rounded-lg border text-[11px] cursor-pointer group flex items-start gap-2 hover:border-green-500/30 transition-colors ${i === 0 ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-teal-500/20 bg-teal-500/5'}`}
                                                onClick={() => navigator.clipboard.writeText(cta)}>
                                                <span className={`text-[10px] font-black shrink-0 ${i === 0 ? 'text-emerald-400' : 'text-teal-400'}`}>{String.fromCharCode(65 + i)}</span>
                                                <p className={`flex-1 ${i === 0 ? 'text-emerald-200' : 'text-teal-200'}`}>{cta}</p>
                                                <Copy size={9} className="text-gray-600 group-hover:text-green-400 shrink-0 transition-colors" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="p-2.5 rounded-lg bg-indigo-500/5 border border-indigo-500/10">
                                    <p className="text-[9px] text-indigo-400/70 font-bold uppercase mb-0.5">🔬 Giả thuyết thử nghiệm</p>
                                    <p className="text-[11px] text-indigo-200">{heroVideo.aiStrategy.ab_test.test_hypothesis}</p>
                                </div>
                            </div>
                        )}

                        {/* ─── NEXT VIDEO IDEA ─── */}
                        {heroVideo.aiStrategy.next_video_idea && heroVideo.aiStrategy.next_video_idea.title !== 'N/A' && heroVideo.aiStrategy.next_video_idea.title !== 'Retry analysis with AI enabled' && (
                            <div className="mt-4 p-4 rounded-xl border border-white/5 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(236,72,153,0.05), rgba(168,85,247,0.05))' }}>
                                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-pink-500/40 to-transparent" />
                                <h4 className="text-xs font-bold text-pink-300 flex items-center gap-2 mb-3">
                                    <Sparkles size={13} className="text-pink-400" />
                                    Ý tưởng video tiếp theo do AI đề xuất
                                    <span className="text-[9px] ml-auto px-2 py-0.5 rounded-full bg-pink-500/15 text-pink-400">🎬 CONTENT PLAYBOOK</span>
                                </h4>
                                <div className="space-y-2">
                                    <div className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
                                        <p className="text-[9px] text-gray-500 font-bold uppercase mb-1">📌 Tiêu đề</p>
                                        <p className="text-sm font-bold text-white">{heroVideo.aiStrategy.next_video_idea.title}</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-pink-500/5 border border-pink-500/10">
                                        <p className="text-[9px] text-pink-400/70 font-bold uppercase mb-1">🎯 Opening Hook</p>
                                        <p className="text-[11px] text-pink-200 font-medium italic">"{heroVideo.aiStrategy.next_video_idea.hook}"</p>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { label: 'Ý tưởng', value: heroVideo.aiStrategy.next_video_idea.concept, icon: '💡' },
                                            { label: 'Định dạng', value: heroVideo.aiStrategy.next_video_idea.format, icon: '📱' },
                                            { label: 'Dựng video', value: heroVideo.aiStrategy.next_video_idea.editing_style, icon: '✂️' },
                                        ].map(item => (
                                            <div key={item.label} className="p-2 rounded-lg bg-white/[0.02] border border-white/5">
                                                <p className="text-[8px] text-gray-600 font-bold uppercase">{item.icon} {item.label}</p>
                                                <p className="text-[10px] text-gray-300 mt-0.5 leading-snug">{item.value}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </motion.div>
            )}

            {/* ═══════════════════════════════════ */}
            {/* CHANNEL-LEVEL MISSION CONTROL PANELS */}
            {/* ═══════════════════════════════════ */}
            {channel && (channel.viral_patterns?.length || channel.content_dna) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* ─── VIRAL PATTERN DETECTOR ─── */}
                    {channel.viral_patterns && channel.viral_patterns.length > 0 && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                            className="p-5 rounded-xl border border-white/5" style={{ background: 'linear-gradient(135deg, rgba(236,72,153,0.04), rgba(244,114,182,0.04))' }}>
                            <div className="flex items-center gap-2 mb-4">
                                <Zap size={15} className="text-pink-400" />
                                <span className="text-sm font-bold text-pink-300">Bộ phát hiện mẫu viral</span>
                                <span className="text-[9px] ml-auto px-2 py-0.5 rounded-full font-bold bg-pink-500/15 text-pink-400">{channel.viral_patterns.length} patterns</span>
                            </div>
                            <div className="space-y-2">
                                {channel.viral_patterns.map((pattern, i) => (
                                    <div key={i} className="flex items-start gap-2.5 p-3 rounded-lg bg-white/[0.02] border border-white/5 hover:border-pink-500/20 transition-colors">
                                        <span className="text-pink-400 font-bold text-xs shrink-0 mt-0.5">#{i + 1}</span>
                                        <p className="text-[11px] text-gray-300 leading-relaxed">{pattern}</p>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* ─── CONTENT DNA ─── */}
                    {channel.content_dna && Object.keys(channel.content_dna).length > 0 && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                            className="p-5 rounded-xl border border-white/5" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.04), rgba(34,211,238,0.04))' }}>
                            <div className="flex items-center gap-2 mb-4">
                                <Sparkles size={15} className="text-cyan-400" />
                                <span className="text-sm font-bold text-cyan-300">DNA nội dung</span>
                                <span className="text-[9px] ml-auto px-2 py-0.5 rounded-full font-bold bg-cyan-500/15 text-cyan-400">🧬 GENETIC MAP</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { label: 'Phong cách chính', value: channel.content_dna.primary_style, icon: '🎬' },
                                    { label: 'Emotion Trigger', value: channel.content_dna.emotion_trigger, icon: '💡' },
                                    { label: 'Content Pillar', value: channel.content_dna.content_pillar, icon: '🏛️' },
                                    { label: 'Phong cách dựng video', value: channel.content_dna.editing_style, icon: '✂️' },
                                    { label: 'CTA Style', value: channel.content_dna.cta_style, icon: '📢' },
                                    { label: 'Creator Persona', value: channel.content_dna.creator_persona, icon: '👤' },
                                ].map(item => (
                                    <div key={item.label} className="p-2.5 rounded-lg bg-white/[0.03] border border-white/5">
                                        <p className="text-[9px] text-gray-600 font-bold uppercase">{item.icon} {item.label}</p>
                                        <p className="text-[11px] text-cyan-200 font-semibold mt-1 truncate">{item.value || 'N/A'}</p>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </div>
            )}

            {/* Channel + Stats */}
            {channel && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                        className="lg:col-span-6 glass-card p-5 flex flex-col gap-4">
                        <div className="flex items-start gap-4">
                            <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-xl shadow-pink-500/20 shrink-0 ring-2 ring-pink-500/20 ring-offset-2 ring-offset-[#0a0a0f]">
                                {channel.avatar}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h2 className="text-base font-bold">{channel.displayName}</h2>
                                    <span className="text-[11px] text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">@{channel.username}</span>
                                    <span className="text-[9px] px-2 py-0.5 bg-purple-500/15 text-purple-300 rounded-full font-bold">{channel.niche}</span>
                                </div>
                                <p className="text-[11px] text-gray-500 mt-1 whitespace-pre-line line-clamp-2 leading-relaxed">{channel.bio}</p>
                                <div className="flex gap-4 mt-2 text-xs">
                                    <span><strong className="text-white">{fmt(channel.following)}</strong> <span className="text-gray-500">Following</span></span>
                                    <span><strong className="text-white">{fmt(channel.followers)}</strong> <span className="text-gray-500">người theo dõi</span></span>
                                    <span><strong className="text-white">{fmt(channel.totalLikes)}</strong> <span className="text-gray-500">Lượt thích</span></span>
                                </div>
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {channel.topHashtags.map(h => (<span key={h} className="text-[10px] px-2 py-0.5 bg-white/5 text-gray-400 rounded-full border border-white/5">{h}</span>))}
                                </div>
                            </div>
                        </div>
                        
                        {/* Account Health Section */}
                        {channel.account_health && (
                            <div className="mt-2 pt-3 border-t border-white/5 grid grid-cols-4 gap-2">
                                <div className="text-center">
                                    <p className="text-[9px] text-gray-500 uppercase font-bold">Sức khỏe kênh</p>
                                    <p className={`text-sm font-bold ${channel.account_health.health_score >= 80 ? 'text-green-400' : channel.account_health.health_score >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                                        {channel.account_health.health_score} <span className="text-[9px] text-gray-600">/ 100</span>
                                    </p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[9px] text-gray-500 uppercase font-bold">Độ ổn định</p>
                                    <p className="text-sm font-bold text-blue-400">{channel.account_health.consistency_score}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[9px] text-gray-500 uppercase font-bold">Giữ chân</p>
                                    <p className="text-[11px] font-bold text-purple-400 mt-1">{displaySignal(channel.account_health.retention_stability)}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[9px] text-gray-500 uppercase font-bold">Audience</p>
                                    <p className="text-[10px] font-bold text-cyan-400 mt-1 leading-tight">{displaySignal(channel.account_health.audience_profile)}</p>
                                </div>
                            </div>
                        )}
                    </motion.div>
                    
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
                        className="lg:col-span-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <StatCard icon={Eye} label="Median lượt xem" value={fmt(channel.medianViews || channel.avgViews)} sub={`TB: ${fmt(channel.avgViews)}`} color="text-pink-400" />
                        <StatCard icon={TrendingUp} label="Xu hướng tăng tốc" value={`+${channel.growthRate}%`} sub="Động lực tăng trưởng" color="text-blue-400" />
                        <StatCard icon={Crown} label="Tỷ lệ viral organic" value={`${organicHitCount}/${channel.videos.length}`} sub="Viral hoặc breakout" color="text-green-400" />
                        <StatCard icon={Activity} label="Tương tác" value={channel.avgEngagement + '%'} sub="Điểm có trọng số" color="text-purple-400" />
                    </motion.div>
                </div>
            )}

            {/* AI Banner */}
            {recommendedCount > 0 && !heroVideo && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="glass-card p-5 border-purple-500/15 relative overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.04), rgba(236,72,153,0.04))' }}>
                    <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
                    <div className="flex flex-col sm:flex-row items-start gap-4">
                        <div className="w-11 h-11 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/25">
                            <Sparkles size={20} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-sm flex items-center gap-2 flex-wrap">
                                AI Đề Xuất Chiến Lược Quảng Cáo
                                <span className="text-[10px] px-2 py-0.5 bg-purple-500/15 text-purple-300 rounded-full font-bold border border-purple-500/20">{recommendedCount} video tiềm năng</span>
                            </h3>
                            {(() => { const top = sortedVideos.find(v => v.aiRecommended); if (!top) return null; return (
                                <div className="mt-2 space-y-1.5">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <StrategyBadge goal={top.aiStrategy.goal} />
                                        <span className="text-[10px] text-gray-500">Điểm AI: <strong className="text-white">{top.aiStrategy.overall_score}</strong></span>
                                        <span className="text-[10px] text-green-400">📈 {top.aiStrategy.estimated_growth_potential}</span>
                                    </div>
                                    <p className="text-xs text-gray-400 leading-relaxed">{top.aiStrategy.final_verdict}</p>
                                </div>
                            ); })()}
                        </div>
                        {(() => {
                            const candidate = sortedVideos.find(v => canRunPaidTest(v.aiStrategy.promotion_decision));
                            if (!candidate) return null;
                            return (
                                <button onClick={() => handlePromote(candidate)}
                                    className="shrink-0 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl text-xs font-bold hover:shadow-lg hover:shadow-cyan-500/25 transition-all active:scale-95 flex items-center gap-1.5">
                                    <Megaphone size={14} /> Chạy test an toàn <ChevronRight size={12} />
                                </button>
                            );
                        })()}
                    </div>
                </motion.div>
            )}

            {/* Tabs + Sort */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex bg-white/[0.03] rounded-xl p-1 border border-white/5">
                    {([
                        { key: 'all' as TabKey, label: 'Tất cả', count: sortedVideos.length },
                        { key: 'recommended' as TabKey, label: 'AI Đề Xuất', count: recommendedCount },
                        { key: 'history' as TabKey, label: 'Lịch sử', count: mockCampaignHistory.length },
                    ]).map(tab => (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${activeTab === tab.key ? 'bg-white/10 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}>
                            {tab.label}
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? 'bg-white/10' : 'bg-white/5'}`}>{tab.count}</span>
                        </button>
                    ))}
                </div>
                {activeTab !== 'history' && (
                    <div className="flex items-center gap-1.5">
                        <button onClick={() => { setIsCompareMode(!isCompareMode); setSelectedForCompare([]); }}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all ${isCompareMode ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-lg shadow-cyan-500/10' : 'bg-white/5 text-gray-400 hover:text-white border border-white/5'}`}>
                            <Activity size={12} /> {isCompareMode ? 'Thoát so sánh' : 'so sánh Mode'}
                        </button>
                        <div className="w-[1px] h-4 bg-white/10 mx-1" />
                        {([
                            { key: 'aiScore' as const, icon: Sparkles, label: 'Điểm AI' },
                            { key: 'views' as const, icon: Eye, label: 'Lượt xem' },
                            { key: 'likes' as const, icon: Heart, label: 'Lượt thích' },
                            { key: 'comments' as const, icon: MessageCircle, label: 'Bình luận' },
                        ]).map(s => (
                            <button key={s.key} onClick={() => setSortBy(s.key)}
                                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all ${sortBy === s.key ? 'bg-purple-500/15 text-purple-300 border border-purple-500/20' : 'text-gray-500 hover:text-gray-300 border border-transparent'}`}>
                                <s.icon size={11} /> {s.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* History */}
            {activeTab === 'history' && (
                <div className="space-y-3">
                    {mockCampaignHistory.map((c, i) => (
                        <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                            className="glass-card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold truncate">{c.videoTitle}</p>
                                <p className="text-[11px] text-gray-500 mt-0.5">{c.goal} • {c.date}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${c.status === 'running' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20' : c.status === 'completed' ? 'bg-green-500/15 text-green-400 border border-green-500/20' : 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20'}`}>
                                    {c.status === 'running' ? '🔵 Đang chạy' : c.status === 'completed' ? '✅ Hoàn tất' : '⏸️ Tạm dừng'}
                                </span>
                                <div className="text-right">
                                    <p className="text-xs font-bold">{fmtVND(c.spent)}</p>
                                    <p className="text-[10px] text-green-400">{c.result}</p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Video Grid — uses extracted memoized VideoCard */}
            {activeTab !== 'history' && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    <AnimatePresence mode="popLayout">
                        {displayVideos.map((video, i) => (
                            <VideoCard
                                key={video.id}
                                video={video}
                                index={i}
                                isExpanded={expandedVideo === video.id}
                                isCompareMode={isCompareMode}
                                isSelectedForCompare={selectedForCompare.includes(video.id)}
                                onToggleExpand={handleToggleExpand}
                                onPromote={handlePromote}
                                onToggleCompare={handleToggleCompare}
                            />
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* ═══ PROMOTE MODAL ═══ */}
            <AnimatePresence>
                {showPromoteModal && selectedVideo && createPortal(
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed top-0 left-0 w-screen h-screen z-[9999] flex items-center justify-center p-4"
                        style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}
                        onClick={() => setShowPromoteModal(false)}>
                        <motion.div initial={{ scale: 0.92, opacity: 0, y: 40 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.92, opacity: 0, y: 40 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            className="w-full max-w-[520px] rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
                            style={{ background: '#0c0c10', border: '1px solid rgba(255,255,255,0.08)' }}
                            onClick={(e) => e.stopPropagation()}>
                            {paymentSuccess ? (
                                <div className="p-12 text-center space-y-5">
                                    <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                                        className="w-20 h-20 bg-green-500/15 rounded-full flex items-center justify-center mx-auto border border-green-500/20">
                                        <Check size={40} className="text-green-400" />
                                    </motion.div>
                                    <h3 className="text-xl font-bold">Chiến dịch đã được tạo! 🎉</h3>
                                    <p className="text-gray-400 text-sm leading-relaxed">Video "<span className="text-white font-medium">{selectedVideo.title.slice(0, 45)}...</span>" đang được chạy chiến dịch <strong className="text-purple-400">{goalConfig[selectedGoal].label}</strong>.</p>
                                    <div className="flex items-center justify-center gap-2 text-xs text-gray-500"><Clock size={12} /> Dự kiến hoàn tất trong 1-3 ngày</div>
                                </div>
                            ) : (
                                <>
                                    <div className="p-5 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <h3 className="font-bold text-base flex items-center gap-2"><Megaphone size={18} className="text-pink-400" /> Tạo Chiến Dịch Promote</h3>
                                        <button onClick={() => setShowPromoteModal(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors"><X size={16} /></button>
                                    </div>
                                    <div className="p-5 space-y-5">
                                        {/* Video preview */}
                                        <div className="flex items-center gap-3 p-3 rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-white/5">
                                                {selectedVideo.thumbnail ? (
                                                    <img src={selectedVideo.thumbnail} alt="" className="w-full h-full object-cover" loading="lazy" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center"><Play size={20} className="text-white/20" /></div>
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium truncate">{selectedVideo.title}</p>
                                                <p className="text-[11px] text-gray-500">{selectedVideo.postedAt} • {fmt(selectedVideo.views)} lượt xem</p>
                                            </div>
                                            <CircularScore score={selectedVideo.aiScore} size={38} />
                                        </div>

                                        {/* Growth Target in Modal */}
                                        <div className="p-3 rounded-xl space-y-2" style={{ background: 'rgba(59,130,246,0.04)', border: '1px solid rgba(59,130,246,0.1)' }}>
                                            <div className="flex items-center gap-2">
                                                <Target size={12} className="text-blue-400" />
                                                <span className="text-[11px] font-bold text-blue-300">Mục tiêu tăng trưởng</span>
                                            </div>
                                            <GrowthBar current={selectedVideo.views} target={selectedVideo.targetViews} label="Lượt xem" color="text-blue-400" icon={Eye} />
                                        </div>

                                        {/* AI recommendation */}
                                        <div className="p-3 rounded-xl space-y-1.5" style={{ background: 'rgba(168,85,247,0.04)', border: '1px solid rgba(168,85,247,0.1)' }}>
                                            <div className="flex items-center gap-2">
                                                <Sparkles size={12} className="text-purple-400" />
                                                <span className="text-[11px] font-bold text-purple-300">AI khuyến nghị</span>
                                                <StrategyBadge goal={selectedVideo.aiStrategy.goal} small />
                                                <span className="text-[9px] text-gray-500 ml-auto">Điểm AI {selectedVideo.aiStrategy.overall_score}</span>
                                            </div>
                                            <p className="text-[10px] text-gray-400 leading-relaxed">{selectedVideo.aiStrategy.final_verdict.slice(0, 200)}...</p>
                                        </div>

                                        {/* Goals */}
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Chọn mục tiêu</h4>
                                            <div className="space-y-2">
                                                {(Object.entries(goalConfig) as [PromoteGoal, typeof goalConfig[PromoteGoal]][]).map(([key, cfg]) => (
                                                    <button key={key} onClick={() => { setSelectedGoal(key); setSelectedPack(null); }}
                                                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${selectedGoal === key ? 'border-pink-500/25' : 'border-white/5 hover:bg-white/[0.03]'}`}
                                                        style={selectedGoal === key ? { background: 'rgba(236,72,153,0.06)' } : {}}>
                                                        <cfg.icon size={17} className={selectedGoal === key ? cfg.color : 'text-gray-500'} />
                                                        <div className="flex-1 min-w-0">
                                                            <p className={`text-[13px] font-semibold flex items-center gap-2 ${selectedGoal === key ? 'text-white' : 'text-gray-300'}`}>
                                                                {cfg.label}
                                                                {key === selectedVideo.aiStrategy.goal && (<span className="text-[8px] px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded font-bold">AI chọn</span>)}
                                                            </p>
                                                            <p className="text-[10px] text-gray-500">{cfg.desc}</p>
                                                        </div>
                                                        <div className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0 ${selectedGoal === key ? 'border-pink-500 bg-pink-500' : 'border-white/15'}`}>
                                                            {selectedGoal === key && <Check size={10} className="text-white" />}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Packs */}
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Chọn gói Promote</h4>
                                            <p className="text-[10px] text-gray-600 mb-3">Kết quả hiển thị là ước tính</p>
                                            <div className="space-y-2">
                                                {promotePacksMap[selectedGoal].map((pack) => (
                                                    <button key={pack.id} onClick={() => setSelectedPack(pack.id)}
                                                        className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left ${selectedPack === pack.id ? 'border-pink-500/30' : 'border-white/5 hover:border-white/10'}`}
                                                        style={selectedPack === pack.id ? { background: 'rgba(236,72,153,0.06)' } : { background: 'rgba(255,255,255,0.015)' }}>
                                                        <div className="w-9 h-9 bg-gradient-to-br from-pink-500/15 to-purple-500/15 rounded-xl flex items-center justify-center shrink-0"><Zap size={16} className="text-pink-400" /></div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-bold">{pack.range}</p>
                                                            <p className="text-[10px] text-gray-500">{pack.unit} {pack.perDay}</p>
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            <p className="text-sm font-bold">{fmtVND(pack.price)}</p>
                                                            {pack.recommended && (<span className="text-[8px] px-1.5 py-0.5 bg-red-500 text-white rounded font-bold">Đề xuất</span>)}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Terms */}
                                        <div className="flex items-start gap-2 text-[10px] text-gray-600">
                                            <AlertCircle size={13} className="shrink-0 mt-0.5" />
                                            <p>Tôi đồng ý với <span className="text-purple-400 cursor-pointer hover:underline">Chương trình quảng bá và Điều khoản thanh toán</span> của TikTok</p>
                                        </div>

                                        {/* Pay */}
                                        <div className="flex items-center justify-between pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div>
                                                <p className="text-[10px] text-gray-500 uppercase font-bold">Tổng cộng</p>
                                                <p className="text-xl font-bold mt-0.5">{selectedPack ? fmtVND(promotePacksMap[selectedGoal].find(p => p.id === selectedPack)?.price ?? 0) : '—'}</p>
                                            </div>
                                            <button onClick={handlePay} disabled={!selectedPack}
                                                className="px-8 py-3 bg-gradient-to-r from-pink-500 to-red-500 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-pink-500/25 transition-all active:scale-95 disabled:opacity-30 flex items-center gap-2 text-sm">
                                                <DollarSign size={15} /> Thanh Toán
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </motion.div>, document.body
                )}
            </AnimatePresence>

            {/* Sticky so sánh Action Bar */}
            <AnimatePresence>
                {isCompareMode && selectedForCompare.length > 0 && (
                    <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed bottom-0 left-0 right-0 p-4 z-40 pointer-events-none flex justify-center">
                        <div className="glass-card px-6 py-3 rounded-2xl flex items-center gap-6 pointer-events-auto border border-cyan-500/30 shadow-2xl shadow-cyan-500/20" style={{ background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(16px)' }}>
                            <span className="text-sm font-bold text-white flex items-center gap-2">
                                <Activity size={16} className="text-cyan-400" /> Đã chọn {selectedForCompare.length}/2 video
                            </span>
                            <div className="flex gap-2">
                                <button onClick={() => { setIsCompareMode(false); setSelectedForCompare([]); }} className="px-4 py-2 text-xs text-gray-400 hover:text-white transition-colors">
                                    Hủy
                                </button>
                                <button disabled={selectedForCompare.length !== 2} onClick={() => alert("so sánh Feature (Enterprise Phase 4) - Sẵn sàng để build modal!")} className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold rounded-xl disabled:opacity-50 transition-all hover:shadow-lg hover:shadow-cyan-500/25 active:scale-95">
                                    So sánh chi tiết
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default TikTokPromote;





