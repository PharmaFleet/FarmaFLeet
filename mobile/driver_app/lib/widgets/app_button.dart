import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_spacing.dart';
import '../theme/app_text_styles.dart';

/// A versatile button component with multiple variants and states
///
/// This component provides a standardized button design that can be used
/// throughout the application for various actions and interactions.
///
/// Example usage:
/// ```dart
/// AppButton(
///   text: 'Submit',
///   onPressed: () => handleSubmit(),
///   variant: AppButtonVariant.primary,
/// )
/// ```
///
/// With loading state:
/// ```dart
/// AppButton(
///   text: 'Loading...',
///   onPressed: null, // Disabled when loading
///   isLoading: true,
///   variant: AppButtonVariant.primary,
/// )
/// ```
enum AppButtonVariant {
  /// Primary brand button (emerald background)
  primary,

  /// Secondary button (gray background)
  secondary,

  /// Outline button (transparent with border)
  outline,

  /// Destructive button (red background)
  destructive,

  /// Ghost button (transparent, no border)
  ghost,
}

enum AppButtonSize {
  /// Small button (32px height)
  small,

  /// Medium button (40px height)
  medium,

  /// Large button (48px height)
  large,
}

class AppButton extends StatelessWidget {
  /// The text to display on the button
  final String text;

  /// Callback when the button is pressed
  final VoidCallback? onPressed;

  /// The visual variant of the button
  final AppButtonVariant variant;

  /// The size of the button
  final AppButtonSize size;

  /// Whether the button is in a loading state
  final bool isLoading;

  /// Icon to display before the text (optional)
  final IconData? leadingIcon;

  /// Icon to display after the text (optional)
  final IconData? trailingIcon;

  /// Whether the button should take full width
  final bool fullWidth;

  /// Custom width of the button
  final double? width;

  /// Custom height of the button
  final double? height;

  /// Custom padding (overrides size-based padding)
  final EdgeInsets? padding;

  /// Custom border radius (overrides theme)
  final BorderRadius? borderRadius;

  /// Semantic label for accessibility
  final String? semanticLabel;

  /// Whether the button has a focus outline
  final bool showFocusOutline;

  const AppButton({
    super.key,
    required this.text,
    required this.onPressed,
    this.variant = AppButtonVariant.primary,
    this.size = AppButtonSize.medium,
    this.isLoading = false,
    this.leadingIcon,
    this.trailingIcon,
    this.fullWidth = false,
    this.width,
    this.height,
    this.padding,
    this.borderRadius,
    this.semanticLabel,
    this.showFocusOutline = true,
  });

  /// Creates a primary button
  factory AppButton.primary({
    required String text,
    required VoidCallback? onPressed,
    AppButtonSize size = AppButtonSize.medium,
    bool isLoading = false,
    IconData? leadingIcon,
    IconData? trailingIcon,
    bool fullWidth = false,
    double? width,
    double? height,
    String? semanticLabel,
  }) {
    return AppButton(
      text: text,
      onPressed: onPressed,
      variant: AppButtonVariant.primary,
      size: size,
      isLoading: isLoading,
      leadingIcon: leadingIcon,
      trailingIcon: trailingIcon,
      fullWidth: fullWidth,
      width: width,
      height: height,
      semanticLabel: semanticLabel,
    );
  }

  /// Creates a secondary button
  factory AppButton.secondary({
    required String text,
    required VoidCallback? onPressed,
    AppButtonSize size = AppButtonSize.medium,
    bool isLoading = false,
    IconData? leadingIcon,
    IconData? trailingIcon,
    bool fullWidth = false,
    double? width,
    double? height,
    String? semanticLabel,
  }) {
    return AppButton(
      text: text,
      onPressed: onPressed,
      variant: AppButtonVariant.secondary,
      size: size,
      isLoading: isLoading,
      leadingIcon: leadingIcon,
      trailingIcon: trailingIcon,
      fullWidth: fullWidth,
      width: width,
      height: height,
      semanticLabel: semanticLabel,
    );
  }

  /// Creates an outline button
  factory AppButton.outline({
    required String text,
    required VoidCallback? onPressed,
    AppButtonSize size = AppButtonSize.medium,
    bool isLoading = false,
    IconData? leadingIcon,
    IconData? trailingIcon,
    bool fullWidth = false,
    double? width,
    double? height,
    String? semanticLabel,
  }) {
    return AppButton(
      text: text,
      onPressed: onPressed,
      variant: AppButtonVariant.outline,
      size: size,
      isLoading: isLoading,
      leadingIcon: leadingIcon,
      trailingIcon: trailingIcon,
      fullWidth: fullWidth,
      width: width,
      height: height,
      semanticLabel: semanticLabel,
    );
  }

