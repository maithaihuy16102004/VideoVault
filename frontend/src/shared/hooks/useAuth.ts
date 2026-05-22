import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';
import type { AuthResponse } from '../types/auth';

export const useAuth = () => {
    const queryClient = useQueryClient();

    // Only attempt to fetch user if we have a token cookie
    const hasToken = () => document.cookie.split('; ').some(row => row.startsWith('access_token='));

    const user = useQuery({
        queryKey: ['me'],
        queryFn: authApi.getMe,
        retry: false,
        // Don't call API at all if there's no token cookie
        enabled: hasToken(),
        // Keep session data fresh for 30 minutes, don't refetch on every mount
        staleTime: 30 * 60 * 1000,
        // Cache the user data for 1 day
        gcTime: 24 * 60 * 60 * 1000,
    });

    const login = useMutation({
        mutationFn: authApi.login,
        onSuccess: (data: AuthResponse) => {
            // Store token for 7 days (604800 seconds)
            document.cookie = `access_token=${data.token}; path=/; max-age=604800; SameSite=Lax`;
            queryClient.setQueryData(['me'], data.user);
        },
    });

    const register = useMutation({
        mutationFn: authApi.register,
        onSuccess: (data: AuthResponse) => {
            // Store token for 7 days (604800 seconds)
            document.cookie = `access_token=${data.token}; path=/; max-age=604800; SameSite=Lax`;
            queryClient.setQueryData(['me'], data.user);
        },
    });

    const logout = () => {
        document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
        queryClient.setQueryData(['me'], null);
        queryClient.clear();
        window.location.href = '/login';
    };

    return {
        user: user.data,
        // Only show loading if we have a token and are actively fetching
        isLoading: user.isFetching && !user.data,
        login,
        register,
        logout,
    };
};
