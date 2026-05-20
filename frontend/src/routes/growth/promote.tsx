import React, { useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
    Megaphone, Search, TrendingUp, Eye, Heart, MessageCircle,
    Play, Sparkles, ChevronRight, X, Check, Zap,
    BarChart3, Clock, UserPlus, FileText,
    Crown, Target, DollarSign, AlertCircle, Share2,
    ArrowUpRight, ArrowDownRight, RefreshCw, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ───────────────────────────────────────────────────────────
interface MockVideo {
    id: string;
    title: string;
    thumbnail: string;
    views: number;
    likes: number;
    comments: number;
    shares: number;
    postedAt: string;
    duration: string;
    retentionRate: number;
    engagementRate: number;
    aiScore: number;
    aiRecommended: boolean;
    aiReason?: string;
    aiGoalSuggestion?: PromoteGoal;
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
}

type PromoteGoal = 'engagement' | 'views' | 'followers' | 'profile';
type TabKey = 'all' | 'recommended' | 'history';

interface PromotePack {
    id: string;
    range: string;
    unit: string;
    price: number;
    perDay: string;
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

// ─── Mock Data ───────────────────────────────────────────────────────
const generateMockChannel = (url: string): ChannelInfo => {
    const handle = url.split('/').pop()?.replace('@', '') || 'user';
    const mockVideos: MockVideo[] = [
        {
            id: 'v1', title: '#ootd #douyin #phoidoxinh #phoidonu #thoitrangnu',
            thumbnail: '🎵', views: 2376, likes: 47, comments: 0, shares: 3,
            postedAt: '14 tháng 5', duration: '0:15', retentionRate: 78,
            engagementRate: 2.1, aiScore: 92, aiRecommended: true,
            aiGoalSuggestion: 'engagement',
            aiReason: 'Retention rate 78% — cao nhất kênh. Hashtag #ootd đang trong top trending. Tỷ lệ giữ chân vượt trội cho thấy nội dung hấp dẫn, phù hợp để thúc đẩy tương tác (thích + bình luận) nhằm đẩy video lên ForYou.',
            privacy: 'Mọi người',
        },
        {
            id: 'v2', title: '#ootd #douyin #phoidoxinh #phoidonu #xuhuong',
            thumbnail: '📱', views: 2041, likes: 18, comments: 1, shares: 2,
            postedAt: '10 tháng 5', duration: '0:12', retentionRate: 65,
            engagementRate: 0.93, aiScore: 74, aiRecommended: false,
            aiGoalSuggestion: 'views',
            privacy: 'Mọi người',
        },
        {
            id: 'v3', title: 'outfit đi chơi đi biển trong mùa hè này cho các nàng nhaaa 🌊🌴...',
            thumbnail: '🏖️', views: 1348, likes: 14, comments: 3, shares: 5,
            postedAt: '3 tháng 5', duration: '0:18', retentionRate: 72,
            engagementRate: 1.63, aiScore: 85, aiRecommended: true,
            aiGoalSuggestion: 'views',
            aiReason: 'Lượt chia sẻ gấp 2.5x trung bình kênh — dấu hiệu viral tiềm năng. Nội dung mùa hè đang đúng thời điểm. Đề xuất tăng lượt xem để tối đa hóa khả năng phủ sóng organic từ lượt share.',
            privacy: 'Mọi người',
        },
        {
            id: 'v4', title: 'Set đồ đi cafe, đi chơi siêu xinh cho các nàng ngày hè 🌸✨ #ootd...',
            thumbnail: '☕', views: 4, likes: 0, comments: 0, shares: 0,
            postedAt: '20 tháng 5', duration: '0:10', retentionRate: 45,
            engagementRate: 0, aiScore: 28, aiRecommended: false,
            aiGoalSuggestion: 'views',
            privacy: 'Mọi người',
        },
        {
            id: 'v5', title: '#CapCut I made this amazing video with CapCut. Open the link...',
            thumbnail: '🎬', views: 0, likes: 0, comments: 0, shares: 0,
            postedAt: '20 tháng 5', duration: '0:08', retentionRate: 20,
            engagementRate: 0, aiScore: 12, aiRecommended: false,
            privacy: 'Chỉ mình tôi',
        },
        {
            id: 'v6', title: 'Đồ xinh sẻ nằm trong bio trưng bày mình nhá các nàng #ootd #douyi...',
            thumbnail: '👗', views: 41, likes: 0, comments: 0, shares: 0,
            postedAt: '20 tháng 5', duration: '0:14', retentionRate: 52,
            engagementRate: 0, aiScore: 35, aiRecommended: false,
            aiGoalSuggestion: 'engagement',
            privacy: 'Mọi người',
        },
        {
            id: 'v7', title: 'Phối đồ douyin 20/05 #ootd #phoidoxinh #phoidonu...',
            thumbnail: '✨', views: 18, likes: 0, comments: 0, shares: 0,
            postedAt: '20 tháng 5', duration: '0:11', retentionRate: 48,
            engagementRate: 0, aiScore: 30, aiRecommended: false,
            privacy: 'Mọi người',
        },
        {
            id: 'v8', title: 'Mix đồ công sở thanh lịch cho nàng đi làm ✨👔',
            thumbnail: '💼', views: 266, likes: 8, comments: 2, shares: 1,
            postedAt: '18 tháng 5', duration: '0:16', retentionRate: 60,
            engagementRate: 4.14, aiScore: 68, aiRecommended: false,
            aiGoalSuggestion: 'engagement',
            privacy: 'Mọi người',
        },
    ];

    const totalViews = mockVideos.reduce((s, v) => s + v.views, 0);
    const totalEng = mockVideos.reduce((s, v) => s + v.engagementRate, 0);

    return {
        username: handle,
        displayName: 'Phối Đồ Douyin ✨',
        avatar: handle.charAt(0).toUpperCase(),
        followers: 262,
        following: 169,
        totalLikes: 842,
        bio: 'Gợi ý phối đồ outfit y2k, nàng thơ douyinnn\n1m60 - 48kg ✨\nSắm đồ xinh ở giỏ hàng nhé các nàng 🛒',
        videos: mockVideos,
        avgViews: Math.round(totalViews / mockVideos.length),
        avgEngagement: +(totalEng / mockVideos.length).toFixed(2),
        topHashtags: ['#ootd', '#phoidoxinh', '#douyin', '#xuhuong', '#phoidonu'],
        growthRate: 12.5,
    };
};

const mockCampaignHistory: CampaignRecord[] = [
    { id: 'c1', videoTitle: '#ootd #douyin #phoidoxinh...', goal: 'Tăng tương tác', status: 'completed', spent: 40011, result: '+387 lượt thích, +42 bình luận', date: '12/05/2026' },
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
    profile: [
        { id: 'p1', range: '300 - 1K', unit: 'lượt xem hồ sơ', perDay: 'trong 1 ngày', price: 23000 },
        { id: 'p2', range: '600 - 2K', unit: 'lượt xem hồ sơ', perDay: 'trong 1 ngày', price: 40011, recommended: true },
        { id: 'p3', range: '1K - 4K', unit: 'lượt xem hồ sơ', perDay: 'trong 1 ngày', price: 70019 },
    ],
};

const goalConfig: Record<PromoteGoal, { icon: React.ElementType; label: string; desc: string; color: string }> = {
    engagement: { icon: Heart, label: 'Tăng lượt thích và bình luận', desc: 'Thúc đẩy tương tác bài đăng', color: 'text-pink-400' },
    views: { icon: Eye, label: 'Nhiều lượt xem video hơn', desc: 'Tăng lượt xem và tiếp cận', color: 'text-blue-400' },
    followers: { icon: UserPlus, label: 'Nhiều follower hơn', desc: 'Tăng lượng người theo dõi', color: 'text-green-400' },
    profile: { icon: FileText, label: 'Tăng lượt xem hồ sơ', desc: 'Thu hút traffic về trang cá nhân', color: 'text-amber-400' },
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
    const color = score >= 80 ? '#22c55e' : score >= 50 ? '#eab308' : '#ef4444';

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                <motion.circle
                    cx={size / 2} cy={size / 2} r={radius} fill="none"
                    stroke={color} strokeWidth="3" strokeLinecap="round"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold" style={{ color }}>
                {score}
            </span>
        </div>
    );
};

const StatCard: React.FC<{ icon: React.ElementType; label: string; value: string; sub?: string; trend?: number; color?: string }> = 
    ({ icon: Icon, label, value, sub, trend, color = 'text-primary' }) => (
    <div className="glass-card p-4 space-y-2 hover:border-white/10">
        <div className="flex items-center justify-between">
            <div className="w-9 h-9 bg-white/5 rounded-xl flex items-center justify-center">
                <Icon size={16} className={color} />
            </div>
            {trend !== undefined && (
                <span className={`text-[10px] font-bold flex items-center gap-0.5 ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {trend >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                    {Math.abs(trend)}%
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
    const [goalTab, setGoalTab] = useState<'account' | 'sales' | 'live' | 'leads'>('account');

    const analyzeChannel = useCallback(() => {
        if (!channelUrl.trim()) return;
        setPhase('analyzing');
        setAnalyzeProgress(0);

        const steps = [
            'Đang kết nối tới TikTok API...',
            'Thu thập dữ liệu kênh & danh sách video...',
            'AI phân tích Retention Rate từng video...',
            'AI đánh giá Engagement Rate & so sánh niche...',
            'AI tính toán Viral Potential Score...',
            'Xây dựng chiến dịch quảng cáo tối ưu...',
            'Hoàn tất phân tích!',
        ];

        let step = 0;
        const interval = setInterval(() => {
            step++;
            setAnalyzeProgress(Math.min(Math.round((step / steps.length) * 100), 100));
            setAnalyzeStep(steps[Math.min(step, steps.length - 1)]);
            if (step >= steps.length) {
                clearInterval(interval);
                setTimeout(() => {
                    setChannel(generateMockChannel(channelUrl));
                    setPhase('results');
                }, 400);
            }
        }, 650);
    }, [channelUrl]);

    const sortedVideos = useMemo(() => {
        if (!channel) return [];
        return channel.videos.slice().sort((a, b) => b[sortBy] - a[sortBy]);
    }, [channel, sortBy]);

    const displayVideos = useMemo(() => {
        if (activeTab === 'recommended') return sortedVideos.filter(v => v.aiRecommended);
        return sortedVideos;
    }, [sortedVideos, activeTab]);

    const recommendedCount = sortedVideos.filter(v => v.aiRecommended).length;

    const handlePromote = (video: MockVideo) => {
        setSelectedVideo(video);
        setSelectedGoal(video.aiGoalSuggestion || 'engagement');
        setSelectedPack(null);
        setPaymentSuccess(false);
        setShowPromoteModal(true);
    };

    const handlePay = () => {
        setPaymentSuccess(true);
        setTimeout(() => {
            setShowPromoteModal(false);
            setPaymentSuccess(false);
        }, 3500);
    };

    // ═════════════════════════════════════════════════════════════════
    // PHASE: INPUT
    // ═════════════════════════════════════════════════════════════════
    if (phase === 'input') {
        return (
            <div className="p-6 lg:p-8 space-y-8">
                {/* Header */}
                <div className="max-w-4xl mx-auto">
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                        <h1 className="text-3xl font-bold">
                            <span className="bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                                TikTok Promote
                            </span>
                            <span className="text-sm font-medium text-purple-400 ml-2 px-2 py-0.5 bg-purple-500/10 rounded-lg border border-purple-500/20">
                                AI Powered
                            </span>
                        </h1>
                        <p className="text-gray-500 mt-2 text-sm max-w-xl">
                            Nhập URL kênh TikTok — AI sẽ phân tích hiệu suất từng video và đề xuất chiến dịch quảng cáo tối ưu nhất cho bạn.
                        </p>
                    </motion.div>
                </div>

                {/* Main Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="max-w-4xl mx-auto glass-card p-8 space-y-6"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-pink-500 via-purple-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/25">
                            <Megaphone size={26} className="text-white" />
                        </div>
                        <div>
                            <h2 className="font-bold text-lg">Phân tích kênh & Đề xuất Promote</h2>
                            <p className="text-xs text-gray-500">Dán URL hồ sơ TikTok — AI phân tích Retention, Engagement, Viral Score</p>
                        </div>
                    </div>

                    {/* Search Input */}
                    <div className="relative magic-input-wrapper">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 z-10" />
                        <input
                            type="text"
                            value={channelUrl}
                            onChange={(e) => setChannelUrl(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && analyzeChannel()}
                            placeholder="https://tiktok.com/@username"
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-40 py-4.5 focus:outline-none focus:border-purple-500/50 focus:bg-white/[0.07] transition-all text-sm placeholder:text-gray-600"
                        />
                        <button
                            onClick={analyzeChannel}
                            disabled={!channelUrl.trim()}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 px-5 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-pink-500/25 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                        >
                            <Sparkles size={15} /> Phân Tích AI
                        </button>
                    </div>

                    {/* Feature Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-5 border-t border-white/5">
                        {[
                            { icon: BarChart3, title: 'Phân tích sâu', desc: 'Retention Rate, Engagement Rate, Viral Score cho từng video', color: 'text-cyan-400', bg: 'from-cyan-500/10 to-blue-500/10' },
                            { icon: Sparkles, title: 'AI đề xuất thông minh', desc: 'Tự động chọn video tiềm năng nhất & mục tiêu Promote tối ưu', color: 'text-purple-400', bg: 'from-purple-500/10 to-pink-500/10' },
                            { icon: Target, title: 'Tạo chiến dịch', desc: 'Setup Promote: tăng View, Tym, Comment, Follow — giá từ 23.000đ', color: 'text-pink-400', bg: 'from-pink-500/10 to-red-500/10' },
                        ].map((f, i) => (
                            <motion.div
                                key={f.title}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 + i * 0.1 }}
                                className={`p-4 rounded-xl bg-gradient-to-br ${f.bg} border border-white/5 hover:border-white/10 transition-all`}
                            >
                                <f.icon size={20} className={`${f.color} mb-2.5`} />
                                <p className="text-sm font-semibold mb-1">{f.title}</p>
                                <p className="text-[11px] text-gray-500 leading-relaxed">{f.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* Quick Tips */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="max-w-4xl mx-auto text-center text-gray-600 text-xs space-y-1"
                >
                    <p>💡 Mẹo: Dán link hồ sơ TikTok (ví dụ: tiktok.com/@chic.outfit.vn) để AI quét toàn bộ video</p>
                    <p>🔒 Dữ liệu của bạn được bảo mật và không chia sẻ với bên thứ ba</p>
                </motion.div>
            </div>
        );
    }

    // ═════════════════════════════════════════════════════════════════
    // PHASE: ANALYZING
    // ═════════════════════════════════════════════════════════════════
    if (phase === 'analyzing') {
        return (
            <div className="p-8 flex flex-col items-center justify-center min-h-[70vh] space-y-10">
                <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative">
                    {/* Glow ring */}
                    <div className="absolute inset-0 w-28 h-28 rounded-3xl bg-gradient-to-br from-pink-500 to-purple-600 blur-2xl opacity-30 animate-pulse" />
                    <div className="relative w-28 h-28 bg-gradient-to-br from-pink-500 via-purple-500 to-violet-600 rounded-3xl flex items-center justify-center shadow-2xl">
                        <Sparkles size={48} className="text-white animate-pulse" />
                    </div>
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.3, type: 'spring' }}
                        className="absolute -bottom-3 -right-3 w-12 h-12 bg-cyan-500 rounded-xl flex items-center justify-center shadow-xl shadow-cyan-500/30"
                    >
                        <TrendingUp size={22} className="text-white" />
                    </motion.div>
                </motion.div>

                <div className="text-center space-y-2 max-w-md">
                    <h2 className="text-2xl font-bold">AI đang phân tích kênh</h2>
                    <motion.p
                        key={analyzeStep}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-gray-400 text-sm"
                    >
                        {analyzeStep || 'Đang khởi tạo...'}
                    </motion.p>
                </div>

                <div className="w-full max-w-sm space-y-3">
                    <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${analyzeProgress}%` }}
                            transition={{ duration: 0.4, ease: 'easeOut' }}
                        />
                    </div>
                    <div className="flex justify-between text-xs text-gray-600">
                        <span>Đang quét video...</span>
                        <span className="font-bold text-white">{analyzeProgress}%</span>
                    </div>
                </div>

                {/* Skeleton previews */}
                <div className="w-full max-w-xl grid grid-cols-3 gap-3 opacity-30">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="glass-card p-3 space-y-2 animate-pulse">
                            <div className="h-20 bg-white/5 rounded-lg" />
                            <div className="h-2 bg-white/5 rounded w-3/4" />
                            <div className="h-2 bg-white/5 rounded w-1/2" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // ═════════════════════════════════════════════════════════════════
    // PHASE: RESULTS
    // ═════════════════════════════════════════════════════════════════
    return (
        <div className="p-5 lg:p-7 space-y-5 max-w-[1400px] mx-auto">
            {/* Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <span className="bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">TikTok Promote</span>
                        <span className="text-[10px] px-2 py-0.5 bg-green-500/15 text-green-400 rounded-full font-bold border border-green-500/20">Phân tích hoàn tất</span>
                    </h1>
                    <p className="text-gray-500 text-xs mt-0.5">Kết quả phân tích & đề xuất chiến dịch quảng cáo</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => { setPhase('analyzing'); setTimeout(() => { setChannel(generateMockChannel(channelUrl)); setPhase('results'); }, 2000); }}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all border border-white/5"
                    >
                        <RefreshCw size={12} /> Quét lại
                    </button>
                    <button
                        onClick={() => { setPhase('input'); setChannel(null); }}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs bg-gradient-to-r from-pink-500/10 to-purple-500/10 text-purple-300 hover:text-white rounded-lg transition-all border border-purple-500/20"
                    >
                        <Search size={12} /> Kênh khác
                    </button>
                </div>
            </div>

            {/* Channel Card + Stats */}
            {channel && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    {/* Profile */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="lg:col-span-5 glass-card p-5 flex items-start gap-4"
                    >
                        <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-xl shadow-pink-500/20 shrink-0 ring-2 ring-pink-500/20 ring-offset-2 ring-offset-[#0a0a0f]">
                            {channel.avatar}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="text-base font-bold">{channel.displayName}</h2>
                                <span className="text-[11px] text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">@{channel.username}</span>
                            </div>
                            <p className="text-[11px] text-gray-500 mt-1 whitespace-pre-line line-clamp-2 leading-relaxed">{channel.bio}</p>
                            <div className="flex gap-4 mt-3 text-xs">
                                <span><strong className="text-white">{fmt(channel.following)}</strong> <span className="text-gray-500">Following</span></span>
                                <span><strong className="text-white">{fmt(channel.followers)}</strong> <span className="text-gray-500">Follower</span></span>
                                <span><strong className="text-white">{fmt(channel.totalLikes)}</strong> <span className="text-gray-500">Likes</span></span>
                            </div>
                            {/* Hashtags */}
                            <div className="flex flex-wrap gap-1.5 mt-3">
                                {channel.topHashtags.map(h => (
                                    <span key={h} className="text-[10px] px-2 py-0.5 bg-white/5 text-gray-400 rounded-full border border-white/5">{h}</span>
                                ))}
                            </div>
                        </div>
                    </motion.div>

                    {/* Overview Stats */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3"
                    >
                        <StatCard icon={Play} label="Tổng video" value={channel.videos.length.toString()} sub="Đang hoạt động" color="text-pink-400" />
                        <StatCard icon={Eye} label="View TB / video" value={fmt(channel.avgViews)} trend={channel.growthRate} color="text-blue-400" />
                        <StatCard icon={TrendingUp} label="Engagement TB" value={channel.avgEngagement + '%'} sub="Tỷ lệ tương tác" color="text-green-400" />
                        <StatCard icon={Crown} label="AI Picks" value={recommendedCount.toString()} sub="Video tiềm năng" color="text-purple-400" />
                    </motion.div>
                </div>
            )}

            {/* AI Recommendation Banner */}
            {recommendedCount > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="glass-card p-5 border-purple-500/15 relative overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.04), rgba(236,72,153,0.04))' }}
                >
                    <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
                    <div className="flex flex-col sm:flex-row items-start gap-4">
                        <div className="w-11 h-11 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/25">
                            <Sparkles size={20} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-sm flex items-center gap-2 flex-wrap">
                                AI Đề Xuất Chiến Dịch Quảng Cáo
                                <span className="text-[10px] px-2 py-0.5 bg-purple-500/15 text-purple-300 rounded-full font-bold border border-purple-500/20">
                                    {recommendedCount} video tiềm năng cao
                                </span>
                            </h3>
                            <p className="text-xs text-gray-400 mt-1.5 leading-relaxed max-w-3xl">
                                {sortedVideos.find(v => v.aiRecommended)?.aiReason}
                            </p>
                        </div>
                        <button
                            onClick={() => { const v = sortedVideos.find(v => v.aiRecommended); if (v) handlePromote(v); }}
                            className="shrink-0 px-5 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl text-xs font-bold hover:shadow-lg hover:shadow-pink-500/25 transition-all active:scale-95 flex items-center gap-1.5"
                        >
                            <Megaphone size={14} /> Promote Ngay <ChevronRight size={12} />
                        </button>
                    </div>
                </motion.div>
            )}

            {/* Tabs + Sort */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Tabs */}
                <div className="flex bg-white/[0.03] rounded-xl p-1 border border-white/5">
                    {([
                        { key: 'all' as TabKey, label: 'Tất cả', count: sortedVideos.length },
                        { key: 'recommended' as TabKey, label: 'AI Đề Xuất', count: recommendedCount },
                        { key: 'history' as TabKey, label: 'Lịch sử chiến dịch', count: mockCampaignHistory.length },
                    ]).map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                                activeTab === tab.key
                                    ? 'bg-white/10 text-white shadow-sm'
                                    : 'text-gray-500 hover:text-gray-300'
                            }`}
                        >
                            {tab.label}
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                activeTab === tab.key ? 'bg-white/10' : 'bg-white/5'
                            }`}>{tab.count}</span>
                        </button>
                    ))}
                </div>

                {/* Sort */}
                {activeTab !== 'history' && (
                    <div className="flex items-center gap-1.5">
                        {([
                            { key: 'aiScore' as const, icon: Sparkles, label: 'AI Score' },
                            { key: 'views' as const, icon: Eye, label: 'Views' },
                            { key: 'likes' as const, icon: Heart, label: 'Likes' },
                            { key: 'comments' as const, icon: MessageCircle, label: 'Comments' },
                        ]).map(s => (
                            <button
                                key={s.key}
                                onClick={() => setSortBy(s.key)}
                                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all ${
                                    sortBy === s.key
                                        ? 'bg-purple-500/15 text-purple-300 border border-purple-500/20'
                                        : 'text-gray-500 hover:text-gray-300 border border-transparent'
                                }`}
                            >
                                <s.icon size={11} /> {s.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Campaign History Tab */}
            {activeTab === 'history' && (
                <div className="space-y-3">
                    {mockCampaignHistory.map((c, i) => (
                        <motion.div
                            key={c.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="glass-card p-4 flex flex-col sm:flex-row sm:items-center gap-3"
                        >
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold truncate">{c.videoTitle}</p>
                                <p className="text-[11px] text-gray-500 mt-0.5">{c.goal} • {c.date}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${
                                    c.status === 'running' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20' :
                                    c.status === 'completed' ? 'bg-green-500/15 text-green-400 border border-green-500/20' :
                                    'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20'
                                }`}>
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
                            <motion.div
                                key={video.id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ delay: i * 0.04 }}
                                className={`glass-card overflow-hidden group ${
                                    video.aiRecommended ? 'ring-1 ring-purple-500/25' : ''
                                }`}
                            >
                                {/* Thumbnail */}
                                <div className="relative h-40 bg-gradient-to-br from-gray-900 via-gray-850 to-gray-800 flex items-center justify-center overflow-hidden cursor-pointer"
                                    onClick={() => setExpandedVideo(expandedVideo === video.id ? null : video.id)}
                                >
                                    <span className="text-5xl opacity-30 group-hover:opacity-50 transition-opacity select-none">{video.thumbnail}</span>
                                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Play size={36} className="text-white/90" fill="white" />
                                    </div>
                                    {/* Top-left badges */}
                                    <div className="absolute top-2 left-2 flex gap-1.5">
                                        {video.aiRecommended && (
                                            <span className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-[9px] font-bold rounded-lg shadow-lg">
                                                <Crown size={9} /> AI Khuyên Dùng
                                            </span>
                                        )}
                                        {video.privacy !== 'Mọi người' && (
                                            <span className="px-2 py-1 bg-black/50 text-gray-300 text-[9px] font-bold rounded-lg">🔒 {video.privacy}</span>
                                        )}
                                    </div>
                                    {/* Top-right AI Score */}
                                    <div className="absolute top-2 right-2">
                                        <CircularScore score={video.aiScore} />
                                    </div>
                                    {/* Bottom */}
                                    <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/70 to-transparent flex items-end justify-between">
                                        <span className="text-[11px] text-white/80 flex items-center gap-1"><Play size={10} fill="white" /> {fmt(video.views)}</span>
                                        <span className="text-[10px] text-white/70 font-mono bg-black/40 px-1.5 py-0.5 rounded">{video.duration}</span>
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="p-3.5 space-y-2.5">
                                    <h4 className="text-[13px] font-medium leading-snug line-clamp-2" title={video.title}>{video.title}</h4>

                                    {/* Metrics row */}
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
                                            <p className="text-[9px] text-gray-600 uppercase font-bold tracking-wider">Retention</p>
                                            <p className={`text-xs font-bold mt-0.5 ${video.retentionRate >= 60 ? 'text-green-400' : video.retentionRate >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                                                {video.retentionRate}%
                                            </p>
                                        </div>
                                        <div className="flex-1 py-1.5 bg-white/[0.03] rounded-lg text-center border border-white/5">
                                            <p className="text-[9px] text-gray-600 uppercase font-bold tracking-wider">Engage</p>
                                            <p className={`text-xs font-bold mt-0.5 ${video.engagementRate >= 2 ? 'text-green-400' : video.engagementRate >= 1 ? 'text-yellow-400' : 'text-red-400'}`}>
                                                {video.engagementRate}%
                                            </p>
                                        </div>
                                        <div className="flex-1 py-1.5 bg-white/[0.03] rounded-lg text-center border border-white/5">
                                            <p className="text-[9px] text-gray-600 uppercase font-bold tracking-wider">Shares</p>
                                            <p className="text-xs font-bold mt-0.5 text-gray-300">{video.shares}</p>
                                        </div>
                                    </div>

                                    {/* AI Insight (expandable) */}
                                    <AnimatePresence>
                                        {expandedVideo === video.id && video.aiReason && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="p-2.5 bg-purple-500/5 border border-purple-500/10 rounded-lg mt-1">
                                                    <p className="text-[10px] text-purple-300 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                                                        <Sparkles size={10} /> AI Insight
                                                    </p>
                                                    <p className="text-[11px] text-gray-400 leading-relaxed">{video.aiReason}</p>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Expand toggle */}
                                    {video.aiReason && (
                                        <button
                                            onClick={() => setExpandedVideo(expandedVideo === video.id ? null : video.id)}
                                            className="w-full flex items-center justify-center gap-1 text-[10px] text-gray-600 hover:text-purple-400 transition-colors py-0.5"
                                        >
                                            <Sparkles size={9} />
                                            {expandedVideo === video.id ? 'Ẩn AI Insight' : 'Xem AI Insight'}
                                            <ChevronDown size={10} className={`transition-transform ${expandedVideo === video.id ? 'rotate-180' : ''}`} />
                                        </button>
                                    )}

                                    {/* CTA */}
                                    <button
                                        onClick={() => handlePromote(video)}
                                        className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] ${
                                            video.aiRecommended
                                                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/15 hover:shadow-xl hover:shadow-pink-500/25'
                                                : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/5 hover:border-white/10'
                                        }`}
                                    >
                                        <Megaphone size={12} />
                                        {video.aiRecommended ? 'Promote Ngay (AI Đề Xuất)' : 'Tạo Promote'}
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
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed top-0 left-0 w-screen h-screen z-[9999] flex items-center justify-center p-4"
                        style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}
                        onClick={() => setShowPromoteModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.92, opacity: 0, y: 40 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.92, opacity: 0, y: 40 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            className="w-full max-w-[520px] rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
                            style={{ background: '#0c0c10', border: '1px solid rgba(255,255,255,0.08)' }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {paymentSuccess ? (
                                <div className="p-12 text-center space-y-5">
                                    <motion.div
                                        initial={{ scale: 0, rotate: -180 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                                        className="w-20 h-20 bg-green-500/15 rounded-full flex items-center justify-center mx-auto border border-green-500/20"
                                    >
                                        <Check size={40} className="text-green-400" />
                                    </motion.div>
                                    <h3 className="text-xl font-bold">Chiến dịch đã được tạo! 🎉</h3>
                                    <p className="text-gray-400 text-sm leading-relaxed">
                                        Video "<span className="text-white font-medium">{selectedVideo.title.slice(0, 45)}...</span>" đang được chạy quảng cáo.
                                        Bạn sẽ nhận được báo cáo kết quả trong 24 giờ tới.
                                    </p>
                                    <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                                        <Clock size={12} /> Dự kiến hoàn tất trong 1-3 ngày
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* Header */}
                                    <div className="p-5 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <h3 className="font-bold text-base flex items-center gap-2">
                                            <Megaphone size={18} className="text-pink-400" />
                                            Tạo Chiến Dịch Promote
                                        </h3>
                                        <button onClick={() => setShowPromoteModal(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                                            <X size={16} />
                                        </button>
                                    </div>

                                    <div className="p-5 space-y-5">
                                        {/* Video preview */}
                                        <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div className="w-12 h-12 bg-gradient-to-br from-gray-800 to-gray-700 rounded-lg flex items-center justify-center text-xl shrink-0">
                                                {selectedVideo.thumbnail}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium truncate">{selectedVideo.title}</p>
                                                <p className="text-[11px] text-gray-500">Đăng ngày {selectedVideo.postedAt} • {fmt(selectedVideo.views)} views</p>
                                            </div>
                                            <CircularScore score={selectedVideo.aiScore} size={38} />
                                        </div>

                                        {/* Goal Tabs (like TikTok) */}
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Chọn mục tiêu ⓘ</h4>
                                            {/* Top tab bar */}
                                            <div className="flex gap-1 mb-3 overflow-x-auto pb-1">
                                                {(['account', 'sales', 'live', 'leads'] as const).map(tab => (
                                                    <button
                                                        key={tab}
                                                        onClick={() => setGoalTab(tab)}
                                                        className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all ${
                                                            goalTab === tab
                                                                ? 'bg-white/10 text-white border border-white/10'
                                                                : 'text-gray-500 hover:text-gray-300 border border-transparent'
                                                        }`}
                                                    >
                                                        {tab === 'account' ? 'Thúc đẩy tài khoản' : tab === 'sales' ? 'Tăng doanh số' : tab === 'live' ? 'Thúc đẩy LIVE' : 'Thu hút khách hàng'}
                                                    </button>
                                                ))}
                                            </div>
                                            {/* Goal options */}
                                            <div className="space-y-2">
                                                {(Object.entries(goalConfig) as [PromoteGoal, typeof goalConfig[PromoteGoal]][]).map(([key, cfg]) => (
                                                    <button
                                                        key={key}
                                                        onClick={() => { setSelectedGoal(key); setSelectedPack(null); }}
                                                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                                                            selectedGoal === key
                                                                ? 'bg-pink-500/8 border-pink-500/25'
                                                                : 'border-white/5 hover:bg-white/[0.03]'
                                                        }`}
                                                        style={selectedGoal === key ? { background: 'rgba(236,72,153,0.06)' } : {}}
                                                    >
                                                        <cfg.icon size={17} className={selectedGoal === key ? cfg.color : 'text-gray-500'} />
                                                        <div className="flex-1 min-w-0">
                                                            <p className={`text-[13px] font-semibold flex items-center gap-2 ${selectedGoal === key ? 'text-white' : 'text-gray-300'}`}>
                                                                {cfg.label}
                                                                {key === 'engagement' && (
                                                                    <span className="text-[8px] px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded font-bold">New</span>
                                                                )}
                                                            </p>
                                                            <p className="text-[10px] text-gray-500">{cfg.desc}</p>
                                                        </div>
                                                        <div className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                                                            selectedGoal === key ? 'border-pink-500 bg-pink-500' : 'border-white/15'
                                                        }`}>
                                                            {selectedGoal === key && <Check size={10} className="text-white" />}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Packs */}
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Chọn gói Promote ⓘ</h4>
                                            <p className="text-[10px] text-gray-600 mb-3">Kết quả hiển thị là ước tính</p>
                                            <div className="space-y-2">
                                                {promotePacksMap[selectedGoal].map((pack) => (
                                                    <button
                                                        key={pack.id}
                                                        onClick={() => setSelectedPack(pack.id)}
                                                        className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left relative ${
                                                            selectedPack === pack.id
                                                                ? 'border-pink-500/30'
                                                                : 'border-white/5 hover:border-white/10'
                                                        }`}
                                                        style={selectedPack === pack.id ? { background: 'rgba(236,72,153,0.06)' } : { background: 'rgba(255,255,255,0.015)' }}
                                                    >
                                                        <div className="w-9 h-9 bg-gradient-to-br from-pink-500/15 to-purple-500/15 rounded-xl flex items-center justify-center shrink-0">
                                                            <Zap size={16} className="text-pink-400" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-bold">{pack.range}</p>
                                                            <p className="text-[10px] text-gray-500">{pack.unit} {pack.perDay}</p>
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            <p className="text-sm font-bold">{fmtVND(pack.price)}</p>
                                                            {pack.recommended && (
                                                                <span className="text-[8px] px-1.5 py-0.5 bg-red-500 text-white rounded font-bold">Đề xuất</span>
                                                            )}
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
                                                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Tổng cộng</p>
                                                <p className="text-xl font-bold mt-0.5">
                                                    {selectedPack ? fmtVND(promotePacksMap[selectedGoal].find(p => p.id === selectedPack)?.price ?? 0) : '—'}
                                                </p>
                                            </div>
                                            <button
                                                onClick={handlePay}
                                                disabled={!selectedPack}
                                                className="px-8 py-3 bg-gradient-to-r from-pink-500 to-red-500 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-pink-500/25 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                                            >
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
