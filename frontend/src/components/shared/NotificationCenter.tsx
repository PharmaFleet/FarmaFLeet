import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuGroup, 
    DropdownMenuItem, 
    DropdownMenuLabel, 
    DropdownMenuSeparator, 
    DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Bell, Package, Truck, CreditCard, Info, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'info' | 'warning' | 'success' | 'order' | 'driver';
}

const mockNotifications: Notification[] = [
    {
        id: '1',
        title: 'New Order Received',
        message: 'Order #SO-12345 has been created.',
        timestamp: '5 mins ago',
        read: false,
        type: 'order'
    },
    {
        id: '2',
        title: 'Driver Offline',
        message: 'Ahmed went offline during active shift.',
        timestamp: '1 hour ago',
        read: false,
        type: 'driver'
    },
    {
        id: '3',
        title: 'Payment Confirmed',
        message: 'Payment for Order #SO-12300 verified.',
        timestamp: '2 hours ago',
        read: true,
        type: 'success'
    }
];

const getIcon = (type: Notification['type']) => {
    switch (type) {
        case 'order': return <Package className="h-4 w-4 text-emerald-600" />;
        case 'driver': return <Truck className="h-4 w-4 text-amber-600" />;
        case 'success': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
        case 'warning': return <Info className="h-4 w-4 text-rose-500" />;
        default: return <Info className="h-4 w-4 text-slate-500" />;
    }
};

const getBg = (type: Notification['type']) => {
    switch (type) {
        case 'order': return 'bg-emerald-50';
        case 'driver': return 'bg-amber-50';
        case 'success': return 'bg-emerald-50';
        default: return 'bg-slate-50';
    }
};

export default function NotificationCenter() {
  const [unreadCount, setUnreadCount] = useState(2);
  const [notifications, setNotifications] = useState(mockNotifications);

  const markAllRead = () => {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
  };

  return (
    <DropdownMenu>
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
                            <DropdownMenuItem key={notification.id} className="cursor-pointer focus:bg-slate-50 p-3 mb-1 rounded-xl transition-all border border-transparent hover:border-slate-100 group">
                                <div className="flex w-full items-start gap-3">
                                    <div className={cn("p-2 rounded-lg shrink-0 transition-transform group-hover:scale-110", getBg(notification.type))}>
                                        {getIcon(notification.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2 mb-0.5">
                                            <span className={cn(
                                                "text-xs font-bold truncate",
                                                !notification.read ? 'text-slate-900' : 'text-slate-500'
                                            )}>
                                                {notification.title}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">{notification.timestamp}</span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 leading-normal line-clamp-2 text-pretty">
                                            {notification.message}
                                        </p>
                                    </div>
                                    {!notification.read && (
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

            <div className="p-3 bg-slate-50/50 border-top border-slate-100">
                <Button 
                    variant="ghost" 
                    className="w-full h-9 text-xs font-bold text-slate-500 hover:text-emerald-600 hover:bg-white rounded-lg transition-colors" 
                    onClick={markAllRead}
                    disabled={unreadCount === 0}
                >
                    Mark all as read
                </Button>
            </div>
        </DropdownMenuContent>
    </DropdownMenu>
  );
}
