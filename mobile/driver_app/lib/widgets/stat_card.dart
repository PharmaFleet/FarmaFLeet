import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_spacing.dart';
import '../theme/app_text_styles.dart';
import 'card_container.dart';

/// A dashboard metric display component
/// 
/// This component provides a standardized way to display key metrics
/// and statistics in the dashboard with title, value, description, and icon.
/// 
/// Example usage:
/// ```dart
/// StatCard(
///   title: 'Total Orders',
///   value: '1,234',
///   description: '+12% from last month',
///   icon: Icons.shopping_cart,
///   valueColor: AppColors.orders,
/// )
/// ```
/// 
/// With custom styling:
/// ```dart
/// StatCard(
///   title: 'Revenue',
///   value: '\$45,678',
///   description: 'This month',
///   icon: Icons.attach_money,
///   valueColor: AppColors.success,
///   onTap: () => navigateToRevenueDetails(),
///   isLoading: false,
/// )
/// ```
class StatCard extends StatelessWidget {
  /// The title/label for the metric
  final String title;

  /// The main value to display
  final String value;

  /// Additional description or subtitle
  final String? description;

  /// Icon to represent the metric
  final IconData? icon;

  /// Color for the value text
  final Color? valueColor;

  /// Color for the icon
  final Color? iconColor;

  /// Whether the card is in a loading state
  final bool isLoading;

  /// Callback when the card is tapped
  final VoidCallback? onTap;

  /// Custom background color
  final Color? backgroundColor;

  /// Whether to show a trend indicator
  final String? trend;

  /// Trend type (up, down, neutral)
  final TrendType? trendType;

  /// Additional widget to display below the main content
  final Widget? footer;

  /// Semantic label for accessibility
  final String? semanticLabel;

  const StatCard({
    super.key,
    required this.title,
    required this.value,
    this.description,
    this.icon,
    this.valueColor,
    this.iconColor,
    this.isLoading = false,
    this.onTap,
    this.backgroundColor,
    this.trend,
    this.trendType,
    this.footer,
    this.semanticLabel,
  });

  @override
  Widget build(BuildContext context) {
    final effectiveValueColor = valueColor ?? AppColors.textPrimary;
    final effectiveIconColor = iconColor ?? AppColors.textSecondary;

    Widget content;

    if (isLoading) {
      content = _buildLoadingContent();
    } else {
      content = _buildContent(effectiveValueColor, effectiveIconColor);
    }

    return CardContainer(
      onTap: onTap,
      backgroundColor: backgroundColor,
      semanticLabel: semanticLabel ?? '$title: $value${description != null ? ', $description' : ''}',
      child: content,
    );
  }

