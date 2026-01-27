import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Truck, 
  Users, 
  CreditCard,
  Settings,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Orders', href: '/orders', icon: Package },
  { name: 'Drivers', href: '/drivers', icon: Truck },
  { name: 'Payments', href: '/payments', icon: CreditCard },
  { name: 'Users', href: '/users', icon: Users },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const logout = useAuthStore((state) => state.logout);

  return (
    <div className="flex flex-col h-full bg-slate-950 text-white w-64 shadow-xl border-r border-slate-900">
      {/* Logo */}
      <div className="flex items-center h-20 px-8">
        <div className="h-10 w-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl mr-3 flex items-center justify-center font-bold text-white shadow-lg shadow-emerald-900/20">
          PF
        </div>
        <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            PharmaFleet
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-8 space-y-1.5 overflow-y-auto">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              cn(
                "flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group relative",
                isActive
                  ? "bg-emerald-600/10 text-emerald-400"
                  : "text-slate-400 hover:bg-slate-900 hover:text-white"
              )
            }
          >
            {({ isActive }) => (
                <>
                    <item.icon className={cn(
                        "mr-3 h-5 w-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110",
                        isActive ? "text-emerald-500" : "text-slate-500 group-hover:text-slate-300"
                    )} />
                    {item.name}
                    {isActive && (
                        <span className="absolute left-0 w-1 h-6 bg-emerald-500 rounded-r-full shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
                    )}
                </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User & Logout */}
      <div className="p-6 border-t border-slate-900">
        <button
          onClick={logout}
          className="flex w-full items-center px-4 py-3 text-sm font-medium text-slate-400 rounded-xl hover:bg-rose-500/10 hover:text-rose-400 transition-all duration-200"
        >
          <LogOut className="mr-3 h-5 w-5 opacity-70" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
