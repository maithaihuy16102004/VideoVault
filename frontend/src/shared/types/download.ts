/** ── Types matching backend DownloadJobDto ── */
export interface DownloadJobDto {
    id: string;
    originalUrl: string;
    platform: string;
    title: string | null;
    quality: string;
    status: string;
    progress: number;
    fileSize: number | null;
    fileUrl: string | null;
    errorMessage: string | null;
    createdAt: string;
    completedAt: string | null;
    subtitlePath: string | null;
}

export interface CreateDownloadRequest {
    url: string;
    quality?: string;
}

/** ── Types for Account / Hashtag scraping ── */
export interface ScrapedVideo {
    videoId: string;
    url: string;
    title: string;
    thumbnailUrl: string;
    author: string;
    duration: number;        // seconds
    views: string;
    likes: string;
    platform: string;
}

export interface AccountInfoDto {
    username: string;
    nickname: string;
    avatar: string;
    followers: string;
    likes: string;
    videoCount: number;
    videos: ScrapedVideo[];
}

export interface HashtagInfoDto {
    hashtag: string;
    viewCount: string;
    videoCount: number;
    videos: ScrapedVideo[];
}

export interface BatchDownloadRequest {
    urls: string[];
    quality?: string;
}

export interface BatchDownloadResponse {
    jobs: DownloadJobDto[];
    failed: string[];
}

/** Legacy compat */
export interface VideoDto {
    id: string;
    title: string;
    thumbnailUrl: string;
    duration?: number;
}
