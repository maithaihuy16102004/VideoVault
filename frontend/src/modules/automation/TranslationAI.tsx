import React, { useEffect, useMemo, useState } from 'react';
import { Languages, ArrowRight, Sparkles, FileText, CheckCircle2, History, RotateCcw, Loader2, Workflow, AlertTriangle } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';

import { rewriteText } from '@/shared/api/ai.api';

// ─── SRT Parsing Helpers ─────────────────────────────────────────────────

interface SrtSegment {
    id: number;
    timeStart: string;
    timeEnd: string;
    text: string;
}

function parseSrtToSegments(srt: string): SrtSegment[] {
    const lines = srt.trim().split('\n');
    const segments: SrtSegment[] = [];
    let i = 0;
    while (i < lines.length) {
        const line = lines[i].trim();
        if (line === '') { i++; continue; }

        const id = parseInt(line, 10);
        if (isNaN(id)) { i++; continue; }
        i++;
        if (i >= lines.length) break;

        const timeLine = lines[i].trim();
        const timeParts = timeLine.split(' --> ');
        if (timeParts.length !== 2) { i++; continue; }

        const timeStart = timeParts[0].trim();
        const timeEnd = timeParts[1].trim();
        i++;

        let text = '';
        while (i < lines.length && lines[i].trim() !== '') {
            text += (text ? ' ' : '') + lines[i].trim();
            i++;
        }

        segments.push({ id, timeStart, timeEnd, text });
    }
    return segments;
}

function segmentsToSrt(segments: SrtSegment[]): string {
    return segments
        .map((seg) => `${seg.id}\n${seg.timeStart} --> ${seg.timeEnd}\n${seg.text}\n`)
        .join('\n');
}

function extractTextsFromSegments(segments: SrtSegment[]): string {
    return segments.map((seg) => `[${seg.id}] ${seg.text}`).join('\n');
}

function mergeTranslatedTexts(segments: SrtSegment[], translatedLines: string[]): SrtSegment[] {
    return segments.map((seg, idx) => {
        let translated = translatedLines[idx]?.trim() || seg.text;
        // Remove [id] prefix if AI included it
        translated = translated.replace(/^\[\d+\]\s*/, '');
        return { ...seg, text: translated };
    });
}

// ─── Component ───────────────────────────────────────────────────────────

