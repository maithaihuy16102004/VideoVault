import React, { useEffect } from 'react';
import { 
    Download, Settings, LayoutDashboard, LogOut,
    CreditCard, ShieldAlert, BarChart3, Users, Hash,
    Workflow, FileAudio, Languages, Mic2,
    Server, ShoppingBag, FolderKanban, LineChart,
    Megaphone, PlayCircle, Zap, ClipboardList
} from 'lucide-react';
import { useAuth } from '../shared/hooks/useAuth';
import { Link, Outlet, useLocation, useNavigate } from '@tanstack/react-router';
import { motion } from 'framer-motion';

const LoadingScreen: React.FC = () => (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-center space-y-4">
            <div className="relative w-16 h-16 mx-auto">
                <div className="absolute inset-0 bg-cyan-500/20 rounded-full animate-ping" />
                <div className="absolute inset-0 bg-cyan-500/40 rounded-full animate-pulse" />
                <PlayCircle className="absolute inset-0 m-auto text-cyan-400" size={24} />
            </div>
            <p className="text-cyan-400 font-bold uppercase tracking-widest text-xs">Đang xác thực...</p>
        </div>
    </div>
);

const MainLayout: React.FC = () => {
    const { logout, user, isLoading } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const isAdmin = user?.role === 'admin';
    const isLoginPage = location.pathname === '/login';

    // ─── Auth Guard ─────────────────────────────────────────────────────
    useEffect(() => {
        if (!isLoading) {
            // Not logged in → redirect to login (except if already on login page)
            if (!user && !isLoginPage) {
                navigate({ to: '/login' });
            }
            // Already logged in → skip login page, go to dashboard
            if (user && isLoginPage) {
                navigate({ to: '/dashboard' });
            }
        }
    }, [user, isLoading, isLoginPage]);

    // On login page → render without sidebar layout (no need to wait for auth check)
    if (isLoginPage) return <Outlet />;

    // Show loading screen while checking session (only when we have a token)
    if (isLoading) return <LoadingScreen />;

    // Not logged in → redirect is happening, render nothing
    if (!user) return null;

    const getActiveTab = () => {
        const path = location.pathname;
        if (path.includes('admin/dashboard')) return 'admin-dashboard';
        if (path.includes('admin/analytics')) return 'admin-analytics';
        if (path.includes('admin/promotion-audit')) return 'admin-promotion-audit';
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

    // ─── Admin section appears FIRST when user is admin ─────────────────
    const adminSection = isAdmin ? [{
        title: 'Quản trị Admin',
        isAdminSection: true,
        items: [
            { id: 'admin-dashboard', icon: ShieldAlert, label: 'Quản lý hệ thống', path: '/admin/dashboard' },
            { id: 'admin-analytics', icon: BarChart3, label: 'Thống kê tổng thể', path: '/admin/analytics' },
            { id: 'admin-promotion-audit', icon: ClipboardList, label: 'Audit quảng bá AI', path: '/admin/promotion-audit' },
        ]
    }] : [];

    const navSections = [
        ...adminSection,
        {
            title: 'Tổng quan',
            isAdminSection: false,
            items: [
                { id: 'dashboard', icon: LayoutDashboard, label: 'Bảng điều khiển', path: '/' },
            ]
        },
        {
            title: 'Trình tải video',
            isAdminSection: false,
            items: [
                { id: 'dl-history', icon: Download, label: 'Tải theo URL', path: '/downloads' },
                { id: 'dl-account', icon: Users, label: 'Tải theo Account', path: '/downloads/account' },
                { id: 'dl-hashtag', icon: Hash, label: 'Tải theo Hashtag', path: '/downloads/hashtag' },
            ]
        },
        {
            title: 'AI Automation',
            isAdminSection: false,
            items: [
                { id: 'auto-pipeline', icon: Workflow, label: 'Auto Pipeline', path: '/automation/pipeline' },
                { id: 'auto-stt', icon: FileAudio, label: 'Speech to Text', path: '/automation/stt' },
                { id: 'auto-translate', icon: Languages, label: 'Dịch thuật AI', path: '/automation/translate' },
                { id: 'auto-voice', icon: Mic2, label: 'Lồng tiếng AI', path: '/automation/voice' },
            ]
        },
        {
            title: 'Tăng Trưởng & Ads',
            isAdminSection: false,
            items: [
                { id: 'growth-promote', icon: Megaphone, label: 'TikTok Promote (AI)', path: '/growth/promote' },
            ]
        },
        {
            title: 'Quản lý tài nguyên',
            isAdminSection: false,
            items: [
                { id: 'lib-storage', icon: Server, label: 'Kho lưu trữ', path: '/library/storage' },
                { id: 'lib-projects', icon: FolderKanban, label: 'Dự án', path: '/library/projects' },
            ]
        },
        {
            title: 'Phân tích & Affiliates',
            isAdminSection: false,
            items: [
                { id: 'an-viral', icon: LineChart, label: 'Viral Analytics', path: '/analytics/viral' },
                { id: 'affiliate', icon: ShoppingBag, label: 'Affiliate Tools', path: '/affiliate' },
            ]
        },
        {
            title: 'Tài khoản',
            isAdminSection: false,
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
                    {navSections.map((section) => {
                        const isAdminSec = section.isAdminSection;
                        return (
                            <div key={section.title} className="flex flex-col gap-1.5 relative">
                                {/* Admin section separator + styled header */}
                                {isAdminSec && (
                                    <div className="h-px bg-gradient-to-r from-purple-500/0 via-purple-500/30 to-purple-500/0 mb-1" />
                                )}
                                <p className={`px-3 text-[10px] uppercase tracking-widest font-black mb-1 flex items-center gap-1.5 ${
                                    isAdminSec ? 'text-purple-400' : 'text-gray-500'
                                }`}>
                                    {isAdminSec && <ShieldAlert size={10} />}
                                    {section.title}
                                </p>
                                
                                {section.items.map((item) => {
                                    const isActive = active === item.id;
                                    return (
                                        <Link
                                            key={item.id}
                                            to={item.path}
                                            className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-200 text-sm group select-none ${
                                                isAdminSec
                                                    ? isActive ? 'text-purple-300 font-bold' : 'text-gray-400 hover:text-purple-300'
                                                    : isActive ? 'text-white font-bold' : 'text-gray-400 hover:text-gray-100'
                                            }`}
                                        >
                                            {isActive && (
                                                <motion.div
                                                    layoutId="activeNavTab"
                                                    className={`absolute inset-0 rounded-r-xl ${
                                                        isAdminSec
                                                            ? 'bg-gradient-to-r from-purple-500/15 to-transparent border-l-2 border-purple-400'
                                                            : 'bg-gradient-to-r from-cyan-500/15 to-transparent border-l-2 border-cyan-400'
                                                    }`}
                                                    initial={false}
                                                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                                />
                                            )}
                                            <item.icon size={18} className={`relative z-10 transition-colors ${
                                                isAdminSec
                                                    ? isActive ? 'text-purple-400' : 'group-hover:text-purple-400'
                                                    : isActive ? 'text-cyan-400' : 'group-hover:text-cyan-300'
                                            }`} />
                                            <span className="relative z-10">{item.label}</span>
                                            {item.id === 'growth-promote' && (
                                                <span className="relative z-10 ml-auto flex items-center justify-center w-5 h-5 rounded-md bg-purple-500/20 text-purple-400">
                                                    <Zap size={10} fill="currentColor" />
                                                </span>
                                            )}
                                        </Link>
                                    );
                                })}
                                {isAdminSec && (
                                    <div className="h-px bg-gradient-to-r from-purple-500/0 via-purple-500/20 to-purple-500/0 mt-1" />
                                )}
                            </div>
                        );
                    })}
                </nav>

                {/* User Profile Mini-card */}
                <div className="mt-8 relative group cursor-pointer">
                    <div className="absolute inset-0 bg-gradient-to-r from-white/[0.02] to-transparent rounded-2xl transition-colors group-hover:from-white/[0.05]" />
                    <div className="relative p-3 flex items-center gap-3 border border-white/5 rounded-2xl">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-white border border-white/10 shadow-inner shrink-0 group-hover:scale-105 transition-transform ${
                            isAdmin
                                ? 'bg-gradient-to-br from-purple-800 to-purple-900'
                                : 'bg-gradient-to-br from-gray-800 to-gray-900'
                        }`}>
                            {user?.username?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className={`text-sm font-bold text-white truncate transition-colors ${isAdmin ? 'group-hover:text-purple-400' : 'group-hover:text-cyan-400'}`}>
                                {user?.fullName || user?.username || 'Guest'}
                            </p>
                            <p className={`text-[10px] uppercase font-black tracking-widest mt-0.5 ${isAdmin ? 'text-purple-400' : 'text-gray-500'}`}>
                                {isAdmin ? '👑 Admin' : 'Free Plan'}
                            </p>
                        </div>
                        <button onClick={logout} className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Đăng xuất">
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto relative bg-[#0a0a0a]">
                <div className={`absolute top-0 left-0 w-full h-96 bg-gradient-to-b ${isAdmin ? 'from-purple-500/5' : 'from-cyan-500/5'} to-transparent pointer-events-none`} />
                <div className="relative min-h-full">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default MainLayout;
