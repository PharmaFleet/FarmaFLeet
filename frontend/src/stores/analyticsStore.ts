import { create } from 'zustand';
import { format, subDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter } from 'date-fns';
import { api } from '@/lib/axios';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export type DateRangePreset = 'today' | 'week' | 'month' | 'quarter' | 'custom';

export interface DateRange {
  startDate: Date;
  endDate: Date;
  preset: DateRangePreset;
}

export interface KPIData {
  total_orders: number;
  completed_deliveries: number;
  average_delivery_time: number; // in minutes
  driver_utilization: number; // percentage
  on_time_delivery_rate: number; // percentage
  pending_orders: number;
}

export interface OrdersByStatus {
  status: string;
  count: number;
  color: string;
}

export interface OrdersByWarehouse {
  warehouse_name: string;
  order_count: number;
}

export interface DeliveryTimeData {
  area: string;
  average_time: number; // in minutes
}

export interface DriverPerformance {
  id: number;
  name: string;
  total_deliveries: number;
  average_delivery_time: number; // in minutes
  on_time_percentage: number;
}

export interface AnalyticsData {
  kpi: KPIData;
  ordersByStatus: OrdersByStatus[];
  ordersByWarehouse: OrdersByWarehouse[];
  deliveryTimes: DeliveryTimeData[];
  driverPerformance: DriverPerformance[];
}

export interface TrendData {
  direction: 'up' | 'down' | 'stable';
  percentage: number;
}

export interface KPICardData {
  title: string;
  value: number;
  trend: TrendData;
  icon: string;
  format: 'number' | 'duration' | 'percentage';
}

interface AnalyticsState {
  // Date range
  dateRange: DateRange;
  
  // Data
  analyticsData: AnalyticsData | null;
  kpiCards: KPICardData[];
  
  // Loading states
  isLoading: boolean;
  isExporting: boolean;
  
  // Error state
  error: string | null;
  
  // Actions
  setDateRange: (range: DateRange) => void;
  setPresetRange: (preset: DateRangePreset, customStart?: Date, customEnd?: Date) => void;
  fetchAnalytics: () => Promise<void>;
  exportData: (format: 'csv' | 'excel') => void;
  clearError: () => void;
}

const getPresetDates = (preset: DateRangePreset, customStart?: Date, customEnd?: Date): { startDate: Date; endDate: Date } => {
  const now = new Date();
  
  switch (preset) {
    case 'today':
      return {
        startDate: startOfDay(now),
        endDate: endOfDay(now),
      };
    case 'week':
      return {
        startDate: startOfWeek(now, { weekStartsOn: 1 }),
        endDate: endOfWeek(now, { weekStartsOn: 1 }),
      };
    case 'month':
      return {
        startDate: startOfMonth(now),
        endDate: endOfMonth(now),
      };
    case 'quarter':
      return {
        startDate: startOfQuarter(now),
        endDate: endOfQuarter(now),
      };
    case 'custom':
      if (customStart && customEnd) {
        return {
          startDate: startOfDay(customStart),
          endDate: endOfDay(customEnd),
        };
      }
      // Fallback to today if custom dates not provided
      return {
        startDate: startOfDay(now),
        endDate: endOfDay(now),
      };
    default:
      return {
        startDate: startOfDay(now),
        endDate: endOfDay(now),
      };
  }
};

const statusColorMap: Record<string, string> = {
  pending: '#f59e0b', // amber-500
  assigned: '#3b82f6', // blue-500
  in_transit: '#8b5cf6', // violet-500
  delivered: '#10b981', // emerald-500
  cancelled: '#ef4444', // red-500
  picked_up: '#06b6d4', // cyan-500
  out_for_delivery: '#6366f1', // indigo-500
  rejected: '#dc2626', // red-600
  returned: '#f97316', // orange-500
  failed: '#7f1d1d', // red-900
};

