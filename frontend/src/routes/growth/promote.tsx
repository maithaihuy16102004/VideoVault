import React, { useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
    Megaphone, Search, TrendingUp, Eye, Heart, MessageCircle,
    Play, Sparkles, ChevronRight, X, Check, Zap,
    BarChart3, Clock, UserPlus, FileText,
    Crown, Target, DollarSign, AlertCircle, Share2,
    ArrowUpRight, ArrowDownRight, RefreshCw, ChevronDown,
    ShoppingBag, Flame, Users, Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ───────────────────────────────────────────────────────────
type PromoteGoal = 'engagement' | 'views' | 'followers' | 'profile' | 'sales';
type TabKey = 'all' | 'recommended' | 'history';

interface AiStrategy {
    goal: PromoteGoal;
    confidence: number; // 0-100
    reasoning: string;
    metrics: { label: string; value: string; impact: 'positive' | 'negative' | 'neutral' }[];
    estimatedROI: string;
    priority: 'high' | 'medium' | 'low';
}

interface MockVideo {
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
}

interface ChannelInfo {
    username: string;
    displayName: string;
    avatar: string;
    followers: number;
    following: number;
    totalLikes: number;
    bio: string;
    videos: MockVideo[];
    avgViews: number;
    avgEngagement: number;
    topHashtags: string[];
    growthRate: number;
    niche: string;
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

// ─── AI Strategy Engine ─────────────────────────────────────────────
const analyzeVideoStrategy = (video: {
    views: number; likes: number; comments: number; shares: number;
    saves: number; retentionRate: number; engagementRate: number;
    shareRate: number; completionRate: number;
}, channelAvgViews: number, channelFollowers: number): AiStrategy => {
    const { views, likes, comments, shares, saves, retentionRate, engagementRate, shareRate, completionRate } = video;

    // Scoring weights for each strategy
    const scores: Record<PromoteGoal, number> = {
        views: 0,
        engagement: 0,
        followers: 0,
        sales: 0,
        profile: 0,
    };

    // ── VIEWS strategy: high retention but low views = untapped potential
    if (retentionRate >= 60 && views < channelAvgViews * 1.5) scores.views += 35;
    if (completionRate >= 50) scores.views += 20;
    if (retentionRate >= 70) scores.views += 15;
    if (views < channelAvgViews) scores.views += 10;

    // ── ENGAGEMENT strategy: content resonates but needs interaction push
    if (engagementRate >= 1.5) scores.engagement += 30;
    if (comments >= 2) scores.engagement += 15;
    if (retentionRate >= 50 && likes / Math.max(views, 1) > 0.015) scores.engagement += 20;
    if (saves > 0) scores.engagement += 10;

    // ── FOLLOWERS strategy: viral indicators, shares are key
    if (shareRate >= 0.2) scores.followers += 35;
    if (shares >= 3) scores.followers += 20;
    if (views > channelAvgViews * 1.5) scores.followers += 15;
    if (engagementRate >= 2) scores.followers += 10;

    // ── SALES strategy: high views + high engagement = monetizable audience
    if (views > channelAvgViews * 2 && engagementRate >= 1.5) scores.sales += 40;
    if (saves >= 2) scores.sales += 20;
    if (likes / Math.max(views, 1) > 0.02) scores.sales += 15;
    if (comments >= 3 && views > 500) scores.sales += 10;

    // ── PROFILE strategy: introductory/brand content
    if (views < channelAvgViews * 0.5 && retentionRate >= 40) scores.profile += 25;
    if (engagementRate < 0.5 && views < 100) scores.profile += 20;

    // Find best strategy
    const bestGoal = (Object.entries(scores) as [PromoteGoal, number][])
        .sort((a, b) => b[1] - a[1])[0];

    const confidence = Math.min(Math.round(bestGoal[1] * 1.2), 98);
    const goal = bestGoal[0];

    // Build reasoning
    const reasoningMap: Record<PromoteGoal, () => string> = {
        views: () => {
            const parts = [];
            if (retentionRate >= 60) parts.push(`Retention Rate ${retentionRate}% rất cao — người xem thích nội dung này`);
            if (views < channelAvgViews) parts.push(`nhưng chỉ đạt ${views} views (thấp hơn TB kênh ${channelAvgViews})`);
            if (completionRate >= 50) parts.push(`tỷ lệ xem hết video ${completionRate}% cho thấy nội dung chất lượng`);
            parts.push('AI khuyến nghị: Đẩy mạnh LƯỢT XEM để thuật toán ForYou nhận diện video chất lượng này');
            return parts.join('. ') + '.';
        },
        engagement: () => {
            const parts = [];
            if (engagementRate >= 1.5) parts.push(`Engagement Rate ${engagementRate}% vượt chuẩn ngành (TB ngành fashion: 1.2%)`);
            if (comments >= 2) parts.push(`${comments} bình luận cho thấy nội dung tạo thảo luận`);
            if (saves > 0) parts.push(`${saves} lượt lưu — tín hiệu mạnh cho thuật toán`);
            parts.push('AI khuyến nghị: Đẩy TƯƠNG TÁC (thích + bình luận) để tăng Social Proof và đẩy lên xu hướng');
            return parts.join('. ') + '.';
        },
        followers: () => {
            const parts = [];
            if (shares >= 3) parts.push(`${shares} lượt chia sẻ — gấp ${(shares / Math.max(1, channelAvgViews / views * shares)).toFixed(1)}x TB kênh`);
            if (views > channelAvgViews) parts.push(`${views} views vượt TB kênh — nội dung có sức lan tỏa`);
            parts.push('AI khuyến nghị: Đẩy FOLLOWER vì video có tính viral cao, người chia sẻ mang về follower mới tự nhiên');
            return parts.join('. ') + '.';
        },
        sales: () => {
            const parts = [];
            if (views > channelAvgViews * 2) parts.push(`${views} views — đã có traffic tốt`);
            if (saves >= 2) parts.push(`${saves} lượt lưu — dấu hiệu ý định mua hàng cực mạnh`);
            if (engagementRate >= 1.5) parts.push(`Engagement ${engagementRate}% — khán giả tương tác tích cực`);
            parts.push('AI khuyến nghị: Chạy DOANH THU vì video có cả traffic + ý định mua. Thêm link sản phẩm vào bio và chạy promote');
            return parts.join('. ') + '.';
        },
        profile: () => {
            return `Video mới chưa được thuật toán phân phối (${views} views). AI khuyến nghị: Tăng LƯỢT XEM HỒ SƠ để kéo traffic về trang cá nhân, giúp người xem khám phá thêm nội dung khác.`;
        },
    };

    // Build metrics
    const metricsMap: Record<PromoteGoal, AiStrategy['metrics']> = {
        views: [
            { label: 'Retention', value: retentionRate + '%', impact: retentionRate >= 60 ? 'positive' : 'neutral' },
            { label: 'Completion', value: completionRate + '%', impact: completionRate >= 50 ? 'positive' : 'neutral' },
            { label: 'Views hiện tại', value: views.toString(), impact: views < channelAvgViews ? 'negative' : 'positive' },
        ],
        engagement: [
            { label: 'Engagement Rate', value: engagementRate + '%', impact: engagementRate >= 1.5 ? 'positive' : 'neutral' },
            { label: 'Bình luận', value: comments.toString(), impact: comments >= 2 ? 'positive' : 'neutral' },
            { label: 'Lượt lưu', value: saves.toString(), impact: saves > 0 ? 'positive' : 'neutral' },
        ],
        followers: [
            { label: 'Lượt chia sẻ', value: shares.toString(), impact: shares >= 3 ? 'positive' : 'neutral' },
            { label: 'Share Rate', value: shareRate.toFixed(2) + '%', impact: shareRate >= 0.2 ? 'positive' : 'neutral' },
            { label: 'Viral Score', value: Math.min(Math.round(shares * 15 + views * 0.01), 100).toString(), impact: 'positive' },
        ],
        sales: [
            { label: 'Lượt lưu (ý định mua)', value: saves.toString(), impact: saves >= 2 ? 'positive' : 'neutral' },
            { label: 'Like / View ratio', value: (likes / Math.max(views, 1) * 100).toFixed(1) + '%', impact: 'positive' },
            { label: 'Traffic sẵn có', value: views > channelAvgViews ? 'Cao' : 'Thấp', impact: views > channelAvgViews ? 'positive' : 'negative' },
        ],
        profile: [
            { label: 'Views hiện tại', value: views.toString(), impact: 'negative' },
            { label: 'Potential', value: retentionRate >= 40 ? 'Có tiềm năng' : 'Thấp', impact: retentionRate >= 40 ? 'positive' : 'negative' },
        ],
    };

    const roiMap: Record<PromoteGoal, string> = {
        views: `+${Math.round(views * 0.8 + 500)} - ${Math.round(views * 2 + 1500)} views dự kiến`,
        engagement: `+${Math.round(likes * 3 + 100)} - ${Math.round(likes * 8 + 400)} tương tác dự kiến`,
        followers: `+${Math.round(channelFollowers * 0.1)} - ${Math.round(channelFollowers * 0.4)} follower dự kiến`,
        sales: `Doanh thu ước tính: ${(views * 15).toLocaleString('vi-VN')}đ - ${(views * 45).toLocaleString('vi-VN')}đ`,
        profile: `+${Math.round(views * 2 + 200)} - ${Math.round(views * 5 + 800)} lượt xem hồ sơ`,
    };

    return {
        goal,
        confidence,
        reasoning: reasoningMap[goal](),
        metrics: metricsMap[goal],
        estimatedROI: roiMap[goal],
        priority: confidence >= 70 ? 'high' : confidence >= 40 ? 'medium' : 'low',
    };
};

// ─── Mock Data ───────────────────────────────────────────────────────
const CHANNEL_AVG_VIEWS = 762;
const CHANNEL_FOLLOWERS = 262;

const generateMockChannel = (url: string): ChannelInfo => {
    const handle = url.split('/').pop()?.replace('@', '') || 'user';

    const rawVideos = [
        { id: 'v1', title: '#ootd #douyin #phoidoxinh #phoidonu #thoitrangnu', thumbnail: '/thumbnails/thumb_1.png', views: 2376, likes: 47, comments: 0, shares: 3, saves: 8, postedAt: '14 tháng 5', duration: '0:15', retentionRate: 78, engagementRate: 2.1, shareRate: 0.13, completionRate: 62, privacy: 'Mọi người' },
        { id: 'v2', title: '#ootd #douyin #phoidoxinh #phoidonu #xuhuong', thumbnail: '/thumbnails/thumb_5.png', views: 2041, likes: 18, comments: 1, shares: 2, saves: 3, postedAt: '10 tháng 5', duration: '0:12', retentionRate: 65, engagementRate: 0.93, shareRate: 0.10, completionRate: 55, privacy: 'Mọi người' },
        { id: 'v3', title: 'outfit đi chơi đi biển trong mùa hè này cho các nàng nhaaa 🌊🌴...', thumbnail: '/thumbnails/thumb_2.png', views: 1348, likes: 14, comments: 3, shares: 5, saves: 6, postedAt: '3 tháng 5', duration: '0:18', retentionRate: 72, engagementRate: 1.63, shareRate: 0.37, completionRate: 58, privacy: 'Mọi người' },
        { id: 'v4', title: 'Set đồ đi cafe, đi chơi siêu xinh cho các nàng ngày hè 🌸✨ #ootd...', thumbnail: '/thumbnails/thumb_3.png', views: 4, likes: 0, comments: 0, shares: 0, saves: 0, postedAt: '20 tháng 5', duration: '0:10', retentionRate: 45, engagementRate: 0, shareRate: 0, completionRate: 38, privacy: 'Mọi người' },
        { id: 'v5', title: '#CapCut I made this amazing video with CapCut. Open the link...', thumbnail: '/thumbnails/thumb_6.png', views: 0, likes: 0, comments: 0, shares: 0, saves: 0, postedAt: '20 tháng 5', duration: '0:08', retentionRate: 20, engagementRate: 0, shareRate: 0, completionRate: 15, privacy: 'Chỉ mình tôi' },
        { id: 'v6', title: 'Đồ xinh sẻ nằm trong bio trưng bày mình nhá các nàng #ootd #douyi...', thumbnail: '/thumbnails/thumb_5.png', views: 41, likes: 0, comments: 0, shares: 0, saves: 1, postedAt: '20 tháng 5', duration: '0:14', retentionRate: 52, engagementRate: 0, shareRate: 0, completionRate: 42, privacy: 'Mọi người' },
        { id: 'v7', title: 'Phối đồ douyin 20/05 #ootd #phoidoxinh #phoidonu...', thumbnail: '/thumbnails/thumb_1.png', views: 18, likes: 0, comments: 0, shares: 0, saves: 0, postedAt: '20 tháng 5', duration: '0:11', retentionRate: 48, engagementRate: 0, shareRate: 0, completionRate: 40, privacy: 'Mọi người' },
        { id: 'v8', title: 'Mix đồ công sở thanh lịch cho nàng đi làm ✨👔', thumbnail: '/thumbnails/thumb_4.png', views: 266, likes: 8, comments: 2, shares: 1, saves: 4, postedAt: '18 tháng 5', duration: '0:16', retentionRate: 60, engagementRate: 4.14, shareRate: 0.38, completionRate: 50, privacy: 'Mọi người' },
    ];

    const videos: MockVideo[] = rawVideos.map(v => {
        const strategy = analyzeVideoStrategy(v, CHANNEL_AVG_VIEWS, CHANNEL_FOLLOWERS);
        return {
            ...v,
            aiScore: Math.min(Math.round(
                v.retentionRate * 0.3 +
                v.engagementRate * 12 +
                Math.min(v.views / CHANNEL_AVG_VIEWS * 15, 25) +
                v.shares * 5 +
                v.saves * 3 +
                v.completionRate * 0.15
            ), 99),
            aiRecommended: strategy.confidence >= 55 && strategy.priority !== 'low',
            aiStrategy: strategy,
        };
    });

    const totalViews = videos.reduce((s, v) => s + v.views, 0);
    const totalEng = videos.reduce((s, v) => s + v.engagementRate, 0);

    return {
        username: handle,
        displayName: 'Phối Đồ Douyin ✨',
        avatar: handle.charAt(0).toUpperCase(),
        followers: CHANNEL_FOLLOWERS,
        following: 169,
        totalLikes: 842,
        bio: 'Gợi ý phối đồ outfit y2k, nàng thơ douyinnn\n1m60 - 48kg ✨\nSắm đồ xinh ở giỏ hàng nhé các nàng 🛒',
        videos,
        avgViews: Math.round(totalViews / videos.length),
        avgEngagement: +(totalEng / videos.length).toFixed(2),
        topHashtags: ['#ootd', '#phoidoxinh', '#douyin', '#xuhuong', '#phoidonu'],
        growthRate: 12.5,
        niche: 'Fashion / Outfit Y2K',
    };
};

const mockCampaignHistory: CampaignRecord[] = [
    { id: 'c1', videoTitle: '#ootd #douyin #phoidoxinh...', goal: 'Tăng tương tác', status: 'completed', spent: 40011, result: '+387 thích, +42 bình luận', date: '12/05/2026' },
    { id: 'c2', videoTitle: 'outfit đi chơi đi biển...', goal: 'Tăng lượt xem', status: 'running', spent: 23000, result: '+1.2K views (đang chạy)', date: '18/05/2026' },
];

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
    sales: { icon: ShoppingBag, label: 'Tăng doanh thu', desc: 'Chuyển đổi thành đơn hàng', color: 'text-amber-400', gradient: 'from-amber-500 to-orange-500' },
    profile: { icon: FileText, label: 'Xem hồ sơ', desc: 'Kéo traffic về trang cá nhân', color: 'text-violet-400', gradient: 'from-violet-500 to-purple-500' },
};

// ─── Helpers ─────────────────────────────────────────────────────────
const fmt = (n: number) => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return n.toString();
};
const fmtVND = (n: number) => n.toLocaleString('vi-VN') + 'đ';

