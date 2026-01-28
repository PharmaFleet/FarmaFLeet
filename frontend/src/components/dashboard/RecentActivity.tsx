import { useQuery } from '@tanstack/react-query';
import { Package, Truck, CheckCircle, XCircle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const activityIcons = {
  assigned: { icon: Truck, color: 'text-blue-500', bg: 'bg-blue-50' },
  picked_up: { icon: Package, color: 'text-amber-500', bg: 'bg-amber-50' },
  delivered: { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  rejected: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' },
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
        // Determine icon based on notification type/data
        let type: keyof typeof activityIcons = 'assigned';
        if (notification.data?.type === 'order_delivered') type = 'delivered';
        else if (notification.data?.type === 'payment_collected') type = 'picked_up'; // Using picked_up icon for payment for now
        
        const config = activityIcons[type] || activityIcons.assigned;
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
