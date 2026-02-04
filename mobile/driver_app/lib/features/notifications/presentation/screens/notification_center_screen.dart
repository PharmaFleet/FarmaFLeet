import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../theme/theme.dart';
import '../../../../widgets/widgets.dart';
import '../../domain/entities/notification_entity.dart';
import '../bloc/notification_bloc.dart';

/// Screen displaying all notifications with management actions.
class NotificationCenterScreen extends StatefulWidget {
  const NotificationCenterScreen({super.key});

  @override
  State<NotificationCenterScreen> createState() => _NotificationCenterScreenState();
}

class _NotificationCenterScreenState extends State<NotificationCenterScreen> {
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    // Fetch notifications when screen loads
    context.read<NotificationBloc>().add(const FetchNotifications(refresh: true));

    // Setup scroll listener for pagination
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_isBottom) {
      final state = context.read<NotificationBloc>().state;
      if (state is NotificationsLoaded && state.hasMore) {
        context.read<NotificationBloc>().add(const FetchNotifications());
      }
    }
  }

  bool get _isBottom {
    if (!_scrollController.hasClients) {
      return false;
    }
    final maxScroll = _scrollController.position.maxScrollExtent;
    final currentScroll = _scrollController.offset;
    return currentScroll >= (maxScroll * 0.9);
  }

  void _showClearDialog() {
    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Clear Notifications'),
        content: const Text('What would you like to clear?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(dialogContext);
              context.read<NotificationBloc>().add(
                const ClearNotifications(keepUnread: true),
              );
            },
            child: const Text('Clear Read Only'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(dialogContext);
              context.read<NotificationBloc>().add(
                const ClearNotifications(keepUnread: false),
              );
            },
            style: TextButton.styleFrom(
              foregroundColor: Theme.of(context).colorScheme.error,
            ),
            child: const Text('Clear All'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          BlocBuilder<NotificationBloc, NotificationState>(
            builder: (context, state) {
              final hasNotifications = state is NotificationsLoaded &&
                  state.notifications.isNotEmpty;
              final hasUnread = state is NotificationsLoaded && state.unreadCount > 0;

              return Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (hasUnread)
                    IconButton(
                      icon: const Icon(Icons.done_all),
                      tooltip: 'Mark All Read',
                      onPressed: () {
                        context.read<NotificationBloc>().add(const MarkAllRead());
                      },
                    ),
                  if (hasNotifications)
                    IconButton(
                      icon: const Icon(Icons.delete_outline),
                      tooltip: 'Clear',
                      onPressed: _showClearDialog,
                    ),
                ],
              );
            },
          ),
        ],
      ),
      body: BlocConsumer<NotificationBloc, NotificationState>(
        listener: (context, state) {
          if (state is NotificationsError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.message),
                behavior: SnackBarBehavior.floating,
                backgroundColor: Theme.of(context).colorScheme.error,
              ),
            );
          }
        },
        builder: (context, state) {
          if (state is NotificationsLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state is NotificationsError) {
            return _ErrorView(
              message: state.message,
              onRetry: () {
                context.read<NotificationBloc>().add(
                  const FetchNotifications(refresh: true),
                );
              },
            );
          }

          final notifications = state is NotificationsLoaded
              ? state.notifications
              : state is NotificationActionInProgress
                  ? state.notifications
                  : <NotificationEntity>[];
          final processingId = state is NotificationActionInProgress
              ? state.processingId
              : null;

          if (notifications.isEmpty) {
            return const _EmptyView();
          }

          return RefreshIndicator(
            onRefresh: () async {
              context.read<NotificationBloc>().add(
                const FetchNotifications(refresh: true),
              );
            },
            child: ListView.builder(
              controller: _scrollController,
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
              itemCount: notifications.length + 1,
              itemBuilder: (context, index) {
                if (index >= notifications.length) {
                  // Loading indicator at bottom
                  if (state is NotificationsLoaded && state.hasMore) {
                    return const Padding(
                      padding: EdgeInsets.all(AppSpacing.lg),
                      child: Center(child: CircularProgressIndicator()),
                    );
                  }
                  return const SizedBox.shrink();
                }

                final notification = notifications[index];
                final isProcessing = processingId == notification.id;

                return _NotificationTile(
                  notification: notification,
                  isProcessing: isProcessing,
                  onTap: () => _handleNotificationTap(notification),
                  onMarkAsRead: () {
                    context.read<NotificationBloc>().add(MarkAsRead(notification.id));
                  },
                );
              },
            ),
          );
        },
      ),
    );
  }

  void _handleNotificationTap(NotificationEntity notification) {
    // Mark as read
    context.read<NotificationBloc>().add(NotificationTapped(notification));

    // Navigate based on notification type
    final type = notification.type;
    final data = notification.data;

    switch (type) {
      case 'new_orders':
        // Navigate to orders list
        context.push('/orders');
        break;
      case 'payment_collection':
        // Navigate to specific order if orderId is in data
        if (data != null && data['order_id'] != null) {
          context.push('/order/${data['order_id']}');
        } else {
          context.push('/orders');
        }
        break;
      case 'order_update':
        // Navigate to specific order
        if (data != null && data['order_id'] != null) {
          context.push('/order/${data['order_id']}');
        }
        break;
      default:
        // For unknown types, just mark as read (already done above)
        break;
    }
  }
}

/// Individual notification tile widget.
class _NotificationTile extends StatelessWidget {
  final NotificationEntity notification;
  final bool isProcessing;
  final VoidCallback onTap;
  final VoidCallback onMarkAsRead;

