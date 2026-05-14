import React, { useState } from 'react';
import { useAuth } from '../shared/hooks/useAuth';
import { Download, Loader2, Lock, Mail, User as UserIcon } from 'lucide-react';
import { motion } from 'framer-motion';

const AuthPage: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const { login, register } = useAuth();
    const [formData, setFormData] = useState({
        email: '',
        username: '',
        password: '',
        fullName: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isLogin) {
            await login.mutateAsync({ email: formData.email, password: formData.password });
            window.location.href = '/dashboard';
        } else {
            await register.mutateAsync(formData);
            window.location.href = '/dashboard';
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.05),transparent_50%)]" />
            
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card w-full max-w-md p-8 relative z-10"
            >
                <div className="flex flex-col items-center mb-8">
                    <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-primary/20">
                        <Download className="text-white" size={28} />
                    </div>
                    <h1 className="text-2xl font-bold">VideoVault</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        {isLogin ? 'Welcome back! Please login.' : 'Create an account to get started.'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {!isLogin && (
                        <div className="space-y-4">
                            <div className="relative">
                                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                <input
                                    type="text"
                                    placeholder="Username"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-12 py-3 focus:outline-none focus:border-primary/50 transition-all"
                                    value={formData.username}
                                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                                    required
                                />
                            </div>
                            <div className="relative">
                                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                <input
                                    type="text"
                                    placeholder="Full Name"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-12 py-3 focus:outline-none focus:border-primary/50 transition-all"
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                                    required
                                />
                            </div>
                        </div>
                    )}

                    <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                        <input
                            type="email"
                            placeholder="Email Address"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-12 py-3 focus:outline-none focus:border-primary/50 transition-all"
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                            required
                        />
                    </div>

                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                        <input
                            type="password"
                            placeholder="Password"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-12 py-3 focus:outline-none focus:border-primary/50 transition-all"
                            value={formData.password}
                            onChange={(e) => setFormData({...formData, password: e.target.value})}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={login.isPending || register.isPending}
                        className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {(login.isPending || register.isPending) && <Loader2 className="animate-spin" size={18} />}
                        {isLogin ? 'Sign In' : 'Create Account'}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-gray-500">
                    {isLogin ? "Don't have an account?" : "Already have an account?"}
                    <button 
                        onClick={() => setIsLogin(!isLogin)}
                        className="ml-2 text-primary font-bold hover:underline"
                    >
                        {isLogin ? 'Sign Up' : 'Sign In'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default AuthPage;
