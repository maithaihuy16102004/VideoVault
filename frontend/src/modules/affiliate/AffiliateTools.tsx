import React, { useState } from 'react';
import { DollarSign, Link as LinkIcon, ShoppingBag, Copy, TrendingUp, Sparkles, Send } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';

export const AffiliateTools: React.FC = () => {
    const analyzedChannel = useStore(state => state.analyzedChannel);
    const [link, setLink] = useState('');
    const [isGenerated, setIsGenerated] = useState(false);

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-12">
                <div>
                    <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                        <DollarSign className="text-primary" size={32} />
                        Affiliate & Commerce Hub {analyzedChannel && <span className="text-sm font-medium text-primary px-2 py-1 bg-primary/10 rounded-lg ml-2">{analyzedChannel.niche}</span>}
                    </h1>
                    <p className="text-gray-500">Tối ưu hóa caption bán hàng, rút gọn link và tích hợp trực tiếp vào luồng đăng video TikTok {analyzedChannel ? `cho kênh ${analyzedChannel.displayName}` : ''}.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Link Generator & AI Caption */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="glass-card p-8 border border-white/5">
                        <h3 className="font-bold mb-4 flex items-center gap-2">
                            <LinkIcon className="text-primary" size={20} />
                            Rút Gọn Link & Tự Động Gắn Tag
                        </h3>
                        <div className="flex gap-4 mb-6">
                            <input 
                                type="text" 
                                placeholder="Dán link sản phẩm (Shopee, TikTok Shop...)"
                                value={link}
                                onChange={(e) => setLink(e.target.value)}
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary/50 transition-colors"
                            />
                            <button 
                                onClick={() => setIsGenerated(true)}
                                className="bg-primary hover:bg-primary-dark px-8 py-3 rounded-xl font-bold transition-all active:scale-95"
                            >
                                Tạo Link
                            </button>
                        </div>

                        {isGenerated && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest mb-1">Smart Link (Đã tối ưu tracking)</p>
                                    <p className="font-mono text-sm text-green-100">https://shope.ee/9zT4abcXYZ</p>
                                </div>
                                <button className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-all text-gray-400 hover:text-white">
                                    <Copy size={18} />
                                </button>
                            </motion.div>
                        )}
                    </div>

                    <div className="glass-card p-8 border border-primary/20 bg-primary/5">
                        <h3 className="font-bold mb-4 flex items-center gap-2">
                            <Sparkles className="text-primary" size={20} />
                            AI Tối Ưu Caption & Hook Đăng Video
                        </h3>
                        <p className="text-sm text-gray-400 mb-6">AI đã phân tích ngữ cảnh sản phẩm và đề xuất các mẫu Caption có tỷ lệ chuyển đổi (CR) cao nhất.</p>
                        
                        <div className="space-y-4">
                            {(analyzedChannel?.affiliateHooks || [
                                { tone: "Nỗi đau", text: "Mua áo này xong hối hận thực sự... Hối hận vì không mua sớm hơn! Form quá đẹp, tôn dáng đỉnh cao. 🛍️ Múc ngay link dưới nha mấy bà ơi!" },
                                { tone: "Review chân thực", text: "Unbox thử set đồ hot TikTok và cái kết bất ngờ. Chất vải siêu mát, mạc đi cafe cuối tuần là chuẩn bài. 👉 Link săn sale mình để đây nhé: [Link]" }
                            ]).map((cta: any, i: number) => (
                                <div key={i} className="p-5 rounded-xl bg-black/40 border border-white/5 hover:border-primary/30 transition-all group">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[10px] bg-primary/20 text-primary px-2 py-1 rounded font-bold uppercase">{cta.tone}</span>
                                        {i === 0 && <span className="text-[10px] text-orange-400 font-bold flex items-center gap-1">🔥 Hot</span>}
                                    </div>
                                    <p className="text-sm font-medium text-gray-200 mt-3 leading-relaxed">"{cta.text}"</p>
                                    <div className="flex justify-end mt-4 gap-3">
                                        <button className="text-[11px] font-bold text-gray-400 hover:text-white flex items-center gap-1 transition-colors"><Copy size={12} /> Copy</button>
                                        <button className="text-[11px] font-bold text-primary flex items-center gap-1 transition-colors"><Send size={12} /> Áp dụng đăng Video</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="space-y-6">
                    <div className="glass-card p-6 border border-white/5">
                        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">Dự phóng Doanh thu</h3>
                        <div className="mb-6">
                            <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">
                                14,250K
                            </h2>
                            <p className="text-green-400 text-xs font-bold flex items-center gap-1 mt-2">
                                <TrendingUp size={12} /> Khả năng tăng 24% nếu dùng AI Hook
                            </p>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-400">Dự kiến Click</span>
                                <span className="font-bold">12,405</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-400">Tỉ lệ chuyển đổi (AI)</span>
                                <span className="font-bold text-green-400">3.85%</span>
                            </div>
                        </div>
                    </div>

                    <button className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-purple-600 hover:from-primary-dark hover:to-purple-700 text-white font-bold transition-all shadow-lg shadow-primary/20 flex justify-center items-center gap-2">
                        <ShoppingBag size={18} /> Đăng Video Kèm Giỏ Hàng
                    </button>
                </div>
            </div>
        </div>
    );
};
