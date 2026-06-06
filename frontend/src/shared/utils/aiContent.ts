// AI Content types and fallback logic for TikTok VN Growth Intelligence
import { buildSmartHashtags, type SmartHashtag } from './hashtags';

export type AiContentResult = {
    sourcePlatform?: string;
    contentType?: string;
    detectedNiche?: string;
    nicheConfidence?: number;
    inputSignals?: {
        usedOriginalCaption?: boolean;
        usedComments?: boolean;
        usedVisualInference?: boolean;
        usedAudioInference?: boolean;
    };
    hookScore?: number;
    trigger?: string;
    viralPotential?: string;
    hook?: string;
    optimized_caption?: string;
    caption?: string;
    optimized_hook?: string;
    psychological_analysis?: string;
    psychological_trigger?: string;
    audience?: string;
    hook_score?: number;
    viral_potential?: string;
    cta?: string;
    style_archetype?: string;
    hashtags?: string[];
    smart_hashtags?: SmartHashtag[];
    hooks_ab?: string[];
    captions_ab?: string[];
    hashtag_sets_ab?: string[][];
    caption_type?: string;
    behavioral_scores?: Record<string, number>;
    feature_vector?: Record<string, string | number>;
    similar_viral_patterns?: Array<{
        pattern: string;
        expected_metric: string;
        confidence: number;
    }>;
    viral_genome?: string[];
    hashtag_opportunity?: {
        formula?: string;
        recommended_mix?: string;
        avg_score?: number;
    };
    memory_signals?: {
        hook?: string;
        retention?: string;
        saves?: string;
        shares?: string;
        ctr?: string;
    };
};

