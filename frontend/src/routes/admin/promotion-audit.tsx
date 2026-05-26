import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Activity, ShieldCheck, RefreshCw, ClipboardList } from 'lucide-react';

type GuardrailState = {
    action?: string;
    objective?: string;
    confidence?: number;
    budgetPlan?: Record<string, unknown>;
};

type AuditDecision = {
    timestamp: string;
    video_id?: string;
    title?: string;
    analysis_mode?: string;
    evidenceLevel?: string;
    before_guardrail?: GuardrailState;
    after_guardrail?: GuardrailState;
    rules_triggered?: string[];
    why_objective_changed?: Array<{ from?: string; to?: string; reason?: string }>;
    warnings?: string[];
};

type PromotionAuditSnapshot = {
    generated_at: string;
    monitoring: Record<string, number>;
    audit_count: number;
    recent_decisions: AuditDecision[];
    campaign_learning: Record<string, unknown>;
    policy: Record<string, unknown>;
};

const API_URL = 'http://localhost:5054/api/admin/promotion-audit';

const metricLabels: Record<string, string> = {
    crawler_errors: 'Lỗi crawler',
    gemini_rate_limits: 'Gemini rate limit',
    fallback_mode_calls: 'Fallback mode',
    missing_field_events: 'Thiếu dữ liệu',
    scale_blocked_count: 'Lượt chặn SCALE',
    decision_count: 'Tổng quyết định',
    decision_latency_ms_avg: 'Độ trễ TB (ms)',
};

const stateText = (state?: GuardrailState) => {
    if (!state) return 'Không có dữ liệu';
    return `${state.action || 'N/A'} / ${state.objective || 'N/A'} / ${state.confidence ?? 'N/A'}%`;
};

const PromotionAuditPage: React.FC = () => {
    const [data, setData] = useState<PromotionAuditSnapshot | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(API_URL);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            setData(await res.json());
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Không thể tải audit');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load();
    }, []);

    const monitoring = useMemo(() => Object.entries(data?.monitoring || {}), [data]);

    return (
        <div className="min-h-screen px-8 py-8 text-white">
            <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="mb-2 text-xs font-black uppercase tracking-[0.35em] text-purple-300">
                        Admin Operations
                    </p>
                    <h1 className="text-3xl font-black tracking-tight">Promotion Decision Audit</h1>
                    <p className="mt-2 max-w-3xl text-sm text-gray-400">
                        Theo dõi before_guardrail, after_guardrail, rules_triggered và lý do AI đổi objective trước khi user đốt tiền.
                    </p>
                </div>
                <button
                    onClick={() => void load()}
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-xl border border-purple-400/30 bg-purple-500/10 px-4 py-2 text-sm font-bold text-purple-100 transition hover:bg-purple-500/20 disabled:opacity-60"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    Làm mới
                </button>
            </div>

            {error && (
                <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                    Không thể đọc endpoint audit: {error}
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {monitoring.map(([key, value]) => (
                    <div key={key} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
                            {metricLabels[key] || key}
                        </p>
                        <p className="mt-3 text-3xl font-black text-white">{value}</p>
                    </div>
                ))}
            </div>

            <div className="mt-6 grid gap-4 xl:grid-cols-3">
                <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-5">
                    <div className="mb-3 flex items-center gap-2 text-cyan-200">
                        <ShieldCheck size={18} />
                        <h2 className="font-black">Policy trạng thái</h2>
                    </div>
                    <div className="space-y-2 text-sm text-gray-300">
                        <p>SCALE yêu cầu: <span className="font-bold text-white">{String(data?.policy?.scale_requires || 'PAID_HISTORY_VERIFIED')}</span></p>
                        <p>Quick Scan được SCALE: <span className="font-bold text-white">Không</span></p>
                        <p>Curated benchmark là live data: <span className="font-bold text-white">Không</span></p>
                        <p>AI cam kết follower/doanh số: <span className="font-bold text-white">Không</span></p>
                    </div>
                </div>

                <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-5">
                    <div className="mb-3 flex items-center gap-2 text-amber-200">
                        <Activity size={18} />
                        <h2 className="font-black">Campaign learning</h2>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        {Object.entries(data?.campaign_learning || {}).map(([key, value]) => (
                            <div key={key} className="rounded-xl bg-black/20 p-3">
                                <p className="text-[10px] uppercase tracking-widest text-amber-100/60">{key}</p>
                                <p className="mt-1 font-bold text-white">{String(value)}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                    <div className="mb-3 flex items-center gap-2 text-purple-200">
                        <ClipboardList size={18} />
                        <h2 className="font-black">Audit summary</h2>
                    </div>
                    <p className="text-sm text-gray-400">Tổng decision đã lưu trong bộ nhớ tiến trình.</p>
                    <p className="mt-3 text-4xl font-black">{data?.audit_count ?? 0}</p>
                    <p className="mt-2 text-xs text-gray-500">Generated: {data?.generated_at || 'N/A'}</p>
                </div>
            </div>

            <div className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-[#101013]">
                <div className="border-b border-white/10 p-5">
                    <h2 className="text-lg font-black">Decision audit gần nhất</h2>
                    <p className="mt-1 text-sm text-gray-500">Dùng để trả lời câu hỏi: vì sao AI khuyên objective/action này.</p>
                </div>

                <div className="divide-y divide-white/10">
                    {(data?.recent_decisions || []).length === 0 && (
                        <div className="flex items-center gap-3 p-6 text-sm text-gray-400">
                            <AlertTriangle size={18} />
                            Chưa có audit. Hãy chạy phân tích ở TikTok Promote để sinh decision log.
                        </div>
                    )}

                    {(data?.recent_decisions || []).map((item, idx) => (
                        <div key={`${item.timestamp}-${idx}`} className="p-5">
                            <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
                                        {item.analysis_mode || 'N/A'} · {item.evidenceLevel || 'NO_EVIDENCE'} · {item.timestamp}
                                    </p>
                                    <h3 className="mt-1 max-w-4xl text-base font-black text-white">
                                        {item.title || item.video_id || 'Không có tiêu đề'}
                                    </h3>
                                </div>
                                <div className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-gray-300">
                                    {item.video_id || 'no-id'}
                                </div>
                            </div>

                            <div className="mt-4 grid gap-3 lg:grid-cols-2">
                                <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4">
                                    <p className="text-xs font-bold uppercase tracking-widest text-red-200">Before guardrail</p>
                                    <p className="mt-2 font-mono text-sm text-white">{stateText(item.before_guardrail)}</p>
                                </div>
                                <div className="rounded-2xl border border-green-400/20 bg-green-500/10 p-4">
                                    <p className="text-xs font-bold uppercase tracking-widest text-green-200">After guardrail</p>
                                    <p className="mt-2 font-mono text-sm text-white">{stateText(item.after_guardrail)}</p>
                                </div>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                                {(item.rules_triggered || []).map((rule) => (
                                    <span key={rule} className="rounded-full bg-purple-500/15 px-3 py-1 text-xs font-bold text-purple-200">
                                        {rule}
                                    </span>
                                ))}
                            </div>

                            {(item.why_objective_changed || []).length > 0 && (
                                <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                                    <p className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-500">Why objective changed</p>
                                    {(item.why_objective_changed || []).map((change, changeIdx) => (
                                        <p key={changeIdx} className="text-sm text-gray-300">
                                            {change.from || 'N/A'} → {change.to || 'N/A'}: {change.reason || 'Không có lý do'}
                                        </p>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PromotionAuditPage;
