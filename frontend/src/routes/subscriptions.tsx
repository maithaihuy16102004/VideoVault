import React, { useState } from 'react';
import { Check, Zap, Rocket, Crown, Building2, Star, X, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../shared/hooks/useAuth';

const formatVND = (amount: number) => {
    if (amount === 0) return 'Miễn phí';
    return amount.toLocaleString('vi-VN') + 'đ';
};

const Subscriptions: React.FC = () => {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';
    const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');

    const plans = [
        {
            name: 'Free',
            icon: Zap,
            monthly: 0,
            yearly: 0,
            quota: 5,
            quality: '720p',
            concurrent: 1,
            features: ['5 lượt tải / ngày', 'Chất lượng 720p', 'Tốc độ tiêu chuẩn'],
            limitations: ['Có watermark', 'Không hỗ trợ tải hàng loạt', 'Không có AI Insight'],
            color: 'from-gray-500/10 to-transparent',
            glowColor: 'group-hover:shadow-gray-500/10',
            borderColor: 'border-white/5 hover:border-gray-500/30',
            iconColor: 'text-gray-400',
            btnClass: 'bg-white/5 hover:bg-white/10 text-white border border-white/5',
        },
        {
            name: 'Starter',
            icon: Rocket,
            monthly: 49000,
            yearly: 490000,
            quota: 30,
            quality: '1080p',
            concurrent: 2,
            features: ['30 lượt tải / ngày', 'Chất lượng 1080p Full HD', 'Không watermark', 'Tốc độ cao'],
            limitations: ['Không có AI Insight'],
            color: 'from-cyan-500/10 to-blue-500/5',
            glowColor: 'group-hover:shadow-cyan-500/20',
            borderColor: 'border-cyan-500/20 hover:border-cyan-400/40',
            iconColor: 'text-cyan-400',
            btnClass: 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20',
            popular: true,
        },
        {
            name: 'Pro',
            icon: Crown,
            monthly: 149000,
            yearly: 1490000,
            quota: 100,
            quality: '4K',
            concurrent: 5,
            features: ['100 lượt tải / ngày', 'Chất lượng 4K Ultra HD', 'Không watermark', 'Tốc độ cao nhất', 'Tải hàng loạt (Batch)', 'Mở khóa AI Insight cơ bản'],
            limitations: [],
            color: 'from-purple-500/10 to-pink-500/5',
            glowColor: 'group-hover:shadow-purple-500/20',
            borderColor: 'border-purple-500/20 hover:border-purple-400/40',
            iconColor: 'text-purple-400',
            btnClass: 'bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-400 hover:to-pink-500 text-white shadow-lg shadow-purple-500/20',
        },
        {
            name: 'Business',
            icon: Building2,
            monthly: 499000,
            yearly: 4990000,
            quota: 500,
            quality: 'Original',
            concurrent: 10,
            features: ['500 lượt tải / ngày', 'Chất lượng gốc (Original)', 'Tốc độ không giới hạn', 'Tải hàng loạt', 'Hỗ trợ ưu tiên 24/7', 'Full quyền AI Promote (Doanh thu/Tương tác)', 'Quản lý Team'],
            limitations: [],
            color: 'from-amber-500/10 to-orange-500/5',
            glowColor: 'group-hover:shadow-amber-500/20',
            borderColor: 'border-amber-500/20 hover:border-amber-400/40',
            iconColor: 'text-amber-400',
            btnClass: 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-lg shadow-amber-500/20',
        },
    ];

    const yearlySaving = Math.round((1 - 490000 / (49000 * 12)) * 100);

    return (
        <div className="p-6 md:p-12 max-w-7xl mx-auto space-y-12">
            {/* Header */}
            <div className="text-center space-y-5">
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight">
                        <span className="bg-gradient-to-r from-white via-cyan-200 to-purple-300 bg-clip-text text-transparent">Chọn Gói Dịch Vụ Phù Hợp</span>
                    </h1>
                </motion.div>
                
                <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-gray-400 max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
                    Nâng cấp để tải video chất lượng 4K không watermark, mở khóa AI Promote Strategy và tăng tốc độ xử lý hàng loạt.
                </motion.p>

                {/* Billing Toggle */}
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
                    className="inline-flex items-center gap-1 bg-white/5 rounded-2xl p-1.5 border border-white/10 shadow-inner"
                >
                    <button onClick={() => setBilling('monthly')}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${billing === 'monthly' ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25' : 'text-gray-400 hover:text-white'}`}>
                        Thanh toán tháng
                    </button>
                    <button onClick={() => setBilling('yearly')}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${billing === 'yearly' ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25' : 'text-gray-400 hover:text-white'}`}>
                        Thanh toán năm
                        <span className={`px-2 py-0.5 text-[10px] uppercase font-black rounded-lg ${billing === 'yearly' ? 'bg-white/20 text-white' : 'bg-green-500/20 text-green-400 border border-green-500/20'}`}>
                            Tiết kiệm {yearlySaving}%
                        </span>
                    </button>
                </motion.div>
            </div>

            {isAdmin ? (
                /* VIP Admin Card */
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    className="relative max-w-3xl mx-auto rounded-3xl p-1 overflow-hidden shadow-2xl"
                >
                    {/* Animated gradient border */}
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 animate-[spin_4s_linear_infinite] opacity-50 blur-sm" />
                    
                    <div className="relative glass-card p-12 text-center border-0 bg-[#0a0a0f]/90 backdrop-blur-xl rounded-[23px] overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-purple-500/10 to-transparent" />
                        
                        <div className="relative z-10">
                            <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-purple-500/30 rotate-3">
                                <ShieldCheck size={48} className="text-white" />
                            </motion.div>
                            
                            <h2 className="text-4xl font-black mb-4">
                                <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">Quyền Lực Tối Thượng</span>
                            </h2>
                            <p className="text-gray-300 mb-8 text-base max-w-xl mx-auto leading-relaxed">
                                Chào mừng <span className="font-bold text-white uppercase">{user?.fullName || 'Admin'}</span>. Bạn đang sử dụng đặc quyền quản trị viên cao cấp nhất. Mọi giới hạn hệ thống đã được gỡ bỏ hoàn toàn.
                            </p>
                            
                            <div className="flex flex-wrap justify-center gap-4 text-sm font-bold text-white">
                                <span className="flex items-center gap-2 px-4 py-2 bg-purple-500/15 border border-purple-500/30 rounded-xl">
                                    <TrendingUp size={16} className="text-purple-400" /> Quota Tải Vô Hạn
                                </span>
                                <span className="flex items-center gap-2 px-4 py-2 bg-pink-500/15 border border-pink-500/30 rounded-xl">
                                    <Sparkles size={16} className="text-pink-400" /> Unlock AI Promote (Full)
                                </span>
                                <span className="flex items-center gap-2 px-4 py-2 bg-cyan-500/15 border border-cyan-500/30 rounded-xl">
                                    <Crown size={16} className="text-cyan-400" /> Admin Dashboard
                                </span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            ) : (
                <>
                    {/* Plans Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {plans.map((plan, i) => {
                            const price = billing === 'monthly' ? plan.monthly : plan.yearly;
                            const period = billing === 'monthly' ? '/tháng' : '/năm';

                            return (
                                <motion.div key={plan.name} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                                    className={`glass-card p-7 relative flex flex-col group transition-all duration-300 border bg-gradient-to-b from-white/[0.03] to-transparent ${plan.borderColor} ${plan.glowColor} ${plan.popular ? 'ring-1 ring-cyan-500/50 scale-[1.02] shadow-2xl shadow-cyan-500/10' : 'hover:-translate-y-1'}`}
                                >
                                    {plan.popular && (
                                        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-[10px] font-black rounded-full uppercase tracking-widest flex items-center gap-1.5 shadow-lg shadow-cyan-500/30">
                                            <Star size={10} fill="currentColor" /> Khuyên Dùng
                                        </div>
                                    )}

                                    {/* Hover glow background */}
                                    <div className={`absolute inset-0 bg-gradient-to-br ${plan.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl pointer-events-none`} />

                                    <div className="relative z-10 flex flex-col h-full">
                                        {/* Icon & Name */}
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center shadow-inner border border-white/5">
                                                <plan.icon className={plan.iconColor} size={22} />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold">{plan.name}</h3>
                                                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{plan.quality}</p>
                                            </div>
                                        </div>
                                        
                                        <div className="mb-6 pb-6 border-b border-white/5">
                                            <p className="text-[11px] text-gray-500 font-medium mb-1">{plan.concurrent} luồng tải • {plan.quota} video/ngày</p>
                                            <div className="flex items-baseline gap-1">
                                                <AnimatePresence mode="wait">
                                                    <motion.span key={`${plan.name}-${billing}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                                                        className="text-3xl font-black tracking-tight text-white">
                                                        {formatVND(price)}
                                                    </motion.span>
                                                </AnimatePresence>
                                                {price > 0 && <span className="text-gray-500 text-sm font-medium">{period}</span>}
                                            </div>
                                        </div>

                                        {/* Features */}
                                        <ul className="space-y-3.5 mb-8 flex-1">
                                            {plan.features.map(f => (
                                                <li key={f} className="flex items-start gap-3 text-sm text-gray-300 font-medium">
                                                    <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center shrink-0 mt-0.5 border border-green-500/20">
                                                        <Check className="text-green-400" size={11} strokeWidth={3} />
                                                    </div>
                                                    <span className="leading-snug">{f}</span>
                                                </li>
                                            ))}
                                            {plan.limitations.map(l => (
                                                <li key={l} className="flex items-start gap-3 text-sm text-gray-500">
                                                    <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center shrink-0 mt-0.5 border border-white/5">
                                                        <X className="text-gray-600" size={11} strokeWidth={3} />
                                                    </div>
                                                    <span className="leading-snug">{l}</span>
                                                </li>
                                            ))}
                                        </ul>

                                        {/* CTA */}
                                        <button className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all active:scale-[0.98] ${plan.btnClass}`}>
                                            {price === 0 ? 'Đang sử dụng' : 'Nâng cấp ngay'}
                                        </button>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* FAQ / Trust badges */}
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                        className="mt-16 text-center text-gray-500 text-xs md:text-sm space-y-2 font-medium"
                    >
                        <p className="flex items-center justify-center gap-2">
                            <ShieldCheck size={16} className="text-green-400" /> Thanh toán an toàn qua MoMo, ZaloPay, VNPAY, Visa/Mastercard
                        </p>
                        <p className="text-gray-600">Hủy hoặc đổi gói bất cứ lúc nào • Hoàn tiền trong 7 ngày đầu không cần lý do</p>
                    </motion.div>
                </>
            )}
        </div>
    );
};

export default Subscriptions;
