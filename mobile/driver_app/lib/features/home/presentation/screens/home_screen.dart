import 'dart:async';

import 'package:driver_app/core/di/injection_container.dart' as di;
import 'package:driver_app/core/services/background_service.dart';
import 'package:driver_app/core/services/location_service.dart';
import 'package:driver_app/core/services/token_storage_service.dart';
import 'package:driver_app/features/auth/presentation/bloc/auth_bloc.dart';
import 'package:driver_app/features/home/presentation/bloc/home_bloc.dart';
import 'package:driver_app/features/home/presentation/screens/daily_summary_screen.dart';
import 'package:driver_app/features/notifications/domain/repositories/notification_repository.dart';
import 'package:driver_app/theme/theme.dart';
// Aliased import for the UI component
import 'package:driver_app/widgets/activity_item.dart' as activity_widget;
import 'package:driver_app/widgets/widgets.dart'
    hide ActivityItem, ActivityType;
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:permission_handler/permission_handler.dart';

class HomeScreen extends StatefulWidget {
  final LocationService locationService;

  const HomeScreen({super.key, required this.locationService});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with WidgetsBindingObserver {
  Timer? _refreshTimer;
  Timer? _notificationTimer;
  bool _hasLocationPermission = false;
  int _unreadNotificationCount = 0;
  bool _isOnline = false;
  String? _currentDriverId;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _requestLocationPermission();
    _fetchUnreadCount();
    _restoreOnlineStatus();

    // Load initial data when screen is created
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<HomeBloc>().add(HomeLoadRequested());
    });

    // Auto-refresh every 5 seconds for faster notification updates
    _refreshTimer = Timer.periodic(const Duration(seconds: 5), (_) {
      if (mounted) {
        _refreshData();
      }
    });

    // Refresh notification count every 30 seconds
    _notificationTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      if (mounted) {
        _fetchUnreadCount();
      }
    });
  }

  /// Restore online status after app restart
  Future<void> _restoreOnlineStatus() async {
    try {
      final tokenStorage = di.sl<TokenStorageService>();
      final wasOnline = await tokenStorage.getOnlineStatus();
      final driverId = await tokenStorage.getDriverId();

      if (wasOnline && driverId != null) {
        debugPrint('[HomeScreen] Restoring online status');
        _currentDriverId = driverId;
        _isOnline = true;

        // Restart location tracking
        final hasPermission = await widget.locationService.checkPermissions();
        if (hasPermission) {
          await widget.locationService.startTracking(driverId);
          // Sync any locations collected while in background
          await widget.locationService.syncPendingLocations();
        }

        // Update HomeBloc state
        if (mounted) {
          context.read<HomeBloc>().add(HomeOnlineStatusChanged(true));
        }
      }
    } catch (e) {
      debugPrint('[HomeScreen] Error restoring online status: $e');
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    super.didChangeAppLifecycleState(state);

    switch (state) {
      case AppLifecycleState.paused:
        // App going to background
        if (_isOnline && _currentDriverId != null) {
          debugPrint('[HomeScreen] App paused - starting background service');
          startBackgroundService(_currentDriverId!);
        }
        break;

      case AppLifecycleState.resumed:
        // App returning to foreground
        debugPrint('[HomeScreen] App resumed - stopping background service');
        stopBackgroundService();

        // Sync any locations collected in background
        if (_isOnline) {
          widget.locationService.syncPendingLocations();
        }
        break;

      case AppLifecycleState.detached:
      case AppLifecycleState.inactive:
      case AppLifecycleState.hidden:
        // No action needed for these states
        break;
    }
  }

  Future<void> _fetchUnreadCount() async {
    try {
      final repository = di.sl<NotificationRepository>();
      final count = await repository.getUnreadCount();
      if (mounted) {
        setState(() => _unreadNotificationCount = count);
      }
    } catch (_) {
      // Ignore errors - just don't update the count
    }
  }

  Future<void> _requestLocationPermission() async {
    final hasPermission = await widget.locationService.checkPermissions();
    if (mounted) {
      setState(() => _hasLocationPermission = hasPermission);

      // If permission denied, show a dialog explaining why it's needed
      if (!hasPermission) {
        _showLocationPermissionDialog();
      }
    }
  }

  void _showLocationPermissionDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Location Permission Required'),
        content: const Text(
          'PharmaFleet needs access to your location to show your position on the map and enable delivery tracking.\n\nPlease grant location permission in Settings.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(context);
              // Open app settings so user can grant permission manually
              await openAppSettings();
            },
            child: const Text('Open Settings'),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _refreshTimer?.cancel();
    _notificationTimer?.cancel();
    super.dispose();
  }

  void _toggleOnlineStatus(bool isOnline) async {
    final tokenStorage = di.sl<TokenStorageService>();

    if (isOnline) {
      // Going online
      final hasPermission = await widget.locationService.checkPermissions();
      if (mounted) {
        setState(() => _hasLocationPermission = hasPermission);
      }
      if (!hasPermission) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Location permission required'),
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
        return;
      }
      final authState = context.read<AuthBloc>().state;
      final driverId = authState is AuthAuthenticated
          ? authState.user.id.toString()
          : 'unknown_driver';
      _currentDriverId = driverId;
      await widget.locationService.startTracking(driverId);

      // Persist online status and driver ID for background service
      await tokenStorage.saveOnlineStatus(true);
      await tokenStorage.saveDriverId(driverId);
    } else {
      // Going offline
      await widget.locationService.stopTracking();
      await stopBackgroundService();

      // Clear persisted online status
      await tokenStorage.saveOnlineStatus(false);
      await tokenStorage.clearDriverId();
      _currentDriverId = null;
    }

    // Track local state
    _isOnline = isOnline;

    // Update driver status on the backend
    final statusUpdated = await widget.locationService.updateDriverStatus(isOnline);
    if (!statusUpdated && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Failed to update status. Please try again.'),
          behavior: SnackBarBehavior.floating,
          backgroundColor: Theme.of(context).colorScheme.error,
        ),
      );
      return;
    }

    // Update BLoC with new status
    if (mounted) {
      context.read<HomeBloc>().add(HomeOnlineStatusChanged(isOnline));
    }
  }

  void _refreshData() {
    context.read<HomeBloc>().add(HomeRefreshRequested());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async {
            _refreshData();
          },
          child: BlocBuilder<HomeBloc, HomeState>(
            builder: (context, state) {
              if (state is HomeLoading) {
                return const _LoadingView();
              }

              if (state is HomeError) {
                return _ErrorView(
                  message: state.message,
                  onRetry: _refreshData,
                );
              }

              if (state is HomeLoaded) {
                final authState = context.read<AuthBloc>().state;
                final driverName = authState is AuthAuthenticated
                    ? (authState.user.fullName ?? 'Driver')
                    : 'Driver';
                return _HomeContentView(
                  state: state,
                  driverName: driverName,
                  onOnlineStatusChanged: _toggleOnlineStatus,
                  onRefresh: _refreshData,
                  hasLocationPermission: _hasLocationPermission,
                  unreadNotificationCount: _unreadNotificationCount,
                  onNotificationTapped: () async {
                    await context.push('/notifications');
                    // Refresh count when returning
                    _fetchUnreadCount();
                  },
                );
              }

              return const SizedBox.shrink();
            },
          ),
        ),
      ),
    );
  }
}

