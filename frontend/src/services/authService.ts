import { api } from '@/lib/axios';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: any; // Build proper user type
}

export const authService = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    // In real app: const response = await api.post<LoginResponse>('/auth/login', credentials);
    // return response.data;
    
    // Mock for now
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                access_token: 'mock_access_token',
                refresh_token: 'mock_refresh_token',
                token_type: 'bearer',
                user: {
                    id: 1,
                    email: credentials.email,
                    full_name: 'Test User',
                    role: 'admin'
                }
            })
        }, 1000)
    })
  },

  logout: async () => {
    await api.post('/auth/logout');
  },

  getCurrentUser: async () => {
    const response = await api.get('/users/me');
    return response.data;
  },
};
