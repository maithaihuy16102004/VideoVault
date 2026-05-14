import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { downloadApi } from '../api/download.api';
import type { CreateDownloadRequest, DownloadJobDto } from '../types/download';

/** Download history with auto-refresh for active jobs */
export const useDownloadHistory = (page = 1, pageSize = 20) => {
    return useQuery<DownloadJobDto[], Error>({
        queryKey: ['downloads', page, pageSize],
        queryFn: () => downloadApi.getHistory(page, pageSize),
        refetchInterval: (query) => {
            // Auto-poll every 3s if any jobs are still processing/pending
            const data = query.state.data;
            const hasActive = data?.some(j => j.status === 'pending' || j.status === 'processing');
            return hasActive ? 3000 : false;
        },
    });
};

/** Create a new download job */
export const useCreateDownload = () => {
    const queryClient = useQueryClient();
    return useMutation<DownloadJobDto, Error, CreateDownloadRequest>({
        mutationFn: (payload) => downloadApi.createJob(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['downloads'] });
        },
    });
};

/** Cancel a running job */
export const useCancelDownload = () => {
    const queryClient = useQueryClient();
    return useMutation<void, Error, string>({
        mutationFn: (id) => downloadApi.cancelJob(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['downloads'] });
        },
    });
};

/** Delete a finished/failed/cancelled job */
export const useDeleteDownload = () => {
    const queryClient = useQueryClient();
    return useMutation<void, Error, string>({
        mutationFn: (id) => downloadApi.deleteJob(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['downloads'] });
        },
    });
};
