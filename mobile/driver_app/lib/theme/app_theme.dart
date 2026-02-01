import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'app_colors.dart';
import 'app_spacing.dart';
import 'app_text_styles.dart';
import 'theme_extensions.dart';

/// Main application theme configuration
/// Provides ThemeData for both light and dark themes based on Material Design 3
/// and the design specification colors and typography
class AppTheme {
  AppTheme._(); // Private constructor to prevent instantiation

  /// Light theme configuration
  static ThemeData get light {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      
      // RTL and accessibility support
      fontFamily: 'Roboto',
      
      // Color scheme based on design specification
      colorScheme: const ColorScheme.light(
        // Primary colors
        primary: AppColors.primary,
        primaryContainer: AppColors.primaryContainer,
        onPrimary: AppColors.onPrimary,
        onPrimaryContainer: AppColors.onPrimaryContainer,
        
        // Surface colors
        surface: AppColors.surface,
        surfaceDim: AppColors.surfaceDim,
        surfaceBright: AppColors.surfaceBright,
        surfaceContainerLowest: AppColors.surfaceContainerLowest,
        surfaceContainerLow: AppColors.surfaceContainerLow,
        surfaceContainer: AppColors.surfaceContainer,
        surfaceContainerHigh: AppColors.surfaceContainerHigh,
        surfaceContainerHighest: AppColors.surfaceVariant, // Replaces surfaceVariant
        
        // Background colors (deprecated in M3, using surface instead)
        // background: AppColors.background,
        // onBackground: AppColors.onBackground,
        onSurface: AppColors.onSurface,
        onSurfaceVariant: AppColors.onSurfaceVariant,
        
        // Error colors
        error: AppColors.error,
        errorContainer: AppColors.errorContainer,
        onError: AppColors.onError,
        
        // Outline colors
        outline: AppColors.outline,
        outlineVariant: AppColors.outlineVariant,
        
        // Shadow and overlay
        scrim: AppColors.scrim,
        inverseSurface: AppColors.textSecondary,
        onInverseSurface: AppColors.surface,
      ),

      // Text theme using Material Design 3 text styles
      textTheme: TextTheme(
        // Display styles
        displayLarge: AppTextStyles.displayLarge,
        displayMedium: AppTextStyles.displayMedium,
        displaySmall: AppTextStyles.displaySmall,
        
        // Headline styles
        headlineLarge: AppTextStyles.headlineLarge,
        headlineMedium: AppTextStyles.headlineMedium,
        headlineSmall: AppTextStyles.headlineSmall,
        
        // Title styles
        titleLarge: AppTextStyles.titleLarge,
        titleMedium: AppTextStyles.titleMedium,
        titleSmall: AppTextStyles.titleSmall,
        
        // Body text styles
        bodyLarge: AppTextStyles.bodyLarge,
        bodyMedium: AppTextStyles.bodyMedium,
        bodySmall: AppTextStyles.bodySmall,
        
        // Label styles
        labelLarge: AppTextStyles.labelLarge,
        labelMedium: AppTextStyles.labelMedium,
        labelSmall: AppTextStyles.labelSmall,
      ),

      // Typography platform settings
      typography: Typography.material2021(
        platform: TargetPlatform.android,
      ),

      // App bar theme
      appBarTheme: AppBarTheme(
        elevation: 0,
        scrolledUnderElevation: 1,
        backgroundColor: AppColors.surface,
        foregroundColor: AppColors.textPrimary,
        surfaceTintColor: AppColors.primary,
        titleTextStyle: AppTextStyles.appBarTitle,
        systemOverlayStyle: SystemUiOverlayStyle.dark.copyWith(
          statusBarColor: Colors.transparent,
          statusBarIconBrightness: Brightness.dark,
        ),
      ),

      // Card theme
      cardTheme: const CardThemeData(
        elevation: 0,
        surfaceTintColor: AppColors.primary,
        color: AppColors.surface,
        shadowColor: AppColors.shadow,
        shape: RoundedRectangleBorder(
          borderRadius: AppSpacing.radiusCard,
        ),
        margin: AppSpacing.marginCard,
      ),

      // Elevated button theme
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          elevation: 0,
          shadowColor: Colors.transparent,
          backgroundColor: AppColors.primary,
          foregroundColor: AppColors.onPrimary,
          surfaceTintColor: AppColors.primary,
          padding: AppSpacing.paddingButton,
          shape: const RoundedRectangleBorder(
            borderRadius: AppSpacing.radiusButton,
          ),
          textStyle: AppTextStyles.buttonText,
        ),
      ),

      // Text button theme
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: AppColors.primary,
          padding: AppSpacing.paddingButton,
          shape: const RoundedRectangleBorder(
            borderRadius: AppSpacing.radiusButton,
          ),
          textStyle: AppTextStyles.buttonText,
        ),
      ),

      // Outlined button theme
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.primary,
          side: const BorderSide(color: AppColors.outline),
          padding: AppSpacing.paddingButton,
          shape: const RoundedRectangleBorder(
            borderRadius: AppSpacing.radiusButton,
          ),
          textStyle: AppTextStyles.buttonText,
        ),
      ),

      // Input decoration theme (text fields)
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.surface,
        contentPadding: AppSpacing.paddingContent,
        border: const OutlineInputBorder(
          borderRadius: AppSpacing.radiusButton,
          borderSide: BorderSide(color: AppColors.outline),
        ),
        enabledBorder: const OutlineInputBorder(
          borderRadius: AppSpacing.radiusButton,
          borderSide: BorderSide(color: AppColors.outline),
        ),
        focusedBorder: const OutlineInputBorder(
          borderRadius: AppSpacing.radiusButton,
          borderSide: BorderSide(color: AppColors.primary, width: 2),
        ),
        errorBorder: const OutlineInputBorder(
          borderRadius: AppSpacing.radiusButton,
          borderSide: BorderSide(color: AppColors.error),
        ),
        focusedErrorBorder: const OutlineInputBorder(
          borderRadius: AppSpacing.radiusButton,
          borderSide: BorderSide(color: AppColors.error, width: 2),
        ),
        disabledBorder: OutlineInputBorder(
          borderRadius: AppSpacing.radiusButton,
          borderSide: BorderSide(color: AppColors.outline.withValues(alpha: 0.5)),
        ),
        labelStyle: AppTextStyles.inputLabel,
        hintStyle: AppTextStyles.inputHint,
        errorStyle: AppTextStyles.errorText,
        floatingLabelBehavior: FloatingLabelBehavior.auto,
      ),

      // Navigation bar theme
      navigationBarTheme: NavigationBarThemeData(
        elevation: 0,
        backgroundColor: AppColors.surface,
        indicatorColor: AppColors.primaryContainer,
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return AppTextStyles.tabTextActive;
          }
          return AppTextStyles.tabTextInactive;
        }),
      ),

      // Navigation rail theme (for larger screens)
      navigationRailTheme: NavigationRailThemeData(
        elevation: 0,
        backgroundColor: AppColors.surface,
        indicatorColor: AppColors.primaryContainer,
        selectedLabelTextStyle: AppTextStyles.tabTextActive,
        unselectedLabelTextStyle: AppTextStyles.tabTextInactive,
      ),

      // Chip theme
      chipTheme: ChipThemeData(
        backgroundColor: AppColors.surfaceVariant,
        selectedColor: AppColors.primaryContainer,
        disabledColor: AppColors.outline.withValues(alpha: 0.3),
        labelStyle: AppTextStyles.chipText,
        secondaryLabelStyle: AppTextStyles.chipText.copyWith(color: AppColors.onPrimary),
        padding: AppSpacing.paddingHorizontalSM.copyWith(top: AppSpacing.sm, bottom: AppSpacing.sm),
        shape: const RoundedRectangleBorder(
          borderRadius: AppSpacing.radiusChip,
        ),
      ),

      // Divider theme
      dividerTheme: const DividerThemeData(
        color: AppColors.divider,
        thickness: 1,
        space: 1,
      ),

      // List tile theme
      listTileTheme: ListTileThemeData(
        contentPadding: AppSpacing.paddingContent,
        titleTextStyle: AppTextStyles.listItemTitle,
        subtitleTextStyle: AppTextStyles.bodyText,
        shape: const RoundedRectangleBorder(
          borderRadius: AppSpacing.radiusCard,
        ),
      ),

      // Dialog theme
      dialogTheme: DialogThemeData(
        backgroundColor: AppColors.surface,
        surfaceTintColor: AppColors.primary,
        elevation: 6,
        shadowColor: AppColors.shadow,
        shape: const RoundedRectangleBorder(
          borderRadius: AppSpacing.radiusDialog,
        ),
        titleTextStyle: AppTextStyles.sectionTitle,
        contentTextStyle: AppTextStyles.bodyText,
      ),

      // Bottom sheet theme
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: AppColors.surface,
        surfaceTintColor: AppColors.primary,
        elevation: 1,
        shape: RoundedRectangleBorder(
          borderRadius: AppSpacing.radiusTop,
        ),
      ),

      // Snack bar theme
      snackBarTheme: SnackBarThemeData(
        backgroundColor: AppColors.textPrimary,
        contentTextStyle: AppTextStyles.bodyMedium.copyWith(color: AppColors.surface),
        behavior: SnackBarBehavior.floating,
        shape: const RoundedRectangleBorder(
          borderRadius: AppSpacing.radiusCard,
        ),
      ),

      // Progress indicator theme
      progressIndicatorTheme: const ProgressIndicatorThemeData(
        color: AppColors.primary,
        linearTrackColor: AppColors.surfaceContainer,
        circularTrackColor: AppColors.surfaceContainer,
      ),

      // Switch theme
      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return AppColors.primary;
          }
          return AppColors.outline;
        }),
        trackColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return AppColors.primary.withValues(alpha: 0.4);
          }
          return AppColors.outline.withValues(alpha: 0.2);
        }),
      ),

      // Checkbox theme
      checkboxTheme: CheckboxThemeData(
        fillColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return AppColors.primary;
          }
          return Colors.transparent;
        }),
        checkColor: WidgetStateProperty.all(AppColors.onPrimary),
        side: const BorderSide(color: AppColors.outline),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(4),
        ),
      ),

      // Radio theme
      radioTheme: RadioThemeData(
        fillColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return AppColors.primary;
          }
          return AppColors.outline;
        }),
      ),

      // Tooltip theme
      tooltipTheme: TooltipThemeData(
        decoration: const BoxDecoration(
          color: AppColors.textPrimary,
          borderRadius: AppSpacing.radiusSM,
        ),
        textStyle: AppTextStyles.bodySmall.copyWith(color: AppColors.surface),
        padding: AppSpacing.paddingSM,
      ),

      // Splash and highlight colors
      splashFactory: InkRipple.splashFactory,
      highlightColor: AppColors.primary.withValues(alpha: 0.1),
      splashColor: AppColors.primary.withValues(alpha: 0.1),

      // Focus and hover colors
      focusColor: AppColors.primary.withValues(alpha: 0.2),
      hoverColor: AppColors.primary.withValues(alpha: 0.1),

      // Disabled colors
      disabledColor: AppColors.outline.withValues(alpha: 0.5),

      // Theme extensions for custom colors
      extensions: const [
        AppColorsExtension(),
      ],
    );
  }

  /// Dark theme configuration (optional, for when dark mode is implemented)
  static ThemeData get dark {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      
      // Color scheme for dark theme
      colorScheme: const ColorScheme.dark(
        primary: AppColors.darkPrimary,
        primaryContainer: AppColors.primaryContainer,
        onPrimary: AppColors.onPrimary,
        onPrimaryContainer: AppColors.onPrimaryContainer,
        
        surface: AppColors.darkSurface,
        surfaceDim: AppColors.darkBackground,
        surfaceBright: AppColors.darkSurface,
        surfaceContainerLowest: AppColors.darkBackground,
        surfaceContainerLow: AppColors.surfaceContainer,
        surfaceContainer: AppColors.surfaceContainerHigh,
        surfaceContainerHigh: AppColors.surfaceContainerHighest,
        surfaceContainerHighest: AppColors.outlineVariant, // Replaces surfaceVariant
        onSurface: AppColors.darkOnSurface,
        onSurfaceVariant: AppColors.textSecondary,
        
        error: AppColors.error,
        errorContainer: AppColors.errorContainer,
        onError: AppColors.onError,
        
        outline: AppColors.outline,
        outlineVariant: AppColors.outlineVariant,
        
        shadow: AppColors.shadow,
        scrim: AppColors.scrim,
        inverseSurface: AppColors.textSecondary,
        onInverseSurface: AppColors.darkBackground,
      ),

      // Use the same text theme but adjust colors for dark background
      textTheme: TextTheme(
        // Display styles
        displayLarge: AppTextStyles.displayLarge.copyWith(color: AppColors.darkOnSurface),
        displayMedium: AppTextStyles.displayMedium.copyWith(color: AppColors.darkOnSurface),
        displaySmall: AppTextStyles.displaySmall.copyWith(color: AppColors.darkOnSurface),
        
        // Headline styles
        headlineLarge: AppTextStyles.headlineLarge.copyWith(color: AppColors.darkOnSurface),
        headlineMedium: AppTextStyles.headlineMedium.copyWith(color: AppColors.darkOnSurface),
        headlineSmall: AppTextStyles.headlineSmall.copyWith(color: AppColors.darkOnSurface),
        
        // Title styles
        titleLarge: AppTextStyles.titleLarge.copyWith(color: AppColors.darkOnSurface),
        titleMedium: AppTextStyles.titleMedium.copyWith(color: AppColors.darkOnSurface),
        titleSmall: AppTextStyles.titleSmall.copyWith(color: AppColors.darkOnSurface),
        
        // Body text styles
        bodyLarge: AppTextStyles.bodyLarge.copyWith(color: AppColors.darkOnSurface),
        bodyMedium: AppTextStyles.bodyMedium.copyWith(color: AppColors.darkOnSurface),
        bodySmall: AppTextStyles.bodySmall.copyWith(color: AppColors.darkOnSurface),
        
        // Label styles
        labelLarge: AppTextStyles.labelLarge.copyWith(color: AppColors.darkOnSurface),
        labelMedium: AppTextStyles.labelMedium.copyWith(color: AppColors.darkOnSurface),
        labelSmall: AppTextStyles.labelSmall.copyWith(color: AppColors.darkOnSurface),
      ),

      // Most other theme properties can be inherited from light theme
      // with color adjustments for dark mode
      appBarTheme: AppBarTheme(
        elevation: 0,
        scrolledUnderElevation: 1,
        backgroundColor: AppColors.darkSurface,
        foregroundColor: AppColors.darkOnSurface,
        surfaceTintColor: AppColors.darkPrimary,
        titleTextStyle: AppTextStyles.appBarTitle.copyWith(color: AppColors.darkOnSurface),
        systemOverlayStyle: SystemUiOverlayStyle.light.copyWith(
          statusBarColor: Colors.transparent,
          statusBarIconBrightness: Brightness.light,
        ),
      ),

      cardTheme: const CardThemeData(
        elevation: 0,
        surfaceTintColor: AppColors.darkPrimary,
        color: AppColors.darkSurface,
        shadowColor: AppColors.shadow,
        shape: RoundedRectangleBorder(
          borderRadius: AppSpacing.radiusCard,
        ),
        margin: AppSpacing.marginCard,
      ),

      // Additional dark theme configurations can be added here
      
      // Theme extensions for custom colors
      extensions: const [
        AppColorsExtension(),
      ],
    );
  }

  /// Helper method to get theme based on brightness
  static ThemeData getTheme(Brightness brightness) {
    return brightness == Brightness.dark ? dark : light;
  }

  /// Helper method to get semantic colors for specific contexts
  static Map<String, Color> get semanticColors => {
        'orders': AppColors.orders,
        'drivers': AppColors.drivers,
        'payments': AppColors.payments,
        'analytics': AppColors.analytics,
        'delivery': AppColors.delivery,
        'failed': AppColors.failed,
        'cancelled': AppColors.cancelled,
        'success': AppColors.success,
        'error': AppColors.error,
        'warning': AppColors.warning,
        'info': AppColors.info,
      };

  /// Helper method to get container colors for semantic contexts
  static Map<String, Color> get semanticContainerColors => {
        'orders': AppColors.ordersContainer,
        'drivers': AppColors.driversContainer,
        'payments': AppColors.paymentsContainer,
        'analytics': AppColors.analyticsContainer,
        'delivery': AppColors.deliveryContainer,
        'failed': AppColors.failedContainer,
        'cancelled': AppColors.cancelledContainer,
        'success': AppColors.successContainer,
        'error': AppColors.errorContainer,
        'warning': AppColors.warningContainer,
        'info': AppColors.infoContainer,
      };
}