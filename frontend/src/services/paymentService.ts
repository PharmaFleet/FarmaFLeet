import { api } from '@/lib/axios';
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
    // Ideally backend has /payments. If not in Plan, we might mock or use orders?
    // Plan 3.9 mentions "Payment Reconciliation" but not specific endpoints list.
    // Let's assume /payments based on standard REST.
    const response = await api.get('/payments', { params });
    return response.data;
  },

  getStats: async () => {
      const response = await api.get('/payments/stats');
      return response.data;
  }
};