export const withAiFallbacks = (data: Partial<AiContentResult>): AiContentResult => {
    const smartHashtags = data.smart_hashtags?.length ? data.smart_hashtags : buildSmartHashtags(data.hashtags);
    const detectedNiche = data.detectedNiche || 'fashion';
    const isFashion = detectedNiche === 'fashion';
    const style = data.style_archetype || (isFashion ? 'Clean Girl' : detectedNiche);
    const hook = data.hook || data.optimized_hook || (isFashion ? 'Đổi đúng 1 món mà outfit nhìn khác hẳn...' : 'Có một chi tiết nhỏ làm video này đáng xem...');
    const caption = data.caption || data.optimized_caption || (isFashion ? 'Mấy bà mặc tone này nhìn sang hơn hẳn luôn á 😭' : 'Cái này ai từng gặp rồi sẽ hiểu luôn á 😭');
    const hookScore = data.hookScore ?? data.hook_score ?? 92;
    const trigger = data.trigger || data.psychological_trigger || (isFashion ? 'Effortless beauty aspiration' : 'Relatable curiosity');
    const viralPotential = data.viralPotential || data.viral_potential || 'High';
    const behavioralScores = data.behavioral_scores || {
        'Hook Power': hookScore,
        'Emotional Curiosity': isFashion ? 78 : 68,
        'Save Intent': isFashion ? 82 : 66,
        'Shareability': isFashion ? 70 : 72,
        'Purchase Intent': isFashion ? 76 : 48,
    };
    const featureVector = data.feature_vector || {
        hook_type: isFashion ? 'transformation' : 'curiosity',
        aesthetic: style,
        pacing: isFashion ? 'fast outfit cuts' : 'medium',
        avg_cut_duration: isFashion ? '1.1s' : '1.8s',
        face_presence: isFashion ? 'high-estimated' : 'medium-estimated',
        text_density: 'medium',
        emotional_tone: trigger,
    };

    return {
        ...data,
        sourcePlatform: data.sourcePlatform || 'unknown',
        contentType: data.contentType || 'unknown',
        detectedNiche,
        nicheConfidence: data.nicheConfidence ?? 0.72,
        inputSignals: data.inputSignals || {
            usedOriginalCaption: true,
            usedComments: false,
            usedVisualInference: false,
            usedAudioInference: false,
        },
        hookScore,
        trigger,
        viralPotential,
        hook,
        audience: data.audience || (isFashion ? `Nữ 18-24 / ${style} / TikTok Shop` : `TikTok Việt Nam / ${detectedNiche} / Organic reach`),
        hook_score: hookScore,
        psychological_trigger: trigger,
        viral_potential: viralPotential,
        optimized_hook: hook,
        optimized_caption: caption,
        caption_type: data.caption_type || (isFashion ? 'Transformation / save intent' : 'Curiosity / retention'),
        behavioral_scores: behavioralScores,
        feature_vector: featureVector,
        similar_viral_patterns: data.similar_viral_patterns?.length ? data.similar_viral_patterns : [
            { pattern: 'Khong nghi + small change', expected_metric: 'retention/save', confidence: 0.76 },
            { pattern: 'May ba / girl-talk opener', expected_metric: 'share/comment', confidence: 0.72 },
            { pattern: 'Set 1 hay set 2', expected_metric: 'comment bait', confidence: 0.61 },
        ],
        viral_genome: data.viral_genome?.length ? data.viral_genome : [
            String(featureVector.aesthetic || style),
            isFashion ? 'visible outfit payoff' : 'curiosity payoff',
            isFashion ? 'TikTok Shop compatible CTA' : 'save/share CTA',
        ],
        hashtag_opportunity: data.hashtag_opportunity || {
            formula: '(engagement_velocity * save_rate * watch_time) / competition_density',
            recommended_mix: '2 large, 3 medium, 3 emerging, 2 hyper niche',
            avg_score: Math.round(smartHashtags.reduce((sum, tag) => sum + (tag.score || 0), 0) / Math.max(smartHashtags.length, 1)),
        },
        cta: data.cta || (isFashion ? 'Có gắn link outfit ở giỏ hàng nha ✨' : 'Lưu lại khi cần nha ✨'),
        style_archetype: style,
        smart_hashtags: smartHashtags,
        hashtags: smartHashtags.map(tag => tag.tag),
        hooks_ab: data.hooks_ab?.length ? data.hooks_ab : [
            'Mấy bà ơi, outfit này cứu dáng thật...',
            'Đổi đúng 1 món mà khác hẳn luôn á',
            'Không nghĩ mặc lên lại sang vậy 😭',
            'Từ ngày phối kiểu này mình đỡ mất thời gian hơn',
            'Ai thích clean girl thử tone này nha',
        ],
        captions_ab: data.captions_ab?.length ? data.captions_ab : [
            caption,
            'Mấy bà lưu lại công thức phối này nha, đơn giản mà lên dáng xinh lắm.',
            'Không cần quá nhiều món, chọn đúng tone là outfit nhìn có gu liền.',
            'Set này hợp đi chơi lẫn đi làm luôn, mình có gắn giỏ hàng nha.',
            'Ai đang bí outfit thì thử kiểu này, nhìn sạch và sang hơn hẳn.',
        ],
        hashtag_sets_ab: data.hashtag_sets_ab?.length ? data.hashtag_sets_ab : [
            smartHashtags.slice(0, 5).map(tag => tag.tag),
            smartHashtags.filter(tag => tag.layer !== 'HIGH DISCOVERY').slice(0, 5).map(tag => tag.tag),
            smartHashtags.filter(tag => tag.layer === 'SHOP CONVERSION' || tag.layer === 'LOW COMPETITION HIGH ENGAGEMENT').map(tag => tag.tag),
            ['#phoido', '#outfitxinh', '#cleangirl', '#reviewdo', '#tiktokshopvn'],
            ['#localfashion', '#thoitrangnu', '#vayxinh', '#outfittiktok'],
        ],
        memory_signals: data.memory_signals || {
            hook: '"Mấy bà ơi" đang hợp nữ 18-24 hơn POV trong fashion VN',
            retention: 'Cần payoff hình ảnh trong 1-3 giây đầu',
            saves: 'Công thức phối đồ và checklist dễ kéo save',
            shares: 'Caption girl talk tăng share trong nhóm bạn',
            ctr: 'CTA mềm về giỏ hàng tốt hơn ép mua trực tiếp',
        },
    };
};
