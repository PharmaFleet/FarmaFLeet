import { api, handlePaginatedResponse } from '@/lib/axios';
import { Driver, PaginatedResponse } from '@/types';

export const driverService = {
getAll: async (params?: any): Promise<PaginatedResponse<Driver>> => {
    const response = await api.get('/drivers', { params });
    return handlePaginatedResponse<Driver>(response.data);
  },

  getAllOnline: async (): Promise<Driver[]> => {
    // For prototype, any available driver is considered online
    const response = await api.get('/drivers', { params: { active_only: true, size: 100 } });
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
  },

  getLocations: async (): Promise<any[]> => {
      const response = await api.get('/drivers/locations');
      return response.data;
  },

  getStats: async (id: number): Promise<{
    driver_id: number;
    orders_assigned: number;
    orders_delivered: number;
    last_order_assigned_at: string | null;
    online_duration_minutes: number | null;
    is_available: boolean;
  }> => {
      const response = await api.get(`/drivers/${id}/stats`);
      return response.data;
  }
};
