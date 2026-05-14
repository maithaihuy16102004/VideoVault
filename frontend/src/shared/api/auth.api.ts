import axios from 'axios';
import type { LoginRequest, RegisterRequest, AuthResponse, UserDto } from '../types/auth';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5141/api/v1',
    headers: { 'Content-Type': 'application/json' },
});

export const authApi = {
    login: async (payload: LoginRequest): Promise<AuthResponse> => {
        const response = await api.post<{ success: boolean; data: AuthResponse }>('/auth/login', payload);
        return response.data.data;
    },

    register: async (payload: RegisterRequest): Promise<AuthResponse> => {
        const response = await api.post<{ success: boolean; data: AuthResponse }>('/auth/register', payload);
        return response.data.data;
    },

    getMe: async (): Promise<UserDto> => {
        const token = document.cookie.split('; ').find(row => row.startsWith('access_token='))?.split('=')[1];
        const response = await api.get<{ success: boolean; data: UserDto }>('/auth/me', {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data.data;
    }
};
