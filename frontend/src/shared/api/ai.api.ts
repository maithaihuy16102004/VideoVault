import { axiosInstance } from './axiosInstance';

export interface RewriteRequest {
    text: string;
    tone: string;
    targetLanguage?: string;
}

export interface RewriteResponse {
    originalText: string;
    rewrittenText: string;
    tone: string;
}

export interface TranslateRequest {
    text: string;
    targetLanguage: string;
}

export interface TranslateResponse {
    translatedText: string;
}

export const rewriteText = async (request: RewriteRequest): Promise<RewriteResponse> => {
    const response = await axiosInstance.post('/api/ai/rewrite', request);
    return response.data;
};

export const translateText = async (request: TranslateRequest): Promise<TranslateResponse> => {
    const response = await axiosInstance.post('/api/ai/translate', request);
    return response.data;
};
