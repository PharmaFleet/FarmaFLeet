import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/formatters';
import { type OrdersByWarehouse } from '@/stores/analyticsStore';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface OrdersByWarehouseChartProps {
  data: OrdersByWarehouse[];
  isLoading?: boolean;
  className?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: OrdersByWarehouse;
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps): JSX.Element | null {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    return (
      <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
        <p className="font-semibold text-slate-900">{item.warehouse_name}</p>
        <p className="text-sm text-slate-600">
          Orders: <span className="font-medium text-slate-900">{formatNumber(item.order_count)}</span>
        </p>
      </div>
    );
  }
  return null;
}

export function OrdersByWarehouseChart({ 
  data, 
  isLoading = false,
  className 
}: OrdersByWarehouseChartProps): JSX.Element {
  if (isLoading) {
    return (
      <Card className={cn('', className)}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-slate-900">Orders by Warehouse</CardTitle>
        <CardDescription className="text-sm text-slate-500">
          Order volume distribution across warehouses
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{
                top: 10,
                right: 30,
                left: 0,
                bottom: 20,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                dataKey="warehouse_name" 
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                angle={-15}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatNumber(value)}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
              <Bar 
                dataKey="order_count" 
                fill="#10b981" 
                radius={[4, 4, 0, 0]}
                name="Orders"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export default OrdersByWarehouseChart;
