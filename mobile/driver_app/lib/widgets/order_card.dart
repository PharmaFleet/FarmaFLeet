import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_spacing.dart';
import '../theme/app_text_styles.dart';
import 'app_button.dart';
import 'card_container.dart';
import 'status_badge.dart';

/// A list item for displaying orders with status badges and actions
/// 
/// This component provides a standardized way to display order information
/// in lists with status badges, customer information, and action buttons.
/// 
/// Example usage:
/// ```dart
/// OrderCard(
///   orderId: 'ORD-1234',
///   customerName: 'John Doe',
///   customerAddress: '123 Main St, City, State',
///   amount: 45.67,
///   status: 'Pending',
///   onTap: () => viewOrderDetails(),
///   onAccept: () => acceptOrder(),
///   onReject: () => rejectOrder(),
/// )
/// ```
/// 
/// With minimal actions:
/// ```dart
/// OrderCard(
///   orderId: 'ORD-1235',
///   customerName: 'Jane Smith',
///   customerAddress: '456 Oak Ave, City, State',
///   amount: 78.90,
///   status: 'Completed',
///   onTap: () => viewOrderDetails(),
///   showActions: false,
/// )
/// ```
enum OrderPriority {
  /// Low priority order
  low,
  
  /// Normal priority order
  normal,
  
  /// High priority order
  high,
  
  /// Urgent priority order
  urgent,
}

class OrderCard extends StatelessWidget {
  /// Unique order identifier
  final String orderId;

  /// Customer name
  final String customerName;

  /// Customer address
  final String customerAddress;

  /// Customer phone number (optional)
  final String? customerPhone;

  /// Order amount
  final double amount;

  /// Current order status
  final String status;

  /// Order priority
  final OrderPriority priority;

  /// Order date/time
  final String? orderDate;

  /// Delivery date/time (optional)
  final String? deliveryDate;

  /// Special instructions (optional)
  final String? instructions;

  /// Number of items in the order (optional)
  final int? itemCount;

  /// Customer avatar URL (optional)
  final String? customerAvatar;

  /// Callback when the card is tapped
  final VoidCallback? onTap;

  /// Callback when accept action is triggered
  final VoidCallback? onAccept;

  /// Callback when reject action is triggered
  final VoidCallback? onReject;

  /// Callback when view details action is triggered
  final VoidCallback? onViewDetails;

  /// Callback when call customer action is triggered
  final VoidCallback? onCallCustomer;

  /// Whether to show action buttons
  final bool showActions;

  /// Whether to show priority indicator
  final bool showPriority;

  /// Whether to show customer avatar
  final bool showCustomerAvatar;

  /// Whether the card is in a loading state
  final bool isLoading;

  /// Custom background color
  final Color? backgroundColor;

  /// Custom margin
  final EdgeInsets? margin;

  /// Whether to show the bottom divider
  final bool showDivider;

  /// Semantic label for accessibility
  final String? semanticLabel;

  const OrderCard({
    super.key,
    required this.orderId,
    required this.customerName,
    required this.customerAddress,
    this.customerPhone,
    required this.amount,
    required this.status,
    this.priority = OrderPriority.normal,
    this.orderDate,
    this.deliveryDate,
    this.instructions,
    this.itemCount,
    this.customerAvatar,
    this.onTap,
    this.onAccept,
    this.onReject,
    this.onViewDetails,
    this.onCallCustomer,
    this.showActions = true,
    this.showPriority = true,
    this.showCustomerAvatar = true,
    this.isLoading = false,
    this.backgroundColor,
    this.margin,
    this.showDivider = true,
    this.semanticLabel,
  });