// ─── Sub Components ─────────────────────────────────────────────────
const CircularScore: React.FC<{ score: number; size?: number }> = ({ score, size = 44 }) => {
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
};

const StrategyBadge: React.FC<{ goal: PromoteGoal; small?: boolean }> = ({ goal, small }) => {
    const cfg = goalConfig[goal];
    return (
        <span className={`inline-flex items-center gap-1 font-bold text-white rounded-lg bg-gradient-to-r ${cfg.gradient} shadow-lg ${small ? 'px-1.5 py-0.5 text-[8px]' : 'px-2 py-1 text-[10px]'}`}>
            <cfg.icon size={small ? 9 : 11} />
            {cfg.label}
        </span>
    );
};

const MetricChip: React.FC<{ label: string; value: string; impact: 'positive' | 'negative' | 'neutral' }> = ({ label, value, impact }) => (
    <div className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] border ${
        impact === 'positive' ? 'bg-green-500/5 border-green-500/15 text-green-400' :
        impact === 'negative' ? 'bg-red-500/5 border-red-500/15 text-red-400' :
        'bg-white/[0.02] border-white/5 text-gray-400'
    }`}>
        <span className="text-gray-500">{label}</span>
        <span className="font-bold">{value}</span>
    </div>
);

const StatCard: React.FC<{ icon: React.ElementType; label: string; value: string; sub?: string; trend?: number; color?: string }> =
    ({ icon: Icon, label, value, sub, trend, color = 'text-primary' }) => (
    <div className="glass-card p-4 space-y-2 hover:border-white/10">
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
);

// ─── Main ────────────────────────────────────────────────────────────
const TikTokPromote: React.FC = () => {
    const [channelUrl, setChannelUrl] = useState('');
    const [phase, setPhase] = useState<'input' | 'analyzing' | 'results'>('input');
    const [channel, setChannel] = useState<ChannelInfo | null>(null);
    const [analyzeProgress, setAnalyzeProgress] = useState(0);
    const [analyzeStep, setAnalyzeStep] = useState('');
    const [activeTab, setActiveTab] = useState<TabKey>('all');
    const [sortBy, setSortBy] = useState<'aiScore' | 'views' | 'likes' | 'comments'>('aiScore');
    const [expandedVideo, setExpandedVideo] = useState<string | null>(null);
    const [showPromoteModal, setShowPromoteModal] = useState(false);
    const [selectedVideo, setSelectedVideo] = useState<MockVideo | null>(null);
    const [selectedGoal, setSelectedGoal] = useState<PromoteGoal>('engagement');
    const [selectedPack, setSelectedPack] = useState<string | null>(null);
    const [paymentSuccess, setPaymentSuccess] = useState(false);

    const analyzeChannel = useCallback(() => {
        if (!channelUrl.trim()) return;
        setPhase('analyzing'); setAnalyzeProgress(0);
        const steps = [
            'Kết nối TikTok Data API...', 'Thu thập metadata kênh & video...',
            'AI phân tích Retention Rate & Watch Time...', 'AI đánh giá Engagement & Share Pattern...',
            'AI so sánh benchmark niche Fashion/Y2K...', 'AI tính toán Viral Potential & ROI...',
            'Xây dựng chiến lược Promote tối ưu cho từng video...', 'Hoàn tất!'
        ];
        let step = 0;
        const interval = setInterval(() => {
            step++;
            setAnalyzeProgress(Math.min(Math.round((step / steps.length) * 100), 100));
            setAnalyzeStep(steps[Math.min(step, steps.length - 1)]);
            if (step >= steps.length) { clearInterval(interval); setTimeout(() => { setChannel(generateMockChannel(channelUrl)); setPhase('results'); }, 400); }
        }, 600);
    }, [channelUrl]);

    const sortedVideos = useMemo(() => channel?.videos.slice().sort((a, b) => b[sortBy] - a[sortBy]) ?? [], [channel, sortBy]);
    const displayVideos = useMemo(() => activeTab === 'recommended' ? sortedVideos.filter(v => v.aiRecommended) : sortedVideos, [sortedVideos, activeTab]);
    const recommendedCount = sortedVideos.filter(v => v.aiRecommended).length;

    const handlePromote = (video: MockVideo) => {
        setSelectedVideo(video);
        setSelectedGoal(video.aiStrategy.goal);
        setSelectedPack(null);
        setPaymentSuccess(false);
        setShowPromoteModal(true);
    };

    const handlePay = () => { setPaymentSuccess(true); setTimeout(() => { setShowPromoteModal(false); setPaymentSuccess(false); }, 3500); };

    // ═══ PHASE: INPUT ═══
    if (phase === 'input') {
        return (
            <div className="p-6 lg:p-8 space-y-8">
                <div className="max-w-4xl mx-auto">
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                        <h1 className="text-3xl font-bold">
                            <span className="bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">TikTok Promote</span>
                            <span className="text-sm font-medium text-purple-400 ml-2 px-2 py-0.5 bg-purple-500/10 rounded-lg border border-purple-500/20">AI Powered</span>
                        </h1>
                        <p className="text-gray-500 mt-2 text-sm max-w-xl">AI phân tích hiệu suất từng video và đề xuất chiến lược quảng cáo tối ưu: tăng View, Tương tác, Follower hay Doanh thu.</p>
                    </motion.div>
                </div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="max-w-4xl mx-auto glass-card p-8 space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-pink-500 via-purple-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/25">
                            <Megaphone size={26} className="text-white" />
                        </div>
                        <div>
                            <h2 className="font-bold text-lg">Phân tích kênh & Chiến lược AI</h2>
                            <p className="text-xs text-gray-500">Dán URL hồ sơ TikTok — AI phân tích Retention, Engagement, Viral Score, ROI</p>
                        </div>
                    </div>
                    <div className="relative magic-input-wrapper">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 z-10" />
                        <input type="text" value={channelUrl} onChange={(e) => setChannelUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && analyzeChannel()}
                            placeholder="https://tiktok.com/@username"
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-40 py-4.5 focus:outline-none focus:border-purple-500/50 focus:bg-white/[0.07] transition-all text-sm placeholder:text-gray-600"
                        />
                        <button onClick={analyzeChannel} disabled={!channelUrl.trim()}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 px-5 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-pink-500/25 transition-all active:scale-95 disabled:opacity-30 flex items-center gap-2 text-sm">
                            <Sparkles size={15} /> Phân Tích AI
                        </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-5 border-t border-white/5">
                        {[
                            { icon: BarChart3, title: 'Phân tích sâu', desc: 'Retention, Engagement, Completion Rate, Share Pattern', color: 'text-cyan-400', bg: 'from-cyan-500/10 to-blue-500/10' },
                            { icon: Sparkles, title: 'AI chiến lược', desc: 'Chọn video + đề xuất: View, Tym, Follow hay Doanh thu', color: 'text-purple-400', bg: 'from-purple-500/10 to-pink-500/10' },
                            { icon: Target, title: 'ROI tối ưu', desc: 'Ước tính kết quả & chi phí tối ưu cho mỗi chiến dịch', color: 'text-pink-400', bg: 'from-pink-500/10 to-red-500/10' },
                        ].map((f, i) => (
                            <motion.div key={f.title} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.1 }}
                                className={`p-4 rounded-xl bg-gradient-to-br ${f.bg} border border-white/5 hover:border-white/10 transition-all`}>
                                <f.icon size={20} className={`${f.color} mb-2.5`} />
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
        return (
            <div className="p-8 flex flex-col items-center justify-center min-h-[70vh] space-y-10">
                <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative">
                    <div className="absolute inset-0 w-28 h-28 rounded-3xl bg-gradient-to-br from-pink-500 to-purple-600 blur-2xl opacity-30 animate-pulse" />
                    <div className="relative w-28 h-28 bg-gradient-to-br from-pink-500 via-purple-500 to-violet-600 rounded-3xl flex items-center justify-center shadow-2xl">
                        <Sparkles size={48} className="text-white animate-pulse" />
                    </div>
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: 'spring' }}
                        className="absolute -bottom-3 -right-3 w-12 h-12 bg-cyan-500 rounded-xl flex items-center justify-center shadow-xl shadow-cyan-500/30">
                        <TrendingUp size={22} className="text-white" />
                    </motion.div>
                </motion.div>
                <div className="text-center space-y-2 max-w-md">
                    <h2 className="text-2xl font-bold">AI đang phân tích kênh</h2>
                    <motion.p key={analyzeStep} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="text-gray-400 text-sm">{analyzeStep || 'Đang khởi tạo...'}</motion.p>
                </div>
                <div className="w-full max-w-sm space-y-3">
                    <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                        <motion.div className="h-full rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500" initial={{ width: 0 }} animate={{ width: `${analyzeProgress}%` }} transition={{ duration: 0.4 }} />
                    </div>
                    <div className="flex justify-between text-xs text-gray-600"><span>Đang quét video...</span><span className="font-bold text-white">{analyzeProgress}%</span></div>
                </div>
                <div className="w-full max-w-xl grid grid-cols-3 gap-3 opacity-30">
                    {[1, 2, 3].map(i => (<div key={i} className="glass-card p-3 space-y-2 animate-pulse"><div className="h-24 bg-white/5 rounded-lg" /><div className="h-2 bg-white/5 rounded w-3/4" /><div className="h-2 bg-white/5 rounded w-1/2" /></div>))}
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
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <span className="bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">TikTok Promote</span>
                        <span className="text-[10px] px-2 py-0.5 bg-green-500/15 text-green-400 rounded-full font-bold border border-green-500/20">Phân tích hoàn tất</span>
                    </h1>
                    <p className="text-gray-500 text-xs mt-0.5">AI đã xây dựng chiến lược tối ưu cho từng video</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => { setPhase('analyzing'); setTimeout(() => { setChannel(generateMockChannel(channelUrl)); setPhase('results'); }, 3000); }}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all border border-white/5">
                        <RefreshCw size={12} /> Quét lại
                    </button>
                    <button onClick={() => { setPhase('input'); setChannel(null); }}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs bg-gradient-to-r from-pink-500/10 to-purple-500/10 text-purple-300 hover:text-white rounded-lg transition-all border border-purple-500/20">
                        <Search size={12} /> Kênh khác
                    </button>
                </div>
            </div>

            {/* Channel + Stats */}
            {channel && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                        className="lg:col-span-5 glass-card p-5 flex items-start gap-4">
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
                                <span><strong className="text-white">{fmt(channel.followers)}</strong> <span className="text-gray-500">Follower</span></span>
                                <span><strong className="text-white">{fmt(channel.totalLikes)}</strong> <span className="text-gray-500">Likes</span></span>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-2">
                                {channel.topHashtags.map(h => (<span key={h} className="text-[10px] px-2 py-0.5 bg-white/5 text-gray-400 rounded-full border border-white/5">{h}</span>))}
                            </div>
                        </div>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
                        className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <StatCard icon={Play} label="Tổng video" value={channel.videos.length.toString()} sub="Đang hoạt động" color="text-pink-400" />
                        <StatCard icon={Eye} label="View TB / video" value={fmt(channel.avgViews)} trend={channel.growthRate} color="text-blue-400" />
                        <StatCard icon={TrendingUp} label="Engagement TB" value={channel.avgEngagement + '%'} sub="TB ngành: 1.2%" color="text-green-400" />
                        <StatCard icon={Crown} label="AI Picks" value={recommendedCount.toString()} sub="Video nên promote" color="text-purple-400" />
                    </motion.div>
                </div>
            )}

            {/* AI Banner */}
            {recommendedCount > 0 && (
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
                                        <span className="text-[10px] text-gray-500">Độ tin cậy: <strong className="text-white">{top.aiStrategy.confidence}%</strong></span>
                                        <span className="text-[10px] text-green-400">📈 {top.aiStrategy.estimatedROI}</span>
                                    </div>
                                    <p className="text-xs text-gray-400 leading-relaxed">{top.aiStrategy.reasoning}</p>
                                </div>
                            ); })()}
                        </div>
                        <button onClick={() => { const v = sortedVideos.find(v => v.aiRecommended); if (v) handlePromote(v); }}
                            className="shrink-0 px-5 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl text-xs font-bold hover:shadow-lg hover:shadow-pink-500/25 transition-all active:scale-95 flex items-center gap-1.5">
                            <Megaphone size={14} /> Promote Ngay <ChevronRight size={12} />
                        </button>
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
                        {([
                            { key: 'aiScore' as const, icon: Sparkles, label: 'AI Score' },
                            { key: 'views' as const, icon: Eye, label: 'Views' },
                            { key: 'likes' as const, icon: Heart, label: 'Likes' },
                            { key: 'comments' as const, icon: MessageCircle, label: 'Comments' },
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

            {/* Video Grid */}
            {activeTab !== 'history' && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    <AnimatePresence mode="popLayout">
                        {displayVideos.map((video, i) => (
                            <motion.div key={video.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ delay: i * 0.04 }}
                                className={`glass-card overflow-hidden group ${video.aiRecommended ? 'ring-1 ring-purple-500/25' : ''}`}>

                                {/* Thumbnail with real image */}
                                <div className="relative h-44 overflow-hidden cursor-pointer" onClick={() => setExpandedVideo(expandedVideo === video.id ? null : video.id)}>
                                    <img src={video.thumbnail} alt={video.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Play size={40} className="text-white/90 drop-shadow-lg" fill="white" />
                                    </div>
                                    {/* Top badges */}
                                    <div className="absolute top-2 left-2 flex flex-col gap-1.5">
                                        {video.aiRecommended && (
                                            <span className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-[9px] font-bold rounded-lg shadow-lg">
                                                <Crown size={9} /> AI Khuyên Dùng
                                            </span>
                                        )}
                                        <StrategyBadge goal={video.aiStrategy.goal} small />
                                    </div>
                                    <div className="absolute top-2 right-2"><CircularScore score={video.aiScore} /></div>
                                    {/* Bottom overlay */}
                                    <div className="absolute bottom-0 left-0 right-0 px-3 py-2 flex items-end justify-between">
                                        <span className="text-[11px] text-white flex items-center gap-1 font-medium drop-shadow"><Play size={10} fill="white" /> {fmt(video.views)}</span>
                                        <span className="text-[10px] text-white/80 font-mono bg-black/40 px-1.5 py-0.5 rounded">{video.duration}</span>
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
                                        <span className="ml-auto text-gray-600">{video.postedAt}</span>
                                    </div>

                                    {/* Stat Chips */}
                                    <div className="flex gap-2">
                                        <div className="flex-1 py-1.5 bg-white/[0.03] rounded-lg text-center border border-white/5">
                                            <p className="text-[9px] text-gray-600 uppercase font-bold">Retention</p>
                                            <p className={`text-xs font-bold mt-0.5 ${video.retentionRate >= 60 ? 'text-green-400' : video.retentionRate >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>{video.retentionRate}%</p>
                                        </div>
                                        <div className="flex-1 py-1.5 bg-white/[0.03] rounded-lg text-center border border-white/5">
                                            <p className="text-[9px] text-gray-600 uppercase font-bold">Engage</p>
                                            <p className={`text-xs font-bold mt-0.5 ${video.engagementRate >= 2 ? 'text-green-400' : video.engagementRate >= 1 ? 'text-yellow-400' : 'text-red-400'}`}>{video.engagementRate}%</p>
                                        </div>
                                        <div className="flex-1 py-1.5 bg-white/[0.03] rounded-lg text-center border border-white/5">
                                            <p className="text-[9px] text-gray-600 uppercase font-bold">Complete</p>
                                            <p className={`text-xs font-bold mt-0.5 ${video.completionRate >= 50 ? 'text-green-400' : 'text-yellow-400'}`}>{video.completionRate}%</p>
                                        </div>
                                    </div>

                                    {/* AI Strategy Preview */}
                                    <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-white/5" style={{ background: 'rgba(168,85,247,0.03)' }}>
                                        <Sparkles size={12} className="text-purple-400 shrink-0" />
                                        <span className="text-[10px] text-gray-400 flex-1 truncate">AI: {goalConfig[video.aiStrategy.goal].label}</span>
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                            video.aiStrategy.priority === 'high' ? 'bg-green-500/15 text-green-400' :
                                            video.aiStrategy.priority === 'medium' ? 'bg-yellow-500/15 text-yellow-400' :
                                            'bg-red-500/15 text-red-400'
                                        }`}>{video.aiStrategy.confidence}% tin cậy</span>
                                    </div>

                                    {/* Expandable AI Insight */}
                                    <AnimatePresence>
                                        {expandedVideo === video.id && (
                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                                <div className="p-3 rounded-xl space-y-2.5 mt-1" style={{ background: 'rgba(168,85,247,0.04)', border: '1px solid rgba(168,85,247,0.1)' }}>
                                                    <div className="flex items-center gap-2">
                                                        <Sparkles size={12} className="text-purple-400" />
                                                        <span className="text-[11px] font-bold text-purple-300">AI Strategy Insight</span>
                                                        <StrategyBadge goal={video.aiStrategy.goal} small />
                                                    </div>
                                                    <p className="text-[11px] text-gray-400 leading-relaxed">{video.aiStrategy.reasoning}</p>
                                                    {/* Metric chips */}
                                                    <div className="space-y-1.5">
                                                        {video.aiStrategy.metrics.map(m => (<MetricChip key={m.label} {...m} />))}
                                                    </div>
                                                    {/* ROI */}
                                                    <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-green-500/5 border border-green-500/10">
                                                        <TrendingUp size={12} className="text-green-400" />
                                                        <span className="text-[11px] text-green-400 font-semibold">{video.aiStrategy.estimatedROI}</span>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {video.aiStrategy.reasoning && (
                                        <button onClick={() => setExpandedVideo(expandedVideo === video.id ? null : video.id)}
                                            className="w-full flex items-center justify-center gap-1 text-[10px] text-gray-600 hover:text-purple-400 transition-colors py-0.5">
                                            <Sparkles size={9} />{expandedVideo === video.id ? 'Ẩn phân tích' : 'Xem phân tích AI chi tiết'}
                                            <ChevronDown size={10} className={`transition-transform ${expandedVideo === video.id ? 'rotate-180' : ''}`} />
                                        </button>
                                    )}

                                    <button onClick={() => handlePromote(video)}
                                        className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] ${
                                            video.aiRecommended
                                                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/15 hover:shadow-xl hover:shadow-pink-500/25'
                                                : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/5 hover:border-white/10'
                                        }`}>
                                        <Megaphone size={12} />
                                        {video.aiRecommended ? `Promote: ${goalConfig[video.aiStrategy.goal].label}` : 'Tạo Promote'}
                                    </button>
                                </div>
                            </motion.div>
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
                                        {/* Video preview with thumbnail */}
                                        <div className="flex items-center gap-3 p-3 rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0">
                                                <img src={selectedVideo.thumbnail} alt="" className="w-full h-full object-cover" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium truncate">{selectedVideo.title}</p>
                                                <p className="text-[11px] text-gray-500">{selectedVideo.postedAt} • {fmt(selectedVideo.views)} views</p>
                                            </div>
                                            <CircularScore score={selectedVideo.aiScore} size={38} />
                                        </div>

                                        {/* AI recommendation in modal */}
                                        <div className="p-3 rounded-xl space-y-1.5" style={{ background: 'rgba(168,85,247,0.04)', border: '1px solid rgba(168,85,247,0.1)' }}>
                                            <div className="flex items-center gap-2">
                                                <Sparkles size={12} className="text-purple-400" />
                                                <span className="text-[11px] font-bold text-purple-300">AI khuyến nghị</span>
                                                <StrategyBadge goal={selectedVideo.aiStrategy.goal} small />
                                                <span className="text-[9px] text-gray-500 ml-auto">{selectedVideo.aiStrategy.confidence}% tin cậy</span>
                                            </div>
                                            <p className="text-[10px] text-gray-400 leading-relaxed">{selectedVideo.aiStrategy.reasoning.slice(0, 150)}...</p>
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
                                                                {key === selectedVideo.aiStrategy.goal && (<span className="text-[8px] px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded font-bold">AI Pick</span>)}
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
        </div>
    );
};

export default TikTokPromote;
