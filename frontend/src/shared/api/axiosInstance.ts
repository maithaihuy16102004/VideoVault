import axios from 'axios';

// Axios instance with base URL from environment variables.
// Vite injects env variables prefixed with VITE_.
const baseURL = import.meta.env.VITE_API_BASE_URL ?? '/';

export const axiosInstance = axios.create({
    baseURL,
    // You can add interceptors for auth tokens here.
    withCredentials: true,
});
