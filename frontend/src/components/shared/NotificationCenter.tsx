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
import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'info' | 'warning' | 'success' | 'error';
}

const mockNotifications: Notification[] = [
    {
        id: '1',
        title: 'New Order Received',
        message: 'Order #SO-12345 has been created.',
        timestamp: '5 mins ago',
        read: false,
        type: 'info'
    },
    {
        id: '2',
        title: 'Driver Offline',
        message: 'Driver Ahmed went offline during active shift.',
        timestamp: '1 hour ago',
        read: false,
        type: 'warning'
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
            <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5 text-slate-500" />
                {unreadCount > 0 && (
                    <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 rounded-full p-0 flex items-center justify-center text-[10px]">
                        {unreadCount}
                    </Badge>
                )}
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-80" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">Notifications</p>
                    <p className="text-xs leading-none text-muted-foreground">
                        You have {unreadCount} unread messages.
                    </p>
                </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <ScrollArea className="h-[300px]">
                <DropdownMenuGroup>
                    {notifications.length === 0 ? (
                         <div className="p-4 text-center text-sm text-muted-foreground">No notifications</div>
                    ) : (
                        notifications.map((notification) => (
                            <DropdownMenuItem key={notification.id} className="cursor-pointer">
                                <div className={`flex flex-col gap-1 ${!notification.read ? 'font-medium' : ''}`}>
                                    <span>{notification.title}</span>
                                    <span className="text-xs text-muted-foreground line-clamp-2">{notification.message}</span>
                                    <span className="text-[10px] text-slate-400">{notification.timestamp}</span>
                                </div>
                                {!notification.read && (
                                    <span className="ml-auto h-2 w-2 rounded-full bg-blue-500" />
                                )}
                            </DropdownMenuItem>
                        ))
                    )}
                </DropdownMenuGroup>
            </ScrollArea>
            <DropdownMenuSeparator />
             <div className="p-2">
                 <Button variant="ghost" className="w-full h-8 text-xs" onClick={markAllRead}>
                     Mark all as read
                 </Button>
             </div>
        </DropdownMenuContent>
    </DropdownMenu>
  );
}
