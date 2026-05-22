import React, { useMemo, useState } from 'react';
import { Sparkles, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { useStore } from '@/store/useStore';

export const ViralAnalytics: React.FC = () => {
    const analyzedChannel = useStore((state) => state.analyzedChannel);
    const firstVideo = analyzedChannel?.videos?.[0];
    const ai = firstVideo?.aiStrategy || {};
    const [expanded, setExpanded] = useState(false);

    const views = Number(firstVideo?.views || 0);
    const completion = Number(firstVideo?.completionRate || 0);
    const retention3s = Number(ai?.retention_prediction?.retention_at_3s || 0);
    const scrollStop = Number(ai?.hook_analysis?.hook_strength || 0) * 10;
    const velocity = Number(ai?.temporal_analytics?.acceleration_score || 60);
    const attention = Math.round((retention3s * 0.5) + (scrollStop * 0.3) + (velocity * 0.2));
    const confidence = Number(ai?.analysis_confidence?.overall_confidence || 72);
    const confidencePenalty = views < 50 ? 40 : views < 200 ? 60 : 100;
    const maxScore = confidencePenalty;
    const aiScore = Math.min(Number(ai?.score || firstVideo?.aiScore || 0), maxScore);

    const predictedRange = useMemo(() => {
        const base = Number(firstVideo?.targetViews || Math.max(views * 2, 200));
        return {
            low: Math.round(base * 0.75),
            high: Math.round(base * 1.75),
        };
    }, [firstVideo?.targetViews, views]);

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-5">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">AI Growth Console</h1>
                <button onClick={() => setExpanded(!expanded)} className="text-xs px-3 py-2 rounded-lg bg-white/10">
                    {expanded ? <span className="flex items-center gap-1"><ChevronUp size={14} /> Compact</span> : <span className="flex items-center gap-1"><ChevronDown size={14} /> Expand</span>}
                </button>
            </div>

            <div className="glass-card p-5 border border-white/10">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <p className="text-xs text-gray-400">Promote Readiness</p>
                        <h2 className="font-semibold">{firstVideo?.title || 'No analyzed video yet'}</h2>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-400">AI Score (capped by confidence)</p>
                        <p className="text-2xl font-bold text-cyan-300">{aiScore}/{maxScore}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div className="rounded-xl bg-white/5 p-3"><p className="text-gray-400 text-xs">Attention</p><p className="font-bold text-green-400">{attention}%</p></div>
                    <div className="rounded-xl bg-white/5 p-3"><p className="text-gray-400 text-xs">Avg Watch</p><p className="font-bold text-amber-400">{ai?.retention_prediction?.avg_watch_seconds || 6.2}s</p></div>
                    <div className="rounded-xl bg-white/5 p-3"><p className="text-gray-400 text-xs">Completion</p><p className="font-bold text-amber-300">{completion}%</p></div>
                    <div className="rounded-xl bg-white/5 p-3"><p className="text-gray-400 text-xs">Replay</p><p className="font-bold text-purple-300">{ai?.retention_prediction?.replay_factor || 1.2}x</p></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm mt-3">
                    <div className="rounded-xl bg-white/5 p-3"><p className="text-gray-400 text-xs">Follow CTR</p><p className="font-bold">{ai?.conversion_metrics?.follow_ctr || 2.3}%</p></div>
                    <div className="rounded-xl bg-white/5 p-3"><p className="text-gray-400 text-xs">Profile CTR</p><p className="font-bold">{ai?.conversion_metrics?.profile_ctr || 5.1}%</p></div>
                    <div className="rounded-xl bg-white/5 p-3"><p className="text-gray-400 text-xs">Product CTR</p><p className="font-bold">{ai?.conversion_metrics?.product_ctr || 1.2}%</p></div>
                </div>

                <div className="mt-4 p-3 rounded-xl bg-cyan-500/10 border border-cyan-400/20">
                    <p className="text-xs text-cyan-300 flex items-center gap-2"><Sparkles size={14} /> AI Insight</p>
                    <p className="text-sm mt-1">{ai?.ai_insight || 'Strong opening frame nhung pacing giam sau 4s lam tut retention. Can rut ngan intro va dua CTA som hon.'}</p>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="rounded-xl bg-white/5 p-3">
                        <p className="text-xs text-gray-400">Predicted Range</p>
                        <p className="font-bold">{predictedRange.low} - {predictedRange.high} views</p>
                        <p className="text-xs text-gray-500">Confidence: {confidence}%</p>
                    </div>
                    <div className="rounded-xl bg-white/5 p-3">
                        <p className="text-xs text-gray-400">Velocity</p>
                        <p className="font-bold flex items-center gap-1"><TrendingUp size={14} className="text-green-400" /> {velocity >= 65 ? 'Accelerating' : 'Slowing'}</p>
                        <p className="text-xs text-gray-500">Trend Match: {ai?.trend_intelligence?.alignment_score >= 70 ? 'HIGH' : 'MEDIUM'}</p>
                    </div>
                </div>

                {expanded && (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="rounded-xl bg-white/5 p-3">
                            <p className="text-xs text-gray-400 mb-1">Temporal Analytics</p>
                            <p>1h: {ai?.temporal_analytics?.h1_views || 50} views</p>
                            <p>2h: {ai?.temporal_analytics?.h2_views || 400} views</p>
                            <p>4h: {ai?.temporal_analytics?.h4_views || 2000} views</p>
                        </div>
                        <div className="rounded-xl bg-white/5 p-3">
                            <p className="text-xs text-gray-400 mb-1">Recommended Actions</p>
                            {(ai?.recommended_actions || ['Repost luc 7PM', 'Rut intro 20%', 'Tang sang cover', 'Dua CTA vao giay 4']).slice(0, 4).map((a: string) => (
                                <p key={a}>- {a}</p>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
