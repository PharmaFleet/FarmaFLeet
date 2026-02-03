import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, CreditCard, Package, Truck } from 'lucide-react';
import { analyticsService } from '@/services/analyticsService';
import { Skeleton } from '@/components/ui/skeleton';
import { MiniMapView } from '@/components/dashboard/MiniMapView';
import { RecentActivity } from '@/components/dashboard/RecentActivity';

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
    <div className="space-y-10 p-8 max-w-[1600px] mx-auto">
      <div>
        <h2 className="text-4xl font-extrabold tracking-tight text-foreground">Dashboard</h2>
        <p className="text-muted-foreground mt-1">Overview of today's delivery operations and fleet performance.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-none shadow-sm bg-card rounded-2xl overflow-hidden group hover:shadow-md transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2.5 rounded-xl transition-transform duration-300 group-hover:scale-110 ${stat.bg}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                  <Skeleton className="h-10 w-24 bg-muted" />
              ) : (
                <div className="space-y-1">
                    <div className="text-3xl font-black text-foreground tracking-tight">{stat.value}</div>
                    <p className="text-xs font-medium text-muted-foreground">{stat.description}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Map and Recent Orders */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-1 lg:col-span-4 border-border shadow-sm rounded-2xl overflow-hidden bg-card">
          <CardHeader className="border-b border-border bg-muted/30">
            <CardTitle className="text-lg font-bold text-foreground">Real-Time Tracking</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[450px] w-full">
              {/* Embedded mini-map - uses Google Maps API if configured */}
              <MiniMapView />
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-1 lg:col-span-3 border-border shadow-sm rounded-2xl overflow-hidden bg-card">
          <CardHeader className="border-b border-border bg-muted/30">
            <CardTitle className="text-lg font-bold text-foreground">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <RecentActivity />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
