import React, { useState, useRef, useEffect } from 'react';
import { FileAudio, Upload, Sparkles, Languages, Clock, Edit3, Save, Download, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { extractSubtitles, getSubtitleStatus } from '@/shared/api/dubbing.api';

interface Subtitle {
    id: number;
    start: string;
    end: string;
    text: string;
}

const SpeechToText: React.FC = () => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [jobId, setJobId] = useState<string | null>(null);
    const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
    const [rawSrt, setRawSrt] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const parseSrt = (srtContent: string) => {
        const lines = srtContent.trim().split('\n');
        const parsed: Subtitle[] = [];
        let i = 0;
        while (i < lines.length) {
            if (lines[i].trim() === '') {
                i++;
                continue;
            }
            const id = parseInt(lines[i]);
            i++;
            if (i >= lines.length) break;
            const timeStr = lines[i];
            const [start, end] = timeStr.split(' --> ').map(s => s.trim().substring(0, 8));
            i++;
            let text = '';
            while (i < lines.length && lines[i].trim() !== '') {
                text += lines[i] + ' ';
                i++;
            }
            parsed.push({ id, start, end, text: text.trim() });
        }
        setSubtitles(parsed);
    };

    useEffect(() => {
        if (jobId && isProcessing) {
            pollingIntervalRef.current = setInterval(async () => {
                try {
                    const res = await getSubtitleStatus(jobId);
                    if (res.status === 'completed' && res.srt_content) {
                        setRawSrt(res.srt_content);
                        parseSrt(res.srt_content);
                        setIsProcessing(false);
                        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
                    } else if (res.status === 'failed') {
                        setIsProcessing(false);
                        alert("Lỗi trích xuất STT: " + res.error);
                        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
                    }
                } catch (error) {
                    console.error("Polling error", error);
                }
            }, 2000);
        }
        return () => {
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        };
    }, [jobId, isProcessing]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            setIsProcessing(true);
            setSubtitles([]);
            try {
                const res = await extractSubtitles(file);
                setJobId(res.jobId);
            } catch (error) {
                console.error("Upload error", error);
                setIsProcessing(false);
                alert("Lỗi kết nối tới STT Service.");
            }
        }
    };
    
    const handleDownloadSrt = () => {
        if (!rawSrt) return;
        const blob = new Blob([rawSrt], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'subtitles.srt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

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

            {!jobId ? (
                <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="glass-card p-16 border-dashed border-2 border-white/5 hover:border-primary/20 transition-all flex flex-col items-center justify-center text-center group cursor-pointer"
                >
                    <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} accept="video/*,audio/*" />
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        {isProcessing ? <Loader2 className="text-primary animate-spin" size={32} /> : <Upload className="text-primary" size={32} />}
                    </div>
                    <h2 className="text-xl font-bold mb-2">{isProcessing ? "Đang upload..." : "Tải video hoặc audio lên"}</h2>
                    <p className="text-gray-500 max-w-sm mb-8">Hỗ trợ MP4, MOV, MP3, WAV. Dung lượng tối đa 500MB.</p>
                </div>
            ) : isProcessing ? (
                <div className="glass-card p-16 flex flex-col items-center justify-center text-center">
                    <Loader2 className="text-primary animate-spin mb-4" size={48} />
                    <h2 className="text-xl font-bold mb-2">AI Đang trích xuất phụ đề...</h2>
                    <p className="text-gray-500">Quá trình này có thể mất vài phút tùy thuộc vào độ dài video.</p>
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
                                    <button onClick={handleDownloadSrt} className="p-2 hover:bg-white/5 rounded-lg text-gray-500 hover:text-white transition-all"><Download size={18} /></button>
                                </div>
                            </div>
                            
                            <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto no-scrollbar">
                                {subtitles.length === 0 ? (
                                    <div className="p-6 text-center text-gray-500">Không tìm thấy phụ đề.</div>
                                ) : subtitles.map((sub) => (
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
                            <button onClick={handleDownloadSrt} className="px-10 py-3 rounded-xl bg-primary hover:bg-primary-dark font-bold shadow-lg shadow-primary/20 transition-all active:scale-[0.98]">Xuất SRT</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SpeechToText;
