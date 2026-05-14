import React from 'react';
import { DollarSign, Link as LinkIcon, ShoppingBag, Copy, ArrowRight, TrendingUp } from 'lucide-react';

export const AffiliateTools: React.FC = () => {
    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-12">
                <div>
                    <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                        <DollarSign className="text-primary" size={32} />
                        Affiliate & Commerce
                    </h1>
                    <p className="text-gray-500">Quản lý link tiếp thị liên kết, gắn giỏ hàng TikTok và tối ưu chuyển đổi.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Link Generator */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="glass-card p-8">
                        <h3 className="font-bold mb-4 flex items-center gap-2">
                            <LinkIcon className="text-primary" size={20} />
                            Rút Gọn & Gắn Mã Affiliate
                        </h3>
                        <div className="flex gap-4 mb-6">
                            <input 
                                type="text" 
                                placeholder="Dán link sản phẩm (Shopee, TikTok Shop, Lazada...)"
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary/50 transition-colors"
                            />
                            <button className="bg-primary hover:bg-primary-dark px-8 py-3 rounded-xl font-bold transition-all active:scale-95">
                                Tạo Link
                            </button>
                        </div>

                        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-between">
                            <div>
                                <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest mb-1">Link Rút Gọn (Shopee)</p>
                                <p className="font-mono text-sm">https://shope.ee/9zT4abcXYZ</p>
                            </div>
                            <button className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-all text-gray-400 hover:text-white">
                                <Copy size={18} />
                            </button>
                        </div>
                    </div>

                    <div className="glass-card p-8">
                        <h3 className="font-bold mb-4 flex items-center gap-2">
                            <ShoppingBag className="text-primary" size={20} />
                            CTA Mẫu (Call to Action)
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                "🔥 Mua ngay kẻo lỡ deal hời góc trái màn hình!",
                                "👉 Link sản phẩm mình để ở bio cho anh em nhé.",
                                "Giỏ hàng TikTok Shop đang sale 50% hôm nay!",
                                "Ai quan tâm thì múc luôn đi, hàng hot mau hết."
                            ].map((cta, i) => (
                                <div key={i} className="p-4 rounded-xl bg-white/5 border border-transparent hover:border-primary/20 cursor-pointer transition-all group">
                                    <p className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">"{cta}"</p>
                                    <div className="flex justify-end mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-[10px] font-bold text-primary flex items-center gap-1">Dùng mẫu <ArrowRight size={12} /></span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="space-y-6">
                    <div className="glass-card p-6">
                        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">Tổng quan doanh thu</h3>
                        <div className="mb-6">
                            <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">
                                14,250K
                            </h2>
                            <p className="text-green-400 text-xs font-bold flex items-center gap-1 mt-2">
                                <TrendingUp size={12} /> +24% so với tháng trước
                            </p>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-400">Click Link</span>
                                <span className="font-bold">12,405</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-400">Đơn hàng</span>
                                <span className="font-bold">342</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-400">Tỉ lệ chuyển đổi</span>
                                <span className="font-bold text-primary">2.75%</span>
                            </div>
                        </div>
                    </div>

                    <button className="w-full py-4 rounded-2xl bg-white/5 hover:bg-white/10 font-bold transition-all border border-white/5 text-sm flex justify-center items-center gap-2">
                        Kết nối TikTok Shop
                    </button>
                </div>
            </div>
        </div>
    );
};
