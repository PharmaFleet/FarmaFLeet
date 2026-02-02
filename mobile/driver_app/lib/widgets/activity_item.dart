import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_spacing.dart';
import '../theme/app_text_styles.dart';
import 'card_container.dart';
import 'status_badge.dart';

/// An item in the Recent Activity feed
/// 
/// This component provides a standardized way to display activity items
/// with icons, titles, descriptions, timestamps, and status badges.
/// 
/// Example usage:
/// ```dart
/// ActivityItem(
///   title: 'Order #1234 Completed',
///   description: 'Delivered to John Doe',
///   timestamp: '2 hours ago',
///   icon: Icons.check_circle,
///   status: 'Completed',
///   type: ActivityType.order,
/// )
/// ```
/// 
/// With custom styling:
/// ```dart
/// ActivityItem(
///   title: 'Payment Received',
///   description: '\$45.67 from order #1234',
///   timestamp: '5 minutes ago',
///   icon: Icons.payments,
///   status: 'Success',
///   type: ActivityType.payment,
///   onTap: () => viewPaymentDetails(),
///   showDivider: true,
/// )
/// ```
enum ActivityType {
  /// Order-related activity
  order,
  
  /// Payment-related activity
  payment,
  
  /// Driver-related activity
  driver,
  
  /// Analytics-related activity
  analytics,
  
  /// Delivery-related activity
  delivery,
  
  /// System-related activity
  system,
  
  /// Generic activity
  generic,
}

class ActivityItem extends StatelessWidget {
  /// Title of the activity
  final String title;

  /// Detailed description of the activity
  final String? description;

  /// When the activity occurred
  final String timestamp;

  /// Icon to represent the activity
  final IconData icon;

  /// Status of the activity
  final String? status;

  /// Type of activity (determines color scheme)
  final ActivityType type;

  /// Callback when the item is tapped
  final VoidCallback? onTap;

  /// Whether to show a divider at the bottom
  final bool showDivider;

  /// Whether to show the status badge
  final bool showStatus;

  /// Whether to show the timestamp
  final bool showTimestamp;

  /// Whether to use a compact layout
  final bool isCompact;

  /// Custom icon color (overrides type-based color)
  final Color? iconColor;

  /// Custom background color
  final Color? backgroundColor;

  /// Custom status badge variant
  final StatusBadgeSize? statusBadgeSize;

  /// Additional widget to display (e.g., amount, user avatar)
  final Widget? trailing;

  /// Semantic label for accessibility
  final String? semanticLabel;

  const ActivityItem({
    super.key,
    required this.title,
    this.description,
    required this.timestamp,
    required this.icon,
    this.status,
    this.type = ActivityType.generic,
    this.onTap,
    this.showDivider = true,
    this.showStatus = true,
    this.showTimestamp = true,
    this.isCompact = false,
    this.iconColor,
    this.backgroundColor,
    this.statusBadgeSize,
    this.trailing,
    this.semanticLabel,
  });

