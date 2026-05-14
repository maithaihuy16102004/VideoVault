import React from 'react';
import { LineChart, Zap, TrendingUp, BarChart3, ArrowUpRight} from 'lucide-react';
import { motion } from 'framer-motion';

export const ViralAnalytics: React.FC = () => {
    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-12">
                <div>
                    <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                        <TrendingUp className="text-primary" size={32} />
                        Viral Analytics
                    </h1>
                    <p className="text-gray-500">Phân tích xu hướng và dự đoán mức độ viral của nội dung.</p>
                </div>
                <div className="flex gap-4">
                    <button className="bg-white/5 hover:bg-white/10 px-6 py-2.5 rounded-xl font-bold text-sm transition-all border border-white/5">
                        Xuất báo cáo
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {[
                    { label: 'Retention Score', value: '82/100', trend: '+12%', icon: Zap, color: 'text-yellow-400' },
                    { label: 'Viral Probability', value: 'High', trend: '94%', icon: TrendingUp, color: 'text-green-400' },
                    { label: 'Engagement Rate', value: '18.4%', trend: '+5.2%', icon: Activity, color: 'text-primary' },
                    { label: 'Market Reach', value: '2.4M', trend: '+120K', icon: BarChart3, color: 'text-purple-400' },
                ].map((stat, i) => (stat.icon = stat.icon || LineChart) && (
                    <div key={i} className="glass-card p-6 border-white/5">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-2 rounded-lg bg-white/5 ${stat.color}`}>
                                <stat.icon size={20} />
                            </div>
                            <span className="text-[10px] font-bold text-green-400 flex items-center gap-1">
                                {stat.trend} <ArrowUpRight size={10} />
                            </span>
                        </div>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">{stat.label}</p>
                        <h3 className="text-2xl font-bold">{stat.value}</h3>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 glass-card p-8">
                    <h3 className="font-bold mb-6 flex items-center gap-2">
                        <LineChart className="text-primary" size={18} />
                        Dự báo tăng trưởng
                    </h3>
                    <div className="aspect-[21/9] bg-white/5 rounded-2xl flex items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 flex items-center justify-center opacity-10">
                            <BarChart3 size={120} />
                        </div>
                        <p className="text-xs text-gray-500 font-medium">Chart visualization will be rendered here.</p>
                        
                        {/* Mock Line Chart */}
                        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                            <motion.path 
                                d="M0 150 Q 100 120, 200 140 T 400 100 T 600 60 T 800 20"
                                fill="none"
                                stroke="var(--primary)"
                                strokeWidth="4"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 2, ease: "easeInOut" }}
                            />
                        </svg>
                    </div>
                </div>

                <div className="glass-card p-8">
                    <h3 className="font-bold mb-6">Trending Hooks</h3>
                    <div className="space-y-4">
                        {[
                            "Đây là món đồ mình tiếc vì không mua sớm hơn...",
                            "Dừng lại 3s nếu bạn đang gặp vấn đề về...",
                            "Bí mật mà các shop Trung Quốc không muốn bạn biết",
                            "Sản phẩm này đã cứu rỗi cuộc đời mình như thế nào"
                        ].map((hook, i) => (
                            <div key={i} className="p-4 rounded-xl bg-white/5 border border-transparent hover:border-primary/20 cursor-pointer transition-all group">
                                <p className="text-sm font-medium group-hover:text-primary transition-colors line-clamp-2">"{hook}"</p>
                                <div className="flex items-center justify-between mt-3">
                                    <span className="text-[10px] text-gray-600 uppercase font-bold">Copy Hook</span>
                                    <span className="text-[10px] text-green-500 font-bold uppercase">Hot 🔥</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const Activity = ({ size, className }: { size?: number, className?: string }) => <div className={className}><Zap size={size} /></div>;
