import React, { useState } from 'react';
import { Mic2, Play, Volume2, Download, Wand2} from 'lucide-react';


const VoiceAI: React.FC = () => {
    const [selectedVoice, setSelectedVoice] = useState('v1');

    const voices = [
        { id: 'v1', name: 'Thanh Tùng', style: 'TikTok Viral', gender: 'Nam', tags: ['Năng động', 'Trẻ trung'] },
        { id: 'v2', name: 'Minh Thư', style: 'Emotional', gender: 'Nữ', tags: ['Nhẹ nhàng', 'Sâu lắng'] },
        { id: 'v3', name: 'Hoàng Nam', style: 'Professional', gender: 'Nam', tags: ['Tin tức', 'Trang trọng'] },
        { id: 'v4', name: 'Linh Chi', style: 'Sales', gender: 'Nữ', tags: ['Cuốn hút', 'Mạnh mẽ'] },
    ];

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-12">
                <div>
                    <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                        <Mic2 className="text-primary" size={32} />
                        Lồng tiếng AI (TTS)
                    </h1>
                    <p className="text-gray-500">Chuyển văn bản thành giọng nói chất lượng cao với công nghệ Voice Clone.</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-xs font-bold uppercase tracking-wider">
                    <Wand2 size={14} className="text-primary" /> Voice Clone (Beta)
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Voice Selection */}
                <div className="space-y-4 overflow-y-auto max-h-[600px] no-scrollbar">
                    <h3 className="text-[10px] font-bold text-gray-600 uppercase tracking-widest px-1">Chọn giọng đọc</h3>
                    {voices.map((v) => (
                        <div 
                            key={v.id}
                            onClick={() => setSelectedVoice(v.id)}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer group ${
                                selectedVoice === v.id 
                                    ? 'bg-primary/10 border-primary/30' 
                                    : 'bg-[#0c0c0c] border-white/5 hover:border-white/10'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                                        selectedVoice === v.id ? 'bg-primary text-white' : 'bg-white/5 text-gray-400'
                                    }`}>
                                        {v.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm">{v.name}</h4>
                                        <p className="text-[10px] text-gray-500">{v.style}</p>
                                    </div>
                                </div>
                                <button className="p-2 rounded-full bg-white/5 group-hover:bg-primary/20 group-hover:text-primary transition-all">
                                    <Play size={14} fill="currentColor" />
                                </button>
                            </div>
                            <div className="flex gap-2">
                                {v.tags.map(tag => (
                                    <span key={tag} className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 text-gray-500">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Editor Section */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="glass-card p-8 flex flex-col h-full">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <Volume2 className="text-primary" size={18} />
                                <span className="font-bold text-sm">Văn bản cần lồng tiếng</span>
                            </div>
                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">245 / 5000 ký tự</span>
                        </div>
                        
                        <textarea 
                            className="flex-1 w-full min-h-[300px] bg-transparent border-none outline-none resize-none text-xl leading-relaxed text-white/90"
                            placeholder="Nhập nội dung bạn muốn lồng tiếng..."
                            defaultValue="Chào mừng các bạn đã quay trở lại với VideoVault. Hôm nay mình sẽ giới thiệu cho các bạn một công cụ AI cực kỳ mạnh mẽ giúp Việt hóa video TikTok chỉ trong vài giây."
                        />

                        <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-6">
                                <div className="space-y-1">
                                    <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Tốc độ</p>
                                    <input type="range" className="w-24 accent-primary" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Âm điệu</p>
                                    <input type="range" className="w-24 accent-primary" />
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button className="p-4 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all">
                                    <Play size={20} fill="currentColor" />
                                </button>
                                <button className="bg-primary hover:bg-primary-dark px-8 py-3 rounded-xl font-bold flex items-center gap-3 shadow-lg shadow-primary/20 transition-all active:scale-[0.98]">
                                    <Download size={18} /> Xuất file Audio
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VoiceAI;
