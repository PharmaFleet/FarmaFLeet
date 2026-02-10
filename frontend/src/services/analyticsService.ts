import { api } from '@/lib/axios';
import { AnalyticsMetrics } from '@/types';

export const analyticsService = {
  getDashboardMetrics: async (): Promise<AnalyticsMetrics> => {
    const response = await api.get('/analytics/executive-dashboard');
    return response.data;
  }
};
