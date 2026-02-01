import 'package:flutter/material.dart';

/// Application typography based on Material Design 3 text styles
/// Centralized text style tokens for consistent typography across the app
class AppTextStyles {
  AppTextStyles._(); // Private constructor to prevent instantiation

  // Display styles (largest text, for headlines)
  static TextStyle get displayLarge => const TextStyle(
        fontSize: 57,
        fontWeight: FontWeight.w400,
        letterSpacing: -0.25,
        height: 1.12,
      );

  static TextStyle get displayMedium => const TextStyle(
        fontSize: 45,
        fontWeight: FontWeight.w400,
        letterSpacing: 0,
        height: 1.16,
      );

  static TextStyle get displaySmall => const TextStyle(
        fontSize: 36,
        fontWeight: FontWeight.w400,
        letterSpacing: 0,
        height: 1.22,
      );

  // Headline styles (for screen titles and section headers)
  static TextStyle get headlineLarge => const TextStyle(
        fontSize: 32,
        fontWeight: FontWeight.w400,
        letterSpacing: 0,
        height: 1.25,
      );

  static TextStyle get headlineMedium => const TextStyle(
        fontSize: 28,
        fontWeight: FontWeight.w400,
        letterSpacing: 0,
        height: 1.29,
      );

  static TextStyle get headlineSmall => const TextStyle(
        fontSize: 24,
        fontWeight: FontWeight.w400,
        letterSpacing: 0,
        height: 1.33,
      );

  // Title styles (for card titles, list item titles, etc.)
  static TextStyle get titleLarge => const TextStyle(
        fontSize: 22,
        fontWeight: FontWeight.w500,
        letterSpacing: 0,
        height: 1.27,
      );

  static TextStyle get titleMedium => const TextStyle(
        fontSize: 16,
        fontWeight: FontWeight.w500,
        letterSpacing: 0.15,
        height: 1.50,
      );

  static TextStyle get titleSmall => const TextStyle(
        fontSize: 14,
        fontWeight: FontWeight.w500,
        letterSpacing: 0.1,
        height: 1.43,
      );

  // Body text styles (for main content)
  static TextStyle get bodyLarge => const TextStyle(
        fontSize: 16,
        fontWeight: FontWeight.w400,
        letterSpacing: 0.5,
        height: 1.50,
      );

  static TextStyle get bodyMedium => const TextStyle(
        fontSize: 14,
        fontWeight: FontWeight.w400,
        letterSpacing: 0.25,
        height: 1.43,
      );

