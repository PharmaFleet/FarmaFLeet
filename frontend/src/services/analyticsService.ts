import { api } from '@/lib/axios';
import { AnalyticsMetrics, DailyOrderData, DriverPerformanceData, WarehouseOrderData } from '@/types';

export const analyticsService = {
  getDashboardMetrics: async (): Promise<AnalyticsMetrics> => {
    const response = await api.get('/analytics/executive-dashboard');
    return response.data;
  },

  getDailyOrders: async (days: number = 7): Promise<DailyOrderData[]> => {
    const response = await api.get('/analytics/daily-orders', { params: { days } });
    return response.data;
  },

  getDriverPerformance: async (): Promise<DriverPerformanceData[]> => {
    const response = await api.get('/analytics/driver-performance');
    return response.data;
  },

  getOrdersByWarehouse: async (): Promise<WarehouseOrderData[]> => {
    const response = await api.get('/analytics/orders-by-warehouse');
    return response.data;
  },

  batchCancelStale: async (daysThreshold: number = 7): Promise<{ cancelled: number; message: string }> => {
    const response = await api.post('/orders/batch-cancel-stale', { days_threshold: daysThreshold });
    return response.data;
  },
};
