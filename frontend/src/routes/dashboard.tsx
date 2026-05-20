import React, { useState } from 'react';
import { useAuth } from '../shared/hooks/useAuth';
import { useCreateDownload, useDownloadHistory, useCancelDownload } from '../shared/hooks/useDownloads';
import { truncateText, formatFileSize, timeAgo } from '../shared/utils/format';
import { 
    Video, ArrowRight, CheckCircle2, PieChart, ChevronRight,
    Loader2, History, Clock, FolderDown, X, Play,
    Sparkles, Zap, ShieldCheck, Crown, Activity, DownloadCloud
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { saveFileAs } from '../shared/utils/format';
import { Link } from '@tanstack/react-router';

const MAX_TITLE_CHARS = 45;

const platformEmoji: Record<string, string> = {
    douyin: '🎵', tiktok: '📱', xhs: '📕', bilibili: '📺', youtube: '▶️', other: '🌐',
};

// ─── Sub Components ─────────────────────────────────────────────────
const StatCard: React.FC<{ icon: React.ElementType; label: string; value: string; color: string; bg: string }> = 
    ({ icon: Icon, label, value, color, bg }) => (
    <motion.div whileHover={{ y: -2 }} className={`p-4 rounded-2xl bg-gradient-to-br ${bg} border border-white/5 hover:border-white/10 transition-all`}>
        <div className="flex items-center justify-between mb-2">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-black/20 ${color}`}>
                <Icon size={18} />
            </div>
        </div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-gray-400 mt-1">{label}</p>
    </motion.div>
);

const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const { data: recentDownloads, isLoading: loadingHistory } = useDownloadHistory(1, 6);
    const createDownload = useCreateDownload();
    const cancelDownload = useCancelDownload();
    const [url, setUrl] = useState('');

    const handleDownload = (e: React.FormEvent) => {
        e.preventDefault();
        if (!url) return;
        createDownload.mutate({ url });
        setUrl('');
    };

    const isAdmin = user?.role === 'admin';
    const quotaUsed = user?.quotaUsed ?? 0;
    const quotaTotal = user?.quotaTotal ?? 10;
    const quotaRemaining = isAdmin ? 'Vô cực' : (quotaTotal - quotaUsed);
    const quotaPct = isAdmin ? 0 : (quotaTotal > 0 ? (quotaUsed / quotaTotal) * 100 : 0);

    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
            {/* ─── Header Section ─── */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                    <h1 className="text-3xl font-bold">
                        Welcome back, <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">{user?.fullName || user?.username || 'User'}</span> 👋
                    </h1>
                    <p className="text-gray-500 mt-2 text-sm">Hôm nay bạn muốn tải video hay khởi tạo chiến dịch AI nào?</p>
                </motion.div>
                {isAdmin && (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-300">
                        <Crown size={14} />
                        <span className="text-xs font-bold uppercase tracking-wider">Tài khoản Admin VIP</span>
                    </motion.div>
                )}
            </div>

            {/* ─── Stats Grid ─── */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-4"
            >
                <StatCard icon={DownloadCloud} label="Video đã tải (Tháng)" value={isAdmin ? '842' : '12'} color="text-cyan-400" bg="from-cyan-500/10 to-blue-500/5" />
                <StatCard icon={Activity} label="AI Pipeline chạy" value={isAdmin ? '156' : '0'} color="text-purple-400" bg="from-purple-500/10 to-pink-500/5" />
                <StatCard icon={Zap} label="Chiến dịch Promote" value={isAdmin ? '24' : '0'} color="text-pink-400" bg="from-pink-500/10 to-rose-500/5" />
                <StatCard icon={ShieldCheck} label="Trạng thái hệ thống" value="Online" color="text-green-400" bg="from-green-500/10 to-emerald-500/5" />
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* ─── Left: Main Action & History ─── */}
                <div className="lg:col-span-8 space-y-6">
                    
                    {/* Main Download Tool */}
                    <motion.section 
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                        className="glass-card p-8 border-cyan-500/20 relative overflow-hidden group"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
                                    <Video className="text-white" size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold">Tải video không Watermark</h3>
                                    <p className="text-xs text-gray-400">Hỗ trợ Douyin, TikTok, XHS, Bilibili ở chất lượng gốc (4K)</p>
                                </div>
                            </div>
                            
                            <form onSubmit={handleDownload} className="relative magic-input-wrapper mt-2">
                                <input 
                                    type="text" 
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    placeholder="Dán URL video vào đây..."
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 pr-36 focus:outline-none focus:border-cyan-500/50 focus:bg-white/[0.08] transition-all text-sm shadow-inner"
                                />
                                <button 
                                    type="submit"
                                    disabled={!url || createDownload.isPending}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95 text-sm shadow-lg shadow-cyan-500/20"
                                >
                                    {createDownload.isPending ? <Loader2 size={16} className="animate-spin" /> : <DownloadCloud size={16} />} 
                                    Fetch
                                </button>
                            </form>
                            
                            <div className="mt-5 flex gap-5 text-xs text-gray-500 justify-center sm:justify-start">
                                <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-green-500" /> Tốc độ cao</span>
                                <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-green-500" /> Server riêng</span>
                                <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-green-500" /> 100% Sạch</span>
                            </div>
                        </div>
                    </motion.section>

                    {/* Download History */}
                    <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold flex items-center gap-2 text-sm text-gray-300">
                                <History size={16} className="text-cyan-400" /> Hoạt động gần đây
                            </h3>
                            <button className="text-xs text-gray-500 hover:text-white transition-colors">Xem tất cả</button>
                        </div>
                        
                        <div className="space-y-3">
                            {loadingHistory ? (
                                <div className="p-10 text-center text-gray-500"><Loader2 className="animate-spin mx-auto" /></div>
                            ) : !recentDownloads?.length ? (
                                <div className="glass-card p-12 text-center text-gray-500 text-sm flex flex-col items-center justify-center gap-3">
                                    <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center">
                                        <FolderDown size={20} className="text-gray-600" />
                                    </div>
                                    <p>Chưa có video nào. Hãy dán URL ở trên để bắt đầu!</p>
                                </div>
                            ) : (
                                <AnimatePresence mode="popLayout">
                                    {recentDownloads.map((item, index) => {
                                        const isActive = item.status === 'processing' || item.status === 'pending';
                                        return (
                                            <motion.div 
                                                key={item.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: index * 0.05 }}
                                                className="glass-card overflow-hidden group hover:border-white/10 transition-all"
                                            >
                                                <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                                                    <div className="w-12 h-12 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl flex items-center justify-center text-xl shrink-0 shadow-inner border border-white/5">
                                                        {platformEmoji[item.platform] || '🌐'}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-sm font-semibold leading-snug truncate" title={item.title || item.originalUrl}>
                                                            {item.title || item.originalUrl}
                                                        </h4>
                                                        <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] text-gray-500">
                                                            <span className="uppercase font-bold text-gray-400">{item.platform}</span>
                                                            <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                                                            {isActive ? (
                                                                <span className="text-cyan-400 font-semibold flex items-center gap-1">
                                                                    <Loader2 size={10} className="animate-spin" /> Đang tải {item.progress}%
                                                                </span>
                                                            ) : (
                                                                <span className={item.status === 'completed' ? 'text-green-400' : item.status === 'failed' ? 'text-red-400' : ''}>
                                                                    {item.status === 'completed' ? '✅ Hoàn thành' : item.status === 'failed' ? '❌ Thất bại' : item.status}
                                                                </span>
                                                            )}
                                                            {item.fileSize && <><span className="w-1 h-1 rounded-full bg-gray-600"></span> <span>{formatFileSize(item.fileSize)}</span></>}
                                                            <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                                                            <span className="flex items-center gap-1"><Clock size={10} /> {timeAgo(item.createdAt)}</span>
                                                        </div>
                                                    </div>
                                                    <div className="shrink-0 mt-3 sm:mt-0">
                                                        {item.status === 'completed' ? (
                                                            <button onClick={() => item.fileUrl && saveFileAs(`http://localhost:5141${item.fileUrl}`, (item.title || 'video') + '.mp4')}
                                                                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all" title="Lưu về máy">
                                                                <FolderDown size={14} /> Lưu
                                                            </button>
                                                        ) : isActive ? (
                                                            <div className="flex items-center justify-end gap-2">
                                                                <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden hidden sm:block">
                                                                    <div className="h-full bg-cyan-500" style={{ width: `${item.progress}%` }} />
                                                                </div>
                                                                <button onClick={() => cancelDownload.mutate(item.id)} className="p-2 hover:bg-red-500/20 hover:text-red-400 text-gray-500 rounded-lg transition-all" title="Hủy tải">
                                                                    <X size={16} />
                                                                </button>
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                </div>
                                                {/* Mobile Progress bar */}
                                                {isActive && (
                                                    <div className="h-0.5 bg-white/5 sm:hidden">
                                                        <motion.div className="h-full bg-cyan-500" initial={{ width: 0 }} animate={{ width: `${item.progress}%` }} transition={{ duration: 0.4 }} />
                                                    </div>
                                                )}
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            )}
                        </div>
                    </motion.section>
                </div>

                {/* ─── Right: Sidebar ─── */}
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-4 space-y-6">
                    
                    {/* VIP Quota Widget */}
                    <div className={`glass-card p-6 space-y-4 relative overflow-hidden ${isAdmin ? 'border-purple-500/30' : 'border-cyan-500/20'}`}>
                        {isAdmin && <div className="absolute -right-6 -top-6 w-24 h-24 bg-purple-500/20 blur-2xl rounded-full" />}
                        
                        <div className="flex justify-between items-center relative z-10">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                                <PieChart size={14} className={isAdmin ? "text-purple-400" : "text-cyan-400"} />
                                Quota Tải Video
                            </h3>
                        </div>
                        
                        <div className="relative z-10">
                            <div className="flex items-baseline gap-1.5">
                                <span className={`text-4xl font-black tracking-tight ${isAdmin ? 'text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400' : 'text-white'}`}>
                                    {isAdmin ? '∞' : quotaRemaining}
                                </span>
                                {!isAdmin && <span className="text-sm text-gray-500 font-medium">/ {quotaTotal} còn lại</span>}
                            </div>
                            
                            {isAdmin && (
                                <div className="mt-1 inline-block px-2 py-0.5 bg-purple-500/15 border border-purple-500/20 rounded-md">
                                    <span className="text-[10px] text-purple-300 font-bold uppercase">UNLIMITED ACCESS</span>
                                </div>
                            )}
                        </div>

                        {!isAdmin ? (
                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mt-2 relative z-10">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${quotaPct}%` }} className={`h-full rounded-full ${quotaPct > 80 ? 'bg-red-500' : quotaPct > 50 ? 'bg-yellow-500' : 'bg-cyan-500'}`} />
                            </div>
                        ) : (
                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden relative z-10">
                                <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} className="h-full rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-red-500" />
                                <div className="absolute inset-0 bg-white/20 animate-pulse mix-blend-overlay"></div>
                            </div>
                        )}
                        
                        <p className="text-[11px] text-gray-500 leading-relaxed relative z-10 pt-2 border-t border-white/5">
                            {isAdmin ? 'Đặc quyền Admin: Sử dụng toàn bộ hệ thống Download, AI Voice, AI Promote không có bất kỳ giới hạn nào.' : 'Quota được làm mới tự động vào 00:00 UTC mỗi ngày.'}
                        </p>
                        
                        {!isAdmin && (
                            <Link to="/subscriptions" className="w-full block text-center py-2.5 mt-2 bg-white/5 hover:bg-white/10 text-cyan-400 text-xs font-bold rounded-lg transition-colors border border-white/5">
                                Nâng cấp gói Premium
                            </Link>
                        )}
                    </div>

                    {/* Quick Access */}
                    <div className="glass-card p-5 space-y-4">
                        <h3 className="font-bold text-sm flex items-center gap-2">
                            <Sparkles size={16} className="text-purple-400" /> Công cụ đề xuất
                        </h3>
                        <div className="space-y-2">
                            <Link to="/growth/promote" className="flex items-center gap-3 p-3 bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 rounded-xl transition-all group">
                                <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-400 group-hover:scale-110 transition-transform">
                                    <Megaphone size={16} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-bold text-gray-300 group-hover:text-white">TikTok Promote (AI)</p>
                                    <p className="text-[10px] text-gray-500">Phân tích & đề xuất quảng cáo</p>
                                </div>
                                <ChevronRight size={14} className="text-gray-600 group-hover:text-white" />
                            </Link>
                            
                            <Link to="/pipeline/tasks" className="flex items-center gap-3 p-3 bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 rounded-xl transition-all group">
                                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                                    <Activity size={16} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-bold text-gray-300 group-hover:text-white">Auto Pipeline</p>
                                    <p className="text-[10px] text-gray-500">Dịch, lồng tiếng tự động</p>
                                </div>
                                <ChevronRight size={14} className="text-gray-600 group-hover:text-white" />
                            </Link>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Dashboard;
