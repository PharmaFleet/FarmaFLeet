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

  batchCancel: async (orderIds: number[], reason?: string) => {
      const response = await api.post('/orders/batch-cancel', { order_ids: orderIds, reason });
      return response.data;
  },

  batchDelete: async (orderIds: number[]) => {
      const response = await api.post('/orders/batch-delete', { order_ids: orderIds });
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
  },

  cancelOrder: async (orderId: number, reason?: string) => {
    const response = await api.post(`/orders/${orderId}/cancel`, { reason: reason || null });
    return response.data;
  },

  returnOrder: async (orderId: number, reason: string) => {
    const response = await api.post(`/orders/${orderId}/return`, { reason });
    return response.data;
  },

  batchReturn: async (orderIds: number[], reason: string) => {
    const response = await api.post('/orders/batch-return', { order_ids: orderIds, reason });
    return response.data;
  },

  deleteOrder: async (orderId: number) => {
    const response = await api.delete(`/orders/${orderId}`);
    return response.data;
  },

  archiveOrder: async (orderId: number) => {
    const response = await api.post(`/orders/${orderId}/archive`);
    return response.data;
  },

  unarchiveOrder: async (orderId: number) => {
    const response = await api.post(`/orders/${orderId}/unarchive`);
    return response.data;
  },

  exportOrders: async (params?: Record<string, any>) => {
    const response = await api.post('/orders/export', null, {
      params,
      responseType: 'blob',
    });
    // Trigger download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'orders.xlsx');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
