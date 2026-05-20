import React, { useState, useCallback } from 'react';
import {
    Megaphone, Search, Loader2, TrendingUp, Eye, Heart, MessageCircle,
    Users, Play, Sparkles, ChevronRight, X, Check, Star, Zap,
    BarChart3, ArrowUpRight, Clock, ThumbsUp, UserPlus, FileText,
    Crown, Target, DollarSign, AlertCircle
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
}

type PromoteGoal = 'engagement' | 'views' | 'followers' | 'profile';

interface PromotePack {
    id: string;
    range: string;
    unit: string;
    price: number;
    recommended?: boolean;
}

// ─── Mock Data Generator ─────────────────────────────────────────────
const generateMockChannel = (url: string): ChannelInfo => {
    const handle = url.split('/').pop()?.replace('@', '') || 'user';
    const mockVideos: MockVideo[] = [
        {
            id: 'v1', title: '#ootd #douyin #phoidoxinh #phoidonu #thoitrangnu',
            thumbnail: '🎵', views: 2376, likes: 47, comments: 0, shares: 3,
            postedAt: '14 tháng 5', duration: '0:15', retentionRate: 78,
            engagementRate: 2.1, aiScore: 92, aiRecommended: true,
            aiReason: 'Video có tỷ lệ giữ chân 78% — cao nhất kênh. Nội dung #ootd đang trend mạnh. AI đề xuất: Tăng lượt thích & bình luận để viral nhanh hơn.',
            privacy: 'Mọi người',
        },
        {
            id: 'v2', title: '#ootd #douyin #phoidoxinh #phoidonu #xuhuong',
            thumbnail: '📱', views: 2041, likes: 18, comments: 1, shares: 2,
            postedAt: '10 tháng 5', duration: '0:12', retentionRate: 65,
            engagementRate: 0.93, aiScore: 74, aiRecommended: false,
            privacy: 'Mọi người',
        },
        {
            id: 'v3', title: 'outfit đi chơi đi biển trong mùa hè này cho các nàng nhaaa 🌊🌴...',
            thumbnail: '🏖️', views: 1348, likes: 14, comments: 3, shares: 5,
            postedAt: '3 tháng 5', duration: '0:18', retentionRate: 72,
            engagementRate: 1.63, aiScore: 85, aiRecommended: true,
            aiReason: 'Lượt chia sẻ cao gấp 2.5x trung bình kênh. Nội dung mùa hè phù hợp xu hướng. AI đề xuất: Nhiều lượt xem hơn để tận dụng momentum chia sẻ.',
            privacy: 'Mọi người',
        },
        {
            id: 'v4', title: 'Set đồ đi cafe, đi chơi siêu xinh cho các nàng ngày hè 🌸✨ #ootd...',
            thumbnail: '☕', views: 4, likes: 0, comments: 0, shares: 0,
            postedAt: '20 tháng 5', duration: '0:10', retentionRate: 45,
            engagementRate: 0, aiScore: 28, aiRecommended: false,
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
            privacy: 'Mọi người',
        },
    ];

    return {
        username: handle,
        displayName: 'Phối Đồ Douyin ✨',
        avatar: handle.charAt(0).toUpperCase(),
        followers: 262,
        following: 169,
        totalLikes: 842,
        bio: 'Gợi ý phối đồ outfit y2k, nàng thơ douyinnn\n1m60 - 48kg ✨\nSắm đồ xinh ở giỏ hàng nhé các nàng 🛒',
        videos: mockVideos,
    };
};

