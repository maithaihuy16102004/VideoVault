// Hashtag types and database for TikTok VN Growth Intelligence

export type HashtagLayer = 'HIGH DISCOVERY' | 'LOW COMPETITION HIGH ENGAGEMENT' | 'TREND VN' | 'SHOP CONVERSION';

export type SmartHashtag = {
    tag: string;
    posts?: string;
    likes?: string;
    engagement?: string;
    saturation?: string;
    growth?: string;
    layer: HashtagLayer;
    score?: number;
    purpose?: string;
    opportunity_score?: number;
    competition_density?: number;
    trend_half_life_days?: number;
};

export const hashtagDb: SmartHashtag[] = [
    { tag: '#outfittiktok', posts: '12M', likes: '4.1B', engagement: 'high', saturation: 'medium', growth: 'rising', layer: 'HIGH DISCOVERY', score: 88 },
    { tag: '#girlstyle', posts: '3.4M', likes: '980M', engagement: 'medium', saturation: 'medium', growth: 'stable', layer: 'HIGH DISCOVERY', score: 72 },
    { tag: '#xuhuong', posts: '50M+', likes: '12B+', engagement: 'low', saturation: 'high', growth: 'stable', layer: 'HIGH DISCOVERY', score: 46 },
    { tag: '#vayxinh', posts: '300K', likes: '800M', engagement: 'high', saturation: 'low', growth: 'rising', layer: 'LOW COMPETITION HIGH ENGAGEMENT', score: 94 },
    { tag: '#phoido', posts: '650K', likes: '1.2B', engagement: 'high', saturation: 'medium', growth: 'rising', layer: 'LOW COMPETITION HIGH ENGAGEMENT', score: 89 },
    { tag: '#thoitrangnu', posts: '1.8M', likes: '2.2B', engagement: 'medium', saturation: 'medium', growth: 'stable', layer: 'LOW COMPETITION HIGH ENGAGEMENT', score: 78 },
    { tag: '#outfitxinh', posts: '820K', likes: '1.6B', engagement: 'high', saturation: 'medium', growth: 'rising', layer: 'LOW COMPETITION HIGH ENGAGEMENT', score: 87 },
    { tag: '#cleangirl', posts: '2M', likes: '900M', engagement: 'medium', saturation: 'medium', growth: 'rising', layer: 'TREND VN', score: 83 },
    { tag: '#localfashion', posts: '410K', likes: '690M', engagement: 'high', saturation: 'low', growth: 'rising', layer: 'TREND VN', score: 91 },
    { tag: '#ulzzangstyle', posts: '780K', likes: '1.1B', engagement: 'medium', saturation: 'medium', growth: 'rising', layer: 'TREND VN', score: 80 },
    { tag: '#reviewdo', posts: '520K', likes: '860M', engagement: 'high', saturation: 'low', growth: 'rising', layer: 'SHOP CONVERSION', score: 90 },
    { tag: '#tiktokshopvn', posts: '1.1M', likes: '1.9B', engagement: 'medium', saturation: 'medium', growth: 'rising', layer: 'SHOP CONVERSION', score: 84 },
    { tag: '#tiktokshop', posts: '8M', likes: '9.4B', engagement: 'medium', saturation: 'high', growth: 'stable', layer: 'SHOP CONVERSION', score: 62 },
];

export const deadOrSpamTags = new Set(['#fyp', '#viral', '#foryou', '#foryoupage']);

export const normalizeTag = (tag: string) => tag.startsWith('#') ? tag.toLowerCase().replace(/\s+/g, '') : `#${tag.toLowerCase().replace(/\s+/g, '')}`;

export const buildSmartHashtags = (incoming: string[] = []): SmartHashtag[] => {
    const incomingSet = new Set(incoming.map(normalizeTag).filter(tag => !deadOrSpamTags.has(tag)));
    const merged = hashtagDb.map(tag => ({
        ...tag,
        score: (tag.score || 0) + (incomingSet.has(normalizeTag(tag.tag)) ? 8 : 0),
    }));

    const bestByLayer = ['HIGH DISCOVERY', 'LOW COMPETITION HIGH ENGAGEMENT', 'TREND VN', 'SHOP CONVERSION']
        .flatMap(layer => merged
            .filter(tag => tag.layer === layer)
            .sort((a, b) => (b.score || 0) - (a.score || 0))
            .slice(0, layer === 'LOW COMPETITION HIGH ENGAGEMENT' ? 3 : 2)
        );

    return bestByLayer;
};
