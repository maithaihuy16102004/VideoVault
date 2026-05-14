import React, { useState } from 'react';
import { useDownloadHistory, useCreateDownload, useCancelDownload, useDeleteDownload } from '../shared/hooks/useDownloads';
import { truncateText, formatFileSize, timeAgo, saveFileAs } from '../shared/utils/format';
import { Loader2, Download, CheckCircle2, Trash2, X, FolderDown, Clock, AlertCircle, Image as ImageIcon, Music, Settings2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

const Downloads: React.FC = () => {
    const [url, setUrl] = useState('');
    const [page, setPage] = useState(1);
    const pageSize = 10;
    const [autoRename, setAutoRename] = useState(true);
    const [extractAudio, setExtractAudio] = useState(false);

    const { data: downloads, isLoading, error } = useDownloadHistory(page, pageSize);
    const createMutation = useCreateDownload();
    const cancelMutation = useCancelDownload();
    const deleteMutation = useDeleteDownload();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!url.trim()) return;
        createMutation.mutate({ url });
        setUrl('');
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const handleSaveAs = async (fileUrl: string, title?: string) => {
        const filename = (title || 'video') + '.mp4';
        await saveFileAs(fileUrl, filename);
    };

    const activeCount = downloads?.filter(d => d.status === 'pending' || d.status === 'processing').length || 0;

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                    Downloads
                </h1>
                <p className="text-gray-500 mt-1">Quản lý và tải video từ các nền tảng.</p>
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
                </div>

                {createMutation.isError && (
                    <p className="text-red-400 mt-3 text-sm flex items-center gap-2">
                        <AlertCircle size={14} /> {(createMutation.error as Error).message}
                    </p>
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
                                                    <button 
                                                        onClick={() => item.fileUrl && saveFileAs(`http://localhost:5141${item.fileUrl}`, (item.title || 'video') + '.mp4')}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-lg shadow-lg shadow-green-500/20 transition-all active:scale-95"
                                                        title="Lưu Video về máy"
                                                    >
                                                        <FolderDown size={16} />
                                                        Video
                                                    </button>
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
