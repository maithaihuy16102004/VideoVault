import React, { useState } from 'react';

import { Check, Zap, Rocket, Crown, Building2, Star, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const formatVND = (amount: number) => {
    if (amount === 0) return 'Miễn phí';
    return amount.toLocaleString('vi-VN') + 'đ';
};

const Subscriptions: React.FC = () => {
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
            limitations: ['Có watermark', 'Không hỗ trợ batch'],
            color: 'from-slate-500/20 to-transparent',
            borderColor: 'border-white/5',
            btnClass: 'bg-white/5 hover:bg-white/10 text-white',
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
            limitations: [],
            color: 'from-blue-500/20 to-transparent',
            borderColor: 'border-blue-500/20',
            btnClass: 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20',
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
            features: ['100 lượt tải / ngày', 'Chất lượng 4K Ultra HD', 'Không watermark', 'Tốc độ cao nhất', 'Tải hàng loạt', 'Hỗ trợ ưu tiên'],
            limitations: [],
            color: 'from-purple-500/20 to-transparent',
            borderColor: 'border-purple-500/20',
            btnClass: 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-500/20',
        },
        {
            name: 'Business',
            icon: Building2,
            monthly: 499000,
            yearly: 4990000,
            quota: 500,
            quality: 'Original',
            concurrent: 10,
            features: ['500 lượt tải / ngày', 'Chất lượng gốc (Original)', 'Không watermark', 'Tốc độ không giới hạn', 'Tải hàng loạt', 'Hỗ trợ ưu tiên 24/7', 'API Access', 'Quản lý Team'],
            limitations: [],
            color: 'from-amber-500/20 to-transparent',
            borderColor: 'border-amber-500/20',
            btnClass: 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-lg shadow-amber-500/20',
        },
    ];

    const yearlySaving = Math.round((1 - 490000 / (49000 * 12)) * 100);

    return (
        <div className="p-6 md:p-12 max-w-7xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12">
                <motion.h1
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-4xl md:text-5xl font-extrabold mb-4 bg-gradient-to-r from-white via-blue-200 to-purple-300 bg-clip-text text-transparent"
                >
                    Chọn Gói Phù Hợp
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-gray-500 max-w-2xl mx-auto mb-8"
                >
                    Nâng cấp để tải video chất lượng gốc, tốc độ cao, không watermark.
                    Thanh toán linh hoạt theo tháng hoặc năm.
                </motion.p>

                {/* Billing Toggle */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="inline-flex items-center gap-3 bg-white/5 rounded-2xl p-1.5"
                >
                    <button
                        onClick={() => setBilling('monthly')}
                        className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                            billing === 'monthly'
                                ? 'bg-primary text-white shadow-lg'
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        Theo tháng
                    </button>
                    <button
                        onClick={() => setBilling('yearly')}
                        className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                            billing === 'yearly'
                                ? 'bg-primary text-white shadow-lg'
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        Theo năm
                        <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-[10px] font-bold rounded-full">
                            -{yearlySaving}%
                        </span>
                    </button>
                </motion.div>
            </div>

            {/* Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {plans.map((plan, i) => {
                    const price = billing === 'monthly' ? plan.monthly : plan.yearly;
                    const period = billing === 'monthly' ? '/tháng' : '/năm';

                    return (
                        <motion.div
                            key={plan.name}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className={`glass-card p-7 relative flex flex-col group border ${plan.borderColor} ${
                                plan.popular ? 'ring-2 ring-blue-500/30 scale-[1.02]' : ''
                            }`}
                        >
                            {plan.popular && (
                                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-[10px] font-bold rounded-full uppercase tracking-widest flex items-center gap-1.5 shadow-lg shadow-blue-500/30">
                                    <Star size={10} fill="currentColor" /> Phổ biến nhất
                                </div>
                            )}

                            <div className={`absolute inset-0 bg-gradient-to-br ${plan.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl`} />

                            <div className="relative z-10 flex flex-col h-full">
                                {/* Icon & Name */}
                                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-5">
                                    <plan.icon className="text-primary" size={22} />
                                </div>
                                <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                                <p className="text-xs text-gray-500 mb-5">{plan.quality} • {plan.concurrent} luồng tải • {plan.quota} video/ngày</p>

                                {/* Price */}
                                <div className="flex items-baseline gap-1 mb-6">
                                    <AnimatePresence mode="wait">
                                        <motion.span
                                            key={`${plan.name}-${billing}`}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="text-3xl font-extrabold"
                                        >
                                            {formatVND(price)}
                                        </motion.span>
                                    </AnimatePresence>
                                    {price > 0 && <span className="text-gray-500 text-sm">{period}</span>}
                                </div>

                                {/* Features */}
                                <ul className="space-y-3 mb-6 flex-1">
                                    {plan.features.map(f => (
                                        <li key={f} className="flex items-start gap-2.5 text-sm text-gray-300">
                                            <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center shrink-0 mt-0.5">
                                                <Check className="text-green-400" size={11} />
                                            </div>
                                            {f}
                                        </li>
                                    ))}
                                    {plan.limitations.map(l => (
                                        <li key={l} className="flex items-start gap-2.5 text-sm text-gray-600">
                                            <div className="w-5 h-5 rounded-full bg-red-500/10 flex items-center justify-center shrink-0 mt-0.5">
                                                <X className="text-red-400" size={11} />
                                            </div>
                                            {l}
                                        </li>
                                    ))}
                                </ul>

                                {/* CTA */}
                                <button className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all active:scale-95 ${plan.btnClass}`}>
                                    {price === 0 ? 'Dùng miễn phí' : 'Nâng cấp ngay'}
                                </button>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* FAQ / Trust badges */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-16 text-center text-gray-600 text-sm space-y-2"
            >
                <p>💳 Thanh toán an toàn qua MoMo, ZaloPay, VNPAY, Visa/Mastercard</p>
                <p>🔄 Hủy hoặc đổi gói bất cứ lúc nào • ✅ Hoàn tiền trong 7 ngày đầu</p>
            </motion.div>
        </div>
    );
};

export default Subscriptions;
