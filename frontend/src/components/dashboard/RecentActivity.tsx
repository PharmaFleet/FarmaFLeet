import { useQuery } from '@tanstack/react-query';
import { Package, Truck, CheckCircle, XCircle, Clock, Navigation, Ban, CreditCard } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const activityIcons: Record<string, { icon: any; color: string; bg: string }> = {
  assigned: { icon: Truck, color: 'text-blue-500', bg: 'bg-blue-50' },
  picked_up: { icon: Package, color: 'text-amber-500', bg: 'bg-amber-50' },
  out_for_delivery: { icon: Navigation, color: 'text-purple-500', bg: 'bg-purple-50' },
  order_delivered: { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  delivered: { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  cancelled: { icon: Ban, color: 'text-slate-500', bg: 'bg-slate-50' },
  rejected: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' },
  payment_collected: { icon: CreditCard, color: 'text-green-600', bg: 'bg-green-50' },
};

export function RecentActivity() {
  const { data: notifications, isLoading } = useQuery({
    queryKey: ['dashboard-activities'],
    queryFn: async () => {
        const res = await import('@/lib/axios').then(m => m.api.get('/analytics/activities'));
        return res.data;
    },
    refetchInterval: 15000,
  });

  if (isLoading) {
    return (
      <div className="h-[300px] flex items-center justify-center text-slate-400 text-sm">
        <Clock className="h-4 w-4 animate-pulse mr-2" /> Loading activity...
      </div>
    );
  }

  if (!notifications || notifications.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-slate-400 text-sm">
        No recent activity
      </div>
    );
  }

  return (
    <div className="h-[300px] overflow-y-auto space-y-3 pr-2">
      {notifications.map((notification: any) => {
        // Get icon config based on activity type
        const activityType = notification.data?.type || 'assigned';
        const config = activityIcons[activityType] || activityIcons.assigned;
        const Icon = config.icon;
        
        return (
          <div key={notification.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
            <div className={`p-2 rounded-full ${config.bg}`}>
              <Icon className={`h-4 w-4 ${config.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 line-clamp-2">
                {notification.title}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {notification.body}
              </p>
            </div>
            <span className="text-xs text-slate-400 whitespace-nowrap">
              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
            </span>
          </div>
        );
      })}
    </div>
  );
}
