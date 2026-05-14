import Cookies from 'js-cookie';

/** Truncate text to maxLen characters, append "..." if exceeded */
export const truncateText = (text: string, maxLen = 50): string => {
    if (!text) return '';
    return text.length > maxLen ? text.slice(0, maxLen) + '...' : text;
};

/** Format bytes to human-readable */
export const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

/** Format ISO date to readable */
export const formatDate = (iso?: string): string => {
    if (!iso) return '-';
    const d = new Date(iso);
    return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

/** Format relative time (e.g. "3 phút trước") */
export const timeAgo = (iso?: string): string => {
    if (!iso) return '-';
    const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (seconds < 60) return 'vừa xong';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} phút trước`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} giờ trước`;
    return `${Math.floor(seconds / 86400)} ngày trước`;
};

/** Prompt user to choose save folder + download file there (File System Access API) */
export const saveFileAs = async (fileUrl: string, suggestedName: string) => {
    try {
        const token = Cookies.get('access_token');
        const downloadUrl = `${fileUrl}?access_token=${token || ''}`;
        
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = downloadUrl;
        a.download = suggestedName;
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        setTimeout(() => {
            document.body.removeChild(a);
        }, 100);
        
        return true;
    } catch (err) {
        console.warn('Save failed:', err);
        return false;
    }
};
