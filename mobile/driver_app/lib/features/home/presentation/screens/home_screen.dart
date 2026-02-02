import 'dart:async';

import 'package:driver_app/core/services/location_service.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:driver_app/features/home/presentation/bloc/home_bloc.dart';
import 'package:driver_app/features/home/presentation/screens/daily_summary_screen.dart';
import 'package:driver_app/theme/theme.dart';
// Aliased import for the UI component
import 'package:driver_app/widgets/activity_item.dart' as activity_widget;
import 'package:driver_app/widgets/widgets.dart'
    hide ActivityItem, ActivityType;
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

class HomeScreen extends StatefulWidget {
  final LocationService locationService;

  const HomeScreen({super.key, required this.locationService});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  Timer? _refreshTimer;
  bool _hasLocationPermission = false;

  @override
  void initState() {
    super.initState();
    _requestLocationPermission();
    // Load initial data when screen is created
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<HomeBloc>().add(HomeLoadRequested());
    });

    // Auto-refresh every 30 seconds
    _refreshTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      if (mounted) {
        _refreshData();
      }
    });
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
    _refreshTimer?.cancel();
    super.dispose();
  }

  void _toggleOnlineStatus(bool isOnline) async {
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
      // TODO: Get actual driver ID from auth state
      await widget.locationService.startTracking('current_driver');
    } else {
      // Going offline
      await widget.locationService.stopTracking();
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
                return _HomeContentView(
                  state: state,
                  onOnlineStatusChanged: _toggleOnlineStatus,
                  onRefresh: _refreshData,
                  hasLocationPermission: _hasLocationPermission,
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
  final Function(bool) onOnlineStatusChanged;
  final VoidCallback onRefresh;
  final bool hasLocationPermission;

  const _HomeContentView({
    required this.state,
    required this.onOnlineStatusChanged,
    required this.onRefresh,
    required this.hasLocationPermission,
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
            isOnline: state.isOnline,
            onOnlineStatusChanged: onOnlineStatusChanged,
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
  final bool isOnline;
  final Function(bool) onOnlineStatusChanged;

  const _HeaderSection({
    required this.isOnline,
    required this.onOnlineStatusChanged,
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
                  'Driver', // TODO: Get actual name
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
              child: MiniMapView(
                initialPosition: const LatLng(
                  29.3759,
                  47.9774,
                ), // Kuwait coordinates
                height: double.infinity, // Take available space
                showCurrentLocation: hasLocationPermission,
                scrollGesturesEnabled: true,
                zoomGesturesEnabled: true,
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
