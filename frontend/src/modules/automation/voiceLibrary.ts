export type VoiceEngineId = 'edge-tts' | 'vieneu-ai' | 'viettts' | 'xtts-v2';

export type VoiceGender = 'Nữ' | 'Nam' | 'Đa giọng' | 'Giọng clone';

export type VoiceStatus = 'ready' | 'offline' | 'beta';

export interface VoiceInfo {
    id: string;
    name: string;
    language: string;
    country: string;
    gender: VoiceGender;
    accent: string;
    engine: VoiceEngineId;
    qualityScore: number;
    speakingRate: number;
    emotionalSupport: boolean;
    previewUrl?: string;
    tags: string[];
    category: string;
    status: VoiceStatus;
}

export interface VoiceEngineInfo {
    id: VoiceEngineId;
    name: string;
    description: string;
    status: VoiceStatus;
    capabilities: string[];
}

export interface VoiceRecommendationInput {
    category: string;
    audience: string;
    captionStyle: string;
    emotion: string;
    niche: string;
}

export interface VoiceRecommendation {
    voice: VoiceInfo;
    confidence: number;
    reason: string;
}

export const voiceEngines: VoiceEngineInfo[] = [
    {
        id: 'edge-tts',
        name: 'Microsoft Edge TTS',
        description: 'Giọng neural thời gian thực, ổn định cho TikTok, Reels và Shorts.',
        status: 'ready',
        capabilities: ['Tạo nhanh', 'Giọng neural', 'Đa ngôn ngữ', 'Miễn phí'],
    },
    {
        id: 'vieneu-ai',
        name: 'VieNeu AI',
        description: 'Đã kết nối adapter VieNeu giả lập qua Edge TTS với tinh chỉnh giọng.',
        status: 'ready',
        capabilities: ['Giả lập giọng', 'Tinh chỉnh Pitch/Rate', 'Giữ đúng engine'],
    },
    {
        id: 'viettts',
        name: 'VietTTS',
        description: 'Chưa kết nối engine VietTTS thật, không dùng fallback Edge TTS để tránh sai giọng.',
        status: 'offline',
        capabilities: ['Chờ adapter VietTTS', 'Không fallback Edge TTS', 'Tối ưu tiếng Việt'],
    },
    {
        id: 'xtts-v2',
        name: 'XTTS-v2 Voice Clone',
        description: 'Chưa kết nối model XTTS-v2 thật, clone giọng sẽ không dùng Edge TTS giả lập.',
        status: 'offline',
        capabilities: ['Chờ model XTTS-v2', 'Clone zero-shot', 'Không fallback Edge TTS'],
    },
];

