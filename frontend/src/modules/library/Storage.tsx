import React, { useState } from 'react';
import { 
    Server, Search, Filter, Grid, List, 
    Video, FileAudio, FileText, Image as ImageIcon,
    MoreVertical, Download, ExternalLink
} from 'lucide-react';
import { motion } from 'framer-motion';

const Storage: React.FC = () => {
    const [view, setView] = useState<'grid' | 'list'>('grid');

    const categories = [
        { label: 'Tất cả', icon: Server, count: 124 },
        { label: 'Videos', icon: Video, count: 45 },
        { label: 'Audio', icon: FileAudio, count: 22 },
        { label: 'Subtitles', icon: FileText, count: 38 },
        { label: 'Thumbnails', icon: ImageIcon, count: 19 },
    ];

    const mockFiles = Array.from({ length: 8 }).map((_, i) => ({
        id: i,
        name: `video_content_tiktok_${i + 1}.mp4`,
        type: 'video',
        size: '12.4 MB',
        date: '14/05/2026',
        thumb: `https://picsum.photos/seed/${i + 100}/400/300`
    }));

    return (
        <div className="p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <div>
                    <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                        <Server className="text-primary" size={32} />
                        Kho lưu trữ
                    </h1>
                    <p className="text-gray-500">Quản lý toàn bộ tài nguyên video, âm thanh và render của bạn.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                        <input 
                            type="text" 
                            placeholder="Tìm kiếm file..."
                            className="bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-2.5 text-sm outline-none focus:border-primary/50 transition-all w-64"
                        />
                    </div>
                    <button className="bg-primary hover:bg-primary-dark px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-primary/20">
                        Tải lên
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Sidebar Filters */}
                <div className="space-y-6">
                    <div className="glass-card p-4">
                        <h3 className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-4 px-2">Phân loại</h3>
                        <div className="space-y-1">
                            {categories.map((c) => (
                                <button key={c.label} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all">
                                    <div className="flex items-center gap-3">
                                        <c.icon size={16} />
                                        <span>{c.label}</span>
                                    </div>
                                    <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded-full">{c.count}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="glass-card p-6">
                        <h3 className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-4">Dung lượng</h3>
                        <div className="space-y-3">
                            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-primary w-[65%]" />
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-500">Đã dùng: <span className="text-white font-bold">3.2 GB</span></span>
                                <span className="text-gray-500">Tổng: <span className="text-white font-bold">5.0 GB</span></span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* File List */}
                <div className="lg:col-span-3 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-white transition-colors">
                                <Filter size={14} /> Mới nhất
                            </button>
                        </div>
                        <div className="flex items-center gap-2 bg-[#0c0c0c] p-1.5 rounded-xl border border-white/5">
                            <button onClick={() => setView('grid')} className={`p-1.5 rounded-lg transition-all ${view === 'grid' ? 'bg-primary text-white' : 'text-gray-500'}`}><Grid size={16} /></button>
                            <button onClick={() => setView('list')} className={`p-1.5 rounded-lg transition-all ${view === 'list' ? 'bg-primary text-white' : 'text-gray-500'}`}><List size={16} /></button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {mockFiles.map((file) => (
                            <motion.div 
                                key={file.id}
                                whileHover={{ y: -4 }}
                                className="glass-card p-3 group relative"
                            >
                                <div className="aspect-video rounded-xl overflow-hidden mb-3 relative">
                                    <img src={file.thumb} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                        <button className="p-2 bg-white/20 backdrop-blur-md rounded-lg hover:bg-primary transition-all"><Download size={16} /></button>
                                        <button className="p-2 bg-white/20 backdrop-blur-md rounded-lg hover:bg-primary transition-all"><ExternalLink size={16} /></button>
                                    </div>
                                </div>
                                <div className="flex items-start justify-between">
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold truncate group-hover:text-primary transition-colors">{file.name}</p>
                                        <p className="text-[10px] text-gray-600 mt-1">{file.size} • {file.date}</p>
                                    </div>
                                    <button className="text-gray-600 hover:text-white"><MoreVertical size={16} /></button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Storage;
