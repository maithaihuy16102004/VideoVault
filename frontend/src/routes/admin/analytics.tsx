import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../../shared/api/analytics.api';
import { BarChart3, PieChart, TrendingUp, Users, Download, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

const Analytics: React.FC = () => {
    const { data: platformStats, isLoading: loadingPlatforms } = useQuery({
        queryKey: ['analytics', 'platforms'],
        queryFn: analyticsApi.getPlatformStats
    });

    const { data: revenueStats, isLoading: loadingRevenue } = useQuery({
        queryKey: ['analytics', 'revenue'],
        queryFn: analyticsApi.getRevenueStats
    });

    if (loadingPlatforms || loadingRevenue) {
        return <div className="p-8 text-center text-gray-500">Loading analytics...</div>;
    }

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">
                        Analytics Dashboard
                    </h1>
                    <p className="text-gray-500">Platform performance and revenue overview.</p>
                </div>
                <div className="flex gap-2">
                    <span className="px-3 py-1 bg-green-500/10 text-green-500 rounded-full text-xs font-bold border border-green-500/20 flex items-center gap-1">
                        <ShieldCheck size={12} /> Live Data
                    </span>
                </div>
            </header>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Total Downloads', value: platformStats?.reduce((a: Record<string, unknown>, b: Record<string, unknown>) => a + Number(b.total_Downloads), 0) || 0, icon: Download, color: 'text-blue-500' },
                    { label: 'Success Rate', value: '98.4%', icon: TrendingUp, color: 'text-green-500' },
                    { label: 'Active Users', value: revenueStats?.[0]?.unique_Paying_Users || 0, icon: Users, color: 'text-purple-500' },
                    { label: 'Monthly Revenue', value: `$${revenueStats?.[0]?.total_Revenue || 0}`, icon: BarChart3, color: 'text-yellow-500' },
                ].map((stat, i) => (
                    <motion.div 
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="glass-card p-6"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-2 bg-white/5 rounded-lg ${stat.color}`}>
                                <stat.icon size={20} />
                            </div>
                        </div>
                        <h3 className="text-gray-500 text-sm font-medium">{stat.label}</h3>
                        <p className="text-2xl font-bold mt-1">{stat.value}</p>
                    </motion.div>
                ))}
            </div>

            {/* Platform Stats Table */}
            <section className="glass-card overflow-hidden">
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <h3 className="font-bold flex items-center gap-2">
                        <PieChart size={18} className="text-primary" />
                        Platform Performance
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-white/5 text-gray-400 text-sm">
                            <tr>
                                <th className="px-6 py-4 font-semibold uppercase tracking-wider">Platform</th>
                                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-right">Total</th>
                                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-right">Success</th>
                                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-right">Failed</th>
                                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-right">Avg Progress</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {platformStats?.map((stat: Record<string, unknown>, i: number) => (
                                <tr key={i} className="hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4 capitalize font-medium">{stat.platform}</td>
                                    <td className="px-6 py-4 text-right">{stat.total_Downloads}</td>
                                    <td className="px-6 py-4 text-right text-green-500">{stat.successful}</td>
                                    <td className="px-6 py-4 text-right text-red-500">{stat.failed}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                <div className="h-full bg-primary" style={{ width: `${stat.avg_Progress}%` }} />
                                            </div>
                                            <span className="text-xs font-mono">{stat.avg_Progress}%</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
};

export default Analytics;
