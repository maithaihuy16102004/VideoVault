import React, { useState, useEffect, useRef } from 'react';
import { 
    Workflow, Zap, Languages, Mic2, Sparkles, 
    PlayCircle, CheckCircle2, ArrowRight, Settings2, Loader2, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { startDubbingPipeline, getDubbingStatus } from '@/shared/api/dubbing.api';
import type { DubbingStatusResponse } from '@/shared/api/dubbing.api';

const AutoPipeline: React.FC = () => {
    const [step, setStep] = useState(1);
    const [videoUrl, setVideoUrl] = useState('');
    const [jobId, setJobId] = useState<string | null>(null);
    const [jobStatus, setJobStatus] = useState<DubbingStatusResponse | null>(null);
    const [isStarting, setIsStarting] = useState(false);
    
    const [config] = useState({
        translate: true,
        voiceover: true,
        burnSubtitles: true,
        rewrite: 'viral',
        voiceTone: 'excited',
        targetLanguage: 'vi',
        ttsEngine: 'edge-tts'
    });

    const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (jobId && jobStatus?.status !== 'completed' && jobStatus?.status !== 'failed') {
            pollingIntervalRef.current = setInterval(async () => {
                try {
                    const status = await getDubbingStatus(jobId);
                    setJobStatus(status);
                    
                    // Map progress to steps
                    if (status.progress < 30) setStep(2);
                    else if (status.progress < 85) setStep(3);
                    else setStep(4);
                    
                    if (status.status === 'completed' || status.status === 'failed') {
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
    }, [jobId, jobStatus?.status]);

    const handleStartPipeline = async () => {
        if (!videoUrl) return;
        setIsStarting(true);
        try {
            const res = await startDubbingPipeline({
                videoPath: videoUrl, // backend video_downloader might need this format or raw url
                targetLanguage: config.targetLanguage,
                ttsEngine: config.ttsEngine,
                enableVoiceClone: false,
                enableEmotion: true
            });
            setJobId(res.jobId);
            setStep(2);
        } catch (error) {
            console.error("Failed to start pipeline", error);
            alert("Failed to start dubbing pipeline. Check console.");
        } finally {
            setIsStarting(false);
        }
    };

    const steps = [
        { id: 1, label: 'Input Source', icon: PlayCircle },
        { id: 2, label: 'AI Processing', icon: Sparkles },
        { id: 3, label: 'Voice & Subtitles', icon: Mic2 },
        { id: 4, label: 'Export & Preview', icon: CheckCircle2 }
    ];

    return (
        <div className="p-8 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-12">
                <div>
                    <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                        <Workflow className="text-primary" size={32} />
                        AI Localization Pipeline
                    </h1>
                    <p className="text-gray-500">Tự động hóa toàn bộ quy trình: Tải → Dịch → Lồng tiếng → Render.</p>
                </div>
                <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full border border-primary/20">
                    <Zap className="text-primary" size={16} fill="currentColor" />
                    <span className="text-xs font-bold text-primary uppercase tracking-wider">Fast Track Mode</span>
                </div>
            </div>

            {/* Stepper */}
            <div className="flex items-center justify-between mb-12 relative">
                <div className="absolute top-1/2 left-0 w-full h-px bg-white/5 -translate-y-1/2 z-0" />
                {steps.map((s) => (
                    <div key={s.id} className="relative z-10 flex flex-col items-center gap-3">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 border ${
                            step >= s.id 
                                ? 'bg-primary border-primary shadow-lg shadow-primary/20 text-white' 
                                : 'bg-[#0c0c0c] border-white/5 text-gray-600'
                        }`}>
                            <s.icon size={20} />
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${
                            step >= s.id ? 'text-primary' : 'text-gray-600'
                        }`}>{s.label}</span>
                    </div>
                ))}
            </div>

            {/* Content Area */}
            <div className="glass-card p-8 min-h-[400px] flex flex-col">
                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <motion.div 
                            key="step1"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-8"
                        >
                            <div className="space-y-4">
                                <label className="text-sm font-bold text-gray-400 uppercase tracking-wider">Dán link video (Douyin / TikTok)</label>
                                <div className="flex gap-4">
                                    <input 
                                        type="text" 
                                        placeholder="Dán link video hoặc đường dẫn file..."
                                        value={videoUrl}
                                        onChange={(e) => setVideoUrl(e.target.value)}
                                        className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-primary/50 transition-colors"
                                    />
                                    <button 
                                        onClick={handleStartPipeline}
                                        disabled={!videoUrl || isStarting}
                                        className="bg-primary hover:bg-primary-dark px-8 rounded-2xl font-bold flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        {isStarting ? <Loader2 size={18} className="animate-spin" /> : 'Tiếp tục'} <ArrowRight size={18} />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-6">
                                <div className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-primary/20 transition-all group cursor-pointer">
                                    <Settings2 className="text-gray-500 group-hover:text-primary mb-4" size={24} />
                                    <h3 className="font-bold mb-1">Cấu hình nâng cao</h3>
                                    <p className="text-xs text-gray-500">Chỉnh sửa ngôn ngữ, giọng đọc và style sub.</p>
                                </div>
                                <div className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-primary/20 transition-all group cursor-pointer">
                                    <Languages className="text-gray-500 group-hover:text-primary mb-4" size={24} />
                                    <h3 className="font-bold mb-1">Dịch thuật & Rewrite</h3>
                                    <p className="text-xs text-gray-500">Tự động Việt hóa nội dung viral.</p>
                                </div>
                                <div className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-primary/20 transition-all group cursor-pointer">
                                    <Mic2 className="text-gray-500 group-hover:text-primary mb-4" size={24} />
                                    <h3 className="font-bold mb-1">Lồng tiếng AI</h3>
                                    <p className="text-xs text-gray-500">Chọn giọng đọc truyền cảm nhất.</p>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div 
                            key="step2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="flex flex-col items-center justify-center py-12 text-center"
                        >
                            <div className="relative w-24 h-24 mb-8">
                                <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
                                <motion.div 
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                    className="absolute inset-0 border-4 border-t-primary rounded-full"
                                />
                                <Sparkles className="absolute inset-0 m-auto text-primary" size={32} />
                            </div>
                            <h2 className="text-2xl font-bold mb-2">Đang phân tích Video...</h2>
                            <p className="text-gray-500 max-w-sm mb-4">Hệ thống đang trích xuất âm thanh, nhận diện giọng nói và chuẩn bị dịch thuật.</p>
                            
                            {jobStatus && (
                                <div className="w-full max-w-md bg-white/5 rounded-full h-2 mb-2">
                                    <div className="bg-primary h-2 rounded-full transition-all duration-500" style={{ width: `${jobStatus.progress}%` }}></div>
                                </div>
                            )}
                            <p className="text-xs text-primary font-bold">{jobStatus?.currentStage || "Khởi tạo..."} - {jobStatus?.progress || 0}%</p>
                        </motion.div>
                    )}

                    {step === 3 && (
                        <motion.div 
                            key="step3"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="flex flex-col items-center justify-center py-12 text-center"
                        >
                            <div className="relative w-24 h-24 mb-8">
                                <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
                                <motion.div 
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                    className="absolute inset-0 border-4 border-t-primary rounded-full"
                                />
                                <Mic2 className="absolute inset-0 m-auto text-primary" size={32} />
                            </div>
                            <h2 className="text-2xl font-bold mb-2">Lồng tiếng & Sync Subtitle</h2>
                            <p className="text-gray-500 max-w-sm mb-4">Đang tạo giọng nói AI và khớp thời gian với video gốc.</p>
                            
                            {jobStatus && (
                                <div className="w-full max-w-md bg-white/5 rounded-full h-2 mb-2">
                                    <div className="bg-primary h-2 rounded-full transition-all duration-500" style={{ width: `${jobStatus.progress}%` }}></div>
                                </div>
                            )}
                            <p className="text-xs text-primary font-bold">{jobStatus?.currentStage || "Đang xử lý..."} - {jobStatus?.progress || 0}%</p>
                        </motion.div>
                    )}

                    {step === 4 && (
                        <motion.div 
                            key="step4"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="flex flex-col items-center justify-center py-12 text-center"
                        >
                            <div className="w-24 h-24 mb-8 bg-green-500/20 rounded-full flex items-center justify-center">
                                <CheckCircle2 className="text-green-500" size={48} />
                            </div>
                            <h2 className="text-2xl font-bold mb-2">Hoàn tất!</h2>
                            <p className="text-gray-500 max-w-sm mb-8">Video của bạn đã được Việt hóa thành công.</p>
                            
                            {jobStatus?.status === 'completed' ? (
                                <a 
                                    href={`http://localhost:5141/api/v1/dubbing/${jobId}/download`}
                                    target="_blank" rel="noreferrer"
                                    className="bg-primary hover:bg-primary-dark px-8 py-4 rounded-2xl font-bold flex items-center gap-3 transition-all active:scale-95"
                                >
                                    <Download size={20} /> Tải Video Về Máy
                                </a>
                            ) : jobStatus?.status === 'failed' ? (
                                <div className="text-red-500 bg-red-500/10 p-4 rounded-xl">
                                    <p className="font-bold">Lỗi xử lý:</p>
                                    <p className="text-sm">{jobStatus.errorMessage}</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center">
                                    <Loader2 className="animate-spin text-primary mb-2" size={24} />
                                    <p className="text-xs text-gray-500">Đang render video cuối...</p>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Pipeline Info */}
            <div className="mt-12 grid grid-cols-4 gap-6">
                {[
                    { label: 'Original', value: 'Chinese', icon: Languages },
                    { label: 'Target', value: 'Vietnamese', icon: ArrowRight },
                    { label: 'Voice', value: 'TikTok Male', icon: Mic2 },
                    { label: 'Style', value: 'Viral Hook', icon: Sparkles },
                ].map((item) => (
                    <div key={item.label} className="bg-[#0c0c0c] p-4 rounded-2xl border border-white/5">
                        <p className="text-[10px] text-gray-600 uppercase font-bold tracking-widest mb-1">{item.label}</p>
                        <div className="flex items-center justify-between">
                            <span className="font-bold text-sm">{item.value}</span>
                            <item.icon size={14} className="text-gray-700" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AutoPipeline;
