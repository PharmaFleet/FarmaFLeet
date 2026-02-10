import axios from 'axios';
import { useAuthStore } from '@/store/useAuthStore';
import { PaginatedResponse } from '@/types';
import { toast } from '@/components/ui/use-toast';

// Retrieve API URL from env, default to local if not set
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach Token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Helper function to handle paginated responses
export const handlePaginatedResponse = <T>(data: any): PaginatedResponse<T> => {
  // If backend returns array, wrap it. Else return as is.
  if (Array.isArray(data)) {
    return {
      items: data,
      total: data.length,
      page: 1,
      size: 100,
      pages: 1
    };
  }
  return data;
};

// Track refresh state to prevent concurrent refresh attempts
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

// Response Interceptor: Handle 401 (Refresh or Logout)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Skip refresh attempt for auth endpoints to avoid loops
      if (originalRequest.url?.includes('/auth/')) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Wait for the ongoing refresh to complete
        return new Promise((resolve) => {
          subscribeTokenRefresh((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Attempt refresh
        const { refreshToken } = useAuthStore.getState();
        if (!refreshToken) throw new Error('No refresh token');

        // Use a separate axios instance to avoid interceptor loops
        const response = await axios.post(`${BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const { access_token } = response.data;

        // Update store
        useAuthStore.getState().setToken(access_token);

        // Notify all waiting requests
        onRefreshed(access_token);
        isRefreshing = false;

        // Update header and retry
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);

      } catch (refreshError) {
        // If refresh fails, show toast and logout user
        isRefreshing = false;
        refreshSubscribers = [];

        toast({
          variant: 'destructive',
          title: 'Session Expired',
          description: 'Please log in again.',
        });

        useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);