  const _NotificationTile({
    required this.notification,
    required this.isProcessing,
    required this.onTap,
    required this.onMarkAsRead,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Dismissible(
      key: Key('notification_${notification.id}'),
      direction: notification.isRead
          ? DismissDirection.none
          : DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: AppSpacing.lg),
        color: colorScheme.primaryContainer,
        child: Icon(
          Icons.done,
          color: colorScheme.onPrimaryContainer,
        ),
      ),
      onDismissed: (_) => onMarkAsRead(),
      child: CardContainer(
        margin: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.xs,
        ),
        padding: const EdgeInsets.all(AppSpacing.md),
        backgroundColor: notification.isRead
            ? colorScheme.surface
            : colorScheme.primaryContainer.withValues(alpha: 0.3),
        onTap: onTap,
        child: Stack(
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Icon based on notification type
                _NotificationIcon(type: notification.type),
                const SizedBox(width: AppSpacing.md),

                // Content
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              notification.title,
                              style: AppTextStyles.titleMedium.copyWith(
                                fontWeight: notification.isRead
                                    ? FontWeight.normal
                                    : FontWeight.bold,
                              ),
                            ),
                          ),
                          if (!notification.isRead)
                            Container(
                              width: 8,
                              height: 8,
                              decoration: BoxDecoration(
                                color: colorScheme.primary,
                                shape: BoxShape.circle,
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.xs),
                      Text(
                        notification.body,
                        style: AppTextStyles.bodyMedium.copyWith(
                          color: colorScheme.onSurfaceVariant,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            _formatTimestamp(notification.createdAt),
                            style: AppTextStyles.bodySmall.copyWith(
                              color: colorScheme.outline,
                            ),
                          ),

                          // Action button based on notification type
                          _NotificationAction(
                            notification: notification,
                            onTap: onTap,
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),

            // Loading overlay when processing
            if (isProcessing)
              Positioned.fill(
                child: Container(
                  color: colorScheme.surface.withValues(alpha: 0.7),
                  child: const Center(
                    child: SizedBox(
                      width: 24,
                      height: 24,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  String _formatTimestamp(DateTime timestamp) {
    final now = DateTime.now();
    final difference = now.difference(timestamp);

    if (difference.inMinutes < 1) {
      return 'Just now';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes}m ago';
    } else if (difference.inHours < 24) {
      return '${difference.inHours}h ago';
    } else if (difference.inDays < 7) {
      return '${difference.inDays}d ago';
    } else {
      return '${timestamp.day}/${timestamp.month}/${timestamp.year}';
    }
  }
}

/// Icon widget based on notification type.
class _NotificationIcon extends StatelessWidget {
  final String? type;

  const _NotificationIcon({required this.type});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    IconData icon;
    Color backgroundColor;
    Color iconColor;

    switch (type) {
      case 'new_orders':
        icon = Icons.assignment_add;
        backgroundColor = context.customColors.info.withValues(alpha: 0.2);
        iconColor = context.customColors.info;
        break;
      case 'payment_collection':
        icon = Icons.payments;
        backgroundColor = context.customColors.warning.withValues(alpha: 0.2);
        iconColor = context.customColors.warning;
        break;
      case 'order_update':
        icon = Icons.update;
        backgroundColor = colorScheme.primaryContainer;
        iconColor = colorScheme.primary;
        break;
      case 'system':
        icon = Icons.info;
        backgroundColor = colorScheme.surfaceContainerHighest;
        iconColor = colorScheme.outline;
        break;
      default:
        icon = Icons.notifications;
        backgroundColor = colorScheme.primaryContainer;
        iconColor = colorScheme.primary;
    }

    return Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Icon(icon, color: iconColor, size: 20),
    );
  }
}

/// Action button based on notification type.
class _NotificationAction extends StatelessWidget {
  final NotificationEntity notification;
  final VoidCallback onTap;

  const _NotificationAction({
    required this.notification,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final type = notification.type;

    switch (type) {
      case 'new_orders':
        return TextButton.icon(
          onPressed: onTap,
          icon: const Icon(Icons.arrow_forward, size: 16),
          label: const Text('View Orders'),
          style: TextButton.styleFrom(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            minimumSize: Size.zero,
            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
          ),
        );
      case 'payment_collection':
        return TextButton.icon(
          onPressed: onTap,
          icon: const Icon(Icons.visibility, size: 16),
          label: const Text('View'),
          style: TextButton.styleFrom(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            minimumSize: Size.zero,
            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
          ),
        );
      default:
        return const SizedBox.shrink();
    }
  }
}

/// Empty state view when there are no notifications.
class _EmptyView extends StatelessWidget {
  const _EmptyView();

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Center(
      child: Padding(
        padding: AppSpacing.paddingLG,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.notifications_off_outlined,
              size: 64,
              color: colorScheme.outline,
            ),
            const SizedBox(height: AppSpacing.lg),
            Text(
              'No Notifications',
              style: AppTextStyles.headlineSmall.copyWith(
                color: colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              'You\'re all caught up! New notifications will appear here.',
              style: AppTextStyles.bodyMedium.copyWith(
                color: colorScheme.outline,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

/// Error state view.
class _ErrorView extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _ErrorView({
    required this.message,
    required this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Center(
      child: Padding(
        padding: AppSpacing.paddingLG,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.error_outline,
              size: 64,
              color: colorScheme.error,
            ),
            const SizedBox(height: AppSpacing.lg),
            Text(
              'Something went wrong',
              style: AppTextStyles.headlineSmall,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              message,
              style: AppTextStyles.bodyMedium.copyWith(
                color: colorScheme.onSurfaceVariant,
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
