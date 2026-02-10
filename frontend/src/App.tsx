import { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LayoutShell } from '@/components/layout/LayoutShell';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Toaster } from '@/components/ui/toaster';

const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const DashboardHome = lazy(() => import('@/pages/dashboard/DashboardHome'));
const OrdersPage = lazy(() => import('@/pages/orders/OrdersPage'));
const OrderDetailsPage = lazy(() => import('@/pages/orders/OrderDetailsPage'));
const DriversPage = lazy(() => import('@/pages/drivers/DriversPage'));
const DriverDetailsPage = lazy(() => import('@/pages/drivers/DriverDetailsPage'));
const MapView = lazy(() => import('@/pages/map/MapView'));
const PaymentsPage = lazy(() => import('@/pages/payments/PaymentsPage'));
const AnalyticsPage = lazy(() => import('@/pages/analytics/AnalyticsPage'));
const UsersPage = lazy(() => import('@/pages/users/UsersPage'));
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

// Create a client with optimized defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 30 seconds - reduces unnecessary refetches
      staleTime: 30 * 1000,
      // Keep unused data in cache for 5 minutes
      gcTime: 5 * 60 * 1000,
      // Retry failed queries up to 2 times
      retry: 2,
      // Don't refetch on window focus for better performance
      refetchOnWindowFocus: false,
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            {/* Protected Routes */}
            <Route element={<LayoutShell />}>
              <Route path="/" element={<DashboardHome />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/orders/:id" element={<OrderDetailsPage />} />
              <Route path="/drivers" element={<DriversPage />} />
              <Route path="/drivers/:id" element={<DriverDetailsPage />} />
              <Route path="/map" element={<MapView />} />
              <Route path="/payments" element={<PaymentsPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              {/* Add more routes here later */}
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </HashRouter>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