// ─── Promote Packs ──────────────────────────────────────────────────
const promotePacksMap: Record<PromoteGoal, PromotePack[]> = {
    engagement: [
        { id: 'e1', range: '140 - 545', unit: 'lượt thích và bình luận trong 1 ngày', price: 23000 },
        { id: 'e2', range: '244 - 948', unit: 'lượt thích và bình luận trong 1 ngày', price: 40011, recommended: true },
        { id: 'e3', range: '428 - 1.66K', unit: 'lượt thích và bình luận trong 1 ngày', price: 70019 },
    ],
    views: [
        { id: 'v1', range: '500 - 1.5K', unit: 'lượt xem video trong 1 ngày', price: 23000 },
        { id: 'v2', range: '1K - 3K', unit: 'lượt xem video trong 1 ngày', price: 40011, recommended: true },
        { id: 'v3', range: '2K - 6K', unit: 'lượt xem video trong 1 ngày', price: 70019 },
    ],
    followers: [
        { id: 'f1', range: '50 - 200', unit: 'followers mới trong 3 ngày', price: 46000 },
        { id: 'f2', range: '120 - 500', unit: 'followers mới trong 3 ngày', price: 92000, recommended: true },
        { id: 'f3', range: '250 - 1K', unit: 'followers mới trong 3 ngày', price: 184000 },
    ],
    profile: [
        { id: 'p1', range: '300 - 1K', unit: 'lượt xem hồ sơ trong 1 ngày', price: 23000 },
        { id: 'p2', range: '600 - 2K', unit: 'lượt xem hồ sơ trong 1 ngày', price: 40011, recommended: true },
        { id: 'p3', range: '1K - 4K', unit: 'lượt xem hồ sơ trong 1 ngày', price: 70019 },
    ],
};

const goalConfig: Record<PromoteGoal, { icon: React.ElementType; label: string; desc: string }> = {
    engagement: { icon: Heart, label: 'Tăng lượt thích và bình luận', desc: 'Thúc đẩy tương tác trên bài đăng' },
    views: { icon: Eye, label: 'Nhiều lượt xem video hơn', desc: 'Tăng lượt xem và tiếp cận' },
    followers: { icon: UserPlus, label: 'Nhiều follower hơn', desc: 'Tăng lượng người theo dõi' },
    profile: { icon: FileText, label: 'Tăng lượt xem hồ sơ', desc: 'Thu hút traffic về trang cá nhân' },
};

// ─── Format Helpers ─────────────────────────────────────────────────
const fmt = (n: number) => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return n.toString();
};

const fmtVND = (n: number) => n.toLocaleString('vi-VN') + 'đ';

// ─── Sub-Components ─────────────────────────────────────────────────
const AiScoreBadge: React.FC<{ score: number }> = ({ score }) => {
    const color = score >= 80 ? 'from-green-500 to-emerald-500' :
                  score >= 50 ? 'from-yellow-500 to-amber-500' :
                  'from-red-500 to-orange-500';
    return (
        <div className={`px-2 py-0.5 text-[10px] font-bold text-white rounded-full bg-gradient-to-r ${color} shadow-lg`}>
            AI {score}
        </div>
    );
};