class _LoadingView extends StatelessWidget {
  const _LoadingView();

  @override
  Widget build(BuildContext context) {
    return const Center(child: CircularProgressIndicator());
  }
}

class _ErrorView extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _ErrorView({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: AppSpacing.paddingMD,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.error_outline,
              size: 64,
              color: Theme.of(context).colorScheme.error,
            ),
            const SizedBox(height: AppSpacing.md),
            Text(
              'Something went wrong',
              style: AppTextStyles.headlineSmall,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              message,
              style: AppTextStyles.bodyMedium.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.lg),
            AppButton(
              text: 'Try Again',
              onPressed: onRetry,
              variant: AppButtonVariant.primary,
            ),
          ],
        ),
      ),
    );
  }
}

class _HomeContentView extends StatelessWidget {
  final HomeLoaded state;
  final String driverName;
  final Function(bool) onOnlineStatusChanged;
  final VoidCallback onRefresh;
  final bool hasLocationPermission;
  final int unreadNotificationCount;
  final VoidCallback onNotificationTapped;

  const _HomeContentView({
    required this.state,
    required this.driverName,
    required this.onOnlineStatusChanged,
    required this.onRefresh,
    required this.hasLocationPermission,
    required this.unreadNotificationCount,
    required this.onNotificationTapped,
  });

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      physics:
          const AlwaysScrollableScrollPhysics(), // Enable refresh indicator
      padding: AppSpacing.paddingMD,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header with user info and online status
          _HeaderSection(
            driverName: driverName,
            isOnline: state.isOnline,
            onOnlineStatusChanged: onOnlineStatusChanged,
            unreadNotificationCount: unreadNotificationCount,
            onNotificationTapped: onNotificationTapped,
          ),
          const SizedBox(height: AppSpacing.lg),

