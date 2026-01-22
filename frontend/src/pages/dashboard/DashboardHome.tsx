import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, CreditCard, Package, Truck } from 'lucide-react';
import { analyticsService } from '@/services/analyticsService';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardHome() {
  const { data: metrics, isLoading, isError } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: analyticsService.getDashboardMetrics,
    refetchInterval: 30000, // Auto-refresh every 30s
  });

  const stats = [
    {
      title: "Active Orders",
      value: metrics?.total_orders_today ?? 0,
      description: "Orders for today",
      icon: Package,
      color: "text-blue-500",
      bg: "bg-blue-500/10"
    },
    {
      title: "Active Drivers",
      value: metrics?.active_drivers ?? 0,
      description: "Currently Online",
      icon: Truck,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10"
    },
    {
      title: "Pending Payments",
      value: `KWD ${metrics?.pending_payments_amount ?? 0}`,
      description: `${metrics?.pending_payments_count ?? 0} transactions`,
      icon: CreditCard,
      color: "text-amber-500",
      bg: "bg-amber-500/10"
    },
    {
      title: "Success Rate",
      value: `${((metrics?.success_rate ?? 0) * 100).toFixed(1)}%`,
      description: "All time",
      icon: Activity,
      color: "text-purple-500",
      bg: "bg-purple-500/10"
    }
  ];

  if (isError) {
      return <div className="p-4 text-red-500">Failed to load dashboard data.</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h2>
        <p className="text-slate-500">Overview of today's delivery operations.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-full ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                  <Skeleton className="h-8 w-20" />
              ) : (
                <>
                    <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
                    <p className="text-xs text-slate-500 mt-1">{stat.description}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Placeholder for Map/Recent Orders */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Real-Time Tracking</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
              Map Component Placeholder
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full bg-slate-50 rounded-lg flex items-center justify-center text-slate-400">
               Timeline Placeholder
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
