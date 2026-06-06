import React, { useState, useRef, useEffect } from 'react';
import { FileAudio, Upload, Sparkles, Languages, Clock, Edit3, Save, Download, Loader2, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from '@tanstack/react-router';
import { extractSubtitles, getSubtitleStatus, type SubtitleDiagnostics } from '@/shared/api/dubbing.api';

interface Subtitle {
    id: number;
    start: string;
    end: string;
    text: string;
}

interface SubtitleJobMeta {
    jobId?: string;
    originalFilename?: string;
    fileSizeBytes?: number;
    sha256?: string;
    createdAt?: string;
    inputPath?: string;
    audioPath?: string;
    videoDuration?: number;
    audioDuration?: number;
}

const SpeechToText: React.FC = () => {
    const navigate = useNavigate();
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [stage, setStage] = useState('');
    const [jobId, setJobId] = useState<string | null>(null);
    const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
    const [rawSrt, setRawSrt] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [mediaDuration, setMediaDuration] = useState<number | null>(null);
    const [diagnostics, setDiagnostics] = useState<SubtitleDiagnostics | null>(null);
    const [jobMeta, setJobMeta] = useState<SubtitleJobMeta | null>(null);
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
                    const isCompleted = res.status === 'done' || res.status === 'completed';
                    const srt = res.srtContent ?? res.srt_content ?? '';
                    if (typeof res.progress === 'number') {
                        setProgress(res.progress);
                    }
                    if (typeof res.stage === 'string' && res.stage) {
                        setStage(res.stage);
                    }
                    if (typeof res.duration === 'number') {
                        setMediaDuration(res.duration);
                    }
                    if (res.diagnostics) {
                        setDiagnostics(res.diagnostics);
                    }
                    setJobMeta({
                        jobId,
                        originalFilename: res.originalFilename,
                        fileSizeBytes: res.fileSizeBytes,
                        sha256: res.sha256,
                        createdAt: res.createdAt,
                        inputPath: res.inputPath,
                        audioPath: res.audioPath,
                        videoDuration: res.videoDuration,
                        audioDuration: res.audioDuration,
                    });
                    if (isCompleted) {
                        setProgress(100);
                        setStage('Hoàn tất!');
                        setRawSrt(srt);
                        localStorage.setItem('automation:srt', srt);
                        localStorage.setItem('automation:sourceText', srt);
                        parseSrt(srt);
                        setIsProcessing(false);
                        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
                    } else if (res.status === 'failed' || res.status === 'error') {
                        setIsProcessing(false);
                        setProgress(0);
                        setErrorMessage("Lỗi trích xuất STT: " + (res.error || 'Không rõ nguyên nhân'));
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
            setErrorMessage("");
            setProgress(0);
            setStage('Đang tải file lên...');
            setMediaDuration(null);
            setDiagnostics(null);
            setJobMeta(null);
            try {
                const res = await extractSubtitles(file, 'auto');
                setJobId(res.jobId);
            } catch (error) {
                console.error("Upload error", error);
                setIsProcessing(false);
                setErrorMessage("Lỗi kết nối tới STT Service.");
            }
        }
    };

    const formatDuration = (seconds: number | null) => {
        if (!seconds || seconds <= 0) return '--:--';
        const totalSeconds = Math.round(seconds);
        const minutes = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const formatSeconds = (seconds?: number | null) => {
        if (typeof seconds !== 'number') return '--';
        return `${seconds.toFixed(1)}s`;
    };

    const formatFileSize = (bytes?: number) => {
        if (typeof bytes !== 'number') return '--';
        return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    };

    const shortHash = (hash?: string) => hash ? `${hash.slice(0, 12)}...${hash.slice(-8)}` : '--';
    
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

            {errorMessage && (
                <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {errorMessage}
                </div>
            )}

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
                    <Loader2 className="text-primary animate-spin mb-6" size={48} />
                    <h2 className="text-xl font-bold mb-2">AI Đang trích xuất phụ đề...</h2>
                    <p className="text-gray-500 mb-8">Quá trình này có thể mất vài phút tùy thuộc vào độ dài video.</p>

                    {/* Progress Bar */}
                    <div className="w-full max-w-md">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-primary uppercase tracking-wider">{stage || 'Đang khởi tạo...'}</span>
                            <span className="text-sm font-bold text-white">{progress}%</span>
                        </div>
                        <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/10">
                            <motion.div
                                className="h-full rounded-full relative"
                                style={{ background: 'linear-gradient(90deg, #7c3aed, #a78bfa, #7c3aed)' }}
                                initial={{ width: '0%' }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.6, ease: 'easeOut' }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                            </motion.div>
                        </div>
                        <div className="mt-4 flex items-center justify-center gap-6 text-[10px] text-gray-500">
                            <span className={progress >= 5 ? 'text-primary font-bold' : ''}>Tải lên</span>
                            <span className="text-gray-700">→</span>
                            <span className={progress >= 10 ? 'text-primary font-bold' : ''}>Trích audio</span>
                            <span className="text-gray-700">→</span>
                            <span className={progress >= 30 ? 'text-primary font-bold' : ''}>AI nhận diện</span>
                            <span className="text-gray-700">→</span>
                            <span className={progress >= 95 ? 'text-primary font-bold' : ''}>Hoàn tất</span>
                        </div>
                    </div>
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
                                <span className="text-xs font-bold">Tự động nhận diện</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-400 flex items-center gap-2"><Clock size={14} /> Thời lượng</span>
                                <span className="text-xs font-bold">{formatDuration(mediaDuration)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-400 flex items-center gap-2"><Sparkles size={14} /> AI Model</span>
                                <span className="text-xs font-bold">Faster Whisper (High Accuracy)</span>
                            </div>
                            {diagnostics && (
                                <div className="border-t border-white/5 pt-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-400">Video duration</span>
                                        <span className="text-xs font-bold">{formatSeconds(diagnostics.video_duration)}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-400">Audio duration</span>
                                        <span className="text-xs font-bold">{formatSeconds(diagnostics.audio_duration)}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-400">Language</span>
                                        <span className="text-xs font-bold">{diagnostics.detected_language || '--'}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-400">Speech</span>
                                        <span className="text-xs font-bold">{formatSeconds(diagnostics.speech_detected_seconds)}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-400">Segments</span>
                                        <span className="text-xs font-bold">{diagnostics.stt_segments ?? 0}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-400">Confidence</span>
                                        <span className="text-xs font-bold">{diagnostics.confidence || 'UNKNOWN'}</span>
                                    </div>
                                    {diagnostics.confidence === 'LOW' && (
                                        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-100">
                                            Audio has little or unclear speech. STT may be incomplete or inaccurate.
                                        </div>
                                    )}
                                </div>
                            )}
                            {jobMeta && (
                                <div className="border-t border-white/5 pt-4 space-y-3">
                                    <div className="text-xs font-bold uppercase tracking-wider text-gray-500">Job Debug</div>
                                    <div className="flex items-center justify-between gap-4">
                                        <span className="text-xs text-gray-400">Job ID</span>
                                        <span className="truncate text-xs font-bold" title={jobMeta.jobId}>{jobMeta.jobId || '--'}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-4">
                                        <span className="text-xs text-gray-400">Filename</span>
                                        <span className="truncate text-xs font-bold" title={jobMeta.originalFilename}>{jobMeta.originalFilename || '--'}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-400">File size</span>
                                        <span className="text-xs font-bold">{formatFileSize(jobMeta.fileSizeBytes)}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-4">
                                        <span className="text-xs text-gray-400">SHA256</span>
                                        <span className="text-xs font-bold" title={jobMeta.sha256}>{shortHash(jobMeta.sha256)}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-4">
                                        <span className="text-xs text-gray-400">Created</span>
                                        <span className="truncate text-xs font-bold" title={jobMeta.createdAt}>{jobMeta.createdAt || '--'}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-4">
                                        <span className="text-xs text-gray-400">Input path</span>
                                        <span className="truncate text-xs font-bold" title={jobMeta.inputPath}>{jobMeta.inputPath || '--'}</span>
                                    </div>
                                </div>
                            )}
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
                            <button onClick={() => navigate({ to: '/automation/translate' })} className="px-10 py-3 rounded-xl bg-primary hover:bg-primary-dark font-bold shadow-lg shadow-primary/20 transition-all active:scale-[0.98] flex items-center gap-2">
                                Dịch AI <ArrowRight size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SpeechToText;
