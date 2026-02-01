import 'package:flutter/material.dart';

/// Application color palette based on the design specification
/// Centralized color tokens for consistent theming across the app
class AppColors {
  AppColors._(); // Private constructor to prevent instantiation

  // Primary brand colors
  static const Color primary = Color(0xFF059669); // Emerald-600
  static const Color primaryContainer = Color(0xFFD1FAE5); // Emerald-100
  static const Color onPrimary = Color(0xFFFFFFFF); // White
  static const Color onPrimaryContainer = Color(0xFF064E3B); // Emerald-900

  // Surface colors
  static const Color surface = Color(0xFFFFFFFF); // White
  static const Color surfaceVariant = Color(0xFFF8FAFC); // Slate-50
  static const Color surfaceDim = Color(0xFFF1F5F9); // Slate-100
  static const Color surfaceBright = Color(0xFFFFFFFF); // White
  static const Color surfaceContainerLowest = Color(0xFFFFFFFF); // White
  static const Color surfaceContainerLow = Color(0xFFF8FAFC); // Slate-50
  static const Color surfaceContainer = Color(0xFFF1F5F9); // Slate-100
  static const Color surfaceContainerHigh = Color(0xFFE2E8F0); // Slate-200
  static const Color surfaceContainerHighest = Color(0xFFCBD5E1); // Slate-300

  // Background colors
  static const Color background = Color(0xFFF8FAFC); // Slate-50
  static const Color onBackground = Color(0xFF0F172A); // Slate-900
  static const Color onSurface = Color(0xFF0F172A); // Slate-900
  static const Color onSurfaceVariant = Color(0xFF475569); // Slate-600

  // Outline and divider colors
  static const Color outline = Color(0xFFCBD5E1); // Slate-300
  static const Color outlineVariant = Color(0xFFE2E8F0); // Slate-200
  static const Color divider = Color(0xFFE2E8F0); // Slate-200

  // Semantic status colors
  static const Color orders = Color(0xFF3B82F6); // Blue-500
  static const Color ordersContainer = Color(0xFFEFF6FF); // Blue-50
  static const Color onOrders = Color(0xFFFFFFFF); // White

  static const Color drivers = Color(0xFF10B981); // Emerald-500
  static const Color driversContainer = Color(0xFFD1FAE5); // Emerald-100
  static const Color onDrivers = Color(0xFFFFFFFF); // White

  static const Color payments = Color(0xFFF59E0B); // Amber-500
  static const Color paymentsContainer = Color(0xFFFEF3C7); // Amber-100
  static const Color onPayments = Color(0xFFFFFFFF); // White

  static const Color analytics = Color(0xFF8B5CF6); // Purple-500
  static const Color analyticsContainer = Color(0xFFEDE9FE); // Purple-100
  static const Color onAnalytics = Color(0xFFFFFFFF); // White

  static const Color delivery = Color(0xFF6366F1); // Indigo-500
  static const Color deliveryContainer = Color(0xFFE0E7FF); // Indigo-100
  static const Color onDelivery = Color(0xFFFFFFFF); // White

  static const Color failed = Color(0xFFEF4444); // Red-500
  static const Color failedContainer = Color(0xFFFEE2E2); // Red-100
  static const Color onFailed = Color(0xFFFFFFFF); // White

  static const Color cancelled = Color(0xFFEF4444); // Red-500 (same as failed)
  static const Color cancelledContainer = Color(0xFFFEE2E2); // Red-100
  static const Color onCancelled = Color(0xFFFFFFFF); // White

  // Success and error states
  static const Color success = Color(0xFF10B981); // Emerald-500
  static const Color successContainer = Color(0xFFD1FAE5); // Emerald-100
  static const Color onSuccess = Color(0xFFFFFFFF); // White

  static const Color error = Color(0xFFEF4444); // Red-500
  static const Color errorContainer = Color(0xFFFEE2E2); // Red-100
  static const Color onError = Color(0xFFFFFFFF); // White

  static const Color warning = Color(0xFFF59E0B); // Amber-500
  static const Color warningContainer = Color(0xFFFEF3C7); // Amber-100
  static const Color onWarning = Color(0xFFFFFFFF); // White

  static const Color info = Color(0xFF3B82F6); // Blue-500
  static const Color infoContainer = Color(0xFFEFF6FF); // Blue-50
  static const Color onInfo = Color(0xFFFFFFFF); // White

  // Neutral colors for text and icons
  static const Color textPrimary = Color(0xFF0F172A); // Slate-900
  static const Color textSecondary = Color(0xFF475569); // Slate-600
  static const Color textTertiary = Color(0xFF64748B); // Slate-500
  static const Color textDisabled = Color(0xFF94A3B8); // Slate-400

  static const Color iconPrimary = Color(0xFF0F172A); // Slate-900
  static const Color iconSecondary = Color(0xFF475569); // Slate-600
  static const Color iconTertiary = Color(0xFF64748B); // Slate-500
  static const Color iconDisabled = Color(0xFF94A3B8); // Slate-400

  // Overlay colors
  static const Color overlay = Color(0x00000000); // Transparent
  static const Color scrim = Color(0x61000000); // 38% black
  static const Color shadow = Color(0x1A000000); // 10% black

  // Dark theme colors (when needed)
  static const Color darkPrimary = Color(0xFF10B981); // Emerald-500
  static const Color darkSurface = Color(0xFF1E293B); // Slate-800
  static const Color darkBackground = Color(0xFF0F172A); // Slate-900
  static const Color darkOnSurface = Color(0xFFF8FAFC); // Slate-50
  static const Color darkOnBackground = Color(0xFFF8FAFC); // Slate-50

  /// Helper method to get status color based on status type
  static Color getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'pending':
      case 'processing':
        return info;
      case 'completed':
      case 'delivered':
      case 'success':
        return success;
      case 'failed':
      case 'error':
        return error;
      case 'cancelled':
        return cancelled;
      case 'warning':
        return warning;
      default:
        return textSecondary;
    }
  }

  /// Helper method to get status container color
  static Color getStatusContainerColor(String status) {
    switch (status.toLowerCase()) {
      case 'pending':
      case 'processing':
        return infoContainer;
      case 'completed':
      case 'delivered':
      case 'success':
        return successContainer;
      case 'failed':
      case 'error':
        return errorContainer;
      case 'cancelled':
        return cancelledContainer;
      case 'warning':
        return warningContainer;
      default:
        return surfaceVariant;
    }
  }
}