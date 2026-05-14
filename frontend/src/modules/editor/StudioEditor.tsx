import React, { useState } from 'react';
import { 
    Scissors, Waves, VolumeX, Type, Layers, 
    Play, Pause, SkipBack, SkipForward, Maximize2, Download
} from 'lucide-react';


export const StudioEditor: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'video' | 'audio'>('audio');
    const [isPlaying, setIsPlaying] = useState(false);

    return (
        <div className="p-8 max-w-7xl mx-auto h-[calc(100vh-2rem)] flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                        <Scissors className="text-primary" size={32} />
                        Studio Editor
                    </h1>
                    <p className="text-gray-500">Chỉnh sửa video, burn sub và xử lý âm thanh AI nâng cao.</p>
                </div>
                <div className="flex gap-4">
                    <button className="bg-white/5 hover:bg-white/10 px-6 py-2.5 rounded-xl font-bold transition-all border border-white/5 text-sm">
                        Lưu dự án
                    </button>
                    <button className="bg-primary hover:bg-primary-dark px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95 text-sm shadow-lg shadow-primary/20">
                        <Download size={16} /> Xuất Render
                    </button>
                </div>
            </div>

            <div className="flex gap-6 flex-1 min-h-0">
                {/* Tools Sidebar */}
                <div className="w-64 flex flex-col gap-4">
                    <div className="flex p-1 bg-white/5 rounded-xl">
                        <button 
                            onClick={() => setActiveTab('audio')}
                            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${activeTab === 'audio' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-500 hover:text-white'}`}
                        >
                            Audio AI
                        </button>
                        <button 
                            onClick={() => setActiveTab('video')}
                            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${activeTab === 'video' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-500 hover:text-white'}`}
                        >
                            Video
                        </button>
                    </div>

                    <div className="glass-card flex-1 p-4 overflow-y-auto no-scrollbar space-y-6">
                        {activeTab === 'audio' ? (
                            <>
                                <div>
                                    <h3 className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <VolumeX size={14} /> Xử lý nhiễu
                                    </h3>
                                    <div className="space-y-2">
                                        <button className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-primary/20 hover:text-primary transition-all border border-transparent hover:border-primary/30 text-sm font-semibold">
                                            Loại bỏ tiếng gió
                                        </button>
                                        <button className="w-full text-left p-3 rounded-lg bg-primary/10 text-primary border border-primary/30 transition-all text-sm font-semibold">
                                            Khử ồn AI (DeepFilter)
                                        </button>
                                    </div>
                                </div>
                                
                                <div>
                                    <h3 className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <Waves size={14} /> Vocal Isolation
                                    </h3>
                                    <div className="space-y-2">
                                        <button className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-primary/20 hover:text-primary transition-all border border-transparent hover:border-primary/30 text-sm font-semibold">
                                            Tách giọng hát (Vocal Only)
                                        </button>
                                        <button className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-primary/20 hover:text-primary transition-all border border-transparent hover:border-primary/30 text-sm font-semibold">
                                            Xóa nhạc nền (BGM Remove)
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div>
                                    <h3 className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <Type size={14} /> Subtitles
                                    </h3>
                                    <div className="space-y-2">
                                        <button className="w-full text-left p-3 rounded-lg bg-primary/10 text-primary border border-primary/30 transition-all text-sm font-semibold">
                                            Burn Subtitles (Hardsub)
                                        </button>
                                        <div className="p-3 bg-[#0c0c0c] rounded-lg border border-white/5">
                                            <p className="text-xs text-gray-400 mb-2">Style</p>
                                            <select className="w-full bg-white/5 rounded px-2 py-1 text-xs outline-none focus:border-primary">
                                                <option>TikTok Viral (Yellow)</option>
                                                <option>Cinematic (White)</option>
                                                <option>Karaoke Style</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <Layers size={14} /> Khung hình
                                    </h3>
                                    <div className="space-y-2">
                                        <button className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-primary/20 hover:text-primary transition-all border border-transparent hover:border-primary/30 text-sm font-semibold">
                                            Crop 9:16 (Auto Tracking)
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Preview & Timeline */}
                <div className="flex-1 flex flex-col gap-4 min-w-0">
                    <div className="glass-card flex-1 p-2 flex flex-col relative overflow-hidden group">
                        <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2 z-10 text-xs font-bold">
                            1080x1920 <span className="text-primary">60fps</span>
                        </div>
                        
                        <div className="flex-1 bg-black rounded-xl overflow-hidden relative flex items-center justify-center">
                            {/* Mock Video Preview */}
                            <img src="https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=1000&auto=format&fit=crop" className="h-full object-cover opacity-80" />
                            
                            {/* Mock Hardsub */}
                            <div className="absolute bottom-20 w-full text-center">
                                <span className="bg-black/60 px-4 py-2 rounded-lg text-yellow-400 font-black text-2xl tracking-wide uppercase stroke-black stroke-2 shadow-2xl">
                                    MÁY HÚT BỤI CẦM TAY SIÊU MẠNH! 🔥
                                </span>
                            </div>
                        </div>

                        <div className="h-16 flex items-center justify-between px-6">
                            <span className="text-xs font-mono">00:04 / 00:15</span>
                            <div className="flex items-center gap-6">
                                <button className="text-gray-400 hover:text-white transition-colors"><SkipBack size={20} fill="currentColor" /></button>
                                <button 
                                    onClick={() => setIsPlaying(!isPlaying)}
                                    className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                                >
                                    {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
                                </button>
                                <button className="text-gray-400 hover:text-white transition-colors"><SkipForward size={20} fill="currentColor" /></button>
                            </div>
                            <button className="text-gray-400 hover:text-white transition-colors"><Maximize2 size={18} /></button>
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="h-48 glass-card p-4 flex flex-col">
                        <div className="flex items-center justify-between mb-2 px-2">
                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Timeline</span>
                            <div className="flex gap-2">
                                <span className="text-[10px] px-2 py-1 bg-blue-500/10 text-blue-400 rounded">V1</span>
                                <span className="text-[10px] px-2 py-1 bg-green-500/10 text-green-400 rounded">A1</span>
                            </div>
                        </div>
                        <div className="flex-1 bg-[#0c0c0c] rounded-xl border border-white/5 relative overflow-hidden">
                            {/* Playhead */}
                            <div className="absolute top-0 bottom-0 w-px bg-primary left-1/3 z-20">
                                <div className="w-3 h-3 bg-primary rounded-full -ml-1 -mt-1 shadow-[0_0_10px_rgba(var(--primary),0.8)]" />
                            </div>
                            
                            {/* Video Track */}
                            <div className="absolute top-4 left-4 right-4 h-12 bg-blue-500/20 rounded-lg border border-blue-500/30 overflow-hidden flex">
                                {Array.from({length: 10}).map((_, i) => (
                                    <div key={i} className="flex-1 border-r border-blue-500/10 h-full flex items-center justify-center">
                                        <ImageIcon size={14} className="text-blue-500/30" />
                                    </div>
                                ))}
                            </div>

                            {/* Audio Track */}
                            <div className="absolute top-20 left-4 right-4 h-12 bg-green-500/20 rounded-lg border border-green-500/30 overflow-hidden flex items-center px-2">
                                <svg className="w-full h-8 text-green-500/50" preserveAspectRatio="none" viewBox="0 0 100 100">
                                    <path d="M0,50 Q10,20 20,50 T40,50 T60,50 T80,50 T100,50" fill="none" stroke="currentColor" strokeWidth="2" />
                                    <path d="M0,50 Q5,80 10,50 T20,50 T30,50" fill="none" stroke="currentColor" strokeWidth="2" />
                                </svg>
                            </div>

                            {/* Subtitle Track */}
                            <div className="absolute top-36 left-4 w-1/3 h-6 bg-yellow-500/20 rounded border border-yellow-500/30 flex items-center justify-center">
                                <span className="text-[8px] text-yellow-500 font-bold truncate px-2">MÁY HÚT BỤI CẦM TAY SIÊU MẠNH! 🔥</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
