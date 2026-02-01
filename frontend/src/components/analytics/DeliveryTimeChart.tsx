import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatDuration } from '@/lib/formatters';
import { type DeliveryTimeData } from '@/stores/analyticsStore';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface DeliveryTimeChartProps {
  data: DeliveryTimeData[];
  isLoading?: boolean;
  className?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: DeliveryTimeData;
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps): JSX.Element | null {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    return (
      <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
        <p className="font-semibold text-slate-900">{item.area}</p>
        <p className="text-sm text-slate-600">
          Avg Time: <span className="font-medium text-slate-900">{formatDuration(item.average_time)}</span>
        </p>
      </div>
    );
  }
  return null;
}

export function DeliveryTimeChart({ 
  data, 
  isLoading = false,
  className 
}: DeliveryTimeChartProps): JSX.Element {
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
        <CardTitle className="text-lg font-semibold text-slate-900">Delivery Times by Area</CardTitle>
        <CardDescription className="text-sm text-slate-500">
          Average delivery duration across different geographic areas
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
                bottom: 10,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                dataKey="area" 
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}m`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
              <Bar 
                dataKey="average_time" 
                fill="#8b5cf6" 
                radius={[4, 4, 0, 0]}
                name="Avg Time (minutes)"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export default DeliveryTimeChart;
