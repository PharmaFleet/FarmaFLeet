import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/useAuthStore';
import NotificationCenter from '@/components/shared/NotificationCenter';

export function TopBar() {
  const user = useAuthStore((state) => state.user);

  return (
    <header className="sticky top-0 z-30 flex h-20 w-full items-center justify-between border-b border-border bg-background px-8 shadow-sm">
      {/* Left: Search (Placeholder) */}
      <div className="flex items-center w-full max-w-sm">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search orders, drivers..."
            className="w-full pl-9 bg-muted border-border focus:bg-background transition-all"
          />
        </div>
      </div>

      {/* Right: Actions & Profile */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <NotificationCenter />

        {/* Profile Dropdown Trigger (Placeholder) */}
        <div className="flex items-center gap-3 pl-4 border-l">
          <div className="flex flex-col items-end hidden md:flex">
            <span className="text-sm font-medium text-foreground">{user?.full_name || 'Admin User'}</span>
            <span className="text-xs text-muted-foreground capitalize">{user?.role || 'Administrator'}</span>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full">
             <div className="h-9 w-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-medium">
               {user?.full_name?.[0] || 'A'}
             </div>
          </Button>
        </div>
      </div>
    </header>
  );
}
