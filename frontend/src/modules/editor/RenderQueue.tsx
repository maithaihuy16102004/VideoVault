import React from 'react';
import { PlayCircle, Clock, CheckCircle2, XCircle, AlertCircle, Cpu, Layers, Download, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

const RenderQueue: React.FC = () => {
    const jobs = [
        { id: '#1254', name: 'Beauty Campaign_Final_V1', status: 'rendering', progress: 65, quality: '1080p', time: '2m left', type: 'AI Pipeline' },
        { id: '#1253', name: 'Kitchen Hack #45', status: 'waiting', progress: 0, quality: '4K', time: 'Waiting...', type: 'Manual Edit' },
        { id: '#1252', name: 'Daily Vlog TikTok', status: 'completed', progress: 100, quality: '1080p', time: '14:20', type: 'AI Pipeline' },
        { id: '#1251', name: 'Product Review XHS', status: 'failed', progress: 42, quality: '720p', time: 'Error', type: 'Translate' },
    ];

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'rendering': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
            case 'waiting': return 'text-gray-400 bg-white/5 border-white/10';
            case 'completed': return 'text-green-400 bg-green-500/10 border-green-500/20';
            case 'failed': return 'text-red-400 bg-red-500/10 border-red-500/20';
            default: return 'text-gray-400';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'rendering': return <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}><Cpu size={14} /></motion.div>;
            case 'waiting': return <Clock size={14} />;
            case 'completed': return <CheckCircle2 size={14} />;
            case 'failed': return <XCircle size={14} />;
            default: return null;
        }
    };

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-12">
                <div>
                    <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                        <PlayCircle className="text-primary" size={32} />
                        Hàng chờ Render
                    </h1>
                    <p className="text-gray-500">Theo dõi tiến độ xuất bản video và quản lý tài nguyên GPU.</p>
                </div>
                <div className="flex gap-4">
                    <div className="bg-[#0c0c0c] border border-white/5 p-4 rounded-2xl flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                            <Cpu size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">GPU Status</p>
                            <p className="text-sm font-bold">NVENC Active (42%)</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {jobs.map((job) => (
                    <motion.div 
                        key={job.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-primary/20 transition-all group"
                    >
                        <div className="flex items-center gap-6 flex-1 min-w-0">
                            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-gray-500 group-hover:text-primary transition-colors">
                                <Layers size={24} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                    <h3 className="font-bold truncate">{job.name}</h3>
                                    <span className="text-[10px] text-gray-600 font-bold">{job.id}</span>
                                </div>
                                <div className="flex items-center gap-4 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                                    <span className="flex items-center gap-1"><Cpu size={12} /> {job.quality}</span>
                                    <span className="flex items-center gap-1"><Layers size={12} /> {job.type}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 max-w-xs px-8">
                            <div className="flex justify-between items-center mb-2">
                                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border flex items-center gap-1.5 ${getStatusColor(job.status)}`}>
                                    {getStatusIcon(job.status)}
                                    {job.status}
                                </span>
                                <span className="text-xs font-bold">{job.progress}%</span>
                            </div>
                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${job.progress}%` }}
                                    className={`h-full ${job.status === 'failed' ? 'bg-red-500' : job.status === 'completed' ? 'bg-green-500' : 'bg-primary'}`}
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-6">
                            <div className="text-right">
                                <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mb-1">Time</p>
                                <p className="text-sm font-bold">{job.time}</p>
                            </div>
                            <div className="flex gap-2">
                                {job.status === 'completed' && (
                                    <button className="p-2.5 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all">
                                        <Download size={18} />
                                    </button>
                                )}
                                <button className="p-2.5 rounded-xl bg-white/5 text-gray-500 hover:text-red-400 hover:bg-red-500/5 transition-all">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Queue Footer */}
            <div className="mt-12 p-6 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-primary/80">
                    <AlertCircle size={18} />
                    <p>Hiện có <strong>2 video</strong> đang chờ xử lý. Thời gian dự kiến hoàn thành: <strong>5 phút</strong>.</p>
                </div>
                <button className="text-sm font-bold text-primary hover:underline">Ưu tiên xử lý ngay (Pro)</button>
            </div>
        </div>
    );
};

export default RenderQueue;
