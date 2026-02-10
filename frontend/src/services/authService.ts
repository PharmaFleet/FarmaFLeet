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
    // FastAPI OAuth2 requires form data
    const params = new URLSearchParams();
    params.append('username', credentials.email);
    params.append('password', credentials.password);

    const response = await api.post<LoginResponse>('/login/access-token', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const loginData = response.data;

    // Fetch user details separately if not included in login response
    const user = await authService.getCurrentUser();

    return {
      ...loginData,
      user,
    };
  },

  logout: async () => {
    await api.post('/auth/logout');
  },

  getCurrentUser: async () => {
    const response = await api.get('/users/me');
    return response.data;
  },
};
