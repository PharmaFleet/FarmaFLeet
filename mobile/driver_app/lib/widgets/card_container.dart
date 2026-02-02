import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_spacing.dart';

/// A versatile card container with consistent padding and border radius
/// 
/// This component provides a standardized card layout that can be used
/// throughout the application for content grouping and visual hierarchy.
/// 
/// Example usage:
/// ```dart
/// CardContainer(
///   child: Column(
///     children: [
///       Text('Card Title'),
///       Text('Card content goes here...'),
///     ],
///   ),
/// )
/// ```
/// 
/// With custom styling:
/// ```dart
/// CardContainer(
///   padding: AppSpacing.paddingLG,
///   margin: AppSpacing.marginSM,
///   backgroundColor: AppColors.surfaceVariant,
///   elevation: 8,
///   borderRadius: AppSpacing.radiusXL,
///   child: child,
/// )
/// ```
class CardContainer extends StatelessWidget {
  /// The child widget contained within the card
  final Widget child;

  /// Custom padding for the card content
  /// Defaults to [AppSpacing.paddingCard] (16px all around)
  final EdgeInsets? padding;

  /// Custom margin around the card
  /// Defaults to null (no margin)
  final EdgeInsets? margin;

  /// Background color of the card
  /// Defaults to [AppColors.surface] (white)
  final Color? backgroundColor;

  /// Elevation of the card (shadow depth)
  /// Defaults to 2
  final double elevation;

  /// Border radius of the card corners
  /// Defaults to [AppSpacing.radiusCard] (10px radius)
  final BorderRadius? borderRadius;

  /// Border to draw around the card
  /// Defaults to null (no border)
  final BoxBorder? border;

  /// Whether to show a subtle shadow effect
  /// Defaults to true
  final bool showShadow;

  /// Callback when the card is tapped
  /// Makes the card interactive when provided
  final VoidCallback? onTap;

  /// Custom width constraint
  /// Defaults to null (no constraint)
  final double? width;

  /// Custom height constraint
  /// Defaults to null (no constraint)
  final double? height;

  /// Semantic label for accessibility
  /// Important for screen readers
  final String? semanticLabel;

  const CardContainer({
    super.key,
    required this.child,
    this.padding,
    this.margin,
    this.backgroundColor,
    this.elevation = 2,
    this.borderRadius,
    this.border,
    this.showShadow = true,
    this.onTap,
    this.width,
    this.height,
    this.semanticLabel,
  });

  @override
  Widget build(BuildContext context) {
    final effectiveBackgroundColor = backgroundColor ?? AppColors.surface;
    final effectiveBorderRadius = borderRadius ?? AppSpacing.radiusCard;
    final effectivePadding = padding ?? AppSpacing.paddingCard;

    Widget cardWidget = Container(
      width: width,
      height: height,
      margin: margin,
      decoration: BoxDecoration(
        color: effectiveBackgroundColor,
        borderRadius: effectiveBorderRadius,
        border: border,
        boxShadow: showShadow
            ? [
                BoxShadow(
                  color: AppColors.shadow,
                  blurRadius: elevation * 2,
                  offset: Offset(0, elevation),
                ),
              ]
            : null,
      ),
      child: Padding(
        padding: effectivePadding,
        child: child,
      ),
    );

    // Make card interactive if onTap is provided
    if (onTap != null) {
      cardWidget = Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: effectiveBorderRadius,
          child: cardWidget,
        ),
      );
    }

    // Add semantic label for accessibility
    if (semanticLabel != null) {
      cardWidget = Semantics(
        label: semanticLabel,
        button: onTap != null,
        child: cardWidget,
      );
    }

    return cardWidget;
  }
}

/// A bordered variant of CardContainer with a visible border
/// 
/// This is useful for creating cards with distinct boundaries
/// without relying on elevation/shadows.
class BorderedCardContainer extends StatelessWidget {
  /// The child widget contained within the card
  final Widget child;

  /// Custom padding for the card content
  final EdgeInsets? padding;

  /// Custom margin around the card
  final EdgeInsets? margin;

  /// Border color
  /// Defaults to [AppColors.outline]
  final Color borderColor;

  /// Border width
  /// Defaults to 1px
  final double borderWidth;

  /// Background color of the card
  final Color? backgroundColor;

  /// Callback when the card is tapped
  final VoidCallback? onTap;

  /// Semantic label for accessibility
  final String? semanticLabel;

  const BorderedCardContainer({
    super.key,
    required this.child,
    this.padding,
    this.margin,
    this.borderColor = AppColors.outline,
    this.borderWidth = 1.0,
    this.backgroundColor,
    this.onTap,
    this.semanticLabel,
  });

  @override
  Widget build(BuildContext context) {
    return CardContainer(
      padding: padding,
      margin: margin,
      backgroundColor: backgroundColor,
      elevation: 0,
      showShadow: false,
      border: Border.all(
        color: borderColor,
        width: borderWidth,
      ),
      onTap: onTap,
      semanticLabel: semanticLabel,
      child: child,
    );
  }
}

/// A highlighted card variant with primary brand color accent
class HighlightedCardContainer extends StatelessWidget {
  /// The child widget contained within the card
  final Widget child;

  /// Custom padding for the card content
  final EdgeInsets? padding;

  /// Custom margin around the card
  final EdgeInsets? margin;

  /// Callback when the card is tapped
  final VoidCallback? onTap;

  /// Semantic label for accessibility
  final String? semanticLabel;

  const HighlightedCardContainer({
    super.key,
    required this.child,
    this.padding,
    this.margin,
    this.onTap,
    this.semanticLabel,
  });

  @override
  Widget build(BuildContext context) {
    return CardContainer(
      padding: padding,
      margin: margin,
      backgroundColor: AppColors.primaryContainer,
      border: Border.all(
        color: AppColors.primary.withValues(alpha: 0.2),
        width: 1,
      ),
      elevation: 1,
      showShadow: true,
      onTap: onTap,
      semanticLabel: semanticLabel,
      child: child,
    );
  }
}