// ─── Main Component ─────────────────────────────────────────────────
const TikTokPromote: React.FC = () => {
    const [channelUrl, setChannelUrl] = useState('');
    const [phase, setPhase] = useState<'input' | 'analyzing' | 'results'>('input');
    const [channel, setChannel] = useState<ChannelInfo | null>(null);
    const [analyzeProgress, setAnalyzeProgress] = useState(0);
    const [analyzeStep, setAnalyzeStep] = useState('');
    const [selectedVideo, setSelectedVideo] = useState<MockVideo | null>(null);
    const [showPromoteModal, setShowPromoteModal] = useState(false);
    const [selectedGoal, setSelectedGoal] = useState<PromoteGoal>('engagement');
    const [selectedPack, setSelectedPack] = useState<string | null>(null);
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [sortBy, setSortBy] = useState<'views' | 'likes' | 'comments' | 'aiScore'>('aiScore');

    const analyzeChannel = useCallback(() => {
        if (!channelUrl.trim()) return;
        setPhase('analyzing');
        setAnalyzeProgress(0);
        
        const steps = [
            'Đang kết nối tới TikTok API...',
            'Thu thập dữ liệu kênh & video...',
            'AI phân tích tỷ lệ giữ chân người xem (Retention Rate)...',
            'AI đánh giá mức độ tương tác (Engagement Rate)...',
            'AI so sánh với các kênh cùng niche...',
            'Xây dựng đề xuất chiến dịch quảng cáo tối ưu...',
            'Hoàn tất!',
        ];

        let step = 0;
        const interval = setInterval(() => {
            step++;
            const progress = Math.min(Math.round((step / steps.length) * 100), 100);
            setAnalyzeProgress(progress);
            setAnalyzeStep(steps[Math.min(step, steps.length - 1)]);

            if (step >= steps.length) {
                clearInterval(interval);
                setTimeout(() => {
                    setChannel(generateMockChannel(channelUrl));
                    setPhase('results');
                }, 400);
            }
        }, 700);
    }, [channelUrl]);

    const sortedVideos = channel?.videos
        .slice()
        .sort((a, b) => b[sortBy] - a[sortBy]) ?? [];

    const handlePromote = (video: MockVideo) => {
        setSelectedVideo(video);
        setSelectedGoal(video.aiReason?.includes('lượt xem') ? 'views' : 'engagement');
        setSelectedPack(null);
        setPaymentSuccess(false);
        setShowPromoteModal(true);
    };

    const handlePay = () => {
        setPaymentSuccess(true);
        setTimeout(() => {
            setShowPromoteModal(false);
            setPaymentSuccess(false);
        }, 3000);
    };

    // ─── PHASE: Input ────────────────────────────────────────────────
    if (phase === 'input') {
        return (
            <div className="p-8 max-w-4xl mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                        TikTok Promote (AI)
                    </h1>
                    <p className="text-gray-500 mt-1">Nhập URL kênh TikTok — AI sẽ phân tích và đề xuất chiến dịch quảng cáo tối ưu nhất.</p>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-8 space-y-6"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-pink-500/20">
                            <Megaphone size={24} className="text-white" />
                        </div>
                        <div>
                            <h2 className="font-bold text-lg">Phân tích kênh bằng AI</h2>
                            <p className="text-xs text-gray-500">Dán URL hồ sơ TikTok của bạn hoặc bất kỳ kênh nào</p>
                        </div>
                    </div>

                    <div className="relative">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            value={channelUrl}
                            onChange={(e) => setChannelUrl(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && analyzeChannel()}
                            placeholder="https://tiktok.com/@username"
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-36 py-4 focus:outline-none focus:border-pink-500/50 focus:bg-white/[0.08] transition-all text-sm"
                        />
                        <button
                            onClick={analyzeChannel}
                            disabled={!channelUrl.trim()}
                            className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg font-semibold hover:from-pink-600 hover:to-purple-700 transition-all active:scale-95 disabled:opacity-40 flex items-center gap-2 text-sm shadow-lg shadow-pink-500/20"
                        >
                            <Sparkles size={16} /> Phân Tích AI
                        </button>
                    </div>

                    {/* Feature highlights */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-white/5">
                        {[
                            { icon: BarChart3, title: 'Phân tích sâu', desc: 'Retention Rate, Engagement, tỷ lệ viral cho từng video' },
                            { icon: Sparkles, title: 'AI đề xuất', desc: 'Tự động chọn video tốt nhất và mục tiêu tối ưu' },
                            { icon: Target, title: 'Setup Promote', desc: 'Thiết lập chiến dịch trực tiếp: view, tym, comment' },
                        ].map((f) => (
                            <div key={f.title} className="flex gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center shrink-0">
                                    <f.icon size={18} className="text-purple-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold">{f.title}</p>
                                    <p className="text-[11px] text-gray-500 leading-relaxed">{f.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>
        );
    }

    // ─── PHASE: Analyzing ────────────────────────────────────────────
    if (phase === 'analyzing') {
        return (
            <div className="p-8 max-w-3xl mx-auto flex flex-col items-center justify-center min-h-[60vh] space-y-8">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="relative"
                >
                    <div className="w-24 h-24 bg-gradient-to-br from-pink-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-pink-500/30">
                        <Sparkles size={40} className="text-white animate-pulse" />
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                        <TrendingUp size={20} className="text-white" />
                    </div>
                </motion.div>

                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold">AI đang phân tích kênh</h2>
                    <p className="text-gray-500 text-sm max-w-md">{analyzeStep || 'Đang khởi tạo...'}</p>
                </div>

                <div className="w-full max-w-md space-y-2">
                    <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${analyzeProgress}%` }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                        />
                    </div>
                    <p className="text-xs text-gray-600 text-center">{analyzeProgress}%</p>
                </div>
            </div>
        );
    }

    // ─── PHASE: Results ──────────────────────────────────────────────
    const recommendedVideos = sortedVideos.filter(v => v.aiRecommended);

    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                        TikTok Promote (AI)
                    </h1>
                    <p className="text-gray-500 text-sm mt-0.5">Kết quả phân tích & đề xuất chiến dịch</p>
                </div>
                <button
                    onClick={() => { setPhase('input'); setChannel(null); }}
                    className="text-sm text-gray-400 hover:text-white flex items-center gap-1.5 transition-colors"
                >
                    <Search size={14} /> Phân tích kênh khác
                </button>
            </div>

            {/* Channel Info Card */}
            {channel && (
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-5 flex flex-col md:flex-row items-start md:items-center gap-5"
                >
                    <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-pink-500/20 shrink-0">
                        {channel.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-lg font-bold">{channel.displayName}</h2>
                            <span className="text-xs text-gray-500">@{channel.username}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 whitespace-pre-line line-clamp-2">{channel.bio}</p>
                        <div className="flex gap-4 mt-2 text-xs">
                            <span><strong className="text-white">{fmt(channel.following)}</strong> <span className="text-gray-500">Đã follow</span></span>
                            <span><strong className="text-white">{fmt(channel.followers)}</strong> <span className="text-gray-500">Follower</span></span>
                            <span><strong className="text-white">{fmt(channel.totalLikes)}</strong> <span className="text-gray-500">Lượt thích</span></span>
                        </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <div className="px-4 py-2 bg-white/5 rounded-xl text-center border border-white/5">
                            <p className="text-lg font-bold text-pink-400">{channel.videos.length}</p>
                            <p className="text-[10px] text-gray-500 uppercase font-bold">Videos</p>
                        </div>
                        <div className="px-4 py-2 bg-white/5 rounded-xl text-center border border-white/5">
                            <p className="text-lg font-bold text-purple-400">{recommendedVideos.length}</p>
                            <p className="text-[10px] text-gray-500 uppercase font-bold">AI Picks</p>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* AI Recommendation Banner */}
            {recommendedVideos.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="glass-card p-5 border-purple-500/20 bg-purple-500/[0.03] relative overflow-hidden"
                >
                    <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500" />
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/20">
                            <Sparkles size={20} className="text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm flex items-center gap-2">
                                AI Đề Xuất Chiến Dịch
                                <span className="text-[10px] px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full font-bold">
                                    {recommendedVideos.length} video tiềm năng
                                </span>
                            </h3>
                            <p className="text-xs text-gray-400 mt-1 leading-relaxed max-w-3xl">
                                {recommendedVideos[0]?.aiReason}
                            </p>
                            <button
                                onClick={() => handlePromote(recommendedVideos[0])}
                                className="mt-3 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg text-xs font-semibold hover:from-pink-600 hover:to-purple-700 transition-all active:scale-95 flex items-center gap-1.5 shadow-lg shadow-pink-500/20"
                            >
                                <Megaphone size={14} /> Chạy Promote Ngay
                                <ChevronRight size={12} />
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Sort Bar */}
            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-600 font-bold uppercase tracking-wider mr-2">Sắp xếp:</span>
                {([
                    { key: 'aiScore' as const, icon: Sparkles, label: 'AI Score' },
                    { key: 'views' as const, icon: Eye, label: 'Lượt xem' },
                    { key: 'likes' as const, icon: Heart, label: 'Lượt thích' },
                    { key: 'comments' as const, icon: MessageCircle, label: 'Bình luận' },
                ]).map(s => (
                    <button
                        key={s.key}
                        onClick={() => setSortBy(s.key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                            sortBy === s.key
                                ? 'bg-purple-500/15 text-purple-300 border border-purple-500/20'
                                : 'bg-white/5 text-gray-400 hover:text-white border border-transparent'
                        }`}
                    >
                        <s.icon size={12} /> {s.label}
                    </button>
                ))}
            </div>

            {/* Video Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                <AnimatePresence mode="popLayout">
                    {sortedVideos.map((video, i) => (
                        <motion.div
                            key={video.id}
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ delay: i * 0.05 }}
                            className={`glass-card overflow-hidden group cursor-pointer ${
                                video.aiRecommended ? 'ring-1 ring-purple-500/30' : ''
                            }`}
                            onClick={() => setSelectedVideo(selectedVideo?.id === video.id ? null : video)}
                        >
                            {/* Video Thumbnail Placeholder */}
                            <div className="relative h-44 bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center overflow-hidden">
                                <span className="text-5xl opacity-40">{video.thumbnail}</span>
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Play size={40} className="text-white/80" fill="white" />
                                </div>
                                {/* Badges */}
                                <div className="absolute top-2 left-2 flex gap-1.5">
                                    {video.aiRecommended && (
                                        <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-[10px] font-bold rounded-lg shadow-lg">
                                            <Crown size={10} /> AI Khuyên Dùng
                                        </div>
                                    )}
                                </div>
                                <div className="absolute top-2 right-2">
                                    <AiScoreBadge score={video.aiScore} />
                                </div>
                                <div className="absolute bottom-2 left-2 flex items-center gap-1.5 text-xs text-white/80">
                                    <Play size={10} fill="white" /> {fmt(video.views)}
                                </div>
                                <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/60 text-[10px] text-white rounded font-mono">
                                    {video.duration}
                                </div>
                            </div>

                            {/* Video Info */}
                            <div className="p-3.5 space-y-2.5">
                                <h4 className="text-sm font-medium leading-snug line-clamp-2" title={video.title}>
                                    {video.title}
                                </h4>
                                <div className="flex items-center gap-3 text-[11px] text-gray-500">
                                    <span className="flex items-center gap-1"><Eye size={11} /> {fmt(video.views)}</span>
                                    <span className="flex items-center gap-1"><Heart size={11} /> {fmt(video.likes)}</span>
                                    <span className="flex items-center gap-1"><MessageCircle size={11} /> {video.comments}</span>
                                    <span className="flex items-center gap-1"><Clock size={11} /> {video.postedAt}</span>
                                </div>
                                
                                {/* Stats Row */}
                                <div className="flex gap-2">
                                    <div className="flex-1 px-2 py-1.5 bg-white/[0.03] rounded-lg text-center border border-white/5">
                                        <p className="text-[10px] text-gray-600">Retention</p>
                                        <p className={`text-xs font-bold ${video.retentionRate >= 60 ? 'text-green-400' : video.retentionRate >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                                            {video.retentionRate}%
                                        </p>
                                    </div>
                                    <div className="flex-1 px-2 py-1.5 bg-white/[0.03] rounded-lg text-center border border-white/5">
                                        <p className="text-[10px] text-gray-600">Engagement</p>
                                        <p className={`text-xs font-bold ${video.engagementRate >= 2 ? 'text-green-400' : video.engagementRate >= 1 ? 'text-yellow-400' : 'text-red-400'}`}>
                                            {video.engagementRate}%
                                        </p>
                                    </div>
                                    <div className="flex-1 px-2 py-1.5 bg-white/[0.03] rounded-lg text-center border border-white/5">
                                        <p className="text-[10px] text-gray-600">Quyền</p>
                                        <p className="text-xs font-medium text-gray-300 truncate">{video.privacy}</p>
                                    </div>
                                </div>

                                {/* CTA */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); handlePromote(video); }}
                                    className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] ${
                                        video.aiRecommended
                                            ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/15 hover:from-pink-600 hover:to-purple-700'
                                            : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/5'
                                    }`}
                                >
                                    <Megaphone size={13} />
                                    {video.aiRecommended ? 'Promote Ngay (AI Đề Xuất)' : 'Tạo Promote'}
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* ─── Promote Modal ─────────────────────────────────── */}
            <AnimatePresence>
                {showPromoteModal && selectedVideo && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setShowPromoteModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 30 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 30 }}
                            className="w-full max-w-lg bg-[#111113] border border-white/10 rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {paymentSuccess ? (
                                /* Success State */
                                <div className="p-10 text-center space-y-4">
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                                        className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto"
                                    >
                                        <Check size={40} className="text-green-400" />
                                    </motion.div>
                                    <h3 className="text-xl font-bold">Chiến dịch đã được tạo!</h3>
                                    <p className="text-gray-400 text-sm">
                                        Video "<span className="text-white">{selectedVideo.title.slice(0, 40)}...</span>" đang được chạy quảng cáo.
                                        Bạn sẽ nhận được kết quả trong 24 giờ tới.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {/* Modal Header */}
                                    <div className="p-5 border-b border-white/5 flex items-center justify-between">
                                        <h3 className="font-bold text-lg flex items-center gap-2">
                                            <Megaphone size={20} className="text-pink-400" />
                                            Tạo Chiến Dịch Promote
                                        </h3>
                                        <button
                                            onClick={() => setShowPromoteModal(false)}
                                            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>

                                    <div className="p-5 space-y-5">
                                        {/* Selected Video Preview */}
                                        <div className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-xl border border-white/5">
                                            <div className="w-12 h-12 bg-gradient-to-br from-gray-800 to-gray-700 rounded-lg flex items-center justify-center text-xl shrink-0">
                                                {selectedVideo.thumbnail}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium truncate">{selectedVideo.title}</p>
                                                <p className="text-[11px] text-gray-500">Đăng ngày {selectedVideo.postedAt}</p>
                                            </div>
                                        </div>

                                        {/* Choose Goal */}
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Chọn mục tiêu</h4>
                                            <div className="grid grid-cols-1 gap-2">
                                                {(Object.entries(goalConfig) as [PromoteGoal, typeof goalConfig[PromoteGoal]][]).map(([key, cfg]) => (
                                                    <button
                                                        key={key}
                                                        onClick={() => { setSelectedGoal(key); setSelectedPack(null); }}
                                                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                                                            selectedGoal === key
                                                                ? 'bg-pink-500/10 border-pink-500/30 text-white'
                                                                : 'bg-white/[0.02] border-white/5 text-gray-400 hover:bg-white/5'
                                                        }`}
                                                    >
                                                        <cfg.icon size={18} className={selectedGoal === key ? 'text-pink-400' : ''} />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-semibold flex items-center gap-2">
                                                                {cfg.label}
                                                                {key === 'engagement' && (
                                                                    <span className="text-[9px] px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded-full font-bold">New</span>
                                                                )}
                                                            </p>
                                                            <p className="text-[11px] text-gray-500">{cfg.desc}</p>
                                                        </div>
                                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                                            selectedGoal === key ? 'border-pink-500 bg-pink-500' : 'border-white/20'
                                                        }`}>
                                                            {selectedGoal === key && <Check size={12} className="text-white" />}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Promotion Packs */}
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Chọn gói Promote</h4>
                                            <p className="text-[11px] text-gray-600 mb-3">Kết quả hiển thị là ước tính</p>
                                            <div className="space-y-2">
                                                {promotePacksMap[selectedGoal].map((pack) => (
                                                    <button
                                                        key={pack.id}
                                                        onClick={() => setSelectedPack(pack.id)}
                                                        className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left relative overflow-hidden ${
                                                            selectedPack === pack.id
                                                                ? 'bg-pink-500/10 border-pink-500/30'
                                                                : 'bg-white/[0.02] border-white/5 hover:bg-white/5'
                                                        }`}
                                                    >
                                                        <div className="w-10 h-10 bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-xl flex items-center justify-center shrink-0">
                                                            <Zap size={18} className="text-pink-400" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-bold text-white">{pack.range}</p>
                                                            <p className="text-[11px] text-gray-500">{pack.unit}</p>
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            <p className="text-sm font-bold text-white">{fmtVND(pack.price)}</p>
                                                            {pack.recommended && (
                                                                <span className="text-[9px] px-1.5 py-0.5 bg-red-500 text-white rounded font-bold">
                                                                    Đề xuất
                                                                </span>
                                                            )}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Customize link */}
                                        <button className="flex items-center justify-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors mx-auto">
                                            <Settings2Icon /> Customize
                                        </button>

                                        {/* Terms */}
                                        <div className="flex items-start gap-2 text-[11px] text-gray-600">
                                            <AlertCircle size={14} className="shrink-0 mt-0.5" />
                                            <p>Tôi đồng ý với <span className="text-purple-400 cursor-pointer hover:underline">Chương trình quảng bá và Điều khoản thanh toán</span> của TikTok</p>
                                        </div>

                                        {/* Total & Pay */}
                                        <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                            <div>
                                                <p className="text-xs text-gray-500">Tổng cộng</p>
                                                <p className="text-xl font-bold">
                                                    {selectedPack
                                                        ? fmtVND(promotePacksMap[selectedGoal].find(p => p.id === selectedPack)?.price ?? 0)
                                                        : '—'
                                                    }
                                                </p>
                                            </div>
                                            <button
                                                onClick={handlePay}
                                                disabled={!selectedPack}
                                                className="px-8 py-3 bg-gradient-to-r from-pink-500 to-red-500 text-white rounded-xl font-bold hover:from-pink-600 hover:to-red-600 transition-all active:scale-95 disabled:opacity-40 flex items-center gap-2 shadow-lg shadow-pink-500/20"
                                            >
                                                <DollarSign size={16} /> Thanh Toán
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Small icon component to avoid importing yet another icon
const Settings2Icon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
);

export default TikTokPromote;
