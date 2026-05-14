import React from 'react';
import { Folder, MoreVertical, Plus, Users, Clock, LayoutGrid } from 'lucide-react';
import { motion } from 'framer-motion';

export const Projects: React.FC = () => {
    const projects = [
        { id: 1, name: 'Chiến dịch Mỹ phẩm XHS', status: 'Active', items: 12, lastEdit: '2 giờ trước', color: 'bg-pink-500' },
        { id: 2, name: 'Review Đồ Gia Dụng', status: 'Active', items: 45, lastEdit: 'Hôm qua', color: 'bg-blue-500' },
        { id: 3, name: 'Kênh TikTok Vệ Tinh 1', status: 'Archived', items: 108, lastEdit: 'Tuần trước', color: 'bg-gray-500' },
    ];

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-12">
                <div>
                    <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                        <Folder className="text-primary" size={32} />
                        Quản lý Dự án
                    </h1>
                    <p className="text-gray-500">Tổ chức video, âm thanh và tiến độ làm việc theo từng dự án riêng biệt.</p>
                </div>
                <button className="bg-primary hover:bg-primary-dark px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-primary/20">
                    <Plus size={18} /> Dự án mới
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {projects.map((p) => (
                    <motion.div 
                        key={p.id}
                        whileHover={{ y: -4 }}
                        className="glass-card p-6 border-white/5 hover:border-primary/20 transition-colors group cursor-pointer"
                    >
                        <div className="flex items-start justify-between mb-8">
                            <div className={`w-12 h-12 rounded-2xl ${p.color}/10 flex items-center justify-center text-${p.color.replace('bg-', '')}`}>
                                <LayoutGrid size={24} />
                            </div>
                            <button className="text-gray-500 hover:text-white"><MoreVertical size={20} /></button>
                        </div>
                        
                        <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{p.name}</h3>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1.5"><Folder size={14} /> {p.items} files</span>
                            <span className="flex items-center gap-1.5"><Clock size={14} /> {p.lastEdit}</span>
                        </div>

                        <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between">
                            <div className="flex -space-x-2">
                                {[1,2,3].map(i => (
                                    <div key={i} className="w-8 h-8 rounded-full bg-[#0c0c0c] border-2 border-[#151515] flex items-center justify-center text-[10px] font-bold text-gray-400">
                                        <Users size={12} />
                                    </div>
                                ))}
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md ${
                                p.status === 'Active' ? 'bg-green-500/10 text-green-400' : 'bg-gray-500/10 text-gray-400'
                            }`}>
                                {p.status}
                            </span>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};
