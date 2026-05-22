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
    speed?: number;
}

export const startDubbingPipeline = async (request: StartDubbingRequest): Promise<DubbingStatusResponse> => {
    const response = await axiosInstance.post('/api/v1/dubbing/start', request);
    return response.data;
};

export const getDubbingStatus = async (jobId: string): Promise<DubbingStatusResponse> => {
    const response = await axiosInstance.get(`/api/v1/dubbing/status/${jobId}`);
    return response.data;
};

// Directly pointing to microservices if API Gateway doesn't route them yet
import axios from 'axios';

// Assuming Python Voice Service is on port 5052
export const generateVoiceTTS = async (request: TTSRequest): Promise<Blob> => {
    const response = await axios.post('http://localhost:5052/api/tts/generate', request, {
        responseType: 'blob'
    });
    return response.data;
};

// Assuming Python Subtitle Service is on port 5051
export const extractSubtitles = async (file: File): Promise<{ jobId: string }> => {
    const formData = new FormData();
    formData.append('video', file);
    const response = await axios.post('http://localhost:5051/extract', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

export const getSubtitleStatus = async (jobId: string): Promise<{ status: string, srt_content?: string, error?: string }> => {
    const response = await axios.get(`http://localhost:5051/status/${jobId}`);
    return response.data;
};
