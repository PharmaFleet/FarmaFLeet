// Core widget components for the PharmaFleet Driver app
//
// This barrel export file provides convenient access to all custom widgets
// throughout the application. Import this file to get access to all components.
//
// Usage:
// ```dart
// import 'package:driver_app/widgets/widgets.dart';
//
// // Now you can use any widget directly
// StatCard(
//   title: 'Total Orders',
//   value: '1234',
//   icon: Icons.shopping_cart,
// )
// ```

// Re-export theme for convenience in widget usage
export '../theme/app_colors.dart';
export '../theme/app_spacing.dart';
export '../theme/app_text_styles.dart';
export 'activity_item.dart';
// Interactive components
export 'app_button.dart';
// Base container components
export 'card_container.dart';
export 'mini_map_view.dart';
export 'order_card.dart';
// Display components
export 'stat_card.dart';
export 'status_badge.dart';