import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuGroup, 
    DropdownMenuItem, 
    DropdownMenuLabel, 
    DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Bell, Package, Truck, Info, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api as axios } from '@/lib/axios';
import { formatDistanceToNow } from 'date-fns';

interface NotificationData {
  id: number;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
  data?: {
      type?: 'info' | 'warning' | 'success' | 'order' | 'driver';
  };
}

const getIcon = (type: string = 'info') => {
    switch (type) {
        case 'order': return <Package className="h-4 w-4 text-emerald-600" />;
        case 'driver': return <Truck className="h-4 w-4 text-amber-600" />;
        case 'success': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
        case 'warning': return <Info className="h-4 w-4 text-rose-500" />;
        default: return <Info className="h-4 w-4 text-slate-500" />;
    }
};

const getBg = (type: string = 'info') => {
    switch (type) {
        case 'order': return 'bg-emerald-50';
        case 'driver': return 'bg-amber-50';
        case 'success': return 'bg-emerald-50';
        default: return 'bg-slate-50';
    }
};

export default function NotificationCenter() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  // Fetch Notifications
  const { data: notifications = [] } = useQuery({
      queryKey: ['notifications'],
      queryFn: async () => {
          const res = await axios.get<NotificationData[]>('/notifications?limit=20');
          return res.data;
      },
      // Refetch every minute to keep synced
      refetchInterval: 60000 
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Mark single as read
  const markReadMutation = useMutation({
      mutationFn: async (id: number) => {
          await axios.patch(`/notifications/${id}/read`);
      },
      onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
      }
  });

  // Mark all as read (Optimistic update locally effectively, but backend loop usually better)
  // Since we don't have a "mark all" endpoint yet, we might iterate or skipping for now.
  // Actually, UI has "Mark all as read". I should probably implement the endpoint or loop.
  // For now let's just loop locally or disable if not critical. 
  // Let's implement individual click to read first.
  
  const handleMarkAsRead = (id: number) => {
      markReadMutation.mutate(id);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative group hover:bg-slate-100/80 rounded-xl transition-all">
                <Bell className="h-5 w-5 text-slate-500 group-hover:text-emerald-600 transition-colors" />
                {unreadCount > 0 && (
                    <Badge className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full p-0 flex items-center justify-center text-[10px] bg-emerald-600 border-2 border-white pointer-events-none">
                        {unreadCount}
                    </Badge>
                )}
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-80 p-0 border-none shadow-2xl rounded-2xl overflow-hidden bg-white mt-2" align="end">
            <DropdownMenuLabel className="p-5 bg-slate-50/50 border-b border-slate-100">
                <div className="flex flex-col space-y-1">
                    <p className="text-sm font-black text-slate-900">Notifications</p>
                    <p className="text-[11px] font-medium text-slate-500">
                        {unreadCount > 0 ? `You have ${unreadCount} unread messages` : 'Up to date!'}
                    </p>
                </div>
            </DropdownMenuLabel>
            
            <ScrollArea className="h-[380px]">
                <DropdownMenuGroup className="p-2">
                    {notifications.length === 0 ? (
                         <div className="py-12 text-center">
                             <div className="h-12 w-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                 <Bell className="h-6 w-6 text-slate-300" />
                             </div>
                             <p className="text-sm text-slate-400 font-medium italic">All caught up</p>
                         </div>
                    ) : (
                        notifications.map((notification) => (
                            <DropdownMenuItem 
                                key={notification.id} 
                                className="cursor-pointer focus:bg-slate-50 p-3 mb-1 rounded-xl transition-all border border-transparent hover:border-slate-100 group"
                                onClick={() => !notification.is_read && handleMarkAsRead(notification.id)}
                            >
                                <div className="flex w-full items-start gap-3">
                                    <div className={cn("p-2 rounded-lg shrink-0 transition-transform group-hover:scale-110", getBg(notification.data?.type))}>
                                        {getIcon(notification.data?.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2 mb-0.5">
                                            <span className={cn(
                                                "text-xs font-bold truncate",
                                                !notification.is_read ? 'text-slate-900' : 'text-slate-500'
                                            )}>
                                                {notification.title}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                                                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 leading-normal line-clamp-2 text-pretty">
                                            {notification.body}
                                        </p>
                                    </div>
                                    {!notification.is_read && (
                                        <div className="mt-1 shrink-0 px-1">
                                            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200" />
                                        </div>
                                    )}
                                </div>
                            </DropdownMenuItem>
                        ))
                    )}
                </DropdownMenuGroup>
            </ScrollArea>
        </DropdownMenuContent>
    </DropdownMenu>
  );
}