  static TextStyle get bodySmall => const TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.w400,
        letterSpacing: 0.4,
        height: 1.33,
      );

  // Label styles (for buttons, tags, and other UI elements)
  static TextStyle get labelLarge => const TextStyle(
        fontSize: 14,
        fontWeight: FontWeight.w500,
        letterSpacing: 0.1,
        height: 1.43,
      );

  static TextStyle get labelMedium => const TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.w500,
        letterSpacing: 0.5,
        height: 1.33,
      );

  static TextStyle get labelSmall => const TextStyle(
        fontSize: 11,
        fontWeight: FontWeight.w500,
        letterSpacing: 0.5,
        height: 1.45,
      );

  // Custom application-specific text styles
  static TextStyle get appBarTitle => titleLarge.copyWith(
        fontWeight: FontWeight.w600,
        color: const Color(0xFF0F172A), // textPrimary
      );

  static TextStyle get screenTitle => headlineSmall.copyWith(
        fontWeight: FontWeight.w600,
        color: const Color(0xFF0F172A), // textPrimary
      );

  static TextStyle get sectionTitle => titleLarge.copyWith(
        fontWeight: FontWeight.w600,
        color: const Color(0xFF0F172A), // textPrimary
      );

  static TextStyle get cardTitle => titleMedium.copyWith(
        fontWeight: FontWeight.w600,
        color: const Color(0xFF0F172A), // textPrimary
      );

  static TextStyle get listItemTitle => titleMedium.copyWith(
        fontWeight: FontWeight.w500,
        color: const Color(0xFF0F172A), // textPrimary
      );

  static TextStyle get bodyText => bodyMedium.copyWith(
        color: const Color(0xFF475569), // textSecondary
      );

  static TextStyle get caption => bodySmall.copyWith(
        color: const Color(0xFF64748B), // textTertiary
      );

  static TextStyle get buttonText => labelLarge.copyWith(
        fontWeight: FontWeight.w600,
        letterSpacing: 0.2,
      );

  static TextStyle get smallButtonText => labelMedium.copyWith(
        fontWeight: FontWeight.w600,
        letterSpacing: 0.2,
      );

  static TextStyle get chipText => labelMedium.copyWith(
        fontWeight: FontWeight.w500,
      );

  static TextStyle get badgeText => labelSmall.copyWith(
        fontWeight: FontWeight.w600,
      );

  static TextStyle get linkText => bodyMedium.copyWith(
        color: const Color(0xFF059669), // primary
        fontWeight: FontWeight.w500,
      );

  static TextStyle get errorText => bodySmall.copyWith(
        color: const Color(0xFFEF4444), // error
        fontWeight: FontWeight.w500,
      );

  static TextStyle get successText => bodySmall.copyWith(
        color: const Color(0xFF10B981), // success
        fontWeight: FontWeight.w500,
      );

  static TextStyle get warningText => bodySmall.copyWith(
        color: const Color(0xFFF59E0B), // warning
        fontWeight: FontWeight.w500,
      );

  static TextStyle get infoText => bodySmall.copyWith(
        color: const Color(0xFF3B82F6), // info
        fontWeight: FontWeight.w500,
      );

  // Number display styles
  static TextStyle get statNumber => headlineMedium.copyWith(
        fontWeight: FontWeight.w700,
        color: const Color(0xFF0F172A), // textPrimary
      );

  static TextStyle get priceLarge => headlineSmall.copyWith(
        fontWeight: FontWeight.w700,
        color: const Color(0xFF0F172A), // textPrimary
      );

  static TextStyle get priceMedium => titleLarge.copyWith(
        fontWeight: FontWeight.w600,
        color: const Color(0xFF0F172A), // textPrimary
      );

  static TextStyle get priceSmall => titleMedium.copyWith(
        fontWeight: FontWeight.w600,
        color: const Color(0xFF0F172A), // textPrimary
      );

  // Form field text styles
  static TextStyle get inputText => bodyLarge.copyWith(
        color: const Color(0xFF0F172A), // textPrimary
      );

  static TextStyle get inputHint => bodyLarge.copyWith(
        color: const Color(0xFF94A3B8), // textDisabled
      );

  static TextStyle get inputLabel => bodyMedium.copyWith(
        fontWeight: FontWeight.w500,
        color: const Color(0xFF475569), // textSecondary
      );

  // Tab text styles
  static TextStyle get tabTextActive => labelLarge.copyWith(
        fontWeight: FontWeight.w600,
      );

  static TextStyle get tabTextInactive => labelLarge.copyWith(
        fontWeight: FontWeight.w500,
      );

  // Helper method to apply color to any text style
  static TextStyle withColor(TextStyle style, Color color) {
    return style.copyWith(color: color);
  }

  // Helper method to apply weight to any text style
  static TextStyle withWeight(TextStyle style, FontWeight weight) {
    return style.copyWith(fontWeight: weight);
  }

  // Helper method to apply size to any text style
  static TextStyle withSize(TextStyle style, double size) {
    return style.copyWith(fontSize: size);
  }

  // Helper method to create a text style with custom properties
  static TextStyle custom({
    double? fontSize,
    FontWeight? fontWeight,
    Color? color,
    double? letterSpacing,
    double? height,
    TextDecoration? decoration,
  }) {
    return TextStyle(
      fontSize: fontSize,
      fontWeight: fontWeight,
      color: color,
      letterSpacing: letterSpacing,
      height: height,
      decoration: decoration,
    );
  }
}