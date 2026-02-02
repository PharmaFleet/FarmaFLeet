import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_spacing.dart';
import '../theme/app_text_styles.dart';

/// A compact colored badge for displaying status indicators and labels
/// 
/// This component provides a standardized badge design that can be used
/// throughout the application for showing status, categories, or tags.
/// 
/// Example usage:
/// ```dart
/// StatusBadge(
///   text: 'Active',
///   type: StatusType.success,
/// )
/// ```
/// 
/// With custom styling:
/// ```dart
/// StatusBadge(
///   text: 'Custom',
///   backgroundColor: Colors.purple,
///   textColor: Colors.white,
///   icon: Icons.star,
/// )
/// ```
enum StatusType {
  /// Success/positive status (green)
  success,
  
  /// Error/negative status (red)
  error,
  
  /// Warning/caution status (amber)
  warning,
  
  /// Informational status (blue)
  info,
  
  /// Neutral/default status (gray)
  neutral,
  
  /// Orders status (blue)
  orders,
  
  /// Drivers status (emerald)
  drivers,
  
  /// Payments status (amber)
  payments,
  
  /// Analytics status (purple)
  analytics,
  
  /// Delivery status (indigo)
  delivery,
  
  /// Failed status (red)
  failed,
  
  /// Cancelled status (red)
  cancelled,
}

class StatusBadge extends StatelessWidget {
  /// The text to display in the badge
  final String text;

  /// The predefined type of badge (determines colors)
  final StatusType? type;

  /// Custom background color (overrides type)
  final Color? backgroundColor;

  /// Custom text color (overrides type)
  final Color? textColor;

  /// Icon to display before the text (optional)
  final IconData? icon;

  /// Size variant for the badge
  final StatusBadgeSize size;

  /// Whether to show a compact version without padding
  final bool isCompact;

  /// Whether to show a pulse animation for active states
  final bool showPulse;

  /// Custom border radius
  final BorderRadius? borderRadius;

  /// Custom padding
  final EdgeInsets? padding;

  /// Semantic label for accessibility
  final String? semanticLabel;

  const StatusBadge({
    super.key,
    required this.text,
    this.type,
    this.backgroundColor,
    this.textColor,
    this.icon,
    this.size = StatusBadgeSize.medium,
    this.isCompact = false,
    this.showPulse = false,
    this.borderRadius,
    this.padding,
    this.semanticLabel,
  });

  /// Creates a status badge for order-related statuses
  factory StatusBadge.orders(String text, {bool isCompact = false}) {
    return StatusBadge(
      text: text,
      type: StatusType.orders,
      isCompact: isCompact,
    );
  }

  /// Creates a status badge for driver-related statuses
  factory StatusBadge.drivers(String text, {bool isCompact = false}) {
    return StatusBadge(
      text: text,
      type: StatusType.drivers,
      isCompact: isCompact,
    );
  }

  /// Creates a status badge for payment-related statuses
  factory StatusBadge.payments(String text, {bool isCompact = false}) {
    return StatusBadge(
      text: text,
      type: StatusType.payments,
      isCompact: isCompact,
    );
  }

  /// Creates a status badge for analytics-related statuses
  factory StatusBadge.analytics(String text, {bool isCompact = false}) {
    return StatusBadge(
      text: text,
      type: StatusType.analytics,
      isCompact: isCompact,
    );
  }

  /// Creates a status badge for delivery-related statuses
  factory StatusBadge.delivery(String text, {bool isCompact = false}) {
    return StatusBadge(
      text: text,
      type: StatusType.delivery,
      isCompact: isCompact,
    );
  }

  @override
  Widget build(BuildContext context) {
    final colors = _getColors();
    final effectiveBorderRadius = borderRadius ?? AppSpacing.radiusChip;
    final effectivePadding = padding ?? _getPadding();

    final Widget badgeChild = Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (icon != null) ...[
          Icon(
            icon,
            size: _getIconSize(),
            color: colors.textColor,
          ),
          const SizedBox(width: AppSpacing.xs),
        ],
        Flexible(
          child: Text(
            text,
            style: _getTextStyle(colors.textColor),
            overflow: TextOverflow.ellipsis,
            maxLines: 1,
          ),
        ),
      ],
    );

    Widget badge = Container(
      padding: isCompact ? EdgeInsets.zero : effectivePadding,
      decoration: BoxDecoration(
        color: colors.backgroundColor,
        borderRadius: effectiveBorderRadius,
        border: Border.all(
          color: colors.backgroundColor,
          width: 1,
        ),
      ),
      child: badgeChild,
    );

    // Add pulse animation if requested
    if (showPulse) {
      badge = _PulsingWidget(child: badge);
    }

    // Add semantic label for accessibility
    if (semanticLabel != null || text.isNotEmpty) {
      badge = Semantics(
        label: semanticLabel ?? text,
        container: true,
        child: badge,
      );
    }

    return badge;
  }

  ({Color backgroundColor, Color textColor}) _getColors() {
    // If custom colors are provided, use them
    if (backgroundColor != null || textColor != null) {
      return (
        backgroundColor: backgroundColor ?? AppColors.surface,
        textColor: textColor ?? AppColors.textPrimary,
      );
    }

    // Otherwise use type-based colors
    switch (type) {
      case StatusType.success:
        return (
          backgroundColor: AppColors.successContainer,
          textColor: AppColors.onSuccess,
        );
      case StatusType.error:
        return (
          backgroundColor: AppColors.errorContainer,
          textColor: AppColors.onError,
        );
      case StatusType.warning:
        return (
          backgroundColor: AppColors.warningContainer,
          textColor: AppColors.onWarning,
        );
      case StatusType.info:
        return (
          backgroundColor: AppColors.infoContainer,
          textColor: AppColors.onInfo,
        );
      case StatusType.neutral:
        return (
          backgroundColor: AppColors.surfaceVariant,
          textColor: AppColors.textSecondary,
        );
      case StatusType.orders:
        return (
          backgroundColor: AppColors.ordersContainer,
          textColor: AppColors.onOrders,
        );
      case StatusType.drivers:
        return (
          backgroundColor: AppColors.driversContainer,
          textColor: AppColors.onDrivers,
        );
      case StatusType.payments:
        return (
          backgroundColor: AppColors.paymentsContainer,
          textColor: AppColors.onPayments,
        );
      case StatusType.analytics:
        return (
          backgroundColor: AppColors.analyticsContainer,
          textColor: AppColors.onAnalytics,
        );
      case StatusType.delivery:
        return (
          backgroundColor: AppColors.deliveryContainer,
          textColor: AppColors.onDelivery,
        );
      case StatusType.failed:
        return (
          backgroundColor: AppColors.failedContainer,
          textColor: AppColors.onFailed,
        );
      case StatusType.cancelled:
        return (
          backgroundColor: AppColors.cancelledContainer,
          textColor: AppColors.onCancelled,
        );
      case null:
        return (
          backgroundColor: AppColors.surfaceVariant,
          textColor: AppColors.textSecondary,
        );
    }
  }

  TextStyle _getTextStyle(Color textColor) {
    switch (size) {
      case StatusBadgeSize.small:
        return AppTextStyles.labelSmall.copyWith(
          color: textColor,
          fontWeight: FontWeight.w600,
        );
      case StatusBadgeSize.medium:
        return AppTextStyles.labelMedium.copyWith(
          color: textColor,
          fontWeight: FontWeight.w600,
        );
      case StatusBadgeSize.large:
        return AppTextStyles.labelLarge.copyWith(
          color: textColor,
          fontWeight: FontWeight.w600,
        );
    }
  }

  EdgeInsets _getPadding() {
    switch (size) {
      case StatusBadgeSize.small:
        return const EdgeInsets.symmetric(
          horizontal: AppSpacing.sm,
          vertical: AppSpacing.xs,
        );
      case StatusBadgeSize.medium:
        return const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.sm,
        );
      case StatusBadgeSize.large:
        return const EdgeInsets.symmetric(
          horizontal: AppSpacing.lg,
          vertical: AppSpacing.sm,
        );
    }
  }

  double _getIconSize() {
    switch (size) {
      case StatusBadgeSize.small:
        return 12.0;
      case StatusBadgeSize.medium:
        return 14.0;
      case StatusBadgeSize.large:
        return 16.0;
    }
  }
}

/// Size variants for status badges
enum StatusBadgeSize {
  /// Small badge (12px font height)
  small,
  
  /// Medium badge (14px font height)
  medium,
  
  /// Large badge (16px font height)
  large,
}

/// A widget that provides a pulsing animation effect
class _PulsingWidget extends StatefulWidget {
  final Widget child;

  const _PulsingWidget({required this.child});

  @override
  State<_PulsingWidget> createState() => _PulsingWidgetState();
}

class _PulsingWidgetState extends State<_PulsingWidget>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    );

    _animation = Tween<double>(
      begin: 1.0,
      end: 1.1,
    ).animate(CurvedAnimation(
      parent: _controller,
      curve: Curves.easeInOut,
    ));

    _controller.repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        return Transform.scale(
          scale: _animation.value,
          child: widget.child,
        );
      },
    );
  }
}