import { api, handlePaginatedResponse } from '@/lib/axios';
import { Driver, PaginatedResponse } from '@/types';

export const driverService = {
getAll: async (params?: any): Promise<PaginatedResponse<Driver>> => {
    const response = await api.get('/drivers', { params });
    return handlePaginatedResponse<Driver>(response.data);
  },

  getAllOnline: async (): Promise<Driver[]> => {
    // For prototype, any available driver is considered online
    const response = await api.get('/drivers', { params: { is_available: true } });
    const data = response.data;
    return Array.isArray(data) ? data : (data.items || []);
  },

  getById: async (id: number): Promise<Driver> => {
    const response = await api.get(`/drivers/${id}`);
    return response.data;
  },

  create: async (data: any): Promise<Driver> => {
      const response = await api.post('/drivers', data);
      return response.data;
  },

  update: async (id: number, data: any): Promise<Driver> => {
      const response = await api.put(`/drivers/${id}`, data);
      return response.data;
  },

  updateStatus: async (id: number, is_available: boolean): Promise<Driver> => {
      const response = await api.patch(`/drivers/${id}/status`, { is_available });
      return response.data;
  }
};