          // Stats Grid (2x2)
          // Daily Summary Bar
          _DailySummaryOverview(stats: state.stats),
          const SizedBox(height: AppSpacing.lg),

          // Real-time Tracking with Mini Map
          SizedBox(
            height: MediaQuery.of(context).size.height * 0.55,
            child: _TrackingSection(
              isOnline: state.isOnline,
              activeDeliveries: state.stats.activeDeliveries,
              hasLocationPermission: hasLocationPermission,
            ),
          ),
          const SizedBox(height: AppSpacing.lg),

          // Recent Activity
          _RecentActivitySection(
            activities: state.recentActivities,
            onViewAll: () {
              // Navigate to activity screen if available
            },
          ),
          const SizedBox(height: AppSpacing.xl),
        ],
      ),
    );
  }
}

class _HeaderSection extends StatelessWidget {
  final String driverName;
  final bool isOnline;
  final Function(bool) onOnlineStatusChanged;
  final int unreadNotificationCount;
  final VoidCallback onNotificationTapped;

  const _HeaderSection({
    required this.driverName,
    required this.isOnline,
    required this.onOnlineStatusChanged,
    required this.unreadNotificationCount,
    required this.onNotificationTapped,
  });

  @override
  Widget build(BuildContext context) {
    return CardContainer(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          CircleAvatar(
            radius: 20,
            backgroundColor: Theme.of(context).colorScheme.primaryContainer,
            child: Icon(
              Icons.person,
              color: Theme.of(context).colorScheme.onPrimaryContainer,
              size: 20,
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  driverName,
                  style: AppTextStyles.titleMedium,
                ),
                Row(
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: isOnline ? Colors.green : Colors.grey,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      isOnline ? 'Online' : 'Offline',
                      style: AppTextStyles.bodySmall.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          // Notification Bell with Badge
          Stack(
            children: [
              IconButton(
                icon: Icon(
                  Icons.notifications_outlined,
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
                onPressed: onNotificationTapped,
              ),
              if (unreadNotificationCount > 0)
                Positioned(
                  right: 4,
                  top: 4,
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.error,
                      shape: unreadNotificationCount > 9
                          ? BoxShape.rectangle
                          : BoxShape.circle,
                      borderRadius: unreadNotificationCount > 9
                          ? BorderRadius.circular(8)
                          : null,
                    ),
                    constraints: const BoxConstraints(
                      minWidth: 16,
                      minHeight: 16,
                    ),
                    child: Text(
                      unreadNotificationCount > 99
                          ? '99+'
                          : '$unreadNotificationCount',
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
          const SizedBox(width: AppSpacing.xs),
          Switch(
            value: isOnline,
            onChanged: onOnlineStatusChanged,
            activeThumbColor: Theme.of(context).colorScheme.primary,
          ),
        ],
      ),
    );
  }
}

class _DailySummaryOverview extends StatelessWidget {
  final HomeStats stats;

  const _DailySummaryOverview({required this.stats});

  @override
  Widget build(BuildContext context) {
    return CardContainer(
      padding: EdgeInsets.zero,
      child: InkWell(
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => DailySummaryScreen(
                todayOrders: stats.todayOrders,
                completedOrders: stats.completedOrders,
                earnings: stats.earnings,
                rating: stats.rating,
              ),
            ),
          );
        },
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Today\'s Overview', style: AppTextStyles.titleMedium),
                  const SizedBox(height: 4),
                  Text(
                    '${stats.todayOrders} orders • KWD ${stats.earnings.toStringAsFixed(3)}',
                    style: AppTextStyles.bodyMedium.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
              Icon(
                Icons.chevron_right,
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _TrackingSection extends StatelessWidget {
  final bool isOnline;
  final int activeDeliveries;
  final bool hasLocationPermission;

  const _TrackingSection({
    required this.isOnline,
    required this.activeDeliveries,
    required this.hasLocationPermission,
  });

  @override
  Widget build(BuildContext context) {
    return CardContainer(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Real-Time Tracking', style: AppTextStyles.titleLarge),
              if (activeDeliveries > 0)
                StatusBadge(
                  text: '$activeDeliveries Active',
                  type: StatusType.delivery,
                ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          Expanded(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: Stack(
                children: [
                  MiniMapView(
                    initialPosition: const LatLng(
                      29.3759,
                      47.9774,
                    ), // Kuwait coordinates
                    height: double.infinity, // Take available space
                    showCurrentLocation: hasLocationPermission,
                    showMyLocationButton: false, // Disable default button
                    scrollGesturesEnabled: true,
                    zoomGesturesEnabled: true,
                  ),
                  // Custom my location button positioned at bottom-right
                  if (hasLocationPermission)
                    Positioned(
                      right: 12,
                      bottom: 12,
                      child: FloatingActionButton.small(
                        heroTag: 'myLocation',
                        backgroundColor: Colors.white,
                        onPressed: () {
                          // TODO: Animate to current location
                        },
                        child: Icon(
                          Icons.my_location,
                          color: Theme.of(context).colorScheme.primary,
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          if (isOnline) ...[
            Row(
              children: [
                Icon(
                  Icons.location_on,
                  size: 16,
                  color: Theme.of(context).colorScheme.primary,
                ),
                const SizedBox(width: AppSpacing.xs),
                Text(
                  'Location tracking active',
                  style: AppTextStyles.bodySmall.copyWith(
                    color: Theme.of(context).colorScheme.primary,
                  ),
                ),
                const Spacer(),
                TextButton(
                  onPressed: () {
                    // Navigate to full map view
                  },
                  child: Text(
                    'View Full Map',
                    style: AppTextStyles.bodySmall.copyWith(
                      color: Theme.of(context).colorScheme.primary,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
          ] else ...[
            Row(
              children: [
                Icon(
                  Icons.location_off,
                  size: 16,
                  color: Theme.of(context).colorScheme.outline,
                ),
                const SizedBox(width: AppSpacing.xs),
                Text(
                  'Go online to enable tracking',
                  style: AppTextStyles.bodySmall.copyWith(
                    color: Theme.of(context).colorScheme.outline,
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _RecentActivitySection extends StatelessWidget {
  final List<ActivityItem> activities;
  final VoidCallback onViewAll;

  const _RecentActivitySection({
    required this.activities,
    required this.onViewAll,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Recent Activity', style: AppTextStyles.titleLarge),
            if (activities.isNotEmpty)
              TextButton(onPressed: onViewAll, child: const Text('View All')),
          ],
        ),
        const SizedBox(height: AppSpacing.md),
        if (activities.isEmpty)
          CardContainer(
            child: Padding(
              padding: AppSpacing.paddingLG,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.history,
                    size: 32,
                    color: Theme.of(context).colorScheme.outline,
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Text(
                    'No recent activity',
                    style: AppTextStyles.bodyMedium.copyWith(
                      color: Theme.of(context).colorScheme.outline,
                    ),
                  ),
                ],
              ),
            ),
          )
        else
          ...activities.map(
            (activity) => Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.sm),
              child: activity_widget.ActivityItem(
                title: activity.title,
                description: activity.description,
                timestamp: _formatTimestamp(activity.timestamp),
                icon: _getActivityIcon(activity.type),
                iconColor: _getActivityColor(context, activity.type),
                onTap: () {
                  // Handle activity tap
                  if (activity.type == ActivityType.orderAssigned &&
                      activity.data?['orderId'] != null) {
                    context.go('/orders/${activity.data!['orderId']}');
                  }
                },
              ),
            ),
          ),
      ],
    );
  }

  String _formatTimestamp(DateTime timestamp) {
    final now = DateTime.now();
    final difference = now.difference(timestamp);

    if (difference.inMinutes < 60) {
      return '${difference.inMinutes}m ago';
    } else if (difference.inHours < 24) {
      return '${difference.inHours}h ago';
    } else {
      return '${timestamp.day}/${timestamp.month}';
    }
  }

  IconData _getActivityIcon(ActivityType type) {
    switch (type) {
      case ActivityType.orderAssigned:
        return Icons.assignment;
      case ActivityType.orderPickedUp:
        return Icons.inventory_2;
      case ActivityType.orderDelivered:
        return Icons.check_circle;
      case ActivityType.orderCancelled:
        return Icons.cancel;
      case ActivityType.paymentReceived:
        return Icons.payments;
      case ActivityType.locationUpdated:
        return Icons.location_on;
    }
  }

  Color _getActivityColor(BuildContext context, ActivityType type) {
    final colorScheme = Theme.of(context).colorScheme;
    switch (type) {
      case ActivityType.orderAssigned:
        return colorScheme.primary;
      case ActivityType.orderPickedUp:
        return context.customColors.warning;
      case ActivityType.orderDelivered:
        return context.customColors.success;
      case ActivityType.orderCancelled:
        return context.customColors.error;
      case ActivityType.paymentReceived:
        return context.customColors.info;
      case ActivityType.locationUpdated:
        return colorScheme.outline;
    }
  }
}
