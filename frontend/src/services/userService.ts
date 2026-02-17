import { api, handlePaginatedResponse } from '@/lib/axios';
import { User, PaginatedResponse } from '@/types';

export const userService = {
  getAll: async (params?: any): Promise<PaginatedResponse<User>> => {
    const queryParams = {
      page: params?.page || 1,
      size: params?.limit || 10,
      search: params?.search
    };
    const response = await api.get('/users', { params: queryParams });
    return handlePaginatedResponse<User>(response.data);
  },

  create: async (data: any): Promise<User> => {
    const response = await api.post('/users', data);
    return response.data;
  },

  update: async (id: number, data: any): Promise<User> => {
    const response = await api.put(`/users/${id}`, data);
    return response.data;
  },

  toggleStatus: async (id: number, isActive: boolean) => {
    return api.put(`/users/${id}`, { is_active: isActive });
  },

  resetPassword: async (id: number, password: string) => {
    return api.put(`/users/${id}`, { password });
  }
};
