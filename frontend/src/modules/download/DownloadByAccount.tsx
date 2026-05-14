import React, { useState } from 'react';
import { Users, Search, Download, CheckCircle2, Play, Grid, List, Workflow, Loader2, AlertCircle, ChevronDown, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { downloadApi } from '@/shared/api/download.api';
import type { ScrapedVideo } from '@/shared/types/download';

const VIDEO_LIMIT_OPTIONS = [5, 10, 20, 30, 50, 100];
const PLATFORM_OPTIONS = [
    { value: 'tiktok', label: 'TikTok', icon: '📱' },
    { value: 'douyin', label: 'Douyin', icon: '🎵' },
];

interface AccountData {
    username: string;
    nickname: string;
    avatar: string;
    followers: string;
    likes: string;
    videoCount: number;
    videos: ScrapedVideo[];
}

export const DownloadByAccount: React.FC = () => {
    const [username, setUsername] = useState('');
    const [videoLimit, setVideoLimit] = useState(10);
    const [platform, setPlatform] = useState('tiktok');
    const [view, setView] = useState<'grid' | 'list'>('grid');
    const [selected, setSelected] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState({ done: 0, total: 0 });
    const [data, setData] = useState<AccountData | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async () => {
        const cleanName = username.trim().replace(/^@/, '');
        if (!cleanName) return;

        setIsLoading(true);
        setError(null);
        setData(null);
        setSelected([]);

        try {
            const result = await downloadApi.scrapeAccount(cleanName, platform);
            // Limit and sort by newest (already ordered by platform)
            result.videos = result.videos.slice(0, videoLimit);
            result.videoCount = result.videos.length;
            setData(result);
        } catch (err: unknown) {
            let msg = 'Không thể tải thông tin tài khoản. Vui lòng thử lại.';
            if (err && typeof err === 'object' && 'response' in err) {
                const axErr = err as { response?: { data?: { message?: string }; status?: number } };
                if (axErr.response?.data?.message) {
                    msg = axErr.response.data.message;
                } else if (axErr.response?.status === 401) {
                    msg = 'Bạn cần đăng nhập để sử dụng tính năng này.';
                } else if (axErr.response?.status === 500) {
                    msg = 'Lỗi máy chủ. Backend chưa chạy hoặc Python script gặp sự cố.';
                }
            } else if (err instanceof Error) {
                if (err.message.includes('Network Error')) {
                    msg = 'Không kết nối được đến server. Hãy chắc chắn backend .NET đang chạy (port 5141).';
                } else {
                    msg = err.message;
                }
            }
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSearch();
    };

    const toggleSelect = (id: string) => {
        setSelected(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const selectAll = () => {
        if (!data) return;
        if (selected.length === data.videos.length) {
            setSelected([]);
        } else {
            setSelected(data.videos.map(v => v.videoId));
        }
    };

    const handleBatchDownload = async () => {
        if (!data || selected.length === 0) return;

        setIsDownloading(true);
        setDownloadProgress({ done: 0, total: selected.length });
        try {
            const urls = data.videos
                .filter(v => selected.includes(v.videoId))
                .map(v => v.url);
            const result = await downloadApi.batchDownload({ urls });
            setDownloadProgress({ done: result.jobs.length, total: selected.length });
            setSelected([]);
        } catch (err) {
            console.error('Batch download failed:', err);
        } finally {
            setIsDownloading(false);
        }
    };

    const handleSingleDownload = async (video: ScrapedVideo) => {
        try {
            await downloadApi.createJob({ url: video.url });
        } catch (err) {
            console.error('Download failed:', err);
        }
    };

    const currentPlatform = PLATFORM_OPTIONS.find(p => p.value === platform) || PLATFORM_OPTIONS[0];

    return (
        <div className="p-8 max-w-7xl mx-auto">
            {/* Search Header */}
            <div className="flex flex-col gap-6 mb-12">
                <div className="flex-1">
                    <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                        <Users className="text-primary" size={32} />
                        Tải theo Account
                    </h1>
                    <p className="text-gray-500 text-sm mb-6">
                        Nhập username để quét và tải hàng loạt video mới nhất — sắp xếp từ mới → cũ.
                    </p>

                    {/* Search Row */}
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Platform Selector */}
                        <div className="relative shrink-0">
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-1.5 ml-1">Nền tảng</label>
                            <div className="relative">
                                <select
                                    value={platform}
                                    onChange={(e) => setPlatform(e.target.value)}
                                    className="appearance-none bg-white/5 border border-white/10 rounded-xl px-4 pr-10 py-3.5 text-sm outline-none focus:border-primary/50 transition-all cursor-pointer min-w-[140px]"
                                >
                                    {PLATFORM_OPTIONS.map(p => (
                                        <option key={p.value} value={p.value}>{p.icon} {p.label}</option>
                                    ))}
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                            </div>
                        </div>

                        {/* Video Limit Dropdown */}
                        <div className="relative shrink-0">
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-1.5 ml-1">Số video</label>
                            <div className="relative">
                                <select
                                    value={videoLimit}
                                    onChange={(e) => setVideoLimit(Number(e.target.value))}
                                    className="appearance-none bg-white/5 border border-white/10 rounded-xl px-4 pr-10 py-3.5 text-sm outline-none focus:border-primary/50 transition-all cursor-pointer min-w-[120px]"
                                >
                                    {VIDEO_LIMIT_OPTIONS.map(n => (
                                        <option key={n} value={n}>{n} video mới nhất</option>
                                    ))}
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                            </div>
                        </div>

                        {/* Search Input */}
                        <div className="flex-1">
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-1.5 ml-1">Username</label>
                            <div className="relative group">
                                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors" size={18} />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder={`Ví dụ: @chic.outfit.vn`}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-14 pr-36 py-3.5 outline-none focus:border-primary/50 transition-all text-sm"
                                />
                                <button
                                    onClick={handleSearch}
                                    disabled={isLoading || !username.trim()}
                                    className="absolute right-2 top-1.5 bottom-1.5 bg-primary hover:bg-primary-dark disabled:opacity-50 px-6 rounded-lg font-bold text-sm transition-all active:scale-95 flex items-center gap-2"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 size={14} className="animate-spin" />
                                            Đang quét...
                                        </>
                                    ) : 'Tìm kiếm'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Info chip */}
                    <div className="flex items-center gap-4 mt-4">
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                            <Globe size={12} />
                            <span>{currentPlatform.icon} {currentPlatform.label}</span>
                            <span className="text-gray-700">•</span>
                            <span>Lấy {videoLimit} video mới nhất</span>
                        </div>

                        <div className="ml-auto flex items-center gap-2 bg-[#0c0c0c] p-1.5 rounded-xl border border-white/5">
                            <button
                                onClick={() => setView('grid')}
                                className={`p-2 rounded-lg transition-all ${view === 'grid' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-500 hover:text-white'}`}
                            >
                                <Grid size={16} />
                            </button>
                            <button
                                onClick={() => setView('list')}
                                className={`p-2 rounded-lg transition-all ${view === 'list' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-500 hover:text-white'}`}
                            >
                                <List size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Error State */}
            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-6 mb-8 border-red-500/20 flex items-center gap-4"
                >
                    <AlertCircle className="text-red-400 shrink-0" size={24} />
                    <div>
                        <p className="font-bold text-red-400">Không thể quét tài khoản</p>
                        <p className="text-sm text-gray-400 mt-1">{error}</p>
                    </div>
                </motion.div>
            )}

            {/* Loading State */}
            {isLoading && (
                <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                    <div className="relative w-20 h-20 mb-6">
                        <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-0 border-4 border-t-primary rounded-full"
                        />
                        <Users className="absolute inset-0 m-auto text-primary" size={28} />
                    </div>
                    <p className="font-bold mb-1">Đang quét @{username.replace(/^@/, '')}...</p>
                    <p className="text-sm text-gray-600">Selenium headless đang thu thập {videoLimit} video mới nhất.</p>
                </div>
            )}

            {/* Results */}
            {data && (
                <>
                    {/* Account Info Preview */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card p-6 mb-8 flex items-center gap-8 border-primary/10"
                    >
                        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-primary to-purple-500 p-0.5 shrink-0">
                            <div className="w-full h-full rounded-full bg-[#0c0c0c] flex items-center justify-center overflow-hidden">
                                {data.avatar ? (
                                    <img src={data.avatar} alt={data.nickname} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-2xl font-bold">{data.nickname?.charAt(0)?.toUpperCase() || '?'}</span>
                                )}
                            </div>
                        </div>
                        <div className="flex-1">
                            <h2 className="text-xl font-bold mb-1">{data.nickname || data.username}</h2>
                            <p className="text-gray-500 text-sm mb-3">
                                @{data.username} • {data.followers} Followers • {data.likes} Likes
                            </p>
                            <div className="flex gap-3 flex-wrap">
                                <button
                                    onClick={selectAll}
                                    className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/5"
                                >
                                    {selected.length === data.videos.length ? 'Bỏ chọn tất cả' : `Chọn tất cả (${data.videoCount})`}
                                </button>
                                <span className="text-xs text-primary font-bold flex items-center gap-1">
                                    {data.videos.length} video mới nhất
                                </span>
                                <span className="text-[10px] text-gray-600 flex items-center gap-1">
                                    (sắp xếp: mới nhất → cũ nhất)
                                </span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Video Grid */}
                    <div className={view === 'grid'
                        ? "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-5 mb-24"
                        : "flex flex-col gap-3 mb-24"
                    }>
                        <AnimatePresence>
                            {data.videos.map((video, idx) => (
                                view === 'grid' ? (
                                    <motion.div
                                        key={video.videoId}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: idx * 0.03 }}
                                        className={`group relative aspect-[3/4] rounded-2xl overflow-hidden border-2 transition-all cursor-pointer ${
                                            selected.includes(video.videoId) ? 'border-primary shadow-lg shadow-primary/10' : 'border-transparent hover:border-white/10'
                                        }`}
                                        onClick={() => toggleSelect(video.videoId)}
                                    >
                                        <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

                                        {/* Order badge */}
                                        <div className="absolute top-3 left-3 text-[9px] font-black bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full text-white/70">
                                            #{idx + 1}
                                        </div>

                                        <div className={`absolute top-3 right-3 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                            selected.includes(video.videoId) ? 'bg-primary border-primary' : 'bg-black/20 border-white/40'
                                        }`}>
                                            {selected.includes(video.videoId) && <CheckCircle2 size={14} className="text-white" />}
                                        </div>

                                        <div className="absolute bottom-4 left-4 right-4">
                                            <p className="text-[10px] font-bold text-white/60 mb-1">{video.views} views</p>
                                            <p className="text-xs font-medium text-white line-clamp-2">{video.title}</p>
                                        </div>

                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center">
                                                <Play size={20} fill="white" className="text-white ml-1" />
                                            </div>
                                        </div>
                                    </motion.div>
                                ) : (
                                    /* List View */
                                    <motion.div
                                        key={video.videoId}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.02 }}
                                        className={`glass-card p-4 flex items-center gap-4 cursor-pointer transition-all ${
                                            selected.includes(video.videoId) ? 'border-primary/30' : ''
                                        }`}
                                        onClick={() => toggleSelect(video.videoId)}
                                    >
                                        <span className="text-[10px] font-black text-gray-600 w-6 text-center">#{idx + 1}</span>
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                            selected.includes(video.videoId) ? 'bg-primary border-primary' : 'border-white/20'
                                        }`}>
                                            {selected.includes(video.videoId) && <CheckCircle2 size={12} className="text-white" />}
                                        </div>
                                        <img src={video.thumbnailUrl} alt={video.title} className="w-16 h-16 rounded-lg object-cover shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm truncate">{video.title}</p>
                                            <p className="text-[10px] text-gray-500 mt-1">
                                                {video.views} views
                                                {video.duration > 0 && ` • ${Math.floor(video.duration / 60)}:${('0' + (video.duration % 60)).slice(-2)}`}
                                            </p>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleSingleDownload(video); }}
                                            className="shrink-0 p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                                            title="Tải video này"
                                        >
                                            <Download size={16} />
                                        </button>
                                    </motion.div>
                                )
                            ))}
                        </AnimatePresence>
                    </div>
                </>
            )}

            {/* Empty State */}
            {!data && !isLoading && !error && (
                <div className="flex flex-col items-center justify-center py-24 text-gray-600">
                    <Users size={64} strokeWidth={1} className="mb-4 opacity-20" />
                    <p className="font-medium mb-1">Nhập username để bắt đầu khám phá video.</p>
                    <p className="text-xs text-gray-700">Hỗ trợ TikTok, Douyin • Sắp xếp: mới nhất → cũ nhất</p>
                </div>
            )}

            {/* Floating Selection Action */}
            <AnimatePresence>
                {selected.length > 0 && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-[#0c0c0c] border border-primary/30 shadow-2xl shadow-primary/20 rounded-2xl px-8 py-4 flex items-center gap-8"
                    >
                        <div className="text-sm">
                            <span className="text-gray-500">Đã chọn:</span>
                            <span className="font-bold ml-2 text-primary">{selected.length} video</span>
                        </div>
                        <div className="h-6 w-px bg-white/5" />
                        <div className="flex gap-3">
                            <button
                                className="text-sm font-bold hover:text-white transition-colors text-gray-500"
                                onClick={() => setSelected([])}
                            >
                                Hủy
                            </button>
                            <button
                                disabled={isDownloading}
                                onClick={handleBatchDownload}
                                className="bg-primary hover:bg-primary-dark disabled:opacity-50 px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95 text-sm"
                            >
                                {isDownloading ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Đang tải ({downloadProgress.done}/{downloadProgress.total})
                                    </>
                                ) : (
                                    <>
                                        <Download size={16} />
                                        Tải {selected.length} video
                                    </>
                                )}
                            </button>
                            <button className="bg-purple-600 hover:bg-purple-700 px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95 text-sm">
                                <Workflow size={16} /> Pipeline AI
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
