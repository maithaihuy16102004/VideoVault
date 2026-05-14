import React, { useState } from 'react';
import { Languages, ArrowRight, Sparkles, FileText, CheckCircle2, History, RotateCcw, Loader2 } from 'lucide-react';

import { rewriteText } from '@/shared/api/ai.api';

const TranslationAI: React.FC = () => {
    const [mode, setMode] = useState('viral');
    const [targetLang, setTargetLang] = useState('vi');
    const [inputText, setInputText] = useState('这个产品的包装真的很精美，推荐给大家！');
    const [outputText, setOutputText] = useState('Đóng gói của con này xịn xò thực sự luôn á, anh em nhất định phải thử nha! 🔥');
    const [isLoading, setIsLoading] = useState(false);

    const handleRewrite = async () => {
        if (!inputText.trim()) return;
        setIsLoading(true);
        try {
            const res = await rewriteText({
                text: inputText,
                tone: mode,
                targetLanguage: targetLang
            });
            setOutputText(res.rewrittenText);
        } catch (error) {
            console.error('Lỗi khi gọi AI:', error);
            setOutputText('Có lỗi xảy ra khi xử lý AI. Vui lòng thử lại.');
        } finally {
            setIsLoading(false);
        }
    };

    const modes = [
        { id: 'viral', label: 'Viral Hook', description: 'Tối ưu tiêu đề thu hút sự chú ý.', icon: Sparkles },
        { id: 'professional', label: 'Professional', description: 'Dịch thuật chuẩn xác, trang trọng.', icon: FileText },
        { id: 'genz', label: 'Gen Z Style', description: 'Sử dụng ngôn ngữ giới trẻ, bắt trend.', icon: Sparkles },
    ];

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-12">
                <div>
                    <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                        <Languages className="text-primary" size={32} />
                        Dịch thuật & Rewrite AI
                    </h1>
                    <p className="text-gray-500">Dịch subtitle và viết lại nội dung theo phong cách viral TikTok.</p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-xs font-bold uppercase tracking-wider">
                        <History size={14} /> Lịch sử
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Editor Section */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="glass-card p-6">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Nội dung gốc (Chinese)</span>
                            <button className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline">Tự động nhận diện</button>
                        </div>
                        <textarea 
                            className="w-full h-48 bg-transparent border-none outline-none resize-none text-lg text-white/80"
                            placeholder="Dán nội dung cần dịch vào đây..."
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                        />
                    </div>

                    <div className="flex justify-center">
                        <button 
                            onClick={handleRewrite}
                            disabled={isLoading}
                            className="w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/40 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? <Loader2 size={24} className="animate-spin" /> : <ArrowRight size={24} />}
                        </button>
                    </div>

                    <div className="glass-card p-6 border-primary/20">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Kết quả AI (Vietnamese)</span>
                            <div className="flex gap-2">
                                <button className="p-1.5 hover:bg-white/10 rounded-lg text-gray-500 hover:text-white transition-all"><RotateCcw size={14} /></button>
                                <button className="p-1.5 hover:bg-white/10 rounded-lg text-gray-500 hover:text-white transition-all"><CheckCircle2 size={14} /></button>
                            </div>
                        </div>
                        <div className="min-h-[100px] text-lg font-medium whitespace-pre-wrap">
                            {outputText}
                        </div>
                    </div>
                </div>

                {/* Sidebar Controls */}
                <div className="space-y-6">
                    <div className="glass-card p-6">
                        <h3 className="font-bold mb-4 flex items-center gap-2">
                            <Sparkles className="text-primary" size={18} />
                            AI Rewrite Mode
                        </h3>
                        <div className="space-y-3">
                            {modes.map((m) => (
                                <button 
                                    key={m.id}
                                    onClick={() => setMode(m.id)}
                                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                                        mode === m.id 
                                            ? 'bg-primary/10 border-primary/30' 
                                            : 'bg-white/5 border-transparent hover:border-white/10'
                                    }`}
                                >
                                    <p className={`font-bold text-sm ${mode === m.id ? 'text-primary' : ''}`}>{m.label}</p>
                                    <p className="text-[10px] text-gray-500 mt-1">{m.description}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="glass-card p-6">
                        <h3 className="font-bold mb-4">Target Language</h3>
                        <select 
                            value={targetLang}
                            onChange={(e) => setTargetLang(e.target.value)}
                            className="w-full bg-[#0c0c0c] border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/50 transition-all text-white/80"
                        >
                            <option value="vi">Tiếng Việt</option>
                            <option value="en">English</option>
                            <option value="th">Thai</option>
                            <option value="id">Indonesian</option>
                        </select>
                    </div>

                    <button className="w-full bg-primary hover:bg-primary-dark py-4 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-primary/20 transition-all active:scale-[0.98]">
                        <Workflow size={20} />
                        Xác nhận & Cập nhật Sub
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TranslationAI;
