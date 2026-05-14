import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';
import type { AuthResponse } from '../types/auth';

export const useAuth = () => {
    const queryClient = useQueryClient();

    const user = useQuery({
        queryKey: ['me'],
        queryFn: authApi.getMe,
        retry: false,
    });

    const login = useMutation({
        mutationFn: authApi.login,
        onSuccess: (data: AuthResponse) => {
            document.cookie = `access_token=${data.token}; path=/; max-age=3600`;
            queryClient.setQueryData(['me'], data.user);
        },
    });

    const register = useMutation({
        mutationFn: authApi.register,
        onSuccess: (data: AuthResponse) => {
            document.cookie = `access_token=${data.token}; path=/; max-age=3600`;
            queryClient.setQueryData(['me'], data.user);
        },
    });

    const logout = () => {
        document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
        queryClient.setQueryData(['me'], null);
        window.location.href = '/login';
    };

    return {
        user: user.data,
        isLoading: user.isLoading,
        login,
        register,
        logout,
    };
};
