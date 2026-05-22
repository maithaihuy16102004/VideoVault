import React, { useState } from 'react';
import { useAuth } from '../shared/hooks/useAuth';
import { Download, Loader2, Lock, Mail, User as UserIcon, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AuthPage: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const { login, register } = useAuth();
    const [formData, setFormData] = useState({
        email: '',
        username: '',
        password: '',
        fullName: ''
    });
    const [errorMsg, setErrorMsg] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        try {
            if (isLogin) {
                await login.mutateAsync({ email: formData.email, password: formData.password });
                // Redirect is handled by MainLayout auth guard automatically
            } else {
                await register.mutateAsync(formData);
                // Redirect is handled by MainLayout auth guard automatically
            }
        } catch (err: any) {
            const msg = err?.response?.data?.message || err?.message || 'Đăng nhập thất bại. Vui lòng thử lại.';
            setErrorMsg(msg);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-4 relative overflow-hidden">
            {/* Background effects */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(6,182,212,0.08),transparent_60%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(168,85,247,0.06),transparent_50%)]" />
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl animate-pulse" />
            
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="relative z-10 w-full max-w-md"
            >
                {/* Card */}
                <div className="bg-[#0f0f17] border border-white/10 rounded-3xl p-8 shadow-[0_0_60px_rgba(0,0,0,0.5)]">
                    {/* Logo */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-14 h-14 bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(6,182,212,0.4)]">
                            <Download className="text-white" size={28} />
                        </div>
                        <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">VideoVault</h1>
                        <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest mt-1">Pro Edition</p>
                        <p className="text-gray-500 text-sm mt-3">
                            {isLogin ? 'Đăng nhập để tiếp tục' : 'Tạo tài khoản mới'}
                        </p>
                    </div>

                    {/* Tab Switch */}
                    <div className="flex bg-white/5 rounded-xl p-1 mb-6">
                        <button
                            onClick={() => { setIsLogin(true); setErrorMsg(''); }}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${isLogin ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            Đăng nhập
                        </button>
                        <button
                            onClick={() => { setIsLogin(false); setErrorMsg(''); }}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${!isLogin ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            Đăng ký
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <AnimatePresence mode="wait">
                            {!isLogin && (
                                <motion.div
                                    key="register-fields"
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="space-y-4 overflow-hidden"
                                >
                                    <div className="relative">
                                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                        <input
                                            type="text"
                                            placeholder="Username"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-12 py-3.5 focus:outline-none focus:border-cyan-500/50 focus:bg-white/[0.08] transition-all text-sm"
                                            value={formData.username}
                                            onChange={(e) => setFormData({...formData, username: e.target.value})}
                                            required
                                        />
                                    </div>
                                    <div className="relative">
                                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                        <input
                                            type="text"
                                            placeholder="Họ và tên"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-12 py-3.5 focus:outline-none focus:border-cyan-500/50 focus:bg-white/[0.08] transition-all text-sm"
                                            value={formData.fullName}
                                            onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                                            required
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                            <input
                                type="email"
                                placeholder="Địa chỉ Email"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-12 py-3.5 focus:outline-none focus:border-cyan-500/50 focus:bg-white/[0.08] transition-all text-sm"
                                value={formData.email}
                                onChange={(e) => setFormData({...formData, email: e.target.value})}
                                required
                            />
                        </div>

                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                            <input
                                type="password"
                                placeholder="Mật khẩu"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-12 py-3.5 focus:outline-none focus:border-cyan-500/50 focus:bg-white/[0.08] transition-all text-sm"
                                value={formData.password}
                                onChange={(e) => setFormData({...formData, password: e.target.value})}
                                required
                            />
                        </div>

                        {/* Error message */}
                        <AnimatePresence>
                            {errorMsg && (
                                <motion.div
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm"
                                >
                                    <AlertCircle size={16} className="shrink-0" />
                                    {errorMsg}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <button
                            type="submit"
                            disabled={login.isPending || register.isPending}
                            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20"
                        >
                            {(login.isPending || register.isPending) && <Loader2 className="animate-spin" size={18} />}
                            {isLogin ? 'Đăng nhập' : 'Tạo tài khoản'}
                        </button>
                    </form>
                </div>
                
                <p className="text-center text-xs text-gray-600 mt-4">
                    VideoVault © 2025 · Tải video chất lượng cao, không watermark
                </p>
            </motion.div>
        </div>
    );
};

export default AuthPage;
