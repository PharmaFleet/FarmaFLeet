import { api, handlePaginatedResponse } from '@/lib/axios';
import { PaginatedResponse } from '@/types';

export interface Payment {
    id: number;
    order_id: number;
    amount: number;
    method: 'CASH' | 'KNET' | 'CREDIT_CARD';
    status: 'PENDING' | 'COMPLETED' | 'FAILED'; // Inferred from verified_at usually
    transaction_id?: string;
    collected_at: string;
    created_at?: string; // Fallback
    driver_id: number;
    driver_name?: string;
    verified_at?: string;
}

export const paymentService = {
  getAll: async (params?: any): Promise<PaginatedResponse<Payment>> => {
    const response = await api.get('/payments', { params });
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
  },

  verify: async (id: number) => {
      const response = await api.post(`/payments/${id}/clear`);
      return response.data;
  }
};
