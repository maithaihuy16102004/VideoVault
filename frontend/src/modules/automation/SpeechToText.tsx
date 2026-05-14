import React, { useState } from 'react';
import { FileAudio, Upload, Sparkles, Languages, Clock, Edit3, Save, Download } from 'lucide-react';
import { motion } from 'framer-motion';

const SpeechToText: React.FC = () => {
    const [isProcessing, setIsProcessing] = useState(false);

    const mockSubtitles = [
        { id: 1, start: '00:01', end: '00:03', text: 'Chào mọi người, hôm nay mình sẽ review' },
        { id: 2, start: '00:03', end: '00:06', text: 'một sản phẩm đang cực kỳ hot trên Douyin.' },
        { id: 3, start: '00:06', end: '00:08', text: 'Đó chính là máy hút bụi cầm tay Mini.' },
    ];

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-12">
                <div>
                    <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                        <FileAudio className="text-primary" size={32} />
                        Speech to Text AI
                    </h1>
                    <p className="text-gray-500">Trích xuất phụ đề tự động từ video hoặc file âm thanh với độ chính xác cao.</p>
                </div>
            </div>

            {!isProcessing ? (
                <div className="glass-card p-16 border-dashed border-2 border-white/5 hover:border-primary/20 transition-all flex flex-col items-center justify-center text-center group cursor-pointer">
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <Upload className="text-primary" size={32} />
                    </div>
                    <h2 className="text-xl font-bold mb-2">Tải video hoặc audio lên</h2>
                    <p className="text-gray-500 max-w-sm mb-8">Hỗ trợ MP4, MOV, MP3, WAV. Dung lượng tối đa 500MB.</p>
                    <button 
                        onClick={() => setIsProcessing(true)}
                        className="bg-primary hover:bg-primary-dark px-12 py-4 rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-primary/20"
                    >
                        Bắt đầu xử lý AI
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Video/Audio Preview */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="aspect-video bg-black rounded-2xl overflow-hidden relative flex items-center justify-center border border-white/5">
                            <Sparkles className="text-primary/20" size={64} />
                            <div className="absolute bottom-4 left-4 right-4 h-1 bg-white/10 rounded-full overflow-hidden">
                                <motion.div 
                                    animate={{ width: ['0%', '100%'] }}
                                    transition={{ duration: 5, repeat: Infinity }}
                                    className="h-full bg-primary"
                                />
                            </div>
                        </div>
                        
                        <div className="glass-card p-6 space-y-4">
                            <h3 className="font-bold text-sm uppercase tracking-wider text-gray-500">Thông tin xử lý</h3>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-400 flex items-center gap-2"><Languages size={14} /> Ngôn ngữ</span>
                                <span className="text-xs font-bold">Tự động (Tiếng Việt)</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-400 flex items-center gap-2"><Clock size={14} /> Thời lượng</span>
                                <span className="text-xs font-bold">00:45</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-400 flex items-center gap-2"><Sparkles size={14} /> AI Model</span>
                                <span className="text-xs font-bold">Faster Whisper (Large)</span>
                            </div>
                        </div>
                    </div>

                    {/* Subtitle Editor */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="glass-card p-0 overflow-hidden border-primary/20">
                            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                                <h3 className="font-bold flex items-center gap-2">
                                    <Edit3 size={18} className="text-primary" />
                                    Subtitle Editor
                                </h3>
                                <div className="flex gap-2">
                                    <button className="p-2 hover:bg-white/5 rounded-lg text-gray-500 hover:text-white transition-all"><Save size={18} /></button>
                                    <button className="p-2 hover:bg-white/5 rounded-lg text-gray-500 hover:text-white transition-all"><Download size={18} /></button>
                                </div>
                            </div>
                            
                            <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto no-scrollbar">
                                {mockSubtitles.map((sub) => (
                                    <div key={sub.id} className="p-6 flex gap-6 hover:bg-white/[0.02] transition-all group">
                                        <div className="text-[10px] font-bold text-gray-600 space-y-1 pt-1">
                                            <p className="hover:text-primary cursor-pointer">{sub.start}</p>
                                            <p className="hover:text-primary cursor-pointer">{sub.end}</p>
                                        </div>
                                        <div className="flex-1">
                                            <input 
                                                type="text" 
                                                defaultValue={sub.text}
                                                className="w-full bg-transparent border-none outline-none text-white/80 focus:text-white transition-colors"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end gap-4">
                            <button className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 font-bold transition-all">Lưu nháp</button>
                            <button className="px-10 py-3 rounded-xl bg-primary hover:bg-primary-dark font-bold shadow-lg shadow-primary/20 transition-all active:scale-[0.98]">Xuất SRT</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SpeechToText;