const TranslationAI: React.FC = () => {
    const navigate = useNavigate();
    const [mode, setMode] = useState('viral');
    const [targetLang, setTargetLang] = useState('vi');
    const [customPrompt, setCustomPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // Source SRT state
    const [sourceSegments, setSourceSegments] = useState<SrtSegment[]>([]);
    const [inputText, setInputText] = useState('');

    // Output state
    const [translatedSegments, setTranslatedSegments] = useState<SrtSegment[]>([]);
    const [outputText, setOutputText] = useState('');

    const isSrtMode = sourceSegments.length > 0;

    useEffect(() => {
        const sourceText = localStorage.getItem('automation:sourceText');
        if (sourceText) {
            const segments = parseSrtToSegments(sourceText);
            if (segments.length > 0) {
                setSourceSegments(segments);
                setInputText(sourceText);
            } else {
                setInputText(sourceText);
            }
            setOutputText('');
            setTranslatedSegments([]);
        }
    }, []);

    const handleRewrite = async () => {
        if (!inputText.trim() && sourceSegments.length === 0) return;
        setIsLoading(true);
        setErrorMessage('');
        try {
            let textToSend: string;
            if (isSrtMode) {
                // Send only text content with line-by-line numbering for accurate mapping
                textToSend = extractTextsFromSegments(sourceSegments);
            } else {
                textToSend = inputText;
            }

            const res = await rewriteText({
                text: textToSend,
                tone: mode,
                targetLanguage: targetLang,
                customPrompt: mode === 'custom' ? customPrompt : undefined
            });

            if (isSrtMode) {
                // Parse AI response: one line per segment
                const lines = res.rewrittenText
                    .split('\n')
                    .map((l: string) => l.trim())
                    .filter((l: string) => l.length > 0);

                const merged = mergeTranslatedTexts(sourceSegments, lines);
                setTranslatedSegments(merged);

                const translatedSrt = segmentsToSrt(merged);
                setOutputText(translatedSrt);
                localStorage.setItem('automation:translatedText', merged.map((s) => s.text).join('\n'));
                localStorage.setItem('automation:translatedSrt', translatedSrt);
            } else {
                setOutputText(res.rewrittenText);
                localStorage.setItem('automation:translatedText', res.rewrittenText);
            }
        } catch (error) {
            console.error('Lỗi khi gọi AI:', error);
            setErrorMessage('Có lỗi xảy ra khi xử lý AI. Vui lòng thử lại.');
        } finally {
            setIsLoading(false);
        }
    };

    const modes = [
        { id: 'viral', label: 'Viral Hook', description: 'Tối ưu hook mạnh, câu ngắn, cuốn, phù hợp TikTok/Douyin.', icon: Sparkles },
        { id: 'professional', label: 'Professional', description: 'Dịch thuật chuẩn xác, trang trọng.', icon: FileText },
        { id: 'genz', label: 'Gen Z Style', description: 'Sử dụng ngôn ngữ giới trẻ, bắt trend.', icon: Sparkles },
        { id: 'custom', label: 'Tùy chỉnh Prompt', description: 'Sử dụng câu lệnh prompt của riêng bạn.', icon: FileText },
    ];

    const modeLabels: Record<string, string> = {
        viral: 'Viral Hook',
        professional: 'Professional',
        genz: 'Gen Z Style',
        custom: 'Tùy chỉnh',
    };

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

            {errorMessage && (
                <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 flex items-center gap-2">
                    <AlertTriangle size={16} /> {errorMessage}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Editor Section */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Source SRT / Text */}
                    <div className="glass-card p-6">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                                {isSrtMode ? `Nội dung gốc — ${sourceSegments.length} đoạn phụ đề` : 'Nội dung gốc'}
                            </span>
                            {isSrtMode && (
                                <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest flex items-center gap-1">
                                    <CheckCircle2 size={12} /> SRT đã parse
                                </span>
                            )}
                        </div>

                        {isSrtMode ? (
                            <div className="max-h-[300px] overflow-y-auto no-scrollbar divide-y divide-white/5">
                                {sourceSegments.map((seg) => (
                                    <div key={seg.id} className="py-3 flex gap-4">
                                        <div className="shrink-0 text-[10px] text-gray-600 font-mono space-y-0.5 pt-0.5 min-w-[140px]">
                                            <p>{seg.id}</p>
                                            <p>{seg.timeStart} → {seg.timeEnd}</p>
                                        </div>
                                        <p className="text-sm text-white/80 leading-relaxed">{seg.text}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <textarea 
                                className="w-full h-48 bg-transparent border-none outline-none resize-none text-lg text-white/80"
                                placeholder="Dán nội dung cần dịch vào đây..."
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                            />
                        )}
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

                    {/* Output */}
                    <div className="glass-card p-6 border-primary/20">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
                                Kết quả AI — {modeLabels[mode] || mode}
                            </span>
                            <div className="flex gap-2">
                                <button onClick={handleRewrite} disabled={isLoading} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-500 hover:text-white transition-all disabled:opacity-50" title="Dịch lại">
                                    <RotateCcw size={14} />
                                </button>
                                <button className="p-1.5 hover:bg-white/10 rounded-lg text-gray-500 hover:text-white transition-all">
                                    <CheckCircle2 size={14} />
                                </button>
                            </div>
                        </div>

                        {isSrtMode && translatedSegments.length > 0 ? (
                            <div className="max-h-[300px] overflow-y-auto no-scrollbar divide-y divide-white/5">
                                {translatedSegments.map((seg) => (
                                    <div key={seg.id} className="py-3 flex gap-4">
                                        <div className="shrink-0 text-[10px] text-gray-600 font-mono space-y-0.5 pt-0.5 min-w-[140px]">
                                            <p>{seg.id}</p>
                                            <p>{seg.timeStart} → {seg.timeEnd}</p>
                                        </div>
                                        <p className="text-sm text-white/90 font-medium leading-relaxed">{seg.text}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="min-h-[100px] text-lg font-medium whitespace-pre-wrap">
                                {isLoading ? (
                                    <div className="flex items-center gap-3 text-gray-500">
                                        <Loader2 size={20} className="animate-spin" />
                                        Đang dịch {isSrtMode ? `${sourceSegments.length} đoạn phụ đề` : 'nội dung'}...
                                    </div>
                                ) : outputText || (
                                    <span className="text-gray-600">Nhấn nút dịch để bắt đầu...</span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Duration warning */}
                    {isSrtMode && translatedSegments.length > 0 && (
                        <div className="rounded-xl border border-green-500/20 bg-green-500/5 px-4 py-3 text-xs text-green-300 flex items-center gap-2">
                            <CheckCircle2 size={14} />
                            {translatedSegments.length} đoạn phụ đề đã được dịch và giữ nguyên timestamp gốc — chuẩn thời lượng video.
                        </div>
                    )}
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
                        
                        {mode === 'custom' && (
                            <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                                <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-wider">Nhập Prompt của bạn</label>
                                <textarea
                                    className="w-full h-24 bg-[#0c0c0c] border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/50 transition-all text-white/80 resize-none"
                                    placeholder="Ví dụ: Dịch sang tiếng Việt mang phong cách kiếm hiệp..."
                                    value={customPrompt}
                                    onChange={(e) => setCustomPrompt(e.target.value)}
                                />
                            </div>
                        )}
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

                    <button
                        onClick={() => {
                            if (isSrtMode && translatedSegments.length > 0) {
                                localStorage.setItem('automation:translatedText', translatedSegments.map((s) => s.text).join('\n'));
                                localStorage.setItem('automation:translatedSrt', segmentsToSrt(translatedSegments));
                            } else if (outputText.trim()) {
                                localStorage.setItem('automation:translatedText', outputText);
                            }
                            navigate({ to: '/automation/voice' });
                        }}
                        className="w-full bg-primary hover:bg-primary-dark py-4 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
                    >
                        <Workflow size={20} />
                        Xác nhận & Sang lồng tiếng
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TranslationAI;
