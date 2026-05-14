import { axiosInstance } from '@/shared/api/axiosInstance';
import type {
    DownloadJobDto,
    CreateDownloadRequest,
    AccountInfoDto,
    HashtagInfoDto,
    BatchDownloadRequest,
    BatchDownloadResponse,
} from '@/shared/types/download';

/**
 * Unified Download API — connects React frontend to .NET backend,
 * which orchestrates video_downloader.py under the hood.
 */
export const downloadApi = {
    // ─── Single URL Download ───────────────────────────────────
    /** Create a download job (triggers video_downloader.py on backend) */
    createJob: async (payload: CreateDownloadRequest): Promise<DownloadJobDto> => {
        const { data } = await axiosInstance.post<{ success: boolean; data: DownloadJobDto }>(
            '/api/v1/downloads', payload
        );
        return data.data;
    },

    /** Get paginated download history */
    getHistory: async (page = 1, pageSize = 20): Promise<DownloadJobDto[]> => {
        const { data } = await axiosInstance.get<{ success: boolean; data: DownloadJobDto[] }>(
            '/api/v1/downloads', { params: { page, pageSize } }
        );
        return data.data;
    },

    /** Get single job status (for polling) */
    getJob: async (id: string): Promise<DownloadJobDto> => {
        const { data } = await axiosInstance.get<{ success: boolean; data: DownloadJobDto }>(
            `/api/v1/downloads/${id}`
        );
        return data.data;
    },

    /** Cancel a pending/processing job */
    cancelJob: async (id: string): Promise<void> => {
        await axiosInstance.put(`/api/v1/downloads/${id}/cancel`);
    },

    /** Delete a job record */
    deleteJob: async (id: string): Promise<void> => {
        await axiosInstance.delete(`/api/v1/downloads/${id}`);
    },

    // ─── Account Scraping ──────────────────────────────────────
    /** Scrape latest videos from an account (calls video_downloader.py --mode account) */
    scrapeAccount: async (username: string, platform = 'douyin'): Promise<AccountInfoDto> => {
        const { data } = await axiosInstance.get<{ success: boolean; data: AccountInfoDto }>(
            '/api/v1/downloads/scrape/account',
            { params: { username, platform } }
        );
        return data.data;
    },

    // ─── Hashtag Scraping ──────────────────────────────────────
    /** Scrape trending videos by hashtag (calls video_downloader.py --mode hashtag) */
    scrapeHashtag: async (hashtag: string, platform = 'douyin'): Promise<HashtagInfoDto> => {
        const { data } = await axiosInstance.get<{ success: boolean; data: HashtagInfoDto }>(
            '/api/v1/downloads/scrape/hashtag',
            { params: { hashtag, platform } }
        );
        return data.data;
    },

    // ─── Batch Download ────────────────────────────────────────
    /** Download multiple videos at once (batch) */
    batchDownload: async (payload: BatchDownloadRequest): Promise<BatchDownloadResponse> => {
        const { data } = await axiosInstance.post<{ success: boolean; data: BatchDownloadResponse }>(
            '/api/v1/downloads/batch', payload
        );
        return data.data;
    },

    // ─── File Access ───────────────────────────────────────────
    /** Get download URL for a completed file */
    getFileUrl: (jobId: string): string => {
        const baseURL = import.meta.env.VITE_API_BASE_URL ?? '';
        return `${baseURL}/api/v1/downloads/${jobId}/file`;
    },
};

/** Legacy named exports for backward compatibility */
export const fetchVideosByAccount = downloadApi.scrapeAccount;
export const startDownload = async (videoUrl: string) => {
    const job = await downloadApi.createJob({ url: videoUrl });
    return { jobId: job.id };
};
