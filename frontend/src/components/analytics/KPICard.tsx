import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Package, 
  CheckCircle, 
  Clock, 
  Users, 
  TrendingUp, 
  Hourglass,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  type LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatNumber, formatDuration, formatPercentage } from '@/lib/formatters';
import { type TrendData, type KPICardData } from '@/stores/analyticsStore';

const iconMap: Record<string, LucideIcon> = {
  Package,
  CheckCircle,
  Clock,
  Users,
  TrendingUp,
  Hourglass,
};

interface KPICardProps {
  title: string;
  value: number;
  trend: TrendData;
  icon: string;
  format: 'number' | 'duration' | 'percentage';
  isLoading?: boolean;
  className?: string;
}

function formatValue(value: number, format: KPICardProps['format']): string {
  switch (format) {
    case 'duration':
      return formatDuration(value);
    case 'percentage':
      return formatPercentage(value, 1);
    case 'number':
    default:
      return formatNumber(value);
  }
}

function TrendIndicator({ trend }: { trend: TrendData }): JSX.Element {
  const { direction, percentage } = trend;
  
  const Icon = direction === 'up' ? ArrowUpRight : direction === 'down' ? ArrowDownRight : Minus;
  
  const colorClass = direction === 'up' 
    ? 'text-emerald-600' 
    : direction === 'down' 
      ? 'text-red-600' 
      : 'text-slate-500';
  
  const bgClass = direction === 'up'
    ? 'bg-emerald-50 dark:bg-emerald-950'
    : direction === 'down'
      ? 'bg-red-50 dark:bg-red-950'
      : 'bg-muted';

  return (
    <div className={cn('flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium', bgClass, colorClass)}>
      <Icon className="h-3 w-3" />
      <span>{percentage}%</span>
    </div>
  );
}

export function KPICard({ 
  title, 
  value, 
  trend, 
  icon, 
  format, 
  isLoading = false,
  className 
}: KPICardProps): JSX.Element {
  const Icon = iconMap[icon] || Package;

  if (isLoading) {
    return (
      <Card className={cn('', className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4 rounded-full" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-20 mb-2" />
          <Skeleton className="h-4 w-16" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="p-1.5 bg-muted rounded-md">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between">
          <div className="text-2xl font-bold text-foreground">
            {formatValue(value, format)}
          </div>
          <TrendIndicator trend={trend} />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          vs previous period
        </p>
      </CardContent>
    </Card>
  );
}

interface KPICardSkeletonProps {
  className?: string;
}

export function KPICardSkeleton({ className }: KPICardSkeletonProps): JSX.Element {
  return (
    <Card className={cn('', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-8 rounded-md" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-20 mb-2" />
        <Skeleton className="h-5 w-24" />
      </CardContent>
    </Card>
  );
}

export default KPICard;