export const voiceLibrary: VoiceInfo[] = [
    {
        id: 'vi-VN-HoaiMyNeural',
        name: 'Hoài My Neural',
        language: 'Tiếng Việt',
        country: 'Việt Nam',
        gender: 'Nữ',
        accent: 'Miền Nam',
        engine: 'edge-tts',
        qualityScore: 94,
        speakingRate: 1,
        emotionalSupport: true,
        tags: ['Thời trang', 'TikTok viral', 'Trẻ trung', 'Thân thiện'],
        category: 'Nữ miền Nam',
        status: 'ready',
    },
    {
        id: 'vi-VN-NamMinhNeural',
        name: 'Nam Minh Neural',
        language: 'Tiếng Việt',
        country: 'Việt Nam',
        gender: 'Nam',
        accent: 'Miền Bắc',
        engine: 'edge-tts',
        qualityScore: 92,
        speakingRate: 1,
        emotionalSupport: true,
        tags: ['Tài chính', 'Review công nghệ', 'Tin tức', 'Chuyên nghiệp'],
        category: 'Nam miền Bắc',
        status: 'ready',
    },
    {
        id: 'en-US-JennyNeural',
        name: 'Jenny Neural',
        language: 'Tiếng Anh',
        country: 'Hoa Kỳ',
        gender: 'Nữ',
        accent: 'Mỹ',
        engine: 'edge-tts',
        qualityScore: 91,
        speakingRate: 1,
        emotionalSupport: true,
        tags: ['Nữ Mỹ', 'Thuyết minh', 'Giải thích'],
        category: 'Nữ tiếng Anh Mỹ',
        status: 'ready',
    },
    {
        id: 'en-US-GuyNeural',
        name: 'Guy Neural',
        language: 'Tiếng Anh',
        country: 'Hoa Kỳ',
        gender: 'Nam',
        accent: 'Mỹ',
        engine: 'edge-tts',
        qualityScore: 90,
        speakingRate: 1,
        emotionalSupport: true,
        tags: ['Nam Mỹ', 'Truyền cảm hứng', 'Review'],
        category: 'Nam tiếng Anh Mỹ',
        status: 'ready',
    },
    {
        id: 'en-GB-SoniaNeural',
        name: 'Sonia Neural',
        language: 'Tiếng Anh',
        country: 'Vương quốc Anh',
        gender: 'Nữ',
        accent: 'Anh',
        engine: 'edge-tts',
        qualityScore: 89,
        speakingRate: 1,
        emotionalSupport: true,
        tags: ['Nữ Anh', 'Cao cấp', 'Editorial'],
        category: 'Nữ tiếng Anh Anh',
        status: 'ready',
    },
    {
        id: 'en-GB-RyanNeural',
        name: 'Ryan Neural',
        language: 'Tiếng Anh',
        country: 'Vương quốc Anh',
        gender: 'Nam',
        accent: 'Anh',
        engine: 'edge-tts',
        qualityScore: 89,
        speakingRate: 1,
        emotionalSupport: true,
        tags: ['Nam Anh', 'Tài liệu', 'Uy tín'],
        category: 'Nam tiếng Anh Anh',
        status: 'ready',
    },
    {
        id: 'ja-JP-NanamiNeural',
        name: 'Nanami Neural',
        language: 'Tiếng Nhật',
        country: 'Nhật Bản',
        gender: 'Nữ',
        accent: 'Tokyo',
        engine: 'edge-tts',
        qualityScore: 90,
        speakingRate: 1,
        emotionalSupport: true,
        tags: ['Nhật Bản', 'Anime', 'Đời sống'],
        category: 'Tiếng Nhật',
        status: 'ready',
    },
    {
        id: 'ko-KR-SunHiNeural',
        name: 'SunHi Neural',
        language: 'Tiếng Hàn',
        country: 'Hàn Quốc',
        gender: 'Nữ',
        accent: 'Seoul',
        engine: 'edge-tts',
        qualityScore: 90,
        speakingRate: 1,
        emotionalSupport: true,
        tags: ['Hàn Quốc', 'K-Beauty', 'Giải trí'],
        category: 'Tiếng Hàn',
        status: 'ready',
    },
    {
        id: 'zh-CN-XiaoxiaoNeural',
        name: 'Xiaoxiao Neural',
        language: 'Tiếng Trung',
        country: 'Trung Quốc',
        gender: 'Nữ',
        accent: 'Quan thoại',
        engine: 'edge-tts',
        qualityScore: 91,
        speakingRate: 1,
        emotionalSupport: true,
        tags: ['Tiếng Trung', 'Quan thoại', 'Thương mại'],
        category: 'Tiếng Trung',
        status: 'ready',
    },
    {
        id: 'es-ES-ElviraNeural',
        name: 'Elvira Neural',
        language: 'Tiếng Tây Ban Nha',
        country: 'Tây Ban Nha',
        gender: 'Nữ',
        accent: 'Tây Ban Nha',
        engine: 'edge-tts',
        qualityScore: 88,
        speakingRate: 1,
        emotionalSupport: true,
        tags: ['Tây Ban Nha', 'Đời sống', 'Du lịch'],
        category: 'Tiếng Tây Ban Nha',
        status: 'ready',
    },
    {
        id: 'fr-FR-DeniseNeural',
        name: 'Denise Neural',
        language: 'Tiếng Pháp',
        country: 'Pháp',
        gender: 'Nữ',
        accent: 'Pháp',
        engine: 'edge-tts',
        qualityScore: 89,
        speakingRate: 1,
        emotionalSupport: true,
        tags: ['Tiếng Pháp', 'Làm đẹp', 'Cao cấp'],
        category: 'Tiếng Pháp',
        status: 'ready',
    },
    {
        id: 'de-DE-KatjaNeural',
        name: 'Katja Neural',
        language: 'Tiếng Đức',
        country: 'Đức',
        gender: 'Nữ',
        accent: 'Đức',
        engine: 'edge-tts',
        qualityScore: 88,
        speakingRate: 1,
        emotionalSupport: true,
        tags: ['Tiếng Đức', 'Giáo dục', 'Sản phẩm'],
        category: 'Tiếng Đức',
        status: 'ready',
    },
    {
        id: 'ru-RU-SvetlanaNeural',
        name: 'Svetlana Neural',
        language: 'Tiếng Nga',
        country: 'Nga',
        gender: 'Nữ',
        accent: 'Moscow',
        engine: 'edge-tts',
        qualityScore: 87,
        speakingRate: 1,
        emotionalSupport: true,
        tags: ['Tiếng Nga', 'Thuyết minh'],
        category: 'Tiếng Nga',
        status: 'ready',
    },
    {
        id: 'vieneu-female-north',
        name: 'Nữ miền Bắc',
        language: 'Tiếng Việt',
        country: 'Việt Nam',
        gender: 'Nữ',
        accent: 'Miền Bắc',
        engine: 'vieneu-ai',
        qualityScore: 93,
        speakingRate: 1,
        emotionalSupport: true,
        tags: ['Voice Tuned', 'Giữ vùng miền', 'Kể chuyện'],
        category: 'Nữ miền Bắc',
        status: 'ready',
    },
    {
        id: 'vieneu-male-north',
        name: 'Nam miền Bắc',
        language: 'Tiếng Việt',
        country: 'Việt Nam',
        gender: 'Nam',
        accent: 'Miền Bắc',
        engine: 'vieneu-ai',
        qualityScore: 92,
        speakingRate: 1,
        emotionalSupport: true,
        tags: ['Voice Tuned', 'Tài chính', 'Uy tín'],
        category: 'Nam miền Bắc',
        status: 'ready',
    },
    {
        id: 'vieneu-female-south',
        name: 'Nữ miền Nam',
        language: 'Tiếng Việt',
        country: 'Việt Nam',
        gender: 'Nữ',
        accent: 'Miền Nam',
        engine: 'vieneu-ai',
        qualityScore: 93,
        speakingRate: 1,
        emotionalSupport: true,
        tags: ['Voice Tuned', 'Thời trang', 'Bán hàng'],
        category: 'Nữ miền Nam',
        status: 'ready',
    },
    {
        id: 'vieneu-male-south',
        name: 'Nam miền Nam',
        language: 'Tiếng Việt',
        country: 'Việt Nam',
        gender: 'Nam',
        accent: 'Miền Nam',
        engine: 'vieneu-ai',
        qualityScore: 91,
        speakingRate: 1,
        emotionalSupport: true,
        tags: ['Voice Tuned', 'Review', 'Tự nhiên'],
        category: 'Nam miền Nam',
        status: 'ready',
    },
    {
        id: 'vieneu-podcast-female',
        name: 'Podcast nữ',
        language: 'Tiếng Việt',
        country: 'Việt Nam',
        gender: 'Nữ',
        accent: 'Trung tính',
        engine: 'vieneu-ai',
        qualityScore: 95,
        speakingRate: 0.95,
        emotionalSupport: true,
        tags: ['Podcast', 'Drama', 'Kể chuyện'],
        category: 'Podcast nữ',
        status: 'ready',
    },
    {
        id: 'vieneu-podcast-male',
        name: 'Podcast nam',
        language: 'Tiếng Việt',
        country: 'Việt Nam',
        gender: 'Nam',
        accent: 'Trung tính',
        engine: 'vieneu-ai',
        qualityScore: 94,
        speakingRate: 0.95,
        emotionalSupport: true,
        tags: ['Podcast', 'Truyền cảm hứng', 'Tài liệu'],
        category: 'Podcast nam',
        status: 'ready',
    },
    {
        id: 'viettts-female-01',
        name: 'Nữ dự phòng 01',
        language: 'Tiếng Việt',
        country: 'Việt Nam',
        gender: 'Nữ',
        accent: 'Trung tính',
        engine: 'viettts',
        qualityScore: 78,
        speakingRate: 1,
        emotionalSupport: false,
        tags: ['Dự phòng', 'Mã nguồn mở'],
        category: 'Giọng nữ dự phòng',
        status: 'offline',
    },
    {
        id: 'viettts-female-02',
        name: 'Nữ dự phòng 02',
        language: 'Tiếng Việt',
        country: 'Việt Nam',
        gender: 'Nữ',
        accent: 'Trung tính',
        engine: 'viettts',
        qualityScore: 77,
        speakingRate: 1,
        emotionalSupport: false,
        tags: ['Dự phòng', 'Mã nguồn mở'],
        category: 'Giọng nữ dự phòng',
        status: 'offline',
    },
    {
        id: 'viettts-male-01',
        name: 'Nam dự phòng 01',
        language: 'Tiếng Việt',
        country: 'Việt Nam',
        gender: 'Nam',
        accent: 'Trung tính',
        engine: 'viettts',
        qualityScore: 76,
        speakingRate: 1,
        emotionalSupport: false,
        tags: ['Dự phòng', 'Mã nguồn mở'],
        category: 'Giọng nam dự phòng',
        status: 'offline',
    },
    {
        id: 'viettts-male-02',
        name: 'Nam dự phòng 02',
        language: 'Tiếng Việt',
        country: 'Việt Nam',
        gender: 'Nam',
        accent: 'Trung tính',
        engine: 'viettts',
        qualityScore: 76,
        speakingRate: 1,
        emotionalSupport: false,
        tags: ['Dự phòng', 'Mã nguồn mở'],
        category: 'Giọng nam dự phòng',
        status: 'offline',
    },
    {
        id: 'xtts-clone-voice',
        name: 'Clone từ giọng mẫu',
        language: 'Đa ngôn ngữ',
        country: 'Toàn cầu',
        gender: 'Giọng clone',
        accent: 'Theo file mẫu',
        engine: 'xtts-v2',
        qualityScore: 90,
        speakingRate: 1,
        emotionalSupport: true,
        tags: ['Tải giọng mẫu', 'Embedding', 'Reup TikTok'],
        category: 'Clone giọng',
        status: 'offline',
    },
];

