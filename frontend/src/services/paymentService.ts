import { api, handlePaginatedResponse } from '@/lib/axios';
import { PaginatedResponse } from '@/types';

export interface Payment {
    id: number;
    order_id: number;
    amount: number;
    method: 'CASH' | 'KNET' | 'CREDIT_CARD';
    status: 'PENDING' | 'COMPLETED' | 'FAILED';
    transaction_id?: string;
    created_at: string;
    collected_by?: number; // driver_id
}

export const paymentService = {
  getAll: async (params?: any): Promise<PaginatedResponse<Payment>> => {
    const response = await api.get('/payments/pending', { params });
    return handlePaginatedResponse<Payment>(response.data);
  },

  getStats: async () => {
      const response = await api.get('/payments/stats');
      return response.data;
  },

  export: async () => {
      const response = await api.get('/payments/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'payments.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
  }
};
