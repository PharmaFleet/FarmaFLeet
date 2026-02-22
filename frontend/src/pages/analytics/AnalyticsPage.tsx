import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '@/services/analyticsService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];

export default function AnalyticsPage() {
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['analytics-metrics'],
    queryFn: analyticsService.getDashboardMetrics,
    refetchInterval: 60000,
  });

  const { data: dailyOrders = [], isLoading: dailyLoading } = useQuery({
    queryKey: ['analytics-daily-orders'],
    queryFn: () => analyticsService.getDailyOrders(7),
    refetchInterval: 60000,
  });

  const { data: driverPerformance = [], isLoading: driversLoading } = useQuery({
    queryKey: ['analytics-driver-performance'],
    queryFn: analyticsService.getDriverPerformance,
    refetchInterval: 60000,
  });

  const { data: warehouseOrders = [], isLoading: warehouseLoading } = useQuery({
    queryKey: ['analytics-warehouse-orders'],
    queryFn: analyticsService.getOrdersByWarehouse,
    refetchInterval: 60000,
  });

  // Format daily orders for chart (show day name)
  const dailyChartData = dailyOrders.map(d => {
    const date = new Date(d.date + 'T00:00:00');
    return {
      name: date.toLocaleDateString('en-US', { weekday: 'short' }),
      total: d.total,
      delivered: d.delivered,
      pending: d.pending,
    };
  });

  // Sort driver performance by total orders (top 10)
  const topDrivers = [...driverPerformance]
    .sort((a, b) => b.total_orders - a.total_orders)
    .slice(0, 10)
    .map(d => ({
      name: `Driver #${d.driver_id}`,
      delivered: d.delivered_orders,
      failed: d.failed_orders,
    }));

  const todayRate = ((metrics?.success_rate ?? 0) * 100).toFixed(1);
  const allTimeRate = ((metrics?.all_time_success_rate ?? 0) * 100).toFixed(1);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Analytics</h2>
        <p className="text-muted-foreground">Reports and performance metrics.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {metricsLoading ? <Skeleton className="h-8 w-20" /> : (
              <>
                <div className="text-2xl font-bold">{metrics?.total_orders_today ?? 0}</div>
                <p className="text-xs text-muted-foreground">{metrics?.unassigned_today ?? 0} unassigned today</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate (Today)</CardTitle>
          </CardHeader>
          <CardContent>
            {metricsLoading ? <Skeleton className="h-8 w-20" /> : (
              <>
                <div className="text-2xl font-bold">{todayRate}%</div>
                <p className="text-xs text-muted-foreground">{allTimeRate}% all-time</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Drivers</CardTitle>
          </CardHeader>
          <CardContent>
            {metricsLoading ? <Skeleton className="h-8 w-20" /> : (
              <>
                <div className="text-2xl font-bold">{metrics?.active_drivers ?? 0}</div>
                <p className="text-xs text-muted-foreground">Currently online</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
          </CardHeader>
          <CardContent>
            {metricsLoading ? <Skeleton className="h-8 w-20" /> : (
              <>
                <div className="text-2xl font-bold">KWD {(metrics?.pending_payments_amount ?? 0).toFixed(3)}</div>
                <p className="text-xs text-muted-foreground">{metrics?.pending_payments_count ?? 0} transactions</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Orders Volume (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px]">
              {dailyLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Skeleton className="h-60 w-full" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} name="Total" />
                    <Line type="monotone" dataKey="delivered" stroke="#10b981" strokeWidth={2} name="Delivered" />
                    <Line type="monotone" dataKey="pending" stroke="#f59e0b" strokeWidth={2} name="Pending" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Driver Performance (Top 10)</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px]">
              {driversLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Skeleton className="h-60 w-full" />
                </div>
              ) : topDrivers.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topDrivers}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="delivered" fill="#10b981" radius={[4, 4, 0, 0]} name="Delivered" />
                    <Bar dataKey="failed" fill="#ef4444" radius={[4, 4, 0, 0]} name="Failed" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">No driver data available</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Orders by Warehouse</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {warehouseLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Skeleton className="h-60 w-full" />
                </div>
              ) : warehouseOrders.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={warehouseOrders}
                      dataKey="orders"
                      nameKey="warehouse"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={(entry: any) => `${entry.warehouse}: ${entry.orders}`}
                    >
                      {warehouseOrders.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">No warehouse data available</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