export const recommendationDefaults: VoiceRecommendationInput = {
    category: 'Thời trang',
    audience: 'Nữ 18-24',
    captionStyle: 'Caption ngắn, dễ viral',
    emotion: 'Hào hứng',
    niche: 'Làm đẹp và phong cách sống',
};

export function recommendVoice(input: VoiceRecommendationInput): VoiceRecommendation {
    const haystack = `${input.category} ${input.audience} ${input.captionStyle} ${input.emotion} ${input.niche}`.toLowerCase();
    const pick = (id: string) => voiceLibrary.find((voice) => voice.id === id) ?? voiceLibrary[0];
    const pickReady = (preferredId: string, fallbackId = 'vi-VN-HoaiMyNeural') => {
        const preferred = pick(preferredId);
        return preferred.status === 'ready' ? preferred : pick(fallbackId);
    };

    if (haystack.includes('thời trang') || haystack.includes('fashion') || haystack.includes('beauty') || haystack.includes('làm đẹp') || haystack.includes('nữ 18')) {
        return {
            voice: pick('vi-VN-HoaiMyNeural'),
            confidence: 92,
            reason: 'Nội dung thời trang và làm đẹp thường hợp giọng nữ miền Nam ấm, sáng và dễ tạo cảm giác gần gũi.',
        };
    }

    if (haystack.includes('tài chính') || haystack.includes('finance') || haystack.includes('business') || haystack.includes('đầu tư')) {
        return {
            voice: pick('vi-VN-NamMinhNeural'),
            confidence: 90,
            reason: 'Nội dung tài chính cần giọng nam miền Bắc rõ chữ, chắc và tạo cảm giác chuyên nghiệp.',
        };
    }

    if (haystack.includes('story') || haystack.includes('drama') || haystack.includes('podcast') || haystack.includes('kể chuyện')) {
        return {
            voice: pickReady('vieneu-podcast-female'),
            confidence: 88,
            reason: 'VieNeu podcast chưa được kết nối engine thật, nên hệ thống đề xuất giọng Edge TTS tiếng Việt đang khả dụng.',
        };
    }

    if (haystack.includes('động lực') || haystack.includes('motivation') || haystack.includes('fitness') || haystack.includes('mạnh mẽ')) {
        return {
            voice: pickReady('vieneu-podcast-male', 'vi-VN-NamMinhNeural'),
            confidence: 86,
            reason: 'VieNeu podcast nam chưa được kết nối engine thật, nên hệ thống đề xuất Nam Minh Neural đang khả dụng.',
        };
    }

    return {
        voice: pick('vi-VN-HoaiMyNeural'),
        confidence: 82,
        reason: 'Đây là giọng tiếng Việt mặc định có độ tự nhiên cao, tạo nhanh và phù hợp đa số nội dung mạng xã hội.',
    };
}
