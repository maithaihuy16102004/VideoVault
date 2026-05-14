import React from 'react';
import { 
    Download, Settings, LayoutDashboard, LogOut,
    CreditCard, ShieldAlert, BarChart3, Users, Hash,
    Workflow, FileAudio, Languages, Mic2,
    Server, ShoppingBag, FolderKanban, LineChart,
    Scissors, PlayCircle
} from 'lucide-react';
import { useAuth } from '../shared/hooks/useAuth';
import { Link, Outlet, useLocation } from '@tanstack/react-router';

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
        if (path.includes('editor/render')) return 'edit-render';
        if (path.includes('editor/studio')) return 'edit-studio';
        if (path.includes('library/storage')) return 'lib-storage';
        if (path.includes('library/projects')) return 'lib-projects';
        if (path.includes('affiliate')) return 'affiliate';
        if (path.includes('analytics/viral')) return 'an-viral';
        if (path.includes('subscriptions')) return 'billing';
        return 'dashboard';
    };

    const active = getActiveTab();

    const navSections = [
        {
            title: 'Tổng quan',
            items: [
                { id: 'dashboard', icon: LayoutDashboard, label: 'Bảng điều khiển', path: '/dashboard' },
            ]
        },
        {
            title: 'Trình tải video',
            items: [
                { id: 'downloads', icon: Download, label: 'Tải theo URL', path: '/downloads' },
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
            title: 'Video Editor',
            items: [
                { id: 'ed-studio', icon: Scissors, label: 'Studio Editor', path: '/editor/studio' },
                { id: 'ed-render', icon: PlayCircle, label: 'Render Queue', path: '/editor/render' },
            ]
        },
        {
            title: 'Thư viện',
            items: [
                { id: 'lib-storage', icon: Server, label: 'Kho lưu trữ', path: '/library/storage' },
                { id: 'lib-projects', icon: FolderKanban, label: 'Dự án', path: '/library/projects' },
            ]
        },
        {
            title: 'Phân tích & Tiếp thị',
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
        <div className="flex h-screen bg-[#0a0a0a] overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 border-r border-white/5 flex flex-col py-6 px-3 bg-[#0c0c0c] shrink-0 overflow-y-auto no-scrollbar">
                {/* Logo */}
                <div className="flex items-center gap-2.5 px-3 mb-8">
                    <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                        <PlayCircle className="text-white" size={20} />
                    </div>
                    <span className="text-lg font-bold tracking-tight">VideoVault</span>
                </div>

                {/* Navigation */}
                <nav className="flex-1 flex flex-col gap-6">
                    {navSections.map((section) => (
                        <div key={section.title} className="flex flex-col gap-1">
                            <p className="px-3 text-[10px] text-gray-600 uppercase tracking-widest font-bold mb-1">{section.title}</p>
                            {section.items.map((item) => (
                                <Link
                                    key={item.id}
                                    to={item.path}
                                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-150 text-sm ${
                                        active === item.id 
                                            ? 'bg-primary/10 text-primary font-semibold' 
                                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    <item.icon size={16} />
                                    <span>{item.label}</span>
                                </Link>
                            ))}
                        </div>
                    ))}

                    {/* Admin Section */}
                    {isAdmin && (
                        <div className="flex flex-col gap-1">
                            <div className="h-px bg-white/5 my-2" />
                            <p className="px-3 text-[10px] text-gray-600 uppercase tracking-widest font-bold mb-1">Quản trị</p>
                            <Link
                                autoFocus={false}
                                to="/admin/dashboard"
                                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-150 text-sm ${
                                    active === 'admin-dashboard' 
                                        ? 'bg-orange-500/10 text-orange-400 font-semibold' 
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                <ShieldAlert size={16} />
                                <span>Quản lý hệ thống</span>
                            </Link>
                            <Link
                                autoFocus={false}
                                to="/admin/analytics"
                                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-150 text-sm ${
                                    active === 'analytics' 
                                        ? 'bg-orange-500/10 text-orange-400 font-semibold' 
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                <BarChart3 size={16} />
                                <span>Thống kê tổng thể</span>
                            </Link>
                        </div>
                    )}
                </nav>

                {/* User Profile */}
                <div className="mt-8 pt-4 border-t border-white/5 space-y-2">
                    <div className="flex items-center gap-2.5 px-3 py-2">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary border border-primary/20">
                            {user?.username?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{user?.username || 'Guest'}</p>
                            <p className="text-[10px] text-gray-600 uppercase font-bold tracking-wider">{user?.role || 'guest'}</p>
                        </div>
                    </div>
                    <button 
                        onClick={logout}
                        className="flex items-center gap-2.5 px-3 py-2 text-gray-500 hover:text-red-400 w-full transition-colors rounded-lg hover:bg-red-500/5 text-sm"
                    >
                        <LogOut size={16} />
                        <span>Đăng xuất</span>
                    </button>
                </div>
            </aside>

            {/* Main */}
            <main className="flex-1 overflow-y-auto">
                <div className="min-h-full">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default MainLayout;