// Mock data generator for development
const generateMockData = (dateRange: DateRange): AnalyticsData => {
  const statusData: OrdersByStatus[] = [
    { status: 'pending', count: Math.floor(Math.random() * 50) + 10, color: statusColorMap.pending },
    { status: 'assigned', count: Math.floor(Math.random() * 40) + 15, color: statusColorMap.assigned },
    { status: 'in_transit', count: Math.floor(Math.random() * 60) + 20, color: statusColorMap.in_transit },
    { status: 'delivered', count: Math.floor(Math.random() * 200) + 100, color: statusColorMap.delivered },
    { status: 'cancelled', count: Math.floor(Math.random() * 15) + 5, color: statusColorMap.cancelled },
  ];

  const warehouseData: OrdersByWarehouse[] = [
    { warehouse_name: 'Main Warehouse', order_count: Math.floor(Math.random() * 150) + 80 },
    { warehouse_name: 'North Branch', order_count: Math.floor(Math.random() * 100) + 50 },
    { warehouse_name: 'South Hub', order_count: Math.floor(Math.random() * 80) + 40 },
    { warehouse_name: 'East Center', order_count: Math.floor(Math.random() * 60) + 30 },
    { warehouse_name: 'West Depot', order_count: Math.floor(Math.random() * 50) + 25 },
  ];

  const deliveryTimeData: DeliveryTimeData[] = [
    { area: 'Downtown', average_time: Math.floor(Math.random() * 20) + 25 },
    { area: 'City Center', average_time: Math.floor(Math.random() * 15) + 30 },
    { area: 'Outskirts', average_time: Math.floor(Math.random() * 30) + 45 },
  ];

  const driverPerformanceData: DriverPerformance[] = [
    { id: 1, name: 'Ahmed Hassan', total_deliveries: 145, average_delivery_time: 32, on_time_percentage: 94.5 },
    { id: 2, name: 'Mohammed Ali', total_deliveries: 132, average_delivery_time: 35, on_time_percentage: 91.2 },
    { id: 3, name: 'Khalid Omar', total_deliveries: 128, average_delivery_time: 30, on_time_percentage: 96.8 },
    { id: 4, name: 'Yusuf Ibrahim', total_deliveries: 119, average_delivery_time: 38, on_time_percentage: 89.4 },
    { id: 5, name: 'Omar Farooq', total_deliveries: 115, average_delivery_time: 33, on_time_percentage: 93.1 },
    { id: 6, name: 'Abdullah Khan', total_deliveries: 108, average_delivery_time: 36, on_time_percentage: 88.9 },
    { id: 7, name: 'Ali Raza', total_deliveries: 102, average_delivery_time: 31, on_time_percentage: 95.2 },
    { id: 8, name: 'Hassan Saeed', total_deliveries: 98, average_delivery_time: 34, on_time_percentage: 90.7 },
    { id: 9, name: 'Bilal Ahmad', total_deliveries: 94, average_delivery_time: 37, on_time_percentage: 87.3 },
    { id: 10, name: 'Tariq Mahmood', total_deliveries: 89, average_delivery_time: 39, on_time_percentage: 85.6 },
  ];

  const totalDelivered = statusData.find(s => s.status === 'delivered')?.count || 0;
  const totalOrders = statusData.reduce((acc, s) => acc + s.count, 0);

  return {
    kpi: {
      total_orders: totalOrders,
      completed_deliveries: totalDelivered,
      average_delivery_time: Math.floor(Math.random() * 15) + 30,
      driver_utilization: Math.floor(Math.random() * 20) + 75,
      on_time_delivery_rate: Math.floor(Math.random() * 10) + 88,
      pending_orders: statusData.find(s => s.status === 'pending')?.count || 0,
    },
    ordersByStatus: statusData,
    ordersByWarehouse: warehouseData,
    deliveryTimes: deliveryTimeData,
    driverPerformance: driverPerformanceData,
  };
};

const generateKPICards = (data: AnalyticsData): KPICardData[] => {
  const randomTrend = (): TrendData => ({
    direction: Math.random() > 0.5 ? 'up' : Math.random() > 0.3 ? 'down' : 'stable',
    percentage: Math.floor(Math.random() * 20) + 1,
  });

  return [
    {
      title: 'Total Orders',
      value: data.kpi.total_orders,
      trend: randomTrend(),
      icon: 'Package',
      format: 'number',
    },
    {
      title: 'Completed Deliveries',
      value: data.kpi.completed_deliveries,
      trend: randomTrend(),
      icon: 'CheckCircle',
      format: 'number',
    },
    {
      title: 'Avg Delivery Time',
      value: data.kpi.average_delivery_time,
      trend: randomTrend(),
      icon: 'Clock',
      format: 'duration',
    },
    {
      title: 'Driver Utilization',
      value: data.kpi.driver_utilization,
      trend: randomTrend(),
      icon: 'Users',
      format: 'percentage',
    },
    {
      title: 'On-Time Rate',
      value: data.kpi.on_time_delivery_rate,
      trend: randomTrend(),
      icon: 'TrendingUp',
      format: 'percentage',
    },
    {
      title: 'Pending Orders',
      value: data.kpi.pending_orders,
      trend: randomTrend(),
      icon: 'Hourglass',
      format: 'number',
    },
  ];
};

