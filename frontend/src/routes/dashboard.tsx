import React, { useState } from 'react';
import { useAuth } from '../shared/hooks/useAuth';
import { useCreateDownload, useDownloadHistory, useCancelDownload } from '../shared/hooks/useDownloads';
import { truncateText, formatFileSize, timeAgo } from '../shared/utils/format';
import { 
    Video, ArrowRight, CheckCircle2, PieChart, ChevronRight,
    Loader2, History, Clock, FolderDown, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { saveFileAs } from '../shared/utils/format';

const MAX_TITLE_CHARS = 40;

const platformEmoji: Record<string, string> = {
    douyin: '🎵', tiktok: '📱', xhs: '📕', bilibili: '📺', youtube: '▶️', other: '🌐',
};

const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const { data: recentDownloads, isLoading: loadingHistory } = useDownloadHistory(1, 5);
    const createDownload = useCreateDownload();
    const cancelDownload = useCancelDownload();
    const [url, setUrl] = useState('');

    const handleDownload = (e: React.FormEvent) => {
        e.preventDefault();
        if (!url) return;
        createDownload.mutate({ url });
        setUrl('');
    };

    const quotaUsed = user?.quotaUsed ?? 0;
    const quotaTotal = user?.quotaTotal ?? 10;
    const quotaRemaining = quotaTotal - quotaUsed;
    const quotaPct = quotaTotal > 0 ? (quotaUsed / quotaTotal) * 100 : 0;

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-bold">
                    Xin chào, <span className="bg-gradient-to-r from-primary to-blue-300 bg-clip-text text-transparent">{user?.fullName || user?.username || 'User'}</span>!
                </h2>
                <p className="text-gray-500 mt-1">Sẵn sàng tải video chất lượng cao?</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left — Main area */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Download Box */}
                    <section className="glass-card p-6 border-primary/10">
                        <div className="flex items-center gap-2 mb-4">
                            <Video className="text-primary" size={20} />
                            <h3 className="font-bold">Tải video mới</h3>
                        </div>
                        
                        <form onSubmit={handleDownload} className="relative">
                            <input 
                                type="text" 
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="Dán URL video (Douyin, TikTok, XHS, Bilibili...)"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 pr-28 focus:outline-none focus:border-primary/50 transition-all"
                            />
                            <button 
                                type="submit"
                                disabled={!url || createDownload.isPending}
                                className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary hover:bg-primary/85 disabled:opacity-40 text-white px-5 py-2.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all active:scale-95 text-sm"
                            >
                                {createDownload.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Fetch'} 
                                <ArrowRight size={14} />
                            </button>
                        </form>
                        
                        <div className="mt-4 flex gap-4 text-[11px] text-gray-500">
                            <span className="flex items-center gap-1"><CheckCircle2 size={11} className="text-green-500" /> Chất lượng gốc</span>
                            <span className="flex items-center gap-1"><CheckCircle2 size={11} className="text-green-500" /> Không watermark</span>
                            <span className="flex items-center gap-1"><CheckCircle2 size={11} className="text-green-500" /> Đa nền tảng</span>
                        </div>
                    </section>

                    {/* Recent Downloads */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold flex items-center gap-2 text-sm text-gray-300">
                                <History size={16} className="text-primary" />
                                Hoạt động gần đây
                            </h3>
                        </div>
                        
                        <div className="space-y-2">
                            {loadingHistory ? (
                                <div className="p-10 text-center text-gray-500"><Loader2 className="animate-spin mx-auto" /></div>
                            ) : !recentDownloads?.length ? (
                                <div className="glass-card p-10 text-center text-gray-600 text-sm">Chưa có video nào. Hãy dán URL ở trên!</div>
                            ) : (
                                <AnimatePresence mode="popLayout">
                                    {recentDownloads.map((item) => {
                                        const isActive = item.status === 'processing' || item.status === 'pending';
                                        return (
                                            <motion.div 
                                                key={item.id}
                                                layout
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                className="glass-card overflow-hidden group"
                                            >
                                                <div className="p-3 flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center text-base shrink-0">
                                                        {platformEmoji[item.platform] || '🌐'}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-sm font-medium leading-snug" title={item.title || item.originalUrl}>
                                                            {truncateText(item.title || item.originalUrl, MAX_TITLE_CHARS)}
                                                        </h4>
                                                        <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-500">
                                                            <span className="uppercase font-bold">{item.platform}</span>
                                                            <span>•</span>
                                                            {isActive ? (
                                                                <span className="text-blue-400 font-semibold">Đang tải {item.progress}%</span>
                                                            ) : (
                                                                <span className={item.status === 'completed' ? 'text-green-400' : item.status === 'failed' ? 'text-red-400' : ''}>
                                                                    {item.status === 'completed' ? 'Hoàn thành' : item.status === 'failed' ? 'Thất bại' : item.status}
                                                                </span>
                                                            )}
                                                            {item.fileSize && <span>• {formatFileSize(item.fileSize)}</span>}
                                                            <span className="flex items-center gap-0.5"><Clock size={9} /> {timeAgo(item.createdAt)}</span>
                                                        </div>
                                                    </div>
                                                    <div className="shrink-0">
                                                        {item.status === 'completed' ? (
                                                            <button 
                                                                onClick={() => item.fileUrl && saveFileAs(`http://localhost:5141${item.fileUrl}`, (item.title || 'video') + '.mp4')}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold rounded-lg shadow-lg shadow-green-500/20 transition-all active:scale-95"
                                                                title="Lưu về máy"
                                                            >
                                                                <FolderDown size={14} />
                                                                Lưu Video
                                                            </button>
                                                        ) : isActive ? (
                                                            <div className="flex items-center gap-1">
                                                                {item.progress === 100 ? (
                                                                    <CheckCircle2 size={16} className="text-green-500" />
                                                                ) : (
                                                                    <Loader2 size={16} className="text-primary animate-spin" />
                                                                )}
                                                                <button 
                                                                    onClick={() => cancelDownload.mutate(item.id)}
                                                                    className="p-1.5 hover:bg-red-500/10 hover:text-red-400 text-gray-500 rounded-lg transition-all"
                                                                    title="Hủy tải"
                                                                >
                                                                    <X size={14} />
                                                                </button>
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                </div>
                                                {/* Progress bar */}
                                                {isActive && (
                                                    <div className="h-1 bg-white/5">
                                                        <motion.div
                                                            className="h-full bg-blue-500"
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${item.progress}%` }}
                                                            transition={{ duration: 0.4 }}
                                                        />
                                                    </div>
                                                )}
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            )}
                        </div>
                    </section>
                </div>

                {/* Right — Sidebar */}
                <div className="space-y-6">
                    {/* Quota */}
                    <div className="glass-card p-5 space-y-3">
                        <div className="flex justify-between items-center">
                            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Quota hôm nay</h3>
                            <PieChart size={14} className="text-primary" />
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-bold">{quotaRemaining}</span>
                            <span className="text-sm text-gray-500">/ {quotaTotal} còn lại</span>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${quotaPct}%` }}
                                className={`h-full rounded-full ${quotaPct > 80 ? 'bg-red-500' : quotaPct > 50 ? 'bg-yellow-500' : 'bg-primary'}`}
                            />
                        </div>
                        <p className="text-[10px] text-gray-600">Reset mỗi ngày lúc 00:00 UTC.</p>
                        <button className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1 mt-1">
                            Nâng cấp gói <ChevronRight size={12} />
                        </button>
                    </div>

                    {/* Tips */}
                    <div className="glass-card p-5 space-y-3">
                        <h3 className="font-bold text-sm">Mẹo sử dụng</h3>
                        <ul className="space-y-2 text-[12px] text-gray-400 leading-relaxed">
                            <li>• Dán link Douyin để tải video chất lượng gốc 4K.</li>
                            <li>• Hỗ trợ TikTok, XHS, Bilibili không watermark.</li>
                            <li>• Nhấn <FolderDown size={11} className="inline text-green-400" /> để chọn thư mục lưu.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
