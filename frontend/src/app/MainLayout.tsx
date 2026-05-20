import React from 'react';
import { 
    Download, Settings, LayoutDashboard, LogOut,
    CreditCard, ShieldAlert, BarChart3, Users, Hash,
    Workflow, FileAudio, Languages, Mic2,
    Server, ShoppingBag, FolderKanban, LineChart,
    Megaphone, PlayCircle, Zap
} from 'lucide-react';
import { useAuth } from '../shared/hooks/useAuth';
import { Link, Outlet, useLocation } from '@tanstack/react-router';
import { motion } from 'framer-motion';

const MainLayout: React.FC = () => {
    const { logout, user } = useAuth();
    const location = useLocation();
    const isAdmin = user?.role === 'admin';
    
    const getActiveTab = () => {
        const path = location.pathname;
        if (path.includes('admin/dashboard')) return 'admin-dashboard';
        if (path.includes('admin/analytics')) return 'analytics';
        if (path.includes('downloads/account')) return 'dl-account';
        if (path.includes('downloads/hashtag')) return 'dl-hashtag';
        if (path.includes('downloads')) return 'dl-history';
        if (path.includes('automation/pipeline')) return 'auto-pipeline';
        if (path.includes('automation/stt')) return 'auto-stt';
        if (path.includes('automation/translate')) return 'auto-translate';
        if (path.includes('automation/voice')) return 'auto-voice';
        if (path.includes('growth/promote')) return 'growth-promote';
        if (path.includes('library/storage')) return 'lib-storage';
        if (path.includes('library/projects')) return 'lib-projects';
        if (path.includes('affiliate')) return 'affiliate';
        if (path.includes('analytics/viral')) return 'an-viral';
        if (path.includes('subscriptions')) return 'billing';
        if (path.includes('settings')) return 'settings';
        return 'dashboard';
    };

    const active = getActiveTab();

    const navSections = [
        {
            title: 'Tổng quan',
            items: [
                { id: 'dashboard', icon: LayoutDashboard, label: 'Bảng điều khiển', path: '/' },
            ]
        },
        {
            title: 'Trình tải video',
            items: [
                { id: 'dl-history', icon: Download, label: 'Tải theo URL', path: '/downloads' },
                { id: 'dl-account', icon: Users, label: 'Tải theo Account', path: '/downloads/account' },
                { id: 'dl-hashtag', icon: Hash, label: 'Tải theo Hashtag', path: '/downloads/hashtag' },
            ]
        },
        {
            title: 'AI Automation',
            items: [
                { id: 'auto-pipeline', icon: Workflow, label: 'Auto Pipeline', path: '/automation/pipeline' },
                { id: 'auto-stt', icon: FileAudio, label: 'Speech to Text', path: '/automation/stt' },
                { id: 'auto-translate', icon: Languages, label: 'Dịch thuật AI', path: '/automation/translate' },
                { id: 'auto-voice', icon: Mic2, label: 'Lồng tiếng AI', path: '/automation/voice' },
            ]
        },
        {
            title: 'Tăng Trưởng & Ads',
            items: [
                { id: 'growth-promote', icon: Megaphone, label: 'TikTok Promote (AI)', path: '/growth/promote' },
            ]
        },
        {
            title: 'Quản lý tài nguyên',
            items: [
                { id: 'lib-storage', icon: Server, label: 'Kho lưu trữ', path: '/library/storage' },
                { id: 'lib-projects', icon: FolderKanban, label: 'Dự án', path: '/library/projects' },
            ]
        },
        {
            title: 'Phân tích & Affiliates',
            items: [
                { id: 'an-viral', icon: LineChart, label: 'Viral Analytics', path: '/analytics/viral' },
                { id: 'affiliate', icon: ShoppingBag, label: 'Affiliate Tools', path: '/affiliate' },
            ]
        },
        {
            title: 'Tài khoản',
            items: [
                { id: 'billing', icon: CreditCard, label: 'Gói dịch vụ', path: '/subscriptions' },
                { id: 'settings', icon: Settings, label: 'Cài đặt', path: '/settings' },
            ]
        }
    ];

    return (
        <div className="flex h-screen bg-[#0a0a0a] overflow-hidden selection:bg-cyan-500/30">
            {/* Sidebar */}
            <aside className="w-[260px] border-r border-white/5 flex flex-col py-6 px-4 bg-[#0a0a0f] shrink-0 overflow-y-auto no-scrollbar z-50">
                
                {/* Logo & Branding */}
                <Link to="/" className="flex items-center gap-3 px-2 mb-8 group select-none">
                    <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.3)] group-hover:shadow-[0_0_25px_rgba(168,85,247,0.4)] transition-all duration-500 relative">
                        <div className="absolute inset-0 bg-white/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                        <PlayCircle className="text-white relative z-10" size={22} fill="currentColor" strokeWidth={1} />
                    </div>
                    <div>
                        <span className="text-xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">VideoVault</span>
                        <span className="text-[9px] block text-cyan-400 font-bold uppercase tracking-widest mt-[-2px]">Pro Edition</span>
                    </div>
                </Link>

                {/* Navigation Menu */}
                <nav className="flex-1 flex flex-col gap-6">
                    {navSections.map((section) => (
                        <div key={section.title} className="flex flex-col gap-1.5 relative">
                            <p className="px-3 text-[10px] text-gray-500 uppercase tracking-widest font-black mb-1">{section.title}</p>
                            
                            {section.items.map((item) => {
                                const isActive = active === item.id;
                                return (
                                    <Link
                                        key={item.id}
                                        to={item.path}
                                        className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-200 text-sm group select-none ${
                                            isActive ? 'text-white font-bold' : 'text-gray-400 hover:text-gray-100'
                                        }`}
                                    >
                                        {isActive && (
                                            <motion.div
                                                layoutId="activeNavTab"
                                                className="absolute inset-0 bg-gradient-to-r from-cyan-500/15 to-transparent border-l-2 border-cyan-400 rounded-r-xl"
                                                initial={false}
                                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                            />
                                        )}
                                        <item.icon size={18} className={`relative z-10 transition-colors ${isActive ? 'text-cyan-400' : 'group-hover:text-cyan-300'}`} />
                                        <span className="relative z-10">{item.label}</span>
                                        {item.id === 'growth-promote' && (
                                            <span className="relative z-10 ml-auto flex items-center justify-center w-5 h-5 rounded-md bg-purple-500/20 text-purple-400">
                                                <Zap size={10} fill="currentColor" />
                                            </span>
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    ))}

                    {/* Admin VIP Section */}
                    {isAdmin && (
                        <div className="flex flex-col gap-1.5 mt-2">
                            <div className="h-px bg-gradient-to-r from-purple-500/0 via-purple-500/20 to-purple-500/0 my-2" />
                            <p className="px-3 text-[10px] text-purple-400 uppercase tracking-widest font-black mb-1 flex items-center gap-1.5">
                                <ShieldAlert size={10} /> Quản trị Admin
                            </p>
                            <Link to="/admin/dashboard" className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-200 text-sm group select-none ${active === 'admin-dashboard' ? 'text-purple-300 font-bold' : 'text-gray-400 hover:text-purple-300'}`}>
                                {active === 'admin-dashboard' && (
                                    <motion.div layoutId="activeNavTab" className="absolute inset-0 bg-gradient-to-r from-purple-500/15 to-transparent border-l-2 border-purple-400 rounded-r-xl" initial={false} transition={{ type: "spring", stiffness: 400, damping: 30 }} />
                                )}
                                <ShieldAlert size={18} className={`relative z-10 transition-colors ${active === 'admin-dashboard' ? 'text-purple-400' : 'group-hover:text-purple-400'}`} />
                                <span className="relative z-10">Quản lý hệ thống</span>
                            </Link>
                            <Link to="/admin/analytics" className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-200 text-sm group select-none ${active === 'analytics' ? 'text-purple-300 font-bold' : 'text-gray-400 hover:text-purple-300'}`}>
                                {active === 'analytics' && (
                                    <motion.div layoutId="activeNavTab" className="absolute inset-0 bg-gradient-to-r from-purple-500/15 to-transparent border-l-2 border-purple-400 rounded-r-xl" initial={false} transition={{ type: "spring", stiffness: 400, damping: 30 }} />
                                )}
                                <BarChart3 size={18} className={`relative z-10 transition-colors ${active === 'analytics' ? 'text-purple-400' : 'group-hover:text-purple-400'}`} />
                                <span className="relative z-10">Thống kê tổng thể</span>
                            </Link>
                        </div>
                    )}
                </nav>

                {/* User Profile Mini-card */}
                <div className="mt-8 relative group cursor-pointer">
                    <div className="absolute inset-0 bg-gradient-to-r from-white/[0.02] to-transparent rounded-2xl transition-colors group-hover:from-white/[0.05]" />
                    <div className="relative p-3 flex items-center gap-3 border border-white/5 rounded-2xl">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-sm font-black text-white border border-white/10 shadow-inner shrink-0 group-hover:scale-105 transition-transform">
                            {user?.username?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white truncate group-hover:text-cyan-400 transition-colors">{user?.fullName || user?.username || 'Guest'}</p>
                            <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mt-0.5">{isAdmin ? '👑 Admin' : 'Free Plan'}</p>
                        </div>
                        <button onClick={logout} className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Đăng xuất">
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto relative bg-[#0a0a0a]">
                <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-cyan-500/5 to-transparent pointer-events-none" />
                <div className="relative min-h-full">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default MainLayout;