  /// Creates a destructive button
  factory AppButton.destructive({
    required String text,
    required VoidCallback? onPressed,
    AppButtonSize size = AppButtonSize.medium,
    bool isLoading = false,
    IconData? leadingIcon,
    IconData? trailingIcon,
    bool fullWidth = false,
    double? width,
    double? height,
    String? semanticLabel,
  }) {
    return AppButton(
      text: text,
      onPressed: onPressed,
      variant: AppButtonVariant.destructive,
      size: size,
      isLoading: isLoading,
      leadingIcon: leadingIcon,
      trailingIcon: trailingIcon,
      fullWidth: fullWidth,
      width: width,
      height: height,
      semanticLabel: semanticLabel,
    );
  }

  /// Creates a ghost button
  factory AppButton.ghost({
    required String text,
    required VoidCallback? onPressed,
    AppButtonSize size = AppButtonSize.medium,
    bool isLoading = false,
    IconData? leadingIcon,
    IconData? trailingIcon,
    bool fullWidth = false,
    double? width,
    double? height,
    String? semanticLabel,
  }) {
    return AppButton(
      text: text,
      onPressed: onPressed,
      variant: AppButtonVariant.ghost,
      size: size,
      isLoading: isLoading,
      leadingIcon: leadingIcon,
      trailingIcon: trailingIcon,
      fullWidth: fullWidth,
      width: width,
      height: height,
      semanticLabel: semanticLabel,
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final buttonStyle = _getButtonStyle();
    final textStyle = _getTextStyle();
    final effectivePadding = padding ?? _getPadding();
    final effectiveBorderRadius = borderRadius ?? AppSpacing.radiusButton;
    final effectiveHeight = height ?? _getHeight();

    final Widget buttonChild = _buildButtonChild(textStyle);

    Widget button = SizedBox(
      width: fullWidth ? double.infinity : width,
      height: effectiveHeight,
      child: TextButton(
        onPressed: isLoading ? null : onPressed,
        style: buttonStyle,
        child: buttonChild,
      ),
    );

    // Add semantic label for accessibility
    if (semanticLabel != null || text.isNotEmpty) {
      button = Semantics(
        label: semanticLabel ?? text,
        button: true,
        excludeSemantics: true,
        child: button,
      );
    }

    return button;
  }

  Widget _buildButtonChild(TextStyle textStyle) {
    if (isLoading) {
      return Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: _getIconSize(),
            height: _getIconSize(),
            child: CircularProgressIndicator(
              strokeWidth: 2,
              valueColor: AlwaysStoppedAnimation<Color>(_getTextColor()),
            ),
          ),
          const SizedBox(width: AppSpacing.sm),
          Text(text, style: textStyle),
        ],
      );
    }

    return Row(
      mainAxisSize: MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (leadingIcon != null) ...[
          Icon(leadingIcon, size: _getIconSize(), color: _getTextColor()),
          const SizedBox(width: AppSpacing.sm),
        ],
        Flexible(
          child: Text(
            text,
            style: textStyle,
            textAlign: TextAlign.center,
            overflow: TextOverflow.ellipsis,
            maxLines: 1,
          ),
        ),
        if (trailingIcon != null) ...[
          const SizedBox(width: AppSpacing.sm),
          Icon(trailingIcon, size: _getIconSize(), color: _getTextColor()),
        ],
      ],
    );
  }

  ButtonStyle _getButtonStyle() {
    final colors = _getColors();
    final effectiveBorderRadius = borderRadius ?? AppSpacing.radiusButton;

    switch (variant) {
      case AppButtonVariant.primary:
        return TextButton.styleFrom(
          backgroundColor: colors.backgroundColor,
          foregroundColor: colors.textColor,
          padding: padding ?? _getPadding(),
          shape: RoundedRectangleBorder(borderRadius: effectiveBorderRadius),
          elevation: 0,
          side: BorderSide(color: colors.borderColor, width: 1),
        ).copyWith(
          overlayColor: WidgetStateProperty.all(colors.overlayColor),
          foregroundColor: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.disabled)) {
              return AppColors.textDisabled;
            }
            return colors.textColor;
          }),
          backgroundColor: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.disabled)) {
              return AppColors.surfaceVariant;
            }
            return colors.backgroundColor;
          }),
        );

      case AppButtonVariant.secondary:
        return TextButton.styleFrom(
          backgroundColor: colors.backgroundColor,
          foregroundColor: colors.textColor,
          padding: padding ?? _getPadding(),
          shape: RoundedRectangleBorder(borderRadius: effectiveBorderRadius),
          elevation: 0,
          side: BorderSide(color: colors.borderColor, width: 1),
        ).copyWith(
          overlayColor: WidgetStateProperty.all(colors.overlayColor),
          foregroundColor: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.disabled)) {
              return AppColors.textDisabled;
            }
            return colors.textColor;
          }),
          backgroundColor: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.disabled)) {
              return AppColors.surfaceVariant;
            }
            return colors.backgroundColor;
          }),
        );

      case AppButtonVariant.outline:
        return TextButton.styleFrom(
          backgroundColor: colors.backgroundColor,
          foregroundColor: colors.textColor,
          padding: padding ?? _getPadding(),
          shape: RoundedRectangleBorder(borderRadius: effectiveBorderRadius),
          elevation: 0,
          side: BorderSide(color: colors.borderColor, width: 1),
        ).copyWith(
          overlayColor: WidgetStateProperty.all(colors.overlayColor),
          foregroundColor: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.disabled)) {
              return AppColors.textDisabled;
            }
            return colors.textColor;
          }),
        );

      case AppButtonVariant.destructive:
        return TextButton.styleFrom(
          backgroundColor: colors.backgroundColor,
          foregroundColor: colors.textColor,
          padding: padding ?? _getPadding(),
          shape: RoundedRectangleBorder(borderRadius: effectiveBorderRadius),
          elevation: 0,
          side: BorderSide(color: colors.borderColor, width: 1),
        ).copyWith(
          overlayColor: WidgetStateProperty.all(colors.overlayColor),
          foregroundColor: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.disabled)) {
              return AppColors.textDisabled;
            }
            return colors.textColor;
          }),
          backgroundColor: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.disabled)) {
              return AppColors.surfaceVariant;
            }
            return colors.backgroundColor;
          }),
        );

      case AppButtonVariant.ghost:
        return TextButton.styleFrom(
          backgroundColor: colors.backgroundColor,
          foregroundColor: colors.textColor,
          padding: padding ?? _getPadding(),
          shape: RoundedRectangleBorder(borderRadius: effectiveBorderRadius),
          elevation: 0,
          side: BorderSide.none,
        ).copyWith(
          overlayColor: WidgetStateProperty.all(colors.overlayColor),
          foregroundColor: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.disabled)) {
              return AppColors.textDisabled;
            }
            return colors.textColor;
          }),
        );
    }
  }

  ({
    Color backgroundColor,
    Color textColor,
    Color borderColor,
    Color overlayColor,
  })
  _getColors() {
    switch (variant) {
      case AppButtonVariant.primary:
        return (
          backgroundColor: AppColors.primary,
          textColor: AppColors.onPrimary,
          borderColor: AppColors.primary,
          overlayColor: AppColors.primary.withOpacity(0.1),
        );
      case AppButtonVariant.secondary:
        return (
          backgroundColor: AppColors.surfaceVariant,
          textColor: AppColors.textPrimary,
          borderColor: AppColors.outline,
          overlayColor: AppColors.outline.withOpacity(0.1),
        );
      case AppButtonVariant.outline:
        return (
          backgroundColor: Colors.transparent,
          textColor: AppColors.primary,
          borderColor: AppColors.primary,
          overlayColor: AppColors.primary.withOpacity(0.1),
        );
      case AppButtonVariant.destructive:
        return (
          backgroundColor: AppColors.error,
          textColor: AppColors.onError,
          borderColor: AppColors.error,
          overlayColor: AppColors.error.withOpacity(0.1),
        );
      case AppButtonVariant.ghost:
        return (
          backgroundColor: Colors.transparent,
          textColor: AppColors.textPrimary,
          borderColor: Colors.transparent,
          overlayColor: AppColors.textSecondary.withOpacity(0.1),
        );
    }
  }

  TextStyle _getTextStyle() {
    final baseStyle = size == AppButtonSize.small
        ? AppTextStyles.smallButtonText
        : AppTextStyles.buttonText;

    return baseStyle.copyWith(
      color: _getTextColor(),
      fontWeight: FontWeight.w600,
    );
  }

  Color _getTextColor() {
    return _getColors().textColor;
  }

  EdgeInsets _getPadding() {
    switch (size) {
      case AppButtonSize.small:
        return const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.xs,
        );
      case AppButtonSize.medium:
        return const EdgeInsets.symmetric(
          horizontal: AppSpacing.lg,
          vertical: AppSpacing.sm,
        );
      case AppButtonSize.large:
        return const EdgeInsets.symmetric(
          horizontal: AppSpacing.xl,
          vertical: AppSpacing.md,
        );
    }
  }

  double _getHeight() {
    switch (size) {
      case AppButtonSize.small:
        return 32.0;
      case AppButtonSize.medium:
        return 40.0;
      case AppButtonSize.large:
        return 48.0;
    }
  }

  double _getIconSize() {
    switch (size) {
      case AppButtonSize.small:
        return 16.0;
      case AppButtonSize.medium:
        return 18.0;
      case AppButtonSize.large:
        return 20.0;
    }
  }
}
