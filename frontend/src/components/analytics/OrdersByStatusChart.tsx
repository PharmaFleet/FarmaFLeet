import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/formatters';
import { type OrdersByStatus } from '@/stores/analyticsStore';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';

interface OrdersByStatusChartProps {
  data: OrdersByStatus[];
  isLoading?: boolean;
  className?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: OrdersByStatus;
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps): JSX.Element | null {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    return (
      <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
        <p className="font-semibold text-slate-900 capitalize">{item.status}</p>
        <p className="text-sm text-slate-600">
          Count: <span className="font-medium text-slate-900">{formatNumber(item.count)}</span>
        </p>
      </div>
    );
  }
  return null;
}

export function OrdersByStatusChart({ 
  data, 
  isLoading = false,
  className 
}: OrdersByStatusChartProps): JSX.Element {
  const totalOrders = data.reduce((acc, item) => acc + item.count, 0);

  if (isLoading) {
    return (
      <Card className={cn('', className)}>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
          <div className="flex justify-center gap-4 mt-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-slate-900">Orders by Status</CardTitle>
        <CardDescription className="text-sm text-slate-500">
          Distribution of orders across different statuses
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="count"
                nameKey="status"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={2} stroke="#fff" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                iconType="circle"
                formatter={(value: string) => (
                  <span className="text-sm text-slate-600 capitalize">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-slate-100">
          <div className="text-center">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Total Orders</p>
            <p className="text-lg font-bold text-slate-900">{formatNumber(totalOrders)}</p>
          </div>
          <div className="text-center border-l border-r border-slate-100">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Delivered</p>
            <p className="text-lg font-bold text-emerald-600">
              {formatNumber(data.find(d => d.status === 'delivered')?.count || 0)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Pending</p>
            <p className="text-lg font-bold text-amber-500">
              {formatNumber(data.find(d => d.status === 'pending')?.count || 0)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default OrdersByStatusChart;
