import axios from 'axios';
import { useAuthStore } from '@/stores/useAuthStore';
import { PaginatedResponse } from '@/types';

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

// Response Interceptor: Handle 401 (Refresh or Logout)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Check if error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Attempt refresh
        const { refreshToken } = useAuthStore.getState();
        if (!refreshToken) throw new Error('No refresh token');

        // Call backend refresh endpoint
        // NOTE: Make sure this endpoint exists and works as expected
        const response = await axios.post(`${BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken, // Adjust payload key based on backend
        });

        const { access_token } = response.data;
        
        // Update store
        useAuthStore.getState().setToken(access_token);

        // Update header and retry
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
        
      } catch (refreshError) {
        // If refresh fails, logout user
        useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);
