import { axiosInstance } from './axiosInstance';

export interface StartDubbingRequest {
    videoPath: string;
    targetLanguage: string;
    ttsEngine: string;
    enableVoiceClone: boolean;
    enableEmotion: boolean;
}

export interface DubbingStatusResponse {
    jobId: string;
    status: 'queued' | 'processing' | 'completed' | 'failed';
    progress: number;
    currentStage: string;
    outputVideoPath?: string;
    subtitlePath?: string;
    errorMessage?: string;
}

export interface TTSRequest {
    text: string;
    voiceId: string;
    engine?: string;
    speed?: number;
    emotion?: string;
    preserveAccent?: boolean;
}

export interface VoiceRecommendationRequest {
    category: string;
    audience: string;
    captionStyle: string;
    emotion: string;
    niche: string;
}

// ─── Engine Registry Types ───────────────────────────────────────────────

export interface TtsEngineInfo {
    id: string;
    name: string;
    description: string;
    status: 'ready' | 'offline' | 'beta';
    capabilities: string[];
}

export interface TtsVoiceInfo {
    id: string;
    name: string;
    language: string;
    country: string;
    gender: string;
    accent: string;
    engine: string;
    qualityScore: number;
    status: 'ready' | 'offline' | 'beta';
    tags: string[];
    category: string;
}

export interface TtsEngineRegistryResponse {
    engines: TtsEngineInfo[];
    voices: TtsVoiceInfo[];
    activeEngine: string;
}

export interface VoiceCloneRequest {
    sourceAudioBase64: string;
    text: string;
    targetLanguage?: string;
    preserveAccent?: boolean;
}

// ─── Dubbing Pipeline API ────────────────────────────────────────────────

export const startDubbingPipeline = async (request: StartDubbingRequest): Promise<DubbingStatusResponse> => {
    const response = await axiosInstance.post('/api/v1/dubbing/start', request);
    return response.data;
};

export const getDubbingStatus = async (jobId: string): Promise<DubbingStatusResponse> => {
    const response = await axiosInstance.get(`/api/v1/dubbing/status/${jobId}`);
    return response.data;
};

// ─── TTS Engine Registry API (ITtsProvider contract) ─────────────────────

import axios from 'axios';

const VOICE_SERVICE_URL = 'http://localhost:5052';

/** Parse error from a blob response (when server returns error JSON but client expects blob) */
async function parseErrorFromBlob(blob: Blob): Promise<string> {
    try {
        const text = await blob.text();
        const json = JSON.parse(text);
        return json.error || json.message || text;
    } catch {
        return 'Unknown voice service error';
    }
}

/** Check if Voice Service is reachable and return engine statuses */
export const checkVoiceServiceHealth = async (): Promise<{ status: string; engines: Record<string, string> } | null> => {
    try {
        const response = await axios.get(`${VOICE_SERVICE_URL}/api/health`, { timeout: 3000 });
        return response.data;
    } catch {
        return null;
    }
};

/** ITtsProvider.GetEngineRegistry */
export const getEngineRegistry = async (): Promise<TtsEngineRegistryResponse> => {
    const response = await axios.get(`${VOICE_SERVICE_URL}/api/registry`);
    return response.data;
};

/** ITtsProvider.GetVoices */
export const getVoices = async (engine?: string): Promise<TtsVoiceInfo[]> => {
    const url = engine
        ? `${VOICE_SERVICE_URL}/api/voices?engine=${engine}`
        : `${VOICE_SERVICE_URL}/api/voices`;
    const response = await axios.get(url);
    return response.data;
};

/** ITtsProvider.GenerateAsync — with timeout (30s) and cancellation support */
export const generateVoiceTTS = async (request: TTSRequest, signal?: AbortSignal): Promise<Blob> => {
    const response = await axios.post(`${VOICE_SERVICE_URL}/api/tts/generate`, {
        text: request.text,
        voice: request.voiceId,
        engine: request.engine || 'edge-tts',
        speed: request.speed,
        emotion: request.emotion,
        preserve_accent: request.preserveAccent ?? true,
    }, {
        responseType: 'blob',
        validateStatus: () => true,  // Don't throw on non-2xx
        timeout: 300000,  // 5m timeout for long texts
        signal,
    });

    if (response.status >= 400) {
        const errorMsg = await parseErrorFromBlob(response.data);
        throw new Error(`TTS Generate Error (${response.status}): ${errorMsg}`);
    }

    return response.data;
};

/** ITtsProvider.PreviewAsync — with timeout (15s) and cancellation support */
export const previewVoiceTTS = async (request: TTSRequest, signal?: AbortSignal): Promise<Blob> => {
    const previewText = request.text.trim().slice(0, 220);
    const response = await axios.post(`${VOICE_SERVICE_URL}/api/tts/preview`, {
        text: previewText,
        voice: request.voiceId,
        engine: request.engine || 'edge-tts',
        speed: request.speed
    }, {
        responseType: 'blob',
        validateStatus: () => true,  // Don't throw on non-2xx
        timeout: 15000,  // 15s timeout
        signal,
    });

    if (response.status >= 400) {
        const errorMsg = await parseErrorFromBlob(response.data);
        throw new Error(`TTS Preview Error (${response.status}): ${errorMsg}`);
    }

    return response.data;
};

/** Voice Clone — upload source audio and generate cloned speech */
export const cloneVoice = async (request: VoiceCloneRequest): Promise<Blob> => {
    const response = await axios.post(`${VOICE_SERVICE_URL}/api/tts/clone`, {
        source_audio_base64: request.sourceAudioBase64,
        text: request.text,
        target_language: request.targetLanguage || 'vi',
        preserve_accent: request.preserveAccent ?? true,
    }, {
        responseType: 'blob',
        validateStatus: () => true,  // Don't throw on non-2xx
    });

    if (response.status >= 400) {
        const errorMsg = await parseErrorFromBlob(response.data);
        throw new Error(`Voice Clone Error (${response.status}): ${errorMsg}`);
    }

    return response.data;
};

// ─── Subtitle Service API ────────────────────────────────────────────────

// Assuming Python Subtitle Service is on port 5051
export const extractSubtitles = async (file: File, language = 'auto'): Promise<{ jobId: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('language', language);
    const response = await axios.post('http://localhost:5051/extract', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

export interface SubtitleDiagnostics {
    video_duration?: number | null;
    audio_duration?: number | null;
    has_audio?: boolean | null;
    mean_volume_db?: number | null;
    speech_detected_seconds?: number | null;
    speech_ratio?: number | null;
    detected_language?: string | null;
    stt_segments?: number;
    confidence?: 'UNKNOWN' | 'LOW' | 'MEDIUM' | 'HIGH';
    duration_delta?: number | null;
}

export const getSubtitleStatus = async (jobId: string): Promise<{ status: string, progress?: number, stage?: string, srtContent?: string, srt_content?: string, error?: string, duration?: number, subtitleCount?: number, detectedLanguage?: string, diagnostics?: SubtitleDiagnostics, originalFilename?: string, fileSizeBytes?: number, sha256?: string, createdAt?: string, inputPath?: string, audioPath?: string, videoDuration?: number, audioDuration?: number }> => {
    const response = await axios.get(`http://localhost:5051/status/${jobId}`);
    return response.data;
};