export const useAnalyticsStore = create<AnalyticsState>((set, get) => {
  const today = new Date();
  
  return {
    dateRange: {
      startDate: startOfDay(today),
      endDate: endOfDay(today),
      preset: 'today',
    },
    analyticsData: null,
    kpiCards: [],
    isLoading: false,
    isExporting: false,
    error: null,

    setDateRange: (range: DateRange) => {
      set({ dateRange: range });
    },

    setPresetRange: (preset: DateRangePreset, customStart?: Date, customEnd?: Date) => {
      const dates = getPresetDates(preset, customStart, customEnd);
      set({ 
        dateRange: { 
          ...dates, 
          preset 
        } 
      });
    },

    fetchAnalytics: async () => {
      set({ isLoading: true, error: null });
      
      try {
        const { dateRange } = get();
        const startDateStr = format(dateRange.startDate, 'yyyy-MM-dd');
        const endDateStr = format(dateRange.endDate, 'yyyy-MM-dd');
        
        // Try to fetch from API first
        try {
          const response = await api.get('/analytics/dashboard', {
            params: {
              start_date: startDateStr,
              end_date: endDateStr,
            },
          });
          
          const data = response.data as AnalyticsData;
          set({ 
            analyticsData: data, 
            kpiCards: generateKPICards(data),
            isLoading: false 
          });
        } catch (apiError) {
          // Fallback to mock data for development
          console.warn('API not available, using mock data:', apiError);
          const mockData = generateMockData(dateRange);
          set({ 
            analyticsData: mockData, 
            kpiCards: generateKPICards(mockData),
            isLoading: false 
          });
        }
      } catch (error) {
        console.error('Error fetching analytics:', error);
        set({ 
          error: error instanceof Error ? error.message : 'Failed to fetch analytics data',
          isLoading: false 
        });
      }
    },

    exportData: (format: 'csv' | 'excel') => {
      const { analyticsData, dateRange } = get();
      
      if (!analyticsData) {
        set({ error: 'No data available to export' });
        return;
      }

      set({ isExporting: true });
      
      try {
        const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm');
        const dateRangeStr = `${format(dateRange.startDate, 'yyyy-MM-dd')}_to_${format(dateRange.endDate, 'yyyy-MM-dd')}`;
        
        // Prepare export data
        const exportData = {
          summary: {
            'Total Orders': analyticsData.kpi.total_orders,
            'Completed Deliveries': analyticsData.kpi.completed_deliveries,
            'Average Delivery Time (min)': analyticsData.kpi.average_delivery_time,
            'Driver Utilization (%)': analyticsData.kpi.driver_utilization,
            'On-Time Delivery Rate (%)': analyticsData.kpi.on_time_delivery_rate,
            'Pending Orders': analyticsData.kpi.pending_orders,
          },
          ordersByStatus: analyticsData.ordersByStatus,
          ordersByWarehouse: analyticsData.ordersByWarehouse,
          deliveryTimes: analyticsData.deliveryTimes,
          driverPerformance: analyticsData.driverPerformance,
        };

        if (format === 'csv') {
          // Export each section as separate CSV sheets
          const csvSections = [
            { name: 'Summary', data: [exportData.summary] },
            { name: 'OrdersByStatus', data: exportData.ordersByStatus },
            { name: 'OrdersByWarehouse', data: exportData.ordersByWarehouse },
            { name: 'DeliveryTimes', data: exportData.deliveryTimes },
            { name: 'DriverPerformance', data: exportData.driverPerformance },
          ];

          // For CSV, we'll create a combined file with section headers
          let csvContent = '';
          csvSections.forEach((section) => {
            csvContent += `\n--- ${section.name} ---\n`;
            const csv = Papa.unparse(section.data);
            csvContent += csv + '\n';
          });

          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = `analytics_${dateRangeStr}_${timestamp}.csv`;
          link.click();
          URL.revokeObjectURL(link.href);
        } else {
          // Excel export
          const wb = XLSX.utils.book_new();
          
          // Summary sheet
          const summaryWs = XLSX.utils.json_to_sheet([exportData.summary]);
          XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');
          
          // Orders by Status sheet
          const statusWs = XLSX.utils.json_to_sheet(exportData.ordersByStatus);
          XLSX.utils.book_append_sheet(wb, statusWs, 'Orders by Status');
          
          // Orders by Warehouse sheet
          const warehouseWs = XLSX.utils.json_to_sheet(exportData.ordersByWarehouse);
          XLSX.utils.book_append_sheet(wb, warehouseWs, 'Orders by Warehouse');
          
          // Delivery Times sheet
          const deliveryWs = XLSX.utils.json_to_sheet(exportData.deliveryTimes);
          XLSX.utils.book_append_sheet(wb, deliveryWs, 'Delivery Times');
          
          // Driver Performance sheet
          const driverWs = XLSX.utils.json_to_sheet(exportData.driverPerformance);
          XLSX.utils.book_append_sheet(wb, driverWs, 'Driver Performance');

          XLSX.writeFile(wb, `analytics_${dateRangeStr}_${timestamp}.xlsx`);
        }

        set({ isExporting: false });
      } catch (error) {
        console.error('Error exporting data:', error);
        set({ 
          error: error instanceof Error ? error.message : 'Failed to export data',
          isExporting: false 
        });
      }
    },

    clearError: () => {
      set({ error: null });
    },
  };
});
