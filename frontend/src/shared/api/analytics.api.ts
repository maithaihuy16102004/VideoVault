import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5141/api/v1',
});

api.interceptors.request.use((config) => {
    const token = document.cookie.split('; ').find(row => row.startsWith('access_token='))?.split('=')[1];
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

export const analyticsApi = {
    getPlatformStats: async () => {
        const response = await api.get('/analytics/platforms');
        return response.data.data;
    },
    getRevenueStats: async () => {
        const response = await api.get('/analytics/revenue');
        return response.data.data;
    }
};