  Widget _buildLoadingContent() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            // Icon placeholder
            Container(
              width: 40,
              height: 40,
              decoration: const BoxDecoration(
                color: AppColors.surfaceVariant,
                borderRadius: AppSpacing.radiusSM,
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            // Title placeholder
            Expanded(
              child: Container(
                height: 16,
                decoration: const BoxDecoration(
                  color: AppColors.surfaceVariant,
                  borderRadius: AppSpacing.radiusXS,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.lg),
        // Value placeholder
        Container(
          width: double.infinity,
          height: 32,
          decoration: const BoxDecoration(
            color: AppColors.surfaceVariant,
            borderRadius: AppSpacing.radiusXS,
          ),
        ),
        // Description placeholder
        if (description != null) ...[
          const SizedBox(height: AppSpacing.sm),
          Container(
            width: 120,
            height: 14,
            decoration: const BoxDecoration(
              color: AppColors.surfaceVariant,
              borderRadius: AppSpacing.radiusXS,
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildContent(Color valueColor, Color iconColor) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header with icon and title
        Row(
          children: [
            if (icon != null) ...[
              Container(
                padding: const EdgeInsets.all(AppSpacing.sm),
                decoration: BoxDecoration(
                  color: iconColor.withValues(alpha: 0.1),
                  borderRadius: AppSpacing.radiusSM,
                ),
                child: Icon(
                  icon,
                  color: iconColor,
                  size: 20,
                ),
              ),
              const SizedBox(width: AppSpacing.md),
            ],
            Expanded(
              child: Text(
                title,
                style: AppTextStyles.labelMedium.copyWith(
                  color: AppColors.textSecondary,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            // Trend indicator
            if (trend != null && trendType != null)
              _buildTrendIndicator(),
          ],
        ),
        const SizedBox(height: AppSpacing.lg),
        // Main value
        Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Flexible(
              child: FittedBox(
                fit: BoxFit.scaleDown,
                alignment: AlignmentDirectional.centerStart,
                child: Text(
                  value,
                  style: AppTextStyles.statNumber.copyWith(
                    color: valueColor,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
          ],
        ),
        // Description
        if (description != null) ...[
          const SizedBox(height: AppSpacing.sm),
          Text(
            description!,
            style: AppTextStyles.bodySmall.copyWith(
              color: AppColors.textTertiary,
            ),
          ),
        ],
        // Footer widget
        if (footer != null) ...[
          const SizedBox(height: AppSpacing.md),
          footer!,
        ],
      ],
    );
  }

  Widget _buildTrendIndicator() {
    final trendColor = _getTrendColor();
    final trendIcon = _getTrendIcon();

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(
          trendIcon,
          size: 16,
          color: trendColor,
        ),
        const SizedBox(width: AppSpacing.xs),
        Text(
          trend!,
          style: AppTextStyles.labelSmall.copyWith(
            color: trendColor,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }

  Color _getTrendColor() {
    switch (trendType) {
      case TrendType.up:
        return AppColors.success;
      case TrendType.down:
        return AppColors.error;
      case TrendType.neutral:
        return AppColors.textSecondary;
      case null:
        return AppColors.textSecondary;
    }
  }

  IconData _getTrendIcon() {
    switch (trendType) {
      case TrendType.up:
        return Icons.trending_up;
      case TrendType.down:
        return Icons.trending_down;
      case TrendType.neutral:
        return Icons.trending_flat;
      case null:
        return Icons.trending_flat;
    }
  }
}

/// Enum for trend types
enum TrendType {
  /// Positive/upward trend
  up,
  
  /// Negative/downward trend
  down,
  
  /// Neutral/sideways trend
  neutral,
}

/// A specialized stat card for financial metrics
class FinancialStatCard extends StatelessWidget {
  /// The title/label for the metric
  final String title;

  /// The monetary value to display
  final double amount;

  /// Currency symbol (defaults to $)
  final String currencySymbol;

  /// Additional description or subtitle
  final String? description;

  /// Whether to show the change indicator
  final double? changeAmount;

  /// Whether the change is positive
  final bool isPositiveChange;

  /// Callback when the card is tapped
  final VoidCallback? onTap;

  /// Semantic label for accessibility
  final String? semanticLabel;

  const FinancialStatCard({
    super.key,
    required this.title,
    required this.amount,
    this.currencySymbol = '\$',
    this.description,
    this.changeAmount,
    this.isPositiveChange = true,
    this.onTap,
    this.semanticLabel,
  });

  @override
  Widget build(BuildContext context) {
    final formattedAmount = _formatAmount(amount);
    final changeText = changeAmount != null
        ? '${isPositiveChange ? '+' : '-'}${_formatAmount(changeAmount!)}'
        : null;
    final trendType = changeAmount != null
        ? (isPositiveChange ? TrendType.up : TrendType.down)
        : null;

    return StatCard(
      title: title,
      value: '$currencySymbol$formattedAmount',
      description: description,
      icon: Icons.attach_money,
      valueColor: AppColors.success,
      iconColor: AppColors.success,
      trend: changeText,
      trendType: trendType,
      onTap: onTap,
      semanticLabel: semanticLabel,
    );
  }

  String _formatAmount(double amount) {
    if (amount >= 1000000) {
      return '${(amount / 1000000).toStringAsFixed(1)}M';
    } else if (amount >= 1000) {
      return '${(amount / 1000).toStringAsFixed(1)}K';
    } else {
      return amount.toStringAsFixed(2);
    }
  }
}

/// A stat card for count-based metrics
class CountStatCard extends StatelessWidget {
  /// The title/label for the metric
  final String title;

  /// The count value
  final int count;

  /// Additional description or subtitle
  final String? description;

  /// Icon to represent the metric
  final IconData icon;

  /// Color theme for the card
  final Color color;

  /// Whether to show the change indicator
  final int? changeCount;

  /// Whether the change is positive
  final bool isPositiveChange;

  /// Callback when the card is tapped
  final VoidCallback? onTap;

  /// Semantic label for accessibility
  final String? semanticLabel;

  const CountStatCard({
    super.key,
    required this.title,
    required this.count,
    this.description,
    required this.icon,
    required this.color,
    this.changeCount,
    this.isPositiveChange = true,
    this.onTap,
    this.semanticLabel,
  });

  @override
  Widget build(BuildContext context) {
    final formattedCount = _formatCount(count);
    final changeText = changeCount != null
        ? '${isPositiveChange ? '+' : '-'}${_formatCount(changeCount!)}'
        : null;
    final trendType = changeCount != null
        ? (isPositiveChange ? TrendType.up : TrendType.down)
        : null;

    return StatCard(
      title: title,
      value: formattedCount,
      description: description,
      icon: icon,
      valueColor: color,
      iconColor: color,
      trend: changeText,
      trendType: trendType,
      onTap: onTap,
      semanticLabel: semanticLabel,
    );
  }

  String _formatCount(int count) {
    if (count >= 1000000) {
      return '${(count / 1000000).toStringAsFixed(1)}M';
    } else if (count >= 1000) {
      return '${(count / 1000).toStringAsFixed(1)}K';
    } else {
      return count.toString();
    }
  }
}