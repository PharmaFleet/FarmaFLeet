import { api, handlePaginatedResponse } from '@/lib/axios';
import { Order, PaginatedResponse } from '@/types';

export const orderService = {
  getAll: async (params?: any): Promise<PaginatedResponse<Order>> => {
    const response = await api.get('/orders', { params });
    return handlePaginatedResponse<Order>(response.data);
  },

  getById: async (id: number): Promise<Order> => {
    const response = await api.get(`/orders/${id}`);
    return response.data;
  },
  
  create: async (data: any): Promise<Order> => { // data: OrderCreate
      const response = await api.post('/orders', data);
      return response.data;
  },

  assignDriver: async (orderId: number, driverId: number) => {
    const response = await api.post(`/orders/${orderId}/assign`, { driver_id: driverId });
    return response.data;
  },
  
  unassignDriver: async (orderId: number) => {
      const response = await api.post(`/orders/${orderId}/unassign`);
      return response.data;
  },

  batchAssign: async (assignments: { order_id: number, driver_id: number }[]) => {
      const response = await api.post('/orders/batch-assign', assignments);
      return response.data;
  },
  
  importExcel: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      // Let Axios set the Content-Type with boundary automatically
      // We must explicitly unset the default application/json header
      const response = await api.post('/orders/import', formData, {
        headers: {
          'Content-Type': undefined
        }
      });
      return response.data;
  }
};
