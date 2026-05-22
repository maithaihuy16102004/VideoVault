import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../../shared/api/analytics.api';
import { formatFileSize } from '../../shared/utils/format';
import { 
    PieChart, TrendingUp, Users, Download, 
    ShieldCheck, DollarSign, Activity, Server, HardDrive,
    Sparkles, ArrowUpRight, Zap
} from 'lucide-react';
import { motion } from 'framer-motion';

const AdminDashboard: React.FC = () => {
    const { data: platformStats, isLoading: loadingPlatforms } = useQuery({
        queryKey: ['analytics', 'platforms'],
        queryFn: analyticsApi.getPlatformStats,
    });

    const { data: revenueStats, isLoading: loadingRevenue } = useQuery({
        queryKey: ['analytics', 'revenue'],
        queryFn: analyticsApi.getRevenueStats,
    });

    const isLoading = loadingPlatforms || loadingRevenue;

    // Computed stats
    const totalDownloads = platformStats?.reduce((a: number, b: any) => a + Number(b.total_Downloads || 0), 0) || 0;
    const totalSuccess = platformStats?.reduce((a: number, b: any) => a + Number(b.successful || 0), 0) || 0;
    const totalFailed = platformStats?.reduce((a: number, b: any) => a + Number(b.failed || 0), 0) || 0;
    const successRate = totalDownloads > 0 ? ((totalSuccess / totalDownloads) * 100).toFixed(1) : '0';
    const totalRevenue = revenueStats?.[0]?.total_Revenue || 0;
    const totalUsers = revenueStats?.[0]?.unique_Paying_Users || 0;

    if (isLoading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[60vh]">
                <div className="text-center space-y-4">
                    <div className="relative w-16 h-16 mx-auto">
                        <div className="absolute inset-0 bg-purple-500/20 rounded-full animate-ping" />
                        <div className="absolute inset-0 bg-purple-500/40 rounded-full animate-pulse" />
                        <Activity className="absolute inset-0 m-auto text-purple-400 animate-spin" size={24} />
                    </div>
                    <p className="text-purple-400 font-bold uppercase tracking-widest text-xs">Đang tải dữ liệu lõi...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-center">
                            <ShieldCheck className="text-purple-400" size={20} />
                        </div>
                        <h1 className="text-3xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
                            Hệ Thống Quản Trị
                        </h1>
                    </div>
                    <p className="text-gray-400 text-sm">Theo dõi toàn cảnh hiệu suất hệ thống, doanh thu và tải nguyên thời gian thực.</p>
                </motion.div>
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-400 rounded-xl border border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.15)]">
                    <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                    </span>
                    <span className="text-[11px] font-black uppercase tracking-wider">Hệ Thống Online</span>
                </motion.div>
            </div>

            {/* Main KPI Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {[
                    { label: 'Tổng lượt tải', value: totalDownloads.toLocaleString(), trend: '+12.5%', icon: Download, color: 'text-blue-400', bg: 'from-blue-500/20 to-blue-600/5', border: 'border-blue-500/20' },
                    { label: 'Tỷ lệ thành công', value: `${successRate}%`, trend: '+2.1%', icon: TrendingUp, color: 'text-green-400', bg: 'from-green-500/20 to-emerald-600/5', border: 'border-green-500/20' },
                    { label: 'User trả phí (Tháng)', value: totalUsers.toLocaleString(), trend: '+5.4%', icon: Users, color: 'text-purple-400', bg: 'from-purple-500/20 to-pink-600/5', border: 'border-purple-500/20' },
                    { label: 'Doanh thu (Tháng)', value: `$${Number(totalRevenue).toLocaleString()}`, trend: '+18.2%', icon: DollarSign, color: 'text-orange-400', bg: 'from-orange-500/20 to-amber-600/5', border: 'border-orange-500/20' },
                ].map((stat, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                        className={`relative p-6 rounded-3xl bg-gradient-to-br ${stat.bg} border ${stat.border} overflow-hidden group`}
                    >
                        {/* Background Glow on Hover */}
                        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        
                        <div className="relative z-10 flex flex-col h-full">
                            <div className="flex justify-between items-start mb-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-[#0a0a0f] border ${stat.border} shadow-inner`}>
                                    <stat.icon size={22} className={stat.color} />
                                </div>
                                <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-[#0a0a0f]/50 border ${stat.border} ${stat.color}`}>
                                    <ArrowUpRight size={12} /> {stat.trend}
                                </span>
                            </div>
                            <div>
                                <p className="text-3xl font-black text-white tracking-tight mb-1">{stat.value}</p>
                                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{stat.label}</p>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Secondary KPIs */}
                <div className="lg:col-span-1 space-y-5">
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
                        className="glass-card p-6 flex items-center gap-5 border-red-500/10 hover:border-red-500/30 transition-colors">
                        <div className="w-14 h-14 bg-gradient-to-br from-red-500/20 to-rose-600/10 rounded-2xl flex items-center justify-center text-red-400 border border-red-500/20">
                            <Activity size={24} />
                        </div>
                        <div>
                            <p className="text-[11px] text-gray-500 uppercase font-bold tracking-widest mb-1">Tiến trình lỗi</p>
                            <p className="text-2xl font-black text-red-400">{totalFailed.toLocaleString()} <span className="text-sm font-medium text-gray-500">lượt</span></p>
                        </div>
                    </motion.div>
                    
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
                        className="glass-card p-6 flex items-center gap-5 border-cyan-500/10 hover:border-cyan-500/30 transition-colors">
                        <div className="w-14 h-14 bg-gradient-to-br from-cyan-500/20 to-blue-600/10 rounded-2xl flex items-center justify-center text-cyan-400 border border-cyan-500/20">
                            <Server size={24} />
                        </div>
                        <div>
                            <p className="text-[11px] text-gray-500 uppercase font-bold tracking-widest mb-1">Nền tảng xử lý</p>
                            <p className="text-2xl font-black text-white">{platformStats?.length || 0} <span className="text-sm font-medium text-gray-500">hệ thống</span></p>
                        </div>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}
                        className="glass-card p-6 flex items-center gap-5 border-purple-500/10 hover:border-purple-500/30 transition-colors">
                        <div className="w-14 h-14 bg-gradient-to-br from-purple-500/20 to-pink-600/10 rounded-2xl flex items-center justify-center text-purple-400 border border-purple-500/20">
                            <HardDrive size={24} />
                        </div>
                        <div>
                            <p className="text-[11px] text-gray-500 uppercase font-bold tracking-widest mb-1">Dung lượng Bandwidth</p>
                            <p className="text-2xl font-black text-white">
                                {formatFileSize(platformStats?.reduce((a: number, b: any) => a + Number(b.total_Size || 0), 0) || 0)}
                            </p>
                        </div>
                    </motion.div>
                    
                    {/* Quick Admin Actions */}
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}
                        className="glass-card p-5 border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-transparent">
                        <h3 className="font-bold text-sm flex items-center gap-2 mb-4 text-orange-400">
                            <Zap size={16} /> Quick Actions
                        </h3>
                        <div className="space-y-2">
                            <button className="w-full text-left px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-medium transition-colors">Clear Cache (Redis)</button>
                            <button className="w-full text-left px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-medium transition-colors">Force Sync User Quota</button>
                            <button className="w-full text-left px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-medium transition-colors">Restart Pipeline Workers</button>
                        </div>
                    </motion.div>
                </div>

                <div className="lg:col-span-2 space-y-6">
                    {/* Platform Performance Table */}
                    <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                        className="glass-card overflow-hidden border-white/5">
                        <div className="p-5 border-b border-white/5 bg-white/[0.02]">
                            <h3 className="font-bold flex items-center gap-2 text-sm text-white">
                                <PieChart size={16} className="text-cyan-400" />
                                Hiệu suất theo Nền Tảng (Platform)
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-[#0a0a0f] text-gray-500 text-[10px] uppercase tracking-widest font-bold">
                                    <tr>
                                        <th className="px-6 py-4">Nền tảng</th>
                                        <th className="px-6 py-4 text-right">Tổng Request</th>
                                        <th className="px-6 py-4 text-right">Success</th>
                                        <th className="px-6 py-4 text-right">Failed</th>
                                        <th className="px-6 py-4 text-right">Success Rate</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {platformStats?.map((stat: any, i: number) => {
                                        const total = Number(stat.total_Downloads) || 0;
                                        const success = Number(stat.successful) || 0;
                                        const rate = total > 0 ? ((success / total) * 100).toFixed(1) : '0';
                                        return (
                                            <tr key={i} className="hover:bg-white/[0.03] transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center font-bold text-gray-300 border border-white/10 uppercase text-xs">
                                                            {stat.platform.slice(0, 2)}
                                                        </div>
                                                        <span className="capitalize font-bold text-gray-200 group-hover:text-white transition-colors">{stat.platform}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono text-gray-300">{total.toLocaleString()}</td>
                                                <td className="px-6 py-4 text-right text-green-400 font-mono font-medium">+{success.toLocaleString()}</td>
                                                <td className="px-6 py-4 text-right text-red-400 font-mono font-medium">-{stat.failed.toLocaleString()}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-3">
                                                        <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                            <div className={`h-full rounded-full ${Number(rate) >= 90 ? 'bg-green-400' : Number(rate) >= 70 ? 'bg-yellow-400' : 'bg-red-400'}`} style={{ width: `${rate}%` }} />
                                                        </div>
                                                        <span className={`font-mono text-xs w-10 text-right ${Number(rate) >= 90 ? 'text-green-400' : Number(rate) >= 70 ? 'text-yellow-400' : 'text-red-400'}`}>
                                                            {rate}%
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </motion.section>

                    {/* Revenue Table */}
                    {revenueStats && revenueStats.length > 0 && (
                        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                            className="glass-card overflow-hidden border-purple-500/20 relative">
                            {/* Glow accent */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2" />
                            
                            <div className="p-5 border-b border-white/5 bg-white/[0.02]">
                                <h3 className="font-bold flex items-center gap-2 text-sm text-white">
                                    <Sparkles size={16} className="text-purple-400" />
                                    Báo Cáo Doanh Thu (Billing Analytics)
                                </h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-[#0a0a0f] text-gray-500 text-[10px] uppercase tracking-widest font-bold">
                                        <tr>
                                            <th className="px-6 py-4">Kỳ báo cáo</th>
                                            <th className="px-6 py-4 text-right">Giao dịch</th>
                                            <th className="px-6 py-4 text-right">Doanh thu Net</th>
                                            <th className="px-6 py-4 text-right">Hoàn tiền (Refunds)</th>
                                            <th className="px-6 py-4 text-right">Active Users</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {revenueStats.map((row: any, i: number) => (
                                            <tr key={i} className="hover:bg-white/[0.03] transition-colors">
                                                <td className="px-6 py-4 font-bold text-gray-300">
                                                    {new Date(row.month).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono text-gray-400">{row.total_Transactions.toLocaleString()}</td>
                                                <td className="px-6 py-4 text-right text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400 font-black text-base">
                                                    ${Number(row.total_Revenue).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 text-right text-red-400/80 font-mono">
                                                    -${Number(row.total_Refunds).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono font-bold text-purple-300">
                                                    {row.unique_Paying_Users.toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </motion.section>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
