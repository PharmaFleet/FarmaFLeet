// Theme system foundation for the PharmaFleet Driver app
// 
// This directory contains the complete design system implementation
// including colors, typography, spacing, and theme configurations.
// 
// Usage:
// ```dart
// import 'package:driver_app/theme/app_theme.dart';
// 
// // In your app
// MaterialApp(
//   theme: AppTheme.light,
//   darkTheme: AppTheme.dark,
// )
// 
// // Access theme colors
// Theme.of(context).colorScheme.primary
// Theme.of(context).customColors.orders
// 
// // Access text styles
// AppTextStyles.headlineMedium
// 
// // Access spacing
// AppSpacing.md
// AppSpacing.paddingCard
// ```

export 'app_colors.dart';
export 'app_spacing.dart';
export 'app_text_styles.dart';
export 'app_theme.dart';
export 'theme_extensions.dart';