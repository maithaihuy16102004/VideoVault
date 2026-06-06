import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, FileAudio2, Headphones, Loader2, Mic2, Pause, Play, RefreshCw, Sparkles, Volume2, Wifi, WifiOff } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';

import { checkVoiceServiceHealth, generateVoiceTTS, previewVoiceTTS } from '@/shared/api/dubbing.api';
import { type VoiceInfo, voiceLibrary } from './voiceLibrary';

const DEFAULT_TEXT = 'Chào mừng bạn quay lại với VideoVault. Đây là bản lồng tiếng AI tiếng Việt, rõ chữ, tự nhiên và phù hợp cho video ngắn.';

/**
 * Strip emoji and special unicode symbols from text before sending to TTS.
 * TTS engines will literally read out emoji characters otherwise.
 */
function stripEmoji(text: string): string {
    return text
        // Remove emoji & pictographs
        .replace(/[\u{1F600}-\u{1F64F}]/gu, '')   // emoticons
        .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')   // misc symbols & pictographs
        .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')   // transport & map
        .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')   // flags
        .replace(/[\u{2600}-\u{26FF}]/gu, '')      // misc symbols
        .replace(/[\u{2700}-\u{27BF}]/gu, '')      // dingbats
        .replace(/[\u{FE00}-\u{FE0F}]/gu, '')      // variation selectors
        .replace(/[\u{1F900}-\u{1F9FF}]/gu, '')   // supplemental symbols
        .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '')   // chess symbols
        .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '')   // symbols extended
        .replace(/[\u{200D}]/gu, '')               // zero width joiner
        .replace(/[\u{20E3}]/gu, '')               // combining enclosing keycap
        .replace(/[\u{E0020}-\u{E007F}]/gu, '')    // tags
        // Clean up leftover whitespace (spaces/tabs only, preserve newlines)
        .replace(/[ \t]{2,}/g, ' ')
        .trim();
}

type AudioState = {
    url: string;
    element: HTMLAudioElement;
    signature: string;
    createdAt: string;
};

const getSignature = (text: string, voiceId: string, speed: number) => `${voiceId}|${speed.toFixed(2)}|${text.trim()}`;

