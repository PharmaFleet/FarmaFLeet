import { api } from '@/lib/axios';
import { User, PaginatedResponse } from '@/types';

export const userService = {
  getAll: async (params?: any): Promise<PaginatedResponse<User>> => {
    const response = await api.get('/admin/users', { params });
    return response.data;
  },

  create: async (data: any): Promise<User> => {
      const response = await api.post('/admin/users', data);
      return response.data;
  },

  update: async (id: number, data: any): Promise<User> => {
      const response = await api.put(`/admin/users/${id}`, data);
      return response.data;
  },
  
  // Example for toggling active status
  toggleStatus: async (id: number, isActive: boolean) => {
      return api.patch(`/admin/users/${id}`, { is_active: isActive });
  }
};
