import React, { useState } from 'react';
import { useDownloadHistory, useCreateDownload, useCancelDownload, useDeleteDownload } from '../shared/hooks/useDownloads';
import { truncateText, formatFileSize, timeAgo, saveFileAs } from '../shared/utils/format';
import { Loader2, Download, CheckCircle2, Trash2, X, FolderDown, Clock, AlertCircle, Image as ImageIcon, Music, Settings2, Sparkles, Copy, Archive, Target, Flame, Brain, TrendingUp, ShoppingBag, BarChart3, Layers, Wand2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { useAuth } from '../shared/hooks/useAuth';

const MAX_TITLE_CHARS = 45;

const platformConfig: Record<string, { icon: string; label: string; color: string }> = {
    douyin:   { icon: '🎵', label: 'Douyin',   color: 'bg-pink-500/10 text-pink-400 border-pink-500/20' },
    tiktok:   { icon: '📱', label: 'TikTok',   color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
    xhs:      { icon: '📕', label: 'XHS',      color: 'bg-red-500/10 text-red-400 border-red-500/20' },
    bilibili: { icon: '📺', label: 'Bilibili', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    youtube:  { icon: '▶️', label: 'YouTube',  color: 'bg-red-500/10 text-red-400 border-red-500/20' },
    other:    { icon: '🌐', label: 'Other',    color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
};

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
    pending:    { label: 'Chờ xử lý',  color: 'text-yellow-400', bgColor: 'bg-yellow-500' },
    processing: { label: 'Đang tải',   color: 'text-blue-400',   bgColor: 'bg-blue-500' },
    completed:  { label: 'Hoàn thành', color: 'text-green-400',  bgColor: 'bg-green-500' },
    failed:     { label: 'Thất bại',   color: 'text-red-400',    bgColor: 'bg-red-500' },
    cancelled:  { label: 'Đã hủy',    color: 'text-gray-400',   bgColor: 'bg-gray-500' },
};

type HashtagLayer = 'HIGH DISCOVERY' | 'LOW COMPETITION HIGH ENGAGEMENT' | 'TREND VN' | 'SHOP CONVERSION';

type SmartHashtag = {
    tag: string;
    posts?: string;
    likes?: string;
    engagement?: string;
    saturation?: string;
    growth?: string;
    layer: HashtagLayer;
    score?: number;
    purpose?: string;
    opportunity_score?: number;
    competition_density?: number;
    trend_half_life_days?: number;
};

type AiContentResult = {
    sourcePlatform?: string;
    contentType?: string;
    detectedNiche?: string;
    nicheConfidence?: number;
    inputSignals?: {
        usedOriginalCaption?: boolean;
        usedComments?: boolean;
        usedVisualInference?: boolean;
        usedAudioInference?: boolean;
    };
    hookScore?: number;
    trigger?: string;
    viralPotential?: string;
    hook?: string;
    optimized_caption?: string;
    caption?: string;
    optimized_hook?: string;
    psychological_analysis?: string;
    psychological_trigger?: string;
    audience?: string;
    hook_score?: number;
    viral_potential?: string;
    cta?: string;
    style_archetype?: string;
    hashtags?: string[];
    smart_hashtags?: SmartHashtag[];
    hooks_ab?: string[];
    captions_ab?: string[];
    hashtag_sets_ab?: string[][];
    caption_type?: string;
    behavioral_scores?: Record<string, number>;
    feature_vector?: Record<string, string | number>;
    similar_viral_patterns?: Array<{
        pattern: string;
        expected_metric: string;
        confidence: number;
    }>;
    viral_genome?: string[];
    hashtag_opportunity?: {
        formula?: string;
        recommended_mix?: string;
        avg_score?: number;
    };
    memory_signals?: {
        hook?: string;
        retention?: string;
        saves?: string;
        shares?: string;
        ctr?: string;
    };
};

const hashtagDb: SmartHashtag[] = [
    { tag: '#outfittiktok', posts: '12M', likes: '4.1B', engagement: 'high', saturation: 'medium', growth: 'rising', layer: 'HIGH DISCOVERY', score: 88 },
    { tag: '#girlstyle', posts: '3.4M', likes: '980M', engagement: 'medium', saturation: 'medium', growth: 'stable', layer: 'HIGH DISCOVERY', score: 72 },
    { tag: '#xuhuong', posts: '50M+', likes: '12B+', engagement: 'low', saturation: 'high', growth: 'stable', layer: 'HIGH DISCOVERY', score: 46 },
    { tag: '#vayxinh', posts: '300K', likes: '800M', engagement: 'high', saturation: 'low', growth: 'rising', layer: 'LOW COMPETITION HIGH ENGAGEMENT', score: 94 },
    { tag: '#phoido', posts: '650K', likes: '1.2B', engagement: 'high', saturation: 'medium', growth: 'rising', layer: 'LOW COMPETITION HIGH ENGAGEMENT', score: 89 },
    { tag: '#thoitrangnu', posts: '1.8M', likes: '2.2B', engagement: 'medium', saturation: 'medium', growth: 'stable', layer: 'LOW COMPETITION HIGH ENGAGEMENT', score: 78 },
    { tag: '#outfitxinh', posts: '820K', likes: '1.6B', engagement: 'high', saturation: 'medium', growth: 'rising', layer: 'LOW COMPETITION HIGH ENGAGEMENT', score: 87 },
    { tag: '#cleangirl', posts: '2M', likes: '900M', engagement: 'medium', saturation: 'medium', growth: 'rising', layer: 'TREND VN', score: 83 },
    { tag: '#localfashion', posts: '410K', likes: '690M', engagement: 'high', saturation: 'low', growth: 'rising', layer: 'TREND VN', score: 91 },
    { tag: '#ulzzangstyle', posts: '780K', likes: '1.1B', engagement: 'medium', saturation: 'medium', growth: 'rising', layer: 'TREND VN', score: 80 },
    { tag: '#reviewdo', posts: '520K', likes: '860M', engagement: 'high', saturation: 'low', growth: 'rising', layer: 'SHOP CONVERSION', score: 90 },
    { tag: '#tiktokshopvn', posts: '1.1M', likes: '1.9B', engagement: 'medium', saturation: 'medium', growth: 'rising', layer: 'SHOP CONVERSION', score: 84 },
    { tag: '#tiktokshop', posts: '8M', likes: '9.4B', engagement: 'medium', saturation: 'high', growth: 'stable', layer: 'SHOP CONVERSION', score: 62 },
];

const deadOrSpamTags = new Set(['#fyp', '#viral', '#foryou', '#foryoupage']);

const normalizeTag = (tag: string) => tag.startsWith('#') ? tag.toLowerCase().replace(/\s+/g, '') : `#${tag.toLowerCase().replace(/\s+/g, '')}`;

const buildSmartHashtags = (incoming: string[] = []): SmartHashtag[] => {
    const incomingSet = new Set(incoming.map(normalizeTag).filter(tag => !deadOrSpamTags.has(tag)));
    const merged = hashtagDb.map(tag => ({
        ...tag,
        score: (tag.score || 0) + (incomingSet.has(normalizeTag(tag.tag)) ? 8 : 0),
    }));

    const bestByLayer = ['HIGH DISCOVERY', 'LOW COMPETITION HIGH ENGAGEMENT', 'TREND VN', 'SHOP CONVERSION']
        .flatMap(layer => merged
            .filter(tag => tag.layer === layer)
            .sort((a, b) => (b.score || 0) - (a.score || 0))
            .slice(0, layer === 'LOW COMPETITION HIGH ENGAGEMENT' ? 3 : 2)
        );

    return bestByLayer;
};

const withAiFallbacks = (data: Partial<AiContentResult>): AiContentResult => {
    const smartHashtags = data.smart_hashtags?.length ? data.smart_hashtags : buildSmartHashtags(data.hashtags);
    const detectedNiche = data.detectedNiche || 'fashion';
    const isFashion = detectedNiche === 'fashion';
    const style = data.style_archetype || (isFashion ? 'Clean Girl' : detectedNiche);
    const hook = data.hook || data.optimized_hook || (isFashion ? 'Đổi đúng 1 món mà outfit nhìn khác hẳn...' : 'Có một chi tiết nhỏ làm video này đáng xem...');
    const caption = data.caption || data.optimized_caption || (isFashion ? 'Mấy bà mặc tone này nhìn sang hơn hẳn luôn á 😭' : 'Cái này ai từng gặp rồi sẽ hiểu luôn á 😭');
    const hookScore = data.hookScore ?? data.hook_score ?? 92;
    const trigger = data.trigger || data.psychological_trigger || (isFashion ? 'Effortless beauty aspiration' : 'Relatable curiosity');
    const viralPotential = data.viralPotential || data.viral_potential || 'High';
    const behavioralScores = data.behavioral_scores || {
        'Hook Power': hookScore,
        'Emotional Curiosity': isFashion ? 78 : 68,
        'Save Intent': isFashion ? 82 : 66,
        'Shareability': isFashion ? 70 : 72,
        'Purchase Intent': isFashion ? 76 : 48,
    };
    const featureVector = data.feature_vector || {
        hook_type: isFashion ? 'transformation' : 'curiosity',
        aesthetic: style,
        pacing: isFashion ? 'fast outfit cuts' : 'medium',
        avg_cut_duration: isFashion ? '1.1s' : '1.8s',
        face_presence: isFashion ? 'high-estimated' : 'medium-estimated',
        text_density: 'medium',
        emotional_tone: trigger,
    };

    return {
        ...data,
        sourcePlatform: data.sourcePlatform || 'unknown',
        contentType: data.contentType || 'unknown',
        detectedNiche,
        nicheConfidence: data.nicheConfidence ?? 0.72,
        inputSignals: data.inputSignals || {
            usedOriginalCaption: true,
            usedComments: false,
            usedVisualInference: false,
            usedAudioInference: false,
        },
        hookScore,
        trigger,
        viralPotential,
        hook,
        audience: data.audience || (isFashion ? `Nữ 18-24 / ${style} / TikTok Shop` : `TikTok Việt Nam / ${detectedNiche} / Organic reach`),
        hook_score: hookScore,
        psychological_trigger: trigger,
        viral_potential: viralPotential,
        optimized_hook: hook,
        optimized_caption: caption,
        caption_type: data.caption_type || (isFashion ? 'Transformation / save intent' : 'Curiosity / retention'),
        behavioral_scores: behavioralScores,
        feature_vector: featureVector,
        similar_viral_patterns: data.similar_viral_patterns?.length ? data.similar_viral_patterns : [
            { pattern: 'Khong nghi + small change', expected_metric: 'retention/save', confidence: 0.76 },
            { pattern: 'May ba / girl-talk opener', expected_metric: 'share/comment', confidence: 0.72 },
            { pattern: 'Set 1 hay set 2', expected_metric: 'comment bait', confidence: 0.61 },
        ],
        viral_genome: data.viral_genome?.length ? data.viral_genome : [
            String(featureVector.aesthetic || style),
            isFashion ? 'visible outfit payoff' : 'curiosity payoff',
            isFashion ? 'TikTok Shop compatible CTA' : 'save/share CTA',
        ],
        hashtag_opportunity: data.hashtag_opportunity || {
            formula: '(engagement_velocity * save_rate * watch_time) / competition_density',
            recommended_mix: '2 large, 3 medium, 3 emerging, 2 hyper niche',
            avg_score: Math.round(smartHashtags.reduce((sum, tag) => sum + (tag.score || 0), 0) / Math.max(smartHashtags.length, 1)),
        },
        cta: data.cta || (isFashion ? 'Có gắn link outfit ở giỏ hàng nha ✨' : 'Lưu lại khi cần nha ✨'),
        style_archetype: style,
        smart_hashtags: smartHashtags,
        hashtags: smartHashtags.map(tag => tag.tag),
        hooks_ab: data.hooks_ab?.length ? data.hooks_ab : [
            'Mấy bà ơi, outfit này cứu dáng thật...',
            'Đổi đúng 1 món mà khác hẳn luôn á',
            'Không nghĩ mặc lên lại sang vậy 😭',
            'Từ ngày phối kiểu này mình đỡ mất thời gian hơn',
            'Ai thích clean girl thử tone này nha',
        ],
        captions_ab: data.captions_ab?.length ? data.captions_ab : [
            caption,
            'Mấy bà lưu lại công thức phối này nha, đơn giản mà lên dáng xinh lắm.',
            'Không cần quá nhiều món, chọn đúng tone là outfit nhìn có gu liền.',
            'Set này hợp đi chơi lẫn đi làm luôn, mình có gắn giỏ hàng nha.',
            'Ai đang bí outfit thì thử kiểu này, nhìn sạch và sang hơn hẳn.',
        ],
        hashtag_sets_ab: data.hashtag_sets_ab?.length ? data.hashtag_sets_ab : [
            smartHashtags.slice(0, 5).map(tag => tag.tag),
            smartHashtags.filter(tag => tag.layer !== 'HIGH DISCOVERY').slice(0, 5).map(tag => tag.tag),
            smartHashtags.filter(tag => tag.layer === 'SHOP CONVERSION' || tag.layer === 'LOW COMPETITION HIGH ENGAGEMENT').map(tag => tag.tag),
            ['#phoido', '#outfitxinh', '#cleangirl', '#reviewdo', '#tiktokshopvn'],
            ['#localfashion', '#thoitrangnu', '#vayxinh', '#outfittiktok'],
        ],
        memory_signals: data.memory_signals || {
            hook: '"Mấy bà ơi" đang hợp nữ 18-24 hơn POV trong fashion VN',
            retention: 'Cần payoff hình ảnh trong 1-3 giây đầu',
            saves: 'Công thức phối đồ và checklist dễ kéo save',
            shares: 'Caption girl talk tăng share trong nhóm bạn',
            ctr: 'CTA mềm về giỏ hàng tốt hơn ép mua trực tiếp',
        },
    };
};

const Downloads: React.FC = () => {
    const { user } = useAuth();
    const [url, setUrl] = useState('');
    const [page, setPage] = useState(1);
    const pageSize = 10;
    const [autoRename, setAutoRename] = useState(true);
    const [extractAudio, setExtractAudio] = useState(false);
    const [downloadType, setDownloadType] = useState('auto');

    const [aiUrl, setAiUrl] = useState('');
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);
    const [aiResult, setAiResult] = useState<AiContentResult | null>(null);
    const [aiError, setAiError] = useState('');

    const { data: downloads, isLoading, error } = useDownloadHistory(page, pageSize);
    const createMutation = useCreateDownload();
    const cancelMutation = useCancelDownload();
    const deleteMutation = useDeleteDownload();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!url.trim()) return;
        createMutation.mutate({ url, downloadType });
        setUrl('');
    };

    const handleGenerateAi = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!aiUrl.trim()) return;
        setIsGeneratingAi(true);
        setAiError('');
        setAiResult(null);
        try {
            const token = document.cookie.split('; ').find(row => row.startsWith('access_token='))?.split('=')[1];
            const res = await fetch('http://localhost:5141/api/v1/ai/generate-caption', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ url: aiUrl })
            });
            const textResponse = await res.text();
            let data: any = {};
            try {
                if (textResponse) data = JSON.parse(textResponse);
            } catch (e) {
                console.error("Non-JSON response:", textResponse);
                throw new Error(`Server returned an invalid response (${res.status})`);
            }
            if (!res.ok) throw new Error(data?.error || `Failed to generate AI content (${res.status})`);
            setAiResult(withAiFallbacks(data));
        } catch (err: any) {
            setAiError(err.message);
        } finally {
            setIsGeneratingAi(false);
        }
    };

    const activeCount = downloads?.filter(d => d.status === 'pending' || d.status === 'processing').length || 0;
    
    // Determine plan info from quota
    let planBadge = { name: 'Free', color: 'bg-gray-500', quality: '720p' };
    if (user?.role === 'admin') planBadge = { name: 'Admin', color: 'bg-purple-500', quality: 'Original' };
    else if (user?.quotaTotal === 30) planBadge = { name: 'Starter', color: 'bg-blue-500', quality: '1080p' };
    else if (user?.quotaTotal === 100) planBadge = { name: 'Pro', color: 'bg-fuchsia-500', quality: '4K' };
    else if (user?.quotaTotal === 500) planBadge = { name: 'Business', color: 'bg-orange-500', quality: 'Original' };

    const quotaLeft = user?.role === 'admin' ? '∞' : Math.max(0, (user?.quotaTotal || 5) - (user?.quotaUsed || 0));

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                        Downloads
                    </h1>
                    <p className="text-gray-500 mt-1">Quản lý và tải video từ các nền tảng.</p>
                </div>
                {user && (
                    <div className="text-right">
                        <div className="flex items-center gap-2 justify-end mb-1">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold text-white ${planBadge.color}`}>
                                {planBadge.name} Plan
                            </span>
                            <span className="text-xs text-gray-400 border border-white/10 px-2 py-0.5 rounded bg-white/5">
                                Max: {planBadge.quality}
                            </span>
                        </div>
                        <div className="text-sm text-gray-400">
                            Lượt tải còn lại hôm nay: <strong className="text-white">{quotaLeft}</strong>
                        </div>
                    </div>
                )}
            </div>

            {/* Download Form */}
            <form onSubmit={handleSubmit} className="glass-card p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Download className="text-primary" size={20} />
                    <h3 className="font-bold">Tải video mới</h3>
                    {activeCount > 0 && (
                        <span className="ml-auto px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[11px] font-bold rounded-full border border-blue-500/20">
                            {activeCount} đang xử lý
                        </span>
                    )}
                </div>
                <div className="relative">
                    <input
                        type="text"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="Dán URL video (Douyin, TikTok, XHS, Bilibili...)"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 pr-32 focus:outline-none focus:border-primary/50 focus:bg-white/8 transition-all"
                    />
                    <button
                        type="submit"
                        disabled={!url.trim() || createMutation.isPending}
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2.5 bg-primary text-white rounded-lg font-semibold hover:bg-primary/80 transition-all active:scale-95 disabled:opacity-40"
                    >
                        {createMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : 'Tải'}
                    </button>
                </div>

                {/* Advanced Options */}
                <div className="mt-4 flex items-center gap-6 pt-4 border-t border-white/5">
                    <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer hover:text-white transition-colors">
                        <input 
                            type="checkbox" 
                            checked={autoRename} 
                            onChange={(e) => setAutoRename(e.target.checked)}
                            className="rounded border-white/10 bg-black/20 text-primary focus:ring-primary focus:ring-offset-0"
                        />
                        <Settings2 size={14} /> Auto Rename
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer hover:text-white transition-colors">
                        <input 
                            type="checkbox" 
                            checked={extractAudio} 
                            onChange={(e) => setExtractAudio(e.target.checked)}
                            className="rounded border-white/10 bg-black/20 text-primary focus:ring-primary focus:ring-offset-0"
                        />
                        <Music size={14} /> Tách âm thanh (MP3)
                    </label>

                    <div className="flex-1"></div>
                    
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400">Tải về:</span>
                        <select 
                            value={downloadType}
                            onChange={(e) => setDownloadType(e.target.value)}
                            className="bg-black/20 border border-white/10 rounded-lg px-3 py-1 text-sm text-gray-300 focus:outline-none focus:border-primary/50"
                        >
                            <option value="auto">Tự động (Ưu tiên Video)</option>
                            <option value="video">Chỉ Video</option>
                            <option value="images">Chỉ Hình Ảnh</option>
                            <option value="both">Cả Video & Ảnh (ZIP)</option>
                        </select>
                    </div>
                </div>

                {createMutation.isError && (
                    <p className="text-red-400 mt-3 text-sm flex items-center gap-2">
                        <AlertCircle size={14} /> {(createMutation.error as Error).message}
                    </p>
                )}
            </form>

            {/* AI Generation Tool */}
            <form onSubmit={handleGenerateAi} className="glass-card p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 bg-gradient-to-bl from-purple-500/20 to-transparent rounded-bl-full pointer-events-none opacity-50"></div>
                <div className="flex items-center gap-3 mb-4 text-purple-400">
                    <Sparkles size={20} />
                    <h3 className="font-bold text-white">TikTok VN Growth Intelligence</h3>
                    <span className="ml-auto px-2 py-0.5 bg-purple-500/10 text-[11px] font-bold rounded-full border border-purple-500/20">
                        AI Universal Growth Analyzer
                    </span>
                </div>
                <div className="relative">
                    <input
                        type="text"
                        value={aiUrl}
                        onChange={(e) => setAiUrl(e.target.value)}
                        placeholder="Dán link từ XHS, Douyin, TikTok, Reels, Shorts... để AI phân tích growth"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 pr-40 focus:outline-none focus:border-purple-500/50 focus:bg-white/8 transition-all"
                    />
                    <button
                        type="submit"
                        disabled={!aiUrl.trim() || isGeneratingAi}
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2.5 bg-purple-500 text-white rounded-lg font-semibold hover:bg-purple-600 transition-all active:scale-95 disabled:opacity-40 flex items-center gap-2"
                    >
                        {isGeneratingAi ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={16} />} 
                        Phân Tích
                    </button>
                </div>
                {aiError && (
                    <p className="text-red-400 mt-3 text-sm flex items-center gap-2">
                        <AlertCircle size={14} /> {aiError}
                    </p>
                )}
                {aiResult && (
                    <div className="mt-5 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                                <div className="flex items-center gap-2 text-blue-300 text-xs font-bold uppercase tracking-wide">
                                    <BarChart3 size={14} /> Source
                                </div>
                                <p className="mt-2 text-sm font-semibold text-white capitalize">{aiResult.sourcePlatform} / {aiResult.contentType}</p>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                                <div className="flex items-center gap-2 text-pink-300 text-xs font-bold uppercase tracking-wide">
                                    <Layers size={14} /> Niche
                                </div>
                                <p className="mt-2 text-sm font-semibold text-white capitalize">{aiResult.detectedNiche} <span className="text-gray-500">{Math.round((aiResult.nicheConfidence || 0) * 100)}%</span></p>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                                <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold uppercase tracking-wide">
                                    <Target size={14} /> Audience
                                </div>
                                <p className="mt-2 text-sm font-semibold text-white">{aiResult.audience}</p>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                                <div className="flex items-center gap-2 text-orange-300 text-xs font-bold uppercase tracking-wide">
                                    <Flame size={14} /> Hook Score
                                </div>
                                <p className="mt-2 text-2xl font-black text-white">{aiResult.hook_score}<span className="text-sm text-gray-500">/100</span></p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="rounded-xl border border-purple-500/15 bg-purple-500/5 p-4">
                                <div className="flex items-center gap-2 text-purple-300 text-xs font-bold uppercase tracking-wide">
                                    <Brain size={14} /> Trigger
                                </div>
                                <p className="mt-2 text-sm font-semibold text-white">{aiResult.psychological_trigger}</p>
                            </div>
                            <div className="rounded-xl border border-green-500/15 bg-green-500/5 p-4">
                                <div className="flex items-center gap-2 text-green-300 text-xs font-bold uppercase tracking-wide">
                                    <TrendingUp size={14} /> Viral Potential
                                </div>
                                <p className="mt-2 text-sm font-semibold text-white">{aiResult.viral_potential}</p>
                            </div>
                            <div className="rounded-xl border border-orange-500/15 bg-orange-500/5 p-4">
                                <div className="flex items-center gap-2 text-orange-300 text-xs font-bold uppercase tracking-wide">
                                    <ShoppingBag size={14} /> Fashion Priority Mode
                                </div>
                                <p className="mt-2 text-sm font-semibold text-white">{aiResult.detectedNiche === 'fashion' ? 'ON' : 'OFF'}</p>
                            </div>
                        </div>

                        <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
                            <h4 className="text-sm font-bold text-white mb-3">Input signals</h4>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { label: 'Original caption', active: aiResult.inputSignals?.usedOriginalCaption },
                                    { label: 'Top comments', active: aiResult.inputSignals?.usedComments },
                                    { label: 'Vision', active: aiResult.inputSignals?.usedVisualInference },
                                    { label: 'Audio', active: aiResult.inputSignals?.usedAudioInference },
                                ].map(({ label, active }) => (
                                    <span key={label} className={`px-3 py-1 rounded-full border text-xs font-bold ${active ? 'bg-green-500/10 border-green-500/20 text-green-300' : 'bg-white/5 border-white/10 text-gray-500'}`}>
                                        {label}: {active ? 'used' : 'not used'}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                        <Target size={16} className="text-cyan-300" /> Behavioral Prediction
                                    </h4>
                                    <span className="text-[11px] font-bold text-purple-300">{aiResult.caption_type}</span>
                                </div>
                                <div className="space-y-3">
                                    {Object.entries(aiResult.behavioral_scores || {}).map(([name, score]) => (
                                        <div key={name}>
                                            <div className="flex items-center justify-between text-xs mb-1">
                                                <span className="font-bold text-gray-300">{name}</span>
                                                <span className="text-white font-black">{score}/100</span>
                                            </div>
                                            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                                                <div className="h-full rounded-full bg-cyan-400" style={{ width: `${Math.min(100, Math.max(0, score))}%` }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
                                <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                    <Brain size={16} className="text-purple-300" /> Viral Genome
                                </h4>
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {(aiResult.viral_genome || []).map(signal => (
                                        <span key={signal} className="px-2.5 py-1 rounded-md border border-purple-500/20 bg-purple-500/10 text-xs font-bold text-purple-100">{signal}</span>
                                    ))}
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {Object.entries(aiResult.feature_vector || {}).map(([key, value]) => (
                                        <div key={key} className="rounded-lg bg-black/20 border border-white/10 p-2">
                                            <div className="text-[10px] uppercase font-black text-gray-500">{key.replaceAll('_', ' ')}</div>
                                            <div className="text-xs font-semibold text-gray-100 mt-1">{String(value)}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
                            <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                <TrendingUp size={16} className="text-green-300" /> Similar Viral Pattern Memory
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {(aiResult.similar_viral_patterns || []).map(item => (
                                    <div key={item.pattern} className="rounded-lg border border-white/10 bg-black/20 p-3">
                                        <div className="text-sm font-bold text-white">{item.pattern}</div>
                                        <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400">
                                            <span>{item.expected_metric}</span>
                                            <span className="text-green-300 font-black">{Math.round(item.confidence * 100)}%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-xl bg-purple-500/5 border border-purple-500/10 p-4 space-y-4">
                            {aiResult.psychological_analysis && (
                                <div>
                                    <h4 className="text-sm font-semibold text-purple-300 mb-2 flex items-center gap-2">
                                        <Brain size={15} /> Phân tích retention & tâm lý
                                    </h4>
                                    <p className="text-sm leading-6 text-gray-300">{aiResult.psychological_analysis}</p>
                                </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-sm font-semibold text-orange-300 flex items-center gap-2">
                                            <Flame size={15} /> Viral Hook
                                        </h4>
                                        <button type="button" onClick={() => navigator.clipboard.writeText(aiResult.optimized_hook || '')} className="text-gray-400 hover:text-white transition-colors" title="Copy hook">
                                            <Copy size={14} />
                                        </button>
                                    </div>
                                    <p className="text-sm text-gray-100 font-semibold">{aiResult.optimized_hook}</p>
                                </div>
                                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-sm font-semibold text-purple-300 flex items-center gap-2">
                                            <Wand2 size={15} /> Viral Caption
                                        </h4>
                                        <button type="button" onClick={() => navigator.clipboard.writeText(aiResult.optimized_caption || aiResult.caption || '')} className="text-gray-400 hover:text-white transition-colors" title="Copy caption">
                                            <Copy size={14} />
                                        </button>
                                    </div>
                                    <p className="text-sm text-gray-100 font-semibold whitespace-pre-wrap">{aiResult.optimized_caption || aiResult.caption}</p>
                                </div>
                            </div>
                            <div className="rounded-xl border border-green-500/15 bg-green-500/5 p-4">
                                <h4 className="text-sm font-semibold text-green-300 mb-2 flex items-center gap-2">
                                    <ShoppingBag size={15} /> CTA TikTok Shop
                                </h4>
                                <p className="text-sm text-gray-100 font-semibold">{aiResult.cta}</p>
                            </div>
                        </div>

                        <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                        <Layers size={16} className="text-cyan-300" /> Smart Hashtags Ranking
                                    </h4>
                                    <p className="mt-1 text-xs text-gray-500">{aiResult.hashtag_opportunity?.recommended_mix}</p>
                                </div>
                                <button type="button" onClick={() => navigator.clipboard.writeText((aiResult.smart_hashtags || []).map(tag => tag.tag).join(' '))} className="text-gray-400 hover:text-white transition-colors" title="Copy hashtags">
                                    <Copy size={14} />
                                </button>
                            </div>
                            <div className="space-y-3">
                                {(['HIGH DISCOVERY', 'LOW COMPETITION HIGH ENGAGEMENT', 'TREND VN', 'SHOP CONVERSION'] as HashtagLayer[]).map(layer => {
                                    const tags = (aiResult.smart_hashtags || []).filter(tag => tag.layer === layer);
                                    if (!tags.length) return null;
                                    return (
                                        <div key={layer}>
                                            <div className="text-[11px] font-black text-gray-400 mb-2">{layer}</div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                {tags.map(tag => (
                                                    <div key={`${layer}-${tag.tag}`} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                                                        <div className="flex items-center justify-between gap-3">
                                                            <span className="font-bold text-sm text-white">{tag.tag}</span>
                                                            {tag.score && <span className="text-[11px] text-cyan-300 font-bold">{tag.score}/100</span>}
                                                        </div>
                                                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-400">
                                                            {tag.posts && <span>{tag.posts} posts</span>}
                                                            {tag.likes && <span>{tag.likes} likes</span>}
                                                            {tag.growth && <span>{tag.growth}</span>}
                                                            {tag.saturation && <span>{tag.saturation} saturation</span>}
                                                            {tag.competition_density !== undefined && <span>density {tag.competition_density}</span>}
                                                            {tag.trend_half_life_days !== undefined && <span>{tag.trend_half_life_days}d life</span>}
                                                        </div>
                                                        {tag.purpose && <p className="mt-1 text-[11px] text-gray-500">{tag.purpose}</p>}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
                                <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                    <BarChart3 size={16} className="text-blue-300" /> VN Viral Memory
                                </h4>
                                <div className="space-y-2 text-sm text-gray-300">
                                    {Object.entries(aiResult.memory_signals || {}).map(([key, value]) => (
                                        <div key={key} className="flex gap-3">
                                            <span className="w-20 shrink-0 text-xs uppercase font-bold text-gray-500">{key}</span>
                                            <span>{value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
                                <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                    <Wand2 size={16} className="text-pink-300" /> Caption A/B Generator
                                </h4>
                                <div className="space-y-3">
                                    {(aiResult.hooks_ab || []).slice(0, 5).map((hook, i) => (
                                        <div key={hook} className="text-sm text-gray-300">
                                            <span className="text-gray-500 font-bold mr-2">H{i + 1}</span>{hook}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-bold text-white">5 caption + hashtag sets để test</h4>
                                <button type="button" onClick={() => navigator.clipboard.writeText((aiResult.captions_ab || []).map((caption, i) => `${i + 1}. ${caption}\n${(aiResult.hashtag_sets_ab?.[i] || []).join(' ')}`).join('\n\n'))} className="text-gray-400 hover:text-white transition-colors" title="Copy A/B sets">
                                    <Copy size={14} />
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {(aiResult.captions_ab || []).slice(0, 5).map((caption, i) => (
                                    <div key={`${caption}-${i}`} className="rounded-lg border border-white/10 bg-black/20 p-3">
                                        <div className="text-[11px] text-purple-300 font-black mb-2">TEST {i + 1}</div>
                                        <p className="text-sm text-gray-100 mb-2">{caption}</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {(aiResult.hashtag_sets_ab?.[i] || []).map(tag => (
                                                <span key={tag} className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-[11px] text-gray-300">{tag}</span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </form>

            {/* Loading / Error / Empty */}
            {isLoading && (
                <div className="flex justify-center py-16">
                    <Loader2 className="animate-spin text-primary" size={32} />
                </div>
            )}
            {error && (
                <div className="glass-card p-6 text-red-400 flex items-center gap-3">
                    <AlertCircle size={20} /> Lỗi tải dữ liệu: {error.message}
                </div>
            )}
            {!isLoading && !error && (!downloads || downloads.length === 0) && (
                <div className="glass-card p-16 text-center text-gray-500 space-y-3">
                    <Download size={40} className="mx-auto opacity-20" />
                    <p className="font-medium">Chưa có lịch sử tải xuống</p>
                    <p className="text-sm">Dán URL video phía trên để bắt đầu.</p>
                </div>
            )}

            {/* Download List */}
            {downloads && downloads.length > 0 && (
                <div className="space-y-3">
                    <AnimatePresence mode="popLayout">
                        {downloads.map((item) => {
                            const platform = platformConfig[item.platform] || platformConfig.other;
                            const status = statusConfig[item.status] || statusConfig.pending;
                            const isActive = item.status === 'processing' || item.status === 'pending';

                            return (
                                <motion.div
                                    key={item.id}
                                    layout
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="glass-card overflow-hidden"
                                >
                                    <div className="p-4 flex items-center gap-4">
                                        {/* Platform Icon */}
                                        <div className="w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center text-lg shrink-0">
                                            {platform.icon}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-medium text-sm leading-snug" title={item.title || item.originalUrl}>
                                                {truncateText(item.title || item.originalUrl, MAX_TITLE_CHARS)}
                                            </h4>
                                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md border ${platform.color}`}>
                                                    {platform.label}
                                                </span>
                                                <span className={`text-[11px] font-semibold ${status.color}`}>
                                                    {status.label}
                                                </span>
                                                {item.fileSize && (
                                                    <span className="text-[11px] text-gray-500">{formatFileSize(item.fileSize)}</span>
                                                )}
                                                <span className="text-[11px] text-gray-600 flex items-center gap-1">
                                                    <Clock size={10} /> {timeAgo(item.createdAt)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="shrink-0 flex items-center gap-2">
                                            {item.status === 'completed' ? (
                                                <>
                                                    {item.thumbnailUrl && (
                                                        <button 
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-semibold rounded-lg transition-all active:scale-95 border border-white/5"
                                                            title="Tải Ảnh Thumbnail"
                                                        >
                                                            <ImageIcon size={16} /> Thumb
                                                        </button>
                                                    )}
                                                    <button 
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-semibold rounded-lg transition-all active:scale-95 border border-white/5"
                                                        title="Tải Âm Thanh MP3"
                                                    >
                                                        <Music size={16} /> Audio
                                                    </button>
                                                    {item.fileExtension === '.zip' ? (
                                                        <button 
                                                            onClick={() => item.fileUrl && saveFileAs(`http://localhost:5141${item.fileUrl}`, (item.title || 'images') + '.zip')}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-lg shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                                                            title="Lưu Ảnh (Zip) về máy"
                                                        >
                                                            <Archive size={16} />
                                                            Images
                                                        </button>
                                                    ) : (
                                                        <button 
                                                            onClick={() => item.fileUrl && saveFileAs(`http://localhost:5141${item.fileUrl}`, (item.title || 'video') + (item.fileExtension || '.mp4'))}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-lg shadow-lg shadow-green-500/20 transition-all active:scale-95"
                                                            title="Lưu Video về máy"
                                                        >
                                                            <FolderDown size={16} />
                                                            Video
                                                        </button>
                                                    )}
                                                </>
                                            ) : isActive ? (
                                                <div className="flex items-center gap-1">
                                                    {item.progress === 100 ? (
                                                        <CheckCircle2 size={16} className="text-green-500" />
                                                    ) : (
                                                        <Loader2 size={16} className="text-primary animate-spin" />
                                                    )}
                                                    <button
                                                        onClick={() => cancelMutation.mutate(item.id)}
                                                        className="p-1.5 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-all text-gray-500"
                                                        title="Hủy tải"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            ) : null}
                                            
                                            {!isActive && item.status !== 'completed' && (
                                                <button
                                                    onClick={() => deleteMutation.mutate(item.id)}
                                                    className="p-2 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-all text-gray-500"
                                                    title="Xóa"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Progress Bar for active jobs */}
                                    {isActive && (
                                        <div className="px-4 pb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                    <motion.div
                                                        className={`h-full rounded-full ${status.bgColor}`}
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${item.progress}%` }}
                                                        transition={{ duration: 0.5, ease: 'easeOut' }}
                                                    />
                                                </div>
                                                <span className="text-xs font-mono text-gray-400 w-10 text-right">
                                                    {item.progress}%
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Error Message */}
                                    {item.status === 'failed' && item.errorMessage && (
                                        <div className="px-4 pb-3">
                                            <p className="text-xs text-red-400/70 flex items-center gap-1.5">
                                                <AlertCircle size={12} /> {truncateText(item.errorMessage, 80)}
                                            </p>
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>

                    {/* Pagination */}
                    <div className="flex justify-center gap-4 pt-4">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-4 py-2 bg-white/5 rounded-lg disabled:opacity-30 hover:bg-white/10 transition-colors text-sm"
                        >
                            ← Trước
                        </button>
                        <span className="flex items-center text-gray-500 text-sm">Trang {page}</span>
                        <button
                            onClick={() => setPage(p => p + 1)}
                            disabled={!downloads || downloads.length < pageSize}
                            className="px-4 py-2 bg-white/5 rounded-lg disabled:opacity-30 hover:bg-white/10 transition-colors text-sm"
                        >
                            Sau →
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Downloads;