const VoiceAI: React.FC = () => {
    const readyVoices = useMemo(() => voiceLibrary.filter((voice) => voice.status === 'ready'), []);
    const unavailableVoices = useMemo(() => voiceLibrary.filter((voice) => voice.status !== 'ready'), []);

    const [selectedVoiceId, setSelectedVoiceId] = useState('vi-VN-HoaiMyNeural');
    const [text, setText] = useState(DEFAULT_TEXT);
    const [speed, setSpeed] = useState(1);
    const [audioState, setAudioState] = useState<AudioState | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [serviceStatus, setServiceStatus] = useState<'checking' | 'online' | 'offline'>('checking');
    const [engineStatuses, setEngineStatuses] = useState<Record<string, string>>({});
    const [elapsedMs, setElapsedMs] = useState(0);
    const abortControllerRef = useRef<AbortController | null>(null);
    const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const selectedVoice = useMemo(
        () => readyVoices.find((voice) => voice.id === selectedVoiceId) ?? readyVoices[0],
        [readyVoices, selectedVoiceId],
    );

    const cleanedText = useMemo(() => stripEmoji(text), [text]);
    const hasEmoji = cleanedText !== text.trim();

    const currentSignature = selectedVoice ? getSignature(cleanedText, selectedVoice.id, speed) : '';
    const audioIsCurrent = Boolean(audioState && audioState.signature === currentSignature);

    // Calculate estimated progress percentage based on text length (~18ms per char on average)
    const estimatedTotalMs = Math.max(2000, cleanedText.length * 18);
    const rawPercent = (elapsedMs / estimatedTotalMs) * 100;
    
    // Asymptotic curve: normal progress up to 85%, then slows down exponentially so it never exceeds 99%
    const progressPercent = rawPercent < 85 
        ? Math.floor(rawPercent) 
        : Math.floor(85 + 14 * (1 - Math.exp(-(rawPercent - 85) / 40)));

    // Health check on mount
    useEffect(() => {
        const checkHealth = async () => {
            setServiceStatus('checking');
            const health = await checkVoiceServiceHealth();
            if (health) {
                setServiceStatus('online');
                setEngineStatuses(health.engines || {});
            } else {
                setServiceStatus('offline');
            }
        };
        checkHealth();
    }, []);

    useEffect(() => {
        const translatedText = localStorage.getItem('automation:translatedText');
        if (translatedText?.trim()) setText(translatedText);
    }, []);

    useEffect(() => {
        return () => {
            if (audioState?.url) URL.revokeObjectURL(audioState.url);
            audioState?.element.pause();
        };
    }, [audioState]);

    const attachAudio = (blob: Blob, signature: string) => {
        if (audioState?.url) URL.revokeObjectURL(audioState.url);
        audioState?.element.pause();

        const url = URL.createObjectURL(blob);
        const element = new Audio(url);
        element.onplay = () => setIsPlaying(true);
        element.onpause = () => setIsPlaying(false);
        element.onended = () => setIsPlaying(false);

        setAudioState({
            url,
            element,
            signature,
            createdAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        });

        return element;
    };

    const isEngineReady = (engine: string) => {
        if (serviceStatus !== 'online') return false;
        return engineStatuses[engine] === 'ready';
    };

    const generatePreviewAudio = async () => {
        if (!selectedVoice || !cleanedText.trim()) return;
        if (serviceStatus === 'offline') {
            setErrorMessage('Voice Service (port 5052) đang offline. Hãy kiểm tra service đã được khởi động chưa.');
            return;
        }

        // Cancel any previous in-flight request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;

        setIsGenerating(true);
        setErrorMessage(null);
        setElapsedMs(0);

        // Start elapsed timer
        const startTime = performance.now();
        elapsedTimerRef.current = setInterval(() => {
            setElapsedMs(Math.round(performance.now() - startTime));
        }, 100);

        try {
            const blob = await generateVoiceTTS({
                text: cleanedText,
                voiceId: selectedVoice.id,
                engine: selectedVoice.engine,
                speed,
                preserveAccent: true,
            }, controller.signal);
            const audio = attachAudio(blob, currentSignature);
            await audio.play();
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            if (axios.isCancel(error)) return;
            console.error('Voice generation failed:', error);
            const msg = error instanceof Error ? error.message : 'Lỗi không xác định';
            setErrorMessage(msg);
        } finally {
            setIsGenerating(false);
            if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
        }
    };

    const previewVoice = async (voice: VoiceInfo) => {
        if (serviceStatus === 'offline') {
            setErrorMessage('Voice Service (port 5052) đang offline.');
            return;
        }

        // Cancel any previous in-flight request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;

        setPreviewingVoiceId(voice.id);
        setErrorMessage(null);
        try {
            const previewText = stripEmoji(text || DEFAULT_TEXT);
            const blob = await previewVoiceTTS({
                text: previewText,
                voiceId: voice.id,
                engine: voice.engine,
                speed,
            }, controller.signal);
            const audio = attachAudio(blob, getSignature(previewText, voice.id, speed));
            await audio.play();
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            if (axios.isCancel(error)) return;
            console.error('Voice preview failed:', error);
            const msg = error instanceof Error ? error.message : 'Không nghe thử được giọng này.';
            setErrorMessage(msg);
        } finally {
            setPreviewingVoiceId(null);
        }
    };

    const togglePlayback = () => {
        if (!audioState || !audioIsCurrent) {
            void generatePreviewAudio();
            return;
        }

        if (audioState.element.paused) void audioState.element.play();
        else audioState.element.pause();
    };

    const downloadAudio = () => {
        if (!audioState || !audioIsCurrent) return;
        const link = document.createElement('a');
        link.href = audioState.url;
        link.download = `videovault_long_tieng_${Date.now()}.mp3`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const retryHealthCheck = async () => {
        setServiceStatus('checking');
        setErrorMessage(null);
        const health = await checkVoiceServiceHealth();
        if (health) {
            setServiceStatus('online');
            setEngineStatuses(health.engines || {});
        } else {
            setServiceStatus('offline');
            setErrorMessage('Voice Service vẫn offline. Hãy chạy lại start.bat hoặc kiểm tra python voice_service.py.');
        }
    };

    // Speed label
    const speedLabel = speed < 0.95 ? 'Chậm' : speed > 1.05 ? 'Nhanh' : 'Chuẩn';

    return (
        <div className="p-6 xl:p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-4 mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center border border-primary/10">
                        <Mic2 className="text-primary" size={24} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold">Lồng tiếng AI</h1>
                        <p className="text-sm text-gray-500 mt-0.5">Chọn giọng, chỉnh tốc độ, nghe thử rồi tải audio lồng tiếng.</p>
                    </div>
                </div>
            </div>

            {/* Service Status Banners */}
            {serviceStatus === 'offline' && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 rounded-2xl border border-red-500/20 bg-gradient-to-r from-red-500/10 to-red-600/5 px-5 py-4 flex items-center justify-between"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-red-500/20 flex items-center justify-center">
                            <WifiOff size={16} className="text-red-400" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-red-300">Voice Service Offline</p>
                            <p className="text-xs text-gray-500">Không kết nối được port 5052. Hãy khởi động lại service.</p>
                        </div>
                    </div>
                    <button onClick={retryHealthCheck} className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 text-xs font-bold flex items-center gap-2 transition-all border border-red-500/20">
                        <RefreshCw size={13} /> Thử lại
                    </button>
                </motion.div>
            )}

            {serviceStatus === 'checking' && (
                <div className="mb-6 rounded-2xl border border-yellow-500/10 bg-yellow-500/5 px-5 py-3 flex items-center gap-3">
                    <Loader2 size={16} className="text-yellow-400 animate-spin" />
                    <p className="text-sm text-yellow-300/80">Đang kiểm tra kết nối Voice Service...</p>
                </div>
            )}

            {/* Error */}
            {errorMessage && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/5 px-5 py-3 flex items-start gap-3"
                >
                    <AlertTriangle size={16} className="shrink-0 mt-0.5 text-red-400" />
                    <div className="flex-1">
                        <p className="text-sm text-red-200">{errorMessage}</p>
                        <button onClick={() => setErrorMessage(null)} className="text-xs text-red-400 hover:text-red-300 mt-1">Đóng</button>
                    </div>
                </motion.div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] gap-6">
                {/* ─── Voice Picker Panel ─── */}
                <div className="space-y-4">
                    <div className="rounded-2xl border border-white/5 bg-[#0a0a0e] p-5">
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <h2 className="font-bold text-lg">Chọn giọng</h2>
                                <p className="text-xs text-gray-500 mt-1">{readyVoices.length} giọng khả dụng</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {serviceStatus === 'online' && (
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                        <span className="text-[10px] font-bold text-green-400 uppercase">Online</span>
                                    </div>
                                )}
                                {serviceStatus === 'offline' && (
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20">
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                                        <span className="text-[10px] font-bold text-red-400 uppercase">Offline</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-1.5 max-h-[520px] overflow-y-auto no-scrollbar pr-1">
                            {readyVoices.map((voice) => {
                                const isSelected = selectedVoice?.id === voice.id;
                                return (
                                    <button
                                        key={voice.id}
                                        onClick={() => setSelectedVoiceId(voice.id)}
                                        className={`w-full p-3.5 rounded-xl text-left transition-all group relative ${
                                            isSelected
                                                ? 'bg-gradient-to-r from-primary/15 to-primary/5 border border-primary/30'
                                                : 'border border-transparent hover:bg-white/[0.03] hover:border-white/5'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className={`font-bold text-sm truncate ${isSelected ? 'text-primary' : ''}`}>
                                                        {voice.name}
                                                    </p>
                                                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                                                </div>
                                                <p className="text-[11px] text-gray-500 truncate mt-0.5">{voice.accent} · {voice.gender}</p>
                                            </div>
                                            <span
                                                role="button"
                                                tabIndex={0}
                                                title="Nghe thử giọng"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    void previewVoice(voice);
                                                }}
                                                onKeyDown={(event) => {
                                                    if (event.key === 'Enter' || event.key === ' ') {
                                                        event.preventDefault();
                                                        event.stopPropagation();
                                                        void previewVoice(voice);
                                                    }
                                                }}
                                                className={`p-2 rounded-xl shrink-0 transition-all ${
                                                    isSelected
                                                        ? 'bg-primary/20 text-primary hover:bg-primary/30'
                                                        : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white opacity-0 group-hover:opacity-100'
                                                }`}
                                            >
                                                {previewingVoiceId === voice.id
                                                    ? <Loader2 size={14} className="animate-spin" />
                                                    : <Play size={14} fill="currentColor" />}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {unavailableVoices.length > 0 && (
                            <div className="mt-4 rounded-xl border border-white/5 bg-white/[0.02] p-3">
                                <p className="text-[11px] text-gray-500">
                                    <span className="font-bold text-gray-400">{unavailableVoices.length} engine</span> chưa kết nối (VietTTS, XTTS)
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Speed Control */}
                    <div className="rounded-2xl border border-white/5 bg-[#0a0a0e] p-5">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-bold">Tốc độ đọc</span>
                            <div className="flex items-center gap-2">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                    speed < 0.95 ? 'bg-blue-500/15 text-blue-400' :
                                    speed > 1.05 ? 'bg-orange-500/15 text-orange-400' :
                                    'bg-green-500/15 text-green-400'
                                }`}>{speedLabel}</span>
                                <span className="text-lg font-bold text-white">{speed.toFixed(2)}x</span>
                            </div>
                        </div>
                        <input
                            type="range"
                            min="0.8"
                            max="1.2"
                            step="0.05"
                            value={speed}
                            onChange={(event) => setSpeed(Number(event.target.value))}
                            className="w-full accent-primary"
                        />
                        <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                            <span>0.8x</span>
                            <span>1.0x</span>
                            <span>1.2x</span>
                        </div>
                    </div>
                </div>

                {/* ─── Main Content ─── */}
                <div className="space-y-5">
                    {/* Selected Voice Header */}
                    <div className="rounded-2xl border border-white/5 bg-[#0a0a0e] p-6">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 via-purple-500/15 to-pink-500/10 flex items-center justify-center border border-primary/10">
                                    <Volume2 size={24} className="text-primary" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Giọng đã chọn</p>
                                    <h2 className="text-2xl font-bold">{selectedVoice?.name}</h2>
                                    <p className="text-sm text-gray-500">{selectedVoice?.accent} · {selectedVoice?.engine} · {speed.toFixed(2)}x</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-[11px] text-gray-500 font-bold">{cleanedText.length} ký tự</span>
                                {hasEmoji && (
                                    <span className="text-[10px] px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold flex items-center gap-1">
                                        <CheckCircle2 size={11} /> Emoji đã lọc
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Text Editor */}
                    <div className="rounded-2xl border border-white/5 bg-[#0a0a0e] overflow-hidden">
                        <div className="px-6 py-3 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                            <div className="flex items-center gap-2 text-primary">
                                <FileAudio2 size={16} />
                                <span className="text-xs font-bold uppercase tracking-wider">Nội dung lồng tiếng</span>
                            </div>
                            {hasEmoji && (
                                <p className="text-[10px] text-amber-400/80">Emoji sẽ được tự động lọc trước khi gửi tới AI.</p>
                            )}
                        </div>
                        <div className="p-6">
                            <textarea
                                className="w-full min-h-[240px] bg-transparent border-none outline-none resize-none text-lg leading-relaxed text-white/90"
                                placeholder="Nhập hoặc chỉnh nội dung cần lồng tiếng..."
                                value={text}
                                onChange={(event) => setText(event.target.value)}
                            />
                        </div>
                    </div>

                    {/* Audio Player Card */}
                    {audioState && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`rounded-2xl border p-5 ${
                                audioIsCurrent
                                    ? 'border-primary/20 bg-gradient-to-r from-primary/5 to-transparent'
                                    : 'border-amber-400/15 bg-amber-500/5'
                            }`}
                        >
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                        audioIsCurrent ? 'bg-primary/15' : 'bg-amber-500/15'
                                    }`}>
                                        {audioIsCurrent
                                            ? <Sparkles size={18} className="text-primary" />
                                            : <RefreshCw size={18} className="text-amber-400" />}
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm">
                                            {audioIsCurrent ? 'Bản nghe thử sẵn sàng' : 'Đã chỉnh sửa — cần tạo lại'}
                                        </p>
                                        <p className="text-xs text-gray-500">Tạo lúc {audioState.createdAt}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={togglePlayback}
                                    disabled={!audioIsCurrent}
                                    className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                >
                                    {isPlaying ? <Pause size={16} /> : <Headphones size={16} />}
                                    {isPlaying ? 'Tạm dừng' : 'Nghe lại'}
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-3 justify-end pt-2">
                        <button
                            onClick={togglePlayback}
                            disabled={isGenerating || !cleanedText.trim() || serviceStatus === 'offline'}
                            className="bg-white/5 hover:bg-white/10 px-6 py-3.5 rounded-xl font-bold flex items-center gap-3 transition-all disabled:opacity-40 disabled:cursor-not-allowed border border-white/5"
                        >
                            {isGenerating
                                ? <Loader2 size={18} className="animate-spin" />
                                : audioIsCurrent
                                    ? <Play size={18} fill="currentColor" />
                                    : <Sparkles size={18} />}
                            {isGenerating
                                ? progressPercent >= 98
                                    ? `Đang xử lý hậu kỳ... 99%`
                                    : `Đang tạo... ${progressPercent}% (${(elapsedMs / 1000).toFixed(1)}s)`
                                : audioIsCurrent ? 'Nghe thử' : 'Tạo bản nghe thử'}
                        </button>
                        <button
                            onClick={downloadAudio}
                            disabled={!audioIsCurrent}
                            className="bg-gradient-to-r from-primary to-purple-500 hover:from-primary-dark hover:to-purple-600 px-7 py-3.5 rounded-xl font-bold flex items-center gap-3 text-black shadow-lg shadow-primary/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                        >
                            <Download size={18} />
                            Tải audio
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VoiceAI;
