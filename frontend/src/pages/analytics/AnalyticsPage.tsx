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
    Line
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';

export default function AnalyticsPage() {
  const { data: metrics } = useQuery({
    queryKey: ['dashboard-metrics'], // Reusing dashboard metrics for now or fetch more specific
    queryFn: analyticsService.getDashboardMetrics,
    refetchInterval: 60000
  });

  // Mock data for charts since backend doesn't have historical endpoints yet in my service
  const dailyOrdersData = [
      { name: 'Mon', orders: 120 },
      { name: 'Tue', orders: 132 },
      { name: 'Wed', orders: 101 },
      { name: 'Thu', orders: 134 },
      { name: 'Fri', orders: 190 },
      { name: 'Sat', orders: 230 },
      { name: 'Sun', orders: 210 },
  ];

  const deliveryPerformanceData = [
      { name: 'Driver A', onTime: 40, late: 2 },
      { name: 'Driver B', onTime: 30, late: 5 },
      { name: 'Driver C', onTime: 50, late: 1 },
      { name: 'Driver D', onTime: 20, late: 8 },
      { name: 'Driver E', onTime: 45, late: 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <h2 className="text-3xl font-bold tracking-tight text-foreground">Analytics</h2>
           <p className="text-muted-foreground">Reports and performance metrics.</p>
        </div>
        <Button variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            Last 7 Days
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
           {/* Summary Cards reusing structure */}
           <Card>
               <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                   <CardTitle className="text-sm font-medium">Total Revenue (Today)</CardTitle>
               </CardHeader>
               <CardContent>
                   <div className="text-2xl font-bold">KWD 1,234.000</div>
                   <p className="text-xs text-muted-foreground">+20.1% from yesterday</p>
               </CardContent>
           </Card>
           <Card>
               <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                   <CardTitle className="text-sm font-medium">Delivered Orders</CardTitle>
               </CardHeader>
               <CardContent>
                   <div className="text-2xl font-bold">432</div>
                   <p className="text-xs text-muted-foreground">+180 since last hour</p>
               </CardContent>
           </Card>
           <Card>
               <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                   <CardTitle className="text-sm font-medium">Active Drivers</CardTitle>
               </CardHeader>
               <CardContent>
                   <div className="text-2xl font-bold">{metrics?.active_drivers || 0}</div>
                   <p className="text-xs text-muted-foreground">Currently online</p>
               </CardContent>
           </Card>
            <Card>
               <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                   <CardTitle className="text-sm font-medium">Avg. Delivery Time</CardTitle>
               </CardHeader>
               <CardContent>
                   <div className="text-2xl font-bold">45m</div>
                   <p className="text-xs text-muted-foreground">-2m from average</p>
               </CardContent>
           </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
          <Card className="col-span-1">
              <CardHeader>
                  <CardTitle>Orders Volume (Weekly)</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                  <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={dailyOrdersData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                              <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                              <Tooltip />
                              <Line type="monotone" dataKey="orders" stroke="#10b981" strokeWidth={2} />
                          </LineChart>
                      </ResponsiveContainer>
                  </div>
              </CardContent>
          </Card>
          
          <Card className="col-span-1">
              <CardHeader>
                  <CardTitle>Driver Performance (Top 5)</CardTitle>
              </CardHeader>
               <CardContent className="pl-2">
                  <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={deliveryPerformanceData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                              <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                              <Tooltip />
                              <Legend />
                              <Bar dataKey="onTime" fill="#10b981" radius={[4, 4, 0, 0]} name="On Time" />
                              <Bar dataKey="late" fill="#ef4444" radius={[4, 4, 0, 0]} name="Late" />
                          </BarChart>
                      </ResponsiveContainer>
                  </div>
              </CardContent>
          </Card>
      </div>
    </div>
  );
}
