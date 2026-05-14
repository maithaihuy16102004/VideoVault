import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../../shared/api/analytics.api';
import { formatFileSize } from '../../shared/utils/format';
import { 
    BarChart3, PieChart, TrendingUp, Users, Download, 
    ShieldCheck, DollarSign, Activity, Server, HardDrive
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
    const totalDownloads = platformStats?.reduce((a: number, b: Record<string, unknown>) => a + Number(b.total_Downloads || 0), 0) || 0;
    const totalSuccess = platformStats?.reduce((a: number, b: Record<string, unknown>) => a + Number(b.successful || 0), 0) || 0;
    const totalFailed = platformStats?.reduce((a: number, b: Record<string, unknown>) => a + Number(b.failed || 0), 0) || 0;
    const successRate = totalDownloads > 0 ? ((totalSuccess / totalDownloads) * 100).toFixed(1) : '0';
    const totalRevenue = revenueStats?.[0]?.total_Revenue || 0;
    const totalUsers = revenueStats?.[0]?.unique_Paying_Users || 0;

    if (isLoading) {
        return (
            <div className="p-8 flex items-center justify-center h-full">
                <div className="text-center space-y-3 text-gray-500">
                    <Activity className="animate-spin mx-auto" size={32} />
                    <p>Đang tải dữ liệu quản trị...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                        Admin Dashboard
                    </h1>
                    <p className="text-gray-500 mt-1">Tổng quan hệ thống và quản lý nghiệp vụ.</p>
                </div>
                <span className="px-3 py-1 bg-green-500/10 text-green-500 rounded-full text-[10px] font-bold border border-green-500/20 flex items-center gap-1">
                    <ShieldCheck size={11} /> Dữ liệu trực tiếp
                </span>
            </div>

            {/* KPI Cards Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Tổng lượt tải', value: totalDownloads.toLocaleString(), icon: Download, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                    { label: 'Tỷ lệ thành công', value: `${successRate}%`, icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/10' },
                    { label: 'Người dùng trả phí', value: totalUsers.toLocaleString(), icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/10' },
                    { label: 'Doanh thu tháng', value: `$${Number(totalRevenue).toLocaleString()}`, icon: DollarSign, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
                ].map((stat, i) => (
                    <motion.div 
                        key={i}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className="glass-card p-5"
                    >
                        <div className={`w-9 h-9 ${stat.bg} rounded-lg flex items-center justify-center mb-3 ${stat.color}`}>
                            <stat.icon size={18} />
                        </div>
                        <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wider">{stat.label}</p>
                        <p className="text-2xl font-bold mt-1">{stat.value}</p>
                    </motion.div>
                ))}
            </div>

            {/* Secondary KPIs */}
            <div className="grid grid-cols-3 gap-4">
                <div className="glass-card p-5 flex items-center gap-4">
                    <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center text-red-400">
                        <Activity size={18} />
                    </div>
                    <div>
                        <p className="text-[11px] text-gray-500 uppercase">Thất bại</p>
                        <p className="text-lg font-bold text-red-400">{totalFailed}</p>
                    </div>
                </div>
                <div className="glass-card p-5 flex items-center gap-4">
                    <div className="w-10 h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center text-cyan-400">
                        <Server size={18} />
                    </div>
                    <div>
                        <p className="text-[11px] text-gray-500 uppercase">Nền tảng</p>
                        <p className="text-lg font-bold">{platformStats?.length || 0}</p>
                    </div>
                </div>
                <div className="glass-card p-5 flex items-center gap-4">
                    <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center text-orange-400">
                        <HardDrive size={18} />
                    </div>
                    <div>
                        <p className="text-[11px] text-gray-500 uppercase">Dung lượng</p>
                        <p className="text-lg font-bold">
                            {formatFileSize(platformStats?.reduce((a: number, b: Record<string, unknown>) => a + Number(b.total_Size || 0), 0) || 0)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Platform Performance Table */}
            <section className="glass-card overflow-hidden">
                <div className="p-5 border-b border-white/5 flex items-center justify-between">
                    <h3 className="font-bold flex items-center gap-2 text-sm">
                        <PieChart size={16} className="text-primary" />
                        Hiệu suất nền tảng
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white/3 text-gray-500 text-[11px] uppercase tracking-wider">
                            <tr>
                                <th className="px-5 py-3 font-semibold">Nền tảng</th>
                                <th className="px-5 py-3 font-semibold text-right">Tổng</th>
                                <th className="px-5 py-3 font-semibold text-right">Thành công</th>
                                <th className="px-5 py-3 font-semibold text-right">Thất bại</th>
                                <th className="px-5 py-3 font-semibold text-right">Tỷ lệ</th>
                                <th className="px-5 py-3 font-semibold text-right">Tiến trình TB</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {platformStats?.map((stat: Record<string, unknown>, i: number) => {
                                const total = Number(stat.total_Downloads) || 0;
                                const success = Number(stat.successful) || 0;
                                const rate = total > 0 ? ((success / total) * 100).toFixed(1) : '0';
                                return (
                                    <tr key={i} className="hover:bg-white/3 transition-colors">
                                        <td className="px-5 py-3.5 capitalize font-medium">{stat.platform}</td>
                                        <td className="px-5 py-3.5 text-right font-mono">{total}</td>
                                        <td className="px-5 py-3.5 text-right text-green-400 font-mono">{success}</td>
                                        <td className="px-5 py-3.5 text-right text-red-400 font-mono">{stat.failed}</td>
                                        <td className="px-5 py-3.5 text-right">
                                            <span className={`font-mono ${Number(rate) >= 90 ? 'text-green-400' : Number(rate) >= 70 ? 'text-yellow-400' : 'text-red-400'}`}>
                                                {rate}%
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <div className="w-20 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                    <div className="h-full bg-primary rounded-full" style={{ width: `${stat.avg_Progress || 0}%` }} />
                                                </div>
                                                <span className="text-[11px] font-mono text-gray-400 w-8 text-right">{stat.avg_Progress || 0}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Revenue Table */}
            {revenueStats && revenueStats.length > 0 && (
                <section className="glass-card overflow-hidden">
                    <div className="p-5 border-b border-white/5">
                        <h3 className="font-bold flex items-center gap-2 text-sm">
                            <BarChart3 size={16} className="text-yellow-400" />
                            Doanh thu theo tháng
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-white/3 text-gray-500 text-[11px] uppercase tracking-wider">
                                <tr>
                                    <th className="px-5 py-3 font-semibold">Tháng</th>
                                    <th className="px-5 py-3 font-semibold text-right">Giao dịch</th>
                                    <th className="px-5 py-3 font-semibold text-right">Doanh thu</th>
                                    <th className="px-5 py-3 font-semibold text-right">Hoàn tiền</th>
                                    <th className="px-5 py-3 font-semibold text-right">Người dùng</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {revenueStats.map((row: Record<string, unknown>, i: number) => (
                                    <tr key={i} className="hover:bg-white/3 transition-colors">
                                        <td className="px-5 py-3.5 font-medium">{new Date(row.month).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}</td>
                                        <td className="px-5 py-3.5 text-right font-mono">{row.total_Transactions}</td>
                                        <td className="px-5 py-3.5 text-right text-green-400 font-mono">${Number(row.total_Revenue).toLocaleString()}</td>
                                        <td className="px-5 py-3.5 text-right text-red-400 font-mono">${Number(row.total_Refunds).toLocaleString()}</td>
                                        <td className="px-5 py-3.5 text-right font-mono">{row.unique_Paying_Users}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}
        </div>
    );
};

export default AdminDashboard;
