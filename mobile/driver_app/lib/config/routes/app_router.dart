import 'package:go_router/go_router.dart';

import '../../core/util/go_router_refresh_stream.dart';
import '../../features/auth/presentation/bloc/auth_bloc.dart';
import '../../features/auth/presentation/screens/login_screen.dart';
import '../../features/auth/presentation/screens/splash_screen.dart';
import '../../features/dashboard/presentation/screens/home_screen.dart';
import '../../features/orders/presentation/screens/order_details_screen.dart';
import '../../features/orders/presentation/screens/orders_list_screen.dart';
import '../../features/profile/presentation/screens/profile_screen.dart';

class AppRouter {
  final AuthBloc authBloc;

  AppRouter(this.authBloc);

  late final router = GoRouter(
    initialLocation: '/',
    refreshListenable: GoRouterRefreshStream(authBloc.stream),
    debugLogDiagnostics: true,
    redirect: (context, state) {
      final authState = authBloc.state;
      final isLoggedIn = authState is AuthAuthenticated;
      // Also consider AuthInitial as not logged in, but maybe we let splash handle init
      final isLoggingIn = state.uri.toString() == '/login';
      final isSplash = state.uri.toString() == '/';

      if (authState is AuthInitial) {
        return null; // Let Splash Screen stay
      }

      if (authState is AuthUnauthenticated) {
         if (isLoggingIn) {
           return null;
         }
         return '/login';
      }

      if (isLoggedIn) {
        if (isSplash || isLoggingIn) {
          return '/home';
        }
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/',
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/home',
        builder: (context, state) => const HomeScreen(),
      ),
      GoRoute(
        path: '/profile',
        builder: (context, state) => const ProfileScreen(),
      ),
       GoRoute(
        path: '/order/:id',
        builder: (context, state) {
           final orderId = state.pathParameters['id']!;
           return OrderDetailsScreen(orderId: orderId);
        },
      ),
      GoRoute(
        path: '/orders',
        builder: (context, state) => const OrdersListScreen(),
      ),
    ],
  );
}