  @override
  Widget build(BuildContext context) {
    final effectiveIconColor = iconColor ?? _getIconColor();

    Widget content = Column(
      children: [
        Padding(
          padding: isCompact
              ? const EdgeInsets.symmetric(
                  horizontal: AppSpacing.md,
                  vertical: AppSpacing.sm,
                )
              : const EdgeInsets.symmetric(
                  horizontal: AppSpacing.lg,
                  vertical: AppSpacing.md,
                ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Icon
              Container(
                padding: isCompact
                    ? const EdgeInsets.all(AppSpacing.sm)
                    : const EdgeInsets.all(AppSpacing.md),
                decoration: BoxDecoration(
                  color: effectiveIconColor.withValues(alpha: 0.1),
                  borderRadius: AppSpacing.radiusSM,
                ),
                child: Icon(
                  icon,
                  color: effectiveIconColor,
                  size: isCompact ? 18 : 20,
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              // Content
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Title and status row
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            title,
                            style: isCompact
                                ? AppTextStyles.bodyMedium.copyWith(
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.textPrimary,
                                  )
                                : AppTextStyles.titleSmall.copyWith(
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.textPrimary,
                                  ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (showStatus && status != null) ...[
                          const SizedBox(width: AppSpacing.sm),
                          StatusBadge(
                            text: status!,
                            type: _getStatusType(),
                            size: statusBadgeSize ?? StatusBadgeSize.small,
                            isCompact: isCompact,
                          ),
                        ],
                      ],
                    ),
                    // Description
                    if (description != null && !isCompact) ...[
                      const SizedBox(height: AppSpacing.xs),
                      Text(
                        description!,
                        style: AppTextStyles.bodySmall.copyWith(
                          color: AppColors.textSecondary,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                    // Timestamp and trailing widget row
                    const SizedBox(height: AppSpacing.xs),
                    Row(
                      children: [
                        if (showTimestamp) ...[
                          const Icon(
                            Icons.access_time,
                            size: 12,
                            color: AppColors.textTertiary,
                          ),
                          const SizedBox(width: AppSpacing.xs),
                          Text(
                            timestamp,
                            style: AppTextStyles.labelSmall.copyWith(
                              color: AppColors.textTertiary,
                            ),
                          ),
                        ],
                        if (trailing != null) ...[
                          const Spacer(),
                          trailing!,
                        ],
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        // Divider
        if (showDivider)
          Divider(
            height: 1,
            thickness: 1,
            color: AppColors.outlineVariant,
            indent: isCompact ? 60 : 76,
          ),
      ],
    );

    // Make the item interactive if onTap is provided
    if (onTap != null) {
      content = Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: AppSpacing.radiusSM,
          child: content,
        ),
      );
    }

    // Add semantic label for accessibility
    if (semanticLabel != null || title.isNotEmpty) {
      content = Semantics(
        label: semanticLabel ?? '$title, $timestamp${description != null ? ', $description' : ''}',
        button: onTap != null,
        child: content,
      );
    }

    // Wrap in card container if background color is specified
    if (backgroundColor != null) {
      content = CardContainer(
        padding: EdgeInsets.zero,
        backgroundColor: backgroundColor,
        margin: EdgeInsets.zero,
        child: content,
      );
    }

    return content;
  }

  Color _getIconColor() {
    switch (type) {
      case ActivityType.order:
        return AppColors.orders;
      case ActivityType.payment:
        return AppColors.payments;
      case ActivityType.driver:
        return AppColors.drivers;
      case ActivityType.analytics:
        return AppColors.analytics;
      case ActivityType.delivery:
        return AppColors.delivery;
      case ActivityType.system:
        return AppColors.info;
      case ActivityType.generic:
        return AppColors.textSecondary;
    }
  }

  StatusType _getStatusType() {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'delivered':
      case 'success':
        return StatusType.success;
      case 'failed':
      case 'error':
      case 'cancelled':
        return StatusType.error;
      case 'pending':
      case 'processing':
      case 'in progress':
        return StatusType.warning;
      case 'paid':
      case 'received':
        return StatusType.info;
      default:
        return StatusType.neutral;
    }
  }
}

/// A specialized activity item for order-related activities
class OrderActivityItem extends StatelessWidget {
  /// Order ID
  final String orderId;

  /// Order status
  final String status;

  /// Customer name (optional)
  final String? customerName;

  /// Order amount (optional)
  final double? amount;

  /// When the activity occurred
  final String timestamp;

  /// Callback when the item is tapped
  final VoidCallback? onTap;

  /// Whether to show a divider at the bottom
  final bool showDivider;

  const OrderActivityItem({
    super.key,
    required this.orderId,
    required this.status,
    this.customerName,
    this.amount,
    required this.timestamp,
    this.onTap,
    this.showDivider = true,
  });

  @override
  Widget build(BuildContext context) {
    String title;
    String? description;
    IconData icon;
    
    switch (status.toLowerCase()) {
      case 'delivered':
        title = 'Order #$orderId Delivered';
        icon = Icons.check_circle;
        break;
      case 'cancelled':
        title = 'Order #$orderId Cancelled';
        icon = Icons.cancel;
        break;
      case 'processing':
        title = 'Order #$orderId Processing';
        icon = Icons.pending;
        break;
      default:
        title = 'Order #$orderId Updated';
        icon = Icons.shopping_cart;
    }

    if (customerName != null) {
      description = 'Customer: $customerName';
    }

    return ActivityItem(
      title: title,
      description: description,
      timestamp: timestamp,
      icon: icon,
      status: status,
      type: ActivityType.order,
      onTap: onTap,
      showDivider: showDivider,
      trailing: amount != null
          ? Text(
              '\$${amount!.toStringAsFixed(2)}',
              style: AppTextStyles.labelMedium.copyWith(
                color: AppColors.textPrimary,
                fontWeight: FontWeight.w600,
              ),
            )
          : null,
    );
  }
}

/// A specialized activity item for payment-related activities
class PaymentActivityItem extends StatelessWidget {
  /// Payment amount
  final double amount;

  /// Payment status
  final String status;

  /// Order ID (optional)
  final String? orderId;

  /// Payment method (optional)
  final String? paymentMethod;

  /// When the activity occurred
  final String timestamp;

  /// Callback when the item is tapped
  final VoidCallback? onTap;

  /// Whether to show a divider at the bottom
  final bool showDivider;

  const PaymentActivityItem({
    super.key,
    required this.amount,
    required this.status,
    this.orderId,
    this.paymentMethod,
    required this.timestamp,
    this.onTap,
    this.showDivider = true,
  });

  @override
  Widget build(BuildContext context) {
    String title;
    IconData icon;
    
    switch (status.toLowerCase()) {
      case 'completed':
      case 'paid':
        title = 'Payment Received';
        icon = Icons.check_circle;
        break;
      case 'failed':
        title = 'Payment Failed';
        icon = Icons.error;
        break;
      case 'pending':
        title = 'Payment Pending';
        icon = Icons.pending;
        break;
      default:
        title = 'Payment Updated';
        icon = Icons.payments;
    }

    String? description;
    if (orderId != null) {
      description = 'Order #$orderId';
      if (paymentMethod != null) {
        description += ' via $paymentMethod';
      }
    } else if (paymentMethod != null) {
      description = 'Via $paymentMethod';
    }

    return ActivityItem(
      title: title,
      description: description,
      timestamp: timestamp,
      icon: icon,
      status: status,
      type: ActivityType.payment,
      onTap: onTap,
      showDivider: showDivider,
      trailing: Text(
        '\$${amount.toStringAsFixed(2)}',
        style: AppTextStyles.labelMedium.copyWith(
          color: status.toLowerCase() == 'failed'
              ? AppColors.error
              : AppColors.success,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

/// A specialized activity item for driver-related activities
class DriverActivityItem extends StatelessWidget {
  /// Driver name
  final String driverName;

  /// Activity description
  final String description;

  /// Activity status
  final String? status;

  /// When the activity occurred
  final String timestamp;

  /// Callback when the item is tapped
  final VoidCallback? onTap;

  /// Whether to show a divider at the bottom
  final bool showDivider;

  const DriverActivityItem({
    super.key,
    required this.driverName,
    required this.description,
    this.status,
    required this.timestamp,
    this.onTap,
    this.showDivider = true,
  });

  @override
  Widget build(BuildContext context) {
    return ActivityItem(
      title: driverName,
      description: description,
      timestamp: timestamp,
      icon: Icons.person,
      status: status,
      type: ActivityType.driver,
      onTap: onTap,
      showDivider: showDivider,
    );
  }
}