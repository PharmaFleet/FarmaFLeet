import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/di/injection_container.dart' as di;
import '../../../../core/services/background_service.dart';
import '../../../../core/services/location_service.dart';
import '../../../../core/services/token_storage_service.dart';
import '../../../auth/presentation/bloc/auth_bloc.dart';
import '../../../notifications/domain/repositories/notification_repository.dart';
import '../bloc/dashboard_bloc.dart';
import '../widgets/map_widget.dart';
import '../widgets/status_toggle.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => di.sl<DashboardBloc>()..add(DashboardInit()),
      child: const DashboardView(),
    );
  }
}

class DashboardView extends StatefulWidget {
  const DashboardView({super.key});

  @override
  State<DashboardView> createState() => _DashboardViewState();
}

class _DashboardViewState extends State<DashboardView> with WidgetsBindingObserver {
  int _unreadCount = 0;
  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _fetchUnreadCount();
    // Refresh unread count every 30 seconds
    _refreshTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      _fetchUnreadCount();
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _refreshTimer?.cancel();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    final bloc = context.read<DashboardBloc>();
    final currentState = bloc.state;

    if (state == AppLifecycleState.paused) {
      // App going to background - start background service if online
      if (currentState.isAvailable && currentState.driverId != null) {
        debugPrint('[Dashboard] App paused - starting background service');
        startBackgroundService(currentState.driverId!);
      }
    } else if (state == AppLifecycleState.resumed) {
      // App returning to foreground
      debugPrint('[Dashboard] App resumed');

      if (currentState.isAvailable && currentState.driverId != null) {
        // Stop background service, restart foreground tracking
        stopBackgroundService();
        final locationService = di.sl<LocationService>();
        locationService.startTracking(currentState.driverId!);
        locationService.syncPendingLocations();
      }

      // Refresh notification count
      _fetchUnreadCount();
    }
  }

  Future<void> _fetchUnreadCount() async {
    try {
      final repository = di.sl<NotificationRepository>();
      final count = await repository.getUnreadCount();
      if (mounted) {
        setState(() => _unreadCount = count);
      }
    } catch (_) {
      // Ignore errors - just don't update the count
    }
  }

  void _handleStatusToggle(BuildContext context, bool val) {
    context.read<DashboardBloc>().add(DashboardStatusToggled(val));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        title: const Text("Dashboard"),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          // Notification Bell Icon with Badge
          Container(
            margin: EdgeInsets.only(right: 8.w),
            decoration: BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.1),
                  blurRadius: 5,
                )
              ],
            ),
            child: Stack(
              children: [
                IconButton(
                  icon: const Icon(Icons.notifications_outlined, color: Colors.black),
                  onPressed: () async {
                    await context.push('/notifications');
                    // Refresh count when returning from notifications screen
                    _fetchUnreadCount();
                  },
                ),
                if (_unreadCount > 0)
                  Positioned(
                    right: 6,
                    top: 6,
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: Colors.red,
                        shape: _unreadCount > 9 ? BoxShape.rectangle : BoxShape.circle,
                        borderRadius: _unreadCount > 9 ? BorderRadius.circular(8) : null,
                      ),
                      constraints: const BoxConstraints(
                        minWidth: 16,
                        minHeight: 16,
                      ),
                      child: Text(
                        _unreadCount > 99 ? '99+' : '$_unreadCount',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ),
              ],
            ),
          ),
          // Profile Icon
          Container(
            margin: EdgeInsets.only(right: 16.w),
            decoration: BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
              boxShadow: [
                 BoxShadow(
                  color: Colors.black.withValues(alpha: 0.1),
                  blurRadius: 5,
                 )
              ]
            ),
            child: IconButton(
              icon: const Icon(Icons.person, color: Colors.black),
              onPressed: () => context.push('/profile'),
            ),
          ),
        ],
      ),
      drawer: Drawer(
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            BlocBuilder<AuthBloc, AuthState>(
              builder: (context, state) {
                final userName = state is AuthAuthenticated
                    ? state.user.fullName ?? 'Driver'
                    : 'Driver';
                return DrawerHeader(
                  decoration: const BoxDecoration(color: Colors.blue),
                  child: Text(userName, style: const TextStyle(color: Colors.white, fontSize: 24)),
                );
              },
            ),
            ListTile(
              leading: const Icon(Icons.list_alt),
              title: const Text('My Orders'),
              onTap: () {
                context.pop(); // Close drawer
                context.push('/orders');
              },
            ),
             ListTile(
              leading: const Icon(Icons.logout),
              title: const Text('Logout'),
              onTap: () {
                // Clear online status on logout
                final tokenStorage = di.sl<TokenStorageService>();
                tokenStorage.clearOnlineStatus();
                tokenStorage.clearDriverId();
                stopBackgroundService();
                context.read<AuthBloc>().add(AuthLogoutRequested());
              },
            ),
          ],
        ),
      ),
      body: Stack(
        children: [
          // Map Background
          BlocBuilder<DashboardBloc, DashboardState>(
            buildWhen: (previous, current) => previous.currentLocation != current.currentLocation,
            builder: (context, state) {
              return MapWidget(
                initialLocation: state.currentLocation,
                markers: const {}, // Add markers logic later
              );
            },
          ),

          // Floating Status Toggle
          Positioned(
            bottom: 40.h,
            left: 0,
            right: 0,
            child: Center(
              child: BlocConsumer<DashboardBloc, DashboardState>(
                listener: (context, state) {
                  if (state.status == DriverStatus.error) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(state.errorMessage ?? 'Error updating status')),
                    );
                  }
                },
                builder: (context, state) {
                  return StatusToggle(
                    isAvailable: state.isAvailable,
                    isLoading: state.status == DriverStatus.loading,
                    onToggle: (val) => _handleStatusToggle(context, val),
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}