  /// Creates a compact version of the order card
  factory OrderCard.compact({
    required String orderId,
    required String customerName,
    required String customerAddress,
    required double amount,
    required String status,
    VoidCallback? onTap,
    OrderPriority priority = OrderPriority.normal,
    String? orderDate,
    bool showPriority = false,
  }) {
    return OrderCard(
      orderId: orderId,
      customerName: customerName,
      customerAddress: customerAddress,
      amount: amount,
      status: status,
      priority: priority,
      orderDate: orderDate,
      onTap: onTap,
      showActions: false,
      showPriority: showPriority,
      showCustomerAvatar: false,
    );
  }

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return _buildLoadingCard();
    }

    Widget card = CardContainer(
      margin: margin ?? AppSpacing.marginBottom,
      backgroundColor: backgroundColor,
      onTap: onTap,
      semanticLabel: semanticLabel ?? 'Order $orderId for $customerName, status: $status, amount: \$${amount.toStringAsFixed(2)}',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header with order ID, status, and priority
          _buildHeader(),
          const SizedBox(height: AppSpacing.md),
          // Customer information
          _buildCustomerInfo(),
          const SizedBox(height: AppSpacing.md),
          // Order details
          _buildOrderDetails(),
          if (instructions != null) ...[
            const SizedBox(height: AppSpacing.sm),
            _buildInstructions(),
          ],
          // Action buttons
          if (showActions) ...[
            const SizedBox(height: AppSpacing.lg),
            _buildActions(),
          ],
        ],
      ),
    );

    if (showDivider) {
      card = Column(
        children: [
          card,
          const Divider(
            height: 1,
            thickness: 1,
            color: AppColors.outlineVariant,
          ),
        ],
      );
    }

    return card;
  }

  Widget _buildLoadingCard() {
    return CardContainer(
      margin: margin ?? AppSpacing.marginBottom,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header placeholder
          Row(
            children: [
              Expanded(
                child: Container(
                  height: 20,
                  decoration: const BoxDecoration(
                    color: AppColors.surfaceVariant,
                    borderRadius: AppSpacing.radiusXS,
                  ),
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Container(
                width: 80,
                height: 24,
                decoration: const BoxDecoration(
                  color: AppColors.surfaceVariant,
                  borderRadius: AppSpacing.radiusXS,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          // Customer info placeholder
          Container(
            height: 16,
            width: double.infinity,
            decoration: const BoxDecoration(
              color: AppColors.surfaceVariant,
              borderRadius: AppSpacing.radiusXS,
            ),
          ),
          const SizedBox(height: AppSpacing.xs),
          Container(
            height: 14,
            width: 200,
            decoration: const BoxDecoration(
              color: AppColors.surfaceVariant,
              borderRadius: AppSpacing.radiusXS,
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          // Actions placeholder
          Row(
            children: [
              Expanded(
                child: Container(
                  height: 36,
                  decoration: const BoxDecoration(
                    color: AppColors.surfaceVariant,
                    borderRadius: AppSpacing.radiusSM,
                  ),
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Container(
                  height: 36,
                  decoration: const BoxDecoration(
                    color: AppColors.surfaceVariant,
                    borderRadius: AppSpacing.radiusSM,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Row(
      children: [
        // Order ID
        Expanded(
          child: Text(
            orderId,
            style: AppTextStyles.titleMedium.copyWith(
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
        ),
        // Status badge
        StatusBadge(
          text: status,
          type: _getStatusType(),
          size: StatusBadgeSize.small,
        ),
        // Priority indicator
        if (showPriority && priority != OrderPriority.normal) ...[
          const SizedBox(width: AppSpacing.sm),
          _buildPriorityIndicator(),
        ],
      ],
    );
  }

  Widget _buildPriorityIndicator() {
    final (Color color, IconData icon, String label) = _getPriorityInfo();

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.xs,
        vertical: 2,
      ),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: AppSpacing.radiusChip,
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            icon,
            size: 12,
            color: color,
          ),
          const SizedBox(width: 2),
          Text(
            label,
            style: AppTextStyles.labelSmall.copyWith(
              color: color,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCustomerInfo() {
    return Row(
      children: [
        // Customer avatar
        if (showCustomerAvatar) ...[
          CircleAvatar(
            radius: 20,
            backgroundColor: AppColors.primary.withValues(alpha: 0.1),
            backgroundImage: customerAvatar != null
                ? NetworkImage(customerAvatar!)
                : null,
            child: customerAvatar == null
                ? Text(
                    customerName.isNotEmpty
                        ? customerName[0].toUpperCase()
                        : '?',
                    style: AppTextStyles.labelLarge.copyWith(
                      color: AppColors.primary,
                      fontWeight: FontWeight.w600,
                    ),
                  )
                : null,
          ),
          const SizedBox(width: AppSpacing.md),
        ],
        // Customer details
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                customerName,
                style: AppTextStyles.bodyMedium.copyWith(
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: AppSpacing.xs),
              Text(
                customerAddress,
                style: AppTextStyles.bodySmall.copyWith(
                  color: AppColors.textSecondary,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              if (customerPhone != null) ...[
                const SizedBox(height: AppSpacing.xs),
                Text(
                  customerPhone!,
                  style: AppTextStyles.bodySmall.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildOrderDetails() {
    return Row(
      children: [
        // Amount
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Amount',
                style: AppTextStyles.labelSmall.copyWith(
                  color: AppColors.textTertiary,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                '\$${amount.toStringAsFixed(2)}',
                style: AppTextStyles.titleMedium.copyWith(
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
        ),
        // Order date
        if (orderDate != null) ...[
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Order Date',
                  style: AppTextStyles.labelSmall.copyWith(
                    color: AppColors.textTertiary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  orderDate!,
                  style: AppTextStyles.bodyMedium.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        ],
        // Item count
        if (itemCount != null) ...[
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Items',
                  style: AppTextStyles.labelSmall.copyWith(
                    color: AppColors.textTertiary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '$itemCount',
                  style: AppTextStyles.bodyMedium.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildInstructions() {
    return Container(
      padding: AppSpacing.paddingSM,
      decoration: BoxDecoration(
        color: AppColors.infoContainer,
        borderRadius: AppSpacing.radiusSM,
        border: Border.all(
          color: AppColors.info.withValues(alpha: 0.2),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(
            Icons.info_outline,
            size: 16,
            color: AppColors.info,
          ),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Text(
              instructions!,
              style: AppTextStyles.bodySmall.copyWith(
                color: AppColors.info,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActions() {
    switch (status.toLowerCase()) {
      case 'pending':
        return Row(
          children: [
            Expanded(
              child: AppButton.secondary(
                text: 'Reject',
                onPressed: onReject,
                size: AppButtonSize.small,
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: AppButton.primary(
                text: 'Accept',
                onPressed: onAccept,
                size: AppButtonSize.small,
              ),
            ),
          ],
        );
      case 'accepted':
      case 'processing':
        return Row(
          children: [
            Expanded(
              child: AppButton.outline(
                text: 'View Details',
                onPressed: onViewDetails,
                size: AppButtonSize.small,
              ),
            ),
            if (onCallCustomer != null) ...[
              const SizedBox(width: AppSpacing.md),
              AppButton.ghost(
                text: '',
                leadingIcon: Icons.call,
                onPressed: onCallCustomer,
                size: AppButtonSize.small,
              ),
            ],
          ],
        );
      case 'completed':
      case 'delivered':
        return Row(
          children: [
            Expanded(
              child: AppButton.outline(
                text: 'View Details',
                onPressed: onViewDetails,
                size: AppButtonSize.small,
              ),
            ),
          ],
        );
      default:
        return Row(
          children: [
            Expanded(
              child: AppButton.outline(
                text: 'View Details',
                onPressed: onViewDetails,
                size: AppButtonSize.small,
              ),
            ),
          ],
        );
    }
  }

  StatusType _getStatusType() {
    switch (status.toLowerCase()) {
      case 'pending':
        return StatusType.warning;
      case 'accepted':
      case 'processing':
      case 'in progress':
        return StatusType.info;
      case 'completed':
      case 'delivered':
        return StatusType.success;
      case 'cancelled':
      case 'rejected':
        return StatusType.error;
      default:
        return StatusType.neutral;
    }
  }

  (Color, IconData, String) _getPriorityInfo() {
    switch (priority) {
      case OrderPriority.urgent:
        return (AppColors.error, Icons.priority_high, 'Urgent');
      case OrderPriority.high:
        return (AppColors.warning, Icons.keyboard_arrow_up, 'High');
      case OrderPriority.low:
        return (AppColors.info, Icons.keyboard_arrow_down, 'Low');
      case OrderPriority.normal:
        return (AppColors.textTertiary, Icons.remove, 'Normal');
    }
  }
}