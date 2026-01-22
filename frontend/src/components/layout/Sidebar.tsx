import { NavLink } from 'react-router-dom';
import { 
  rxIcon, // Placeholder if needed? No, importing directly 
  LayoutDashboard, 
  Package, 
  Truck, 
  Users, 
  CreditCard,
  Settings,
  LogOut,
  Bell
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
    <div className="flex flex-col h-full border-r bg-slate-900 text-white w-64">
      {/* Logo */}
      <div className="flex items-center h-16 px-6 border-b border-slate-800">
        <div className="h-8 w-8 bg-emerald-500 rounded-lg mr-3 flex items-center justify-center font-bold text-white">
          PF
        </div>
        <span className="text-lg font-bold tracking-tight">PharmaFleet</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              cn(
                "flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors group",
                isActive
                  ? "bg-emerald-600 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )
            }
          >
            <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
            {item.name}
          </NavLink>
        ))}
      </nav>

      {/* User & Logout */}
      <div className="p-4 border-t border-slate-800">
        <button
          onClick={logout}
          className="flex w-full items-center px-3 py-2.5 text-sm font-medium text-slate-400 rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-colors"
        >
          <LogOut className="mr-3 h-5 w-5" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
