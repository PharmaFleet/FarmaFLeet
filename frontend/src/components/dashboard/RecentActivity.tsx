import { useQuery } from '@tanstack/react-query';
import { orderService } from '@/services/orderService';
import { Package, Truck, CheckCircle, XCircle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActivityItem {
  id: number;
  type: 'assigned' | 'picked_up' | 'delivered' | 'rejected';
  order_number: string;
  driver_name?: string;
  timestamp: string;
}

const activityIcons = {
  assigned: { icon: Truck, color: 'text-blue-500', bg: 'bg-blue-50' },
  picked_up: { icon: Package, color: 'text-amber-500', bg: 'bg-amber-50' },
  delivered: { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  rejected: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' },
};

export function RecentActivity() {
  const { data: activities, isLoading } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: async () => {
      // Try to fetch recent orders with status changes
      const orders = await orderService.getAll({ limit: 5 });
      // Transform to activity items
      return orders.items?.map((order): ActivityItem => ({
        id: order.id,
        type: (order.status as string) as ActivityItem['type'],
        order_number: order.sales_order_number || `ORD-${order.id}`,
        driver_name: order.driver?.user?.full_name,
        timestamp: order.updated_at || order.created_at,
      })) || [];
    },
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="h-[300px] flex items-center justify-center text-slate-400 text-sm">
        <Clock className="h-4 w-4 animate-pulse mr-2" /> Loading activity...
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-slate-400 text-sm">
        No recent activity
      </div>
    );
  }

  return (
    <div className="h-[300px] overflow-y-auto space-y-3 pr-2">
      {activities.map((activity) => {
        const config = activityIcons[activity.type] || activityIcons.assigned;
        const Icon = config.icon;
        
        return (
          <div key={activity.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
            <div className={`p-2 rounded-full ${config.bg}`}>
              <Icon className={`h-4 w-4 ${config.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                {activity.order_number}
              </p>
              <p className="text-xs text-slate-500">
                {activity.driver_name ? `${activity.driver_name} • ` : ''}
                {activity.type.replace('_', ' ')}
              </p>
            </div>
            <span className="text-xs text-slate-400 whitespace-nowrap">
              {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
            </span>
          </div>
        );
      })}
    </div>
  );
}
