import { api } from '@/lib/axios';

export interface Warehouse {
  id: number;
  name: string;
  address?: string;
}

export const warehouseService = {
  getAll: async () => {
    const response = await api.get('/warehouses');
    return response.data;
  }
};
