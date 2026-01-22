import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LayoutShell } from '@/components/layout/LayoutShell';
import LoginPage from '@/pages/auth/LoginPage';
import DashboardHome from '@/pages/dashboard/DashboardHome';
import OrdersPage from '@/pages/orders/OrdersPage';
import DriversPage from '@/pages/drivers/DriversPage';
import MapView from '@/pages/map/MapView';
import PaymentsPage from '@/pages/payments/PaymentsPage';
import AnalyticsPage from '@/pages/analytics/AnalyticsPage';
import UsersPage from '@/pages/users/UsersPage';
import SettingsPage from '@/pages/settings/SettingsPage';
import NotFoundPage from '@/pages/NotFoundPage';

// Create a client
const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          {/* Protected Routes */}
          <Route element={<LayoutShell />}>
            <Route path="/" element={<DashboardHome />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/drivers" element={<DriversPage />} />
            <Route path="/map" element={<MapView />} />
            <Route path="/payments" element={<PaymentsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            {/* Add more routes here later */}
          </Route>
          
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
