import React from 'react';
import { Copy, Brain, TrendingUp, ShoppingBag, BarChart3, Layers, Target, Flame, Wand2 } from 'lucide-react';
import type { AiContentResult } from '../../shared/utils/aiContent';
import type { HashtagLayer } from '../../shared/utils/hashtags';

interface AiResultPanelProps {
    aiResult: AiContentResult;
}

const AiResultPanel: React.FC<AiResultPanelProps> = ({ aiResult }) => {
    return (
        <div className="mt-5 space-y-4">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-center gap-2 text-blue-300 text-xs font-bold uppercase tracking-wide">
                        <BarChart3 size={14} /> Source
                    </div>
                    <p className="mt-2 text-sm font-semibold text-white capitalize">{aiResult.sourcePlatform} / {aiResult.contentType}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-center gap-2 text-pink-300 text-xs font-bold uppercase tracking-wide">
                        <Layers size={14} /> Niche
                    </div>
                    <p className="mt-2 text-sm font-semibold text-white capitalize">{aiResult.detectedNiche} <span className="text-gray-500">{Math.round((aiResult.nicheConfidence || 0) * 100)}%</span></p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold uppercase tracking-wide">
                        <Target size={14} /> Audience
                    </div>
                    <p className="mt-2 text-sm font-semibold text-white">{aiResult.audience}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-center gap-2 text-orange-300 text-xs font-bold uppercase tracking-wide">
                        <Flame size={14} /> Hook Score
                    </div>
                    <p className="mt-2 text-2xl font-black text-white">{aiResult.hook_score}<span className="text-sm text-gray-500">/100</span></p>
                </div>
            </div>

            {/* Trigger / Viral / Fashion */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-xl border border-purple-500/15 bg-purple-500/5 p-4">
                    <div className="flex items-center gap-2 text-purple-300 text-xs font-bold uppercase tracking-wide">
                        <Brain size={14} /> Trigger
                    </div>
                    <p className="mt-2 text-sm font-semibold text-white">{aiResult.psychological_trigger}</p>
                </div>
                <div className="rounded-xl border border-green-500/15 bg-green-500/5 p-4">
                    <div className="flex items-center gap-2 text-green-300 text-xs font-bold uppercase tracking-wide">
                        <TrendingUp size={14} /> Viral Potential
                    </div>
                    <p className="mt-2 text-sm font-semibold text-white">{aiResult.viral_potential}</p>
                </div>
                <div className="rounded-xl border border-orange-500/15 bg-orange-500/5 p-4">
                    <div className="flex items-center gap-2 text-orange-300 text-xs font-bold uppercase tracking-wide">
                        <ShoppingBag size={14} /> Fashion Priority Mode
                    </div>
                    <p className="mt-2 text-sm font-semibold text-white">{aiResult.detectedNiche === 'fashion' ? 'ON' : 'OFF'}</p>
                </div>
            </div>

            {/* Input Signals */}
            <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
                <h4 className="text-sm font-bold text-white mb-3">Input signals</h4>
                <div className="flex flex-wrap gap-2">
                    {[
                        { label: 'Original caption', active: aiResult.inputSignals?.usedOriginalCaption },
                        { label: 'Top comments', active: aiResult.inputSignals?.usedComments },
                        { label: 'Vision', active: aiResult.inputSignals?.usedVisualInference },
                        { label: 'Audio', active: aiResult.inputSignals?.usedAudioInference },
                    ].map(({ label, active }) => (
                        <span key={label} className={`px-3 py-1 rounded-full border text-xs font-bold ${active ? 'bg-green-500/10 border-green-500/20 text-green-300' : 'bg-white/5 border-white/10 text-gray-500'}`}>
                            {label}: {active ? 'used' : 'not used'}
                        </span>
                    ))}
                </div>
            </div>

            {/* Behavioral + Viral Genome */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                            <Target size={16} className="text-cyan-300" /> Behavioral Prediction
                        </h4>
                        <span className="text-[11px] font-bold text-purple-300">{aiResult.caption_type}</span>
                    </div>
                    <div className="space-y-3">
                        {Object.entries(aiResult.behavioral_scores || {}).map(([name, score]) => (
                            <div key={name}>
                                <div className="flex items-center justify-between text-xs mb-1">
                                    <span className="font-bold text-gray-300">{name}</span>
                                    <span className="text-white font-black">{score}/100</span>
                                </div>
                                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                                    <div className="h-full rounded-full bg-cyan-400" style={{ width: `${Math.min(100, Math.max(0, score))}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
                    <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                        <Brain size={16} className="text-purple-300" /> Viral Genome
                    </h4>
                    <div className="flex flex-wrap gap-2 mb-4">
                        {(aiResult.viral_genome || []).map(signal => (
                            <span key={signal} className="px-2.5 py-1 rounded-md border border-purple-500/20 bg-purple-500/10 text-xs font-bold text-purple-100">{signal}</span>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {Object.entries(aiResult.feature_vector || {}).map(([key, value]) => (
                            <div key={key} className="rounded-lg bg-black/20 border border-white/10 p-2">
                                <div className="text-[10px] uppercase font-black text-gray-500">{key.replaceAll('_', ' ')}</div>
                                <div className="text-xs font-semibold text-gray-100 mt-1">{String(value)}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Similar Viral Patterns */}
            <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
                <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                    <TrendingUp size={16} className="text-green-300" /> Similar Viral Pattern Memory
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {(aiResult.similar_viral_patterns || []).map(item => (
                        <div key={item.pattern} className="rounded-lg border border-white/10 bg-black/20 p-3">
                            <div className="text-sm font-bold text-white">{item.pattern}</div>
                            <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400">
                                <span>{item.expected_metric}</span>
                                <span className="text-green-300 font-black">{Math.round(item.confidence * 100)}%</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Hook + Caption + CTA */}
            <div className="rounded-xl bg-purple-500/5 border border-purple-500/10 p-4 space-y-4">
                {aiResult.psychological_analysis && (
                    <div>
                        <h4 className="text-sm font-semibold text-purple-300 mb-2 flex items-center gap-2">
                            <Brain size={15} /> Phân tích retention & tâm lý
                        </h4>
                        <p className="text-sm leading-6 text-gray-300">{aiResult.psychological_analysis}</p>
                    </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-semibold text-orange-300 flex items-center gap-2">
                                <Flame size={15} /> Viral Hook
                            </h4>
                            <button type="button" onClick={() => navigator.clipboard.writeText(aiResult.optimized_hook || '')} className="text-gray-400 hover:text-white transition-colors" title="Copy hook">
                                <Copy size={14} />
                            </button>
                        </div>
                        <p className="text-sm text-gray-100 font-semibold">{aiResult.optimized_hook}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-semibold text-purple-300 flex items-center gap-2">
                                <Wand2 size={15} /> Viral Caption
                            </h4>
                            <button type="button" onClick={() => navigator.clipboard.writeText(aiResult.optimized_caption || aiResult.caption || '')} className="text-gray-400 hover:text-white transition-colors" title="Copy caption">
                                <Copy size={14} />
                            </button>
                        </div>
                        <p className="text-sm text-gray-100 font-semibold whitespace-pre-wrap">{aiResult.optimized_caption || aiResult.caption}</p>
                    </div>
                </div>
                <div className="rounded-xl border border-green-500/15 bg-green-500/5 p-4">
                    <h4 className="text-sm font-semibold text-green-300 mb-2 flex items-center gap-2">
                        <ShoppingBag size={15} /> CTA TikTok Shop
                    </h4>
                    <p className="text-sm text-gray-100 font-semibold">{aiResult.cta}</p>
                </div>
            </div>

            {/* Smart Hashtags */}
            <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                            <Layers size={16} className="text-cyan-300" /> Smart Hashtags Ranking
                        </h4>
                        <p className="mt-1 text-xs text-gray-500">{aiResult.hashtag_opportunity?.recommended_mix}</p>
                    </div>
                    <button type="button" onClick={() => navigator.clipboard.writeText((aiResult.smart_hashtags || []).map(tag => tag.tag).join(' '))} className="text-gray-400 hover:text-white transition-colors" title="Copy hashtags">
                        <Copy size={14} />
                    </button>
                </div>
                <div className="space-y-3">
                    {(['HIGH DISCOVERY', 'LOW COMPETITION HIGH ENGAGEMENT', 'TREND VN', 'SHOP CONVERSION'] as HashtagLayer[]).map(layer => {
                        const tags = (aiResult.smart_hashtags || []).filter(tag => tag.layer === layer);
                        if (!tags.length) return null;
                        return (
                            <div key={layer}>
                                <div className="text-[11px] font-black text-gray-400 mb-2">{layer}</div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {tags.map(tag => (
                                        <div key={`${layer}-${tag.tag}`} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="font-bold text-sm text-white">{tag.tag}</span>
                                                {tag.score && <span className="text-[11px] text-cyan-300 font-bold">{tag.score}/100</span>}
                                            </div>
                                            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-400">
                                                {tag.posts && <span>{tag.posts} posts</span>}
                                                {tag.likes && <span>{tag.likes} likes</span>}
                                                {tag.growth && <span>{tag.growth}</span>}
                                                {tag.saturation && <span>{tag.saturation} saturation</span>}
                                                {tag.competition_density !== undefined && <span>density {tag.competition_density}</span>}
                                                {tag.trend_half_life_days !== undefined && <span>{tag.trend_half_life_days}d life</span>}
                                            </div>
                                            {tag.purpose && <p className="mt-1 text-[11px] text-gray-500">{tag.purpose}</p>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* VN Viral Memory + Caption A/B */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
                    <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                        <BarChart3 size={16} className="text-blue-300" /> VN Viral Memory
                    </h4>
                    <div className="space-y-2 text-sm text-gray-300">
                        {Object.entries(aiResult.memory_signals || {}).map(([key, value]) => (
                            <div key={key} className="flex gap-3">
                                <span className="w-20 shrink-0 text-xs uppercase font-bold text-gray-500">{key}</span>
                                <span>{value}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
                    <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                        <Wand2 size={16} className="text-pink-300" /> Caption A/B Generator
                    </h4>
                    <div className="space-y-3">
                        {(aiResult.hooks_ab || []).slice(0, 5).map((hook, i) => (
                            <div key={hook} className="text-sm text-gray-300">
                                <span className="text-gray-500 font-bold mr-2">H{i + 1}</span>{hook}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* A/B Test Sets */}
            <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
                <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-white">5 caption + hashtag sets để test</h4>
                    <button type="button" onClick={() => navigator.clipboard.writeText((aiResult.captions_ab || []).map((caption, i) => `${i + 1}. ${caption}\n${(aiResult.hashtag_sets_ab?.[i] || []).join(' ')}`).join('\n\n'))} className="text-gray-400 hover:text-white transition-colors" title="Copy A/B sets">
                        <Copy size={14} />
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(aiResult.captions_ab || []).slice(0, 5).map((caption, i) => (
                        <div key={`${caption}-${i}`} className="rounded-lg border border-white/10 bg-black/20 p-3">
                            <div className="text-[11px] text-purple-300 font-black mb-2">TEST {i + 1}</div>
                            <p className="text-sm text-gray-100 mb-2">{caption}</p>
                            <div className="flex flex-wrap gap-1.5">
                                {(aiResult.hashtag_sets_ab?.[i] || []).map(tag => (
                                    <span key={tag} className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-[11px] text-gray-300">{tag}</span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AiResultPanel;
