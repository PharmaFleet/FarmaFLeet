import 'package:flutter/material.dart';
import 'app_colors.dart';

/// Theme extension for custom semantic colors
/// Allows accessing custom color tokens through Theme.of(context)
class AppColorsExtension extends ThemeExtension<AppColorsExtension> {
  // Semantic status colors
  final Color orders;
  final Color ordersContainer;
  final Color onOrders;

  final Color drivers;
  final Color driversContainer;
  final Color onDrivers;

  final Color payments;
  final Color paymentsContainer;
  final Color onPayments;

  final Color analytics;
  final Color analyticsContainer;
  final Color onAnalytics;

  final Color delivery;
  final Color deliveryContainer;
  final Color onDelivery;

  final Color failed;
  final Color failedContainer;
  final Color onFailed;

  final Color cancelled;
  final Color cancelledContainer;
  final Color onCancelled;

  final Color success;
  final Color successContainer;
  final Color onSuccess;

  final Color error;
  final Color errorContainer;
  final Color onError;

  final Color warning;
  final Color warningContainer;
  final Color onWarning;

  final Color info;
  final Color infoContainer;
  final Color onInfo;

  const AppColorsExtension({
    this.orders = AppColors.orders,
    this.ordersContainer = AppColors.ordersContainer,
    this.onOrders = AppColors.onOrders,
    this.drivers = AppColors.drivers,
    this.driversContainer = AppColors.driversContainer,
    this.onDrivers = AppColors.onDrivers,
    this.payments = AppColors.payments,
    this.paymentsContainer = AppColors.paymentsContainer,
    this.onPayments = AppColors.onPayments,
    this.analytics = AppColors.analytics,
    this.analyticsContainer = AppColors.analyticsContainer,
    this.onAnalytics = AppColors.onAnalytics,
    this.delivery = AppColors.delivery,
    this.deliveryContainer = AppColors.deliveryContainer,
    this.onDelivery = AppColors.onDelivery,
    this.failed = AppColors.failed,
    this.failedContainer = AppColors.failedContainer,
    this.onFailed = AppColors.onFailed,
    this.cancelled = AppColors.cancelled,
    this.cancelledContainer = AppColors.cancelledContainer,
    this.onCancelled = AppColors.onCancelled,
    this.success = AppColors.success,
    this.successContainer = AppColors.successContainer,
    this.onSuccess = AppColors.onSuccess,
    this.error = AppColors.error,
    this.errorContainer = AppColors.errorContainer,
    this.onError = AppColors.onError,
    this.warning = AppColors.warning,
    this.warningContainer = AppColors.warningContainer,
    this.onWarning = AppColors.onWarning,
    this.info = AppColors.info,
    this.infoContainer = AppColors.infoContainer,
    this.onInfo = AppColors.onInfo,
  });

  @override
  AppColorsExtension copyWith({
    Color? orders,
    Color? ordersContainer,
    Color? onOrders,
    Color? drivers,
    Color? driversContainer,
    Color? onDrivers,
    Color? payments,
    Color? paymentsContainer,
    Color? onPayments,
    Color? analytics,
    Color? analyticsContainer,
    Color? onAnalytics,
    Color? delivery,
    Color? deliveryContainer,
    Color? onDelivery,
    Color? failed,
    Color? failedContainer,
    Color? onFailed,
    Color? cancelled,
    Color? cancelledContainer,
    Color? onCancelled,
    Color? success,
    Color? successContainer,
    Color? onSuccess,
    Color? error,
    Color? errorContainer,
    Color? onError,
    Color? warning,
    Color? warningContainer,
    Color? onWarning,
    Color? info,
    Color? infoContainer,
    Color? onInfo,
  }) {
    return AppColorsExtension(
      orders: orders ?? this.orders,
      ordersContainer: ordersContainer ?? this.ordersContainer,
      onOrders: onOrders ?? this.onOrders,
      drivers: drivers ?? this.drivers,
      driversContainer: driversContainer ?? this.driversContainer,
      onDrivers: onDrivers ?? this.onDrivers,
      payments: payments ?? this.payments,
      paymentsContainer: paymentsContainer ?? this.paymentsContainer,
      onPayments: onPayments ?? this.onPayments,
      analytics: analytics ?? this.analytics,
      analyticsContainer: analyticsContainer ?? this.analyticsContainer,
      onAnalytics: onAnalytics ?? this.onAnalytics,
      delivery: delivery ?? this.delivery,
      deliveryContainer: deliveryContainer ?? this.deliveryContainer,
      onDelivery: onDelivery ?? this.onDelivery,
      failed: failed ?? this.failed,
      failedContainer: failedContainer ?? this.failedContainer,
      onFailed: onFailed ?? this.onFailed,
      cancelled: cancelled ?? this.cancelled,
      cancelledContainer: cancelledContainer ?? this.cancelledContainer,
      onCancelled: onCancelled ?? this.onCancelled,
      success: success ?? this.success,
      successContainer: successContainer ?? this.successContainer,
      onSuccess: onSuccess ?? this.onSuccess,
      error: error ?? this.error,
      errorContainer: errorContainer ?? this.errorContainer,
      onError: onError ?? this.onError,
      warning: warning ?? this.warning,
      warningContainer: warningContainer ?? this.warningContainer,
      onWarning: onWarning ?? this.onWarning,
      info: info ?? this.info,
      infoContainer: infoContainer ?? this.infoContainer,
      onInfo: onInfo ?? this.onInfo,
    );
  }

  @override
  AppColorsExtension lerp(ThemeExtension<AppColorsExtension>? other, double t) {
    if (other is! AppColorsExtension) {
      return this;
    }
    return AppColorsExtension(
      orders: Color.lerp(orders, other.orders, t)!,
      ordersContainer: Color.lerp(ordersContainer, other.ordersContainer, t)!,
      onOrders: Color.lerp(onOrders, other.onOrders, t)!,
      drivers: Color.lerp(drivers, other.drivers, t)!,
      driversContainer: Color.lerp(driversContainer, other.driversContainer, t)!,
      onDrivers: Color.lerp(onDrivers, other.onDrivers, t)!,
      payments: Color.lerp(payments, other.payments, t)!,
      paymentsContainer: Color.lerp(paymentsContainer, other.paymentsContainer, t)!,
      onPayments: Color.lerp(onPayments, other.onPayments, t)!,
      analytics: Color.lerp(analytics, other.analytics, t)!,
      analyticsContainer: Color.lerp(analyticsContainer, other.analyticsContainer, t)!,
      onAnalytics: Color.lerp(onAnalytics, other.onAnalytics, t)!,
      delivery: Color.lerp(delivery, other.delivery, t)!,
      deliveryContainer: Color.lerp(deliveryContainer, other.deliveryContainer, t)!,
      onDelivery: Color.lerp(onDelivery, other.onDelivery, t)!,
      failed: Color.lerp(failed, other.failed, t)!,
      failedContainer: Color.lerp(failedContainer, other.failedContainer, t)!,
      onFailed: Color.lerp(onFailed, other.onFailed, t)!,
      cancelled: Color.lerp(cancelled, other.cancelled, t)!,
      cancelledContainer: Color.lerp(cancelledContainer, other.cancelledContainer, t)!,
      onCancelled: Color.lerp(onCancelled, other.onCancelled, t)!,
      success: Color.lerp(success, other.success, t)!,
      successContainer: Color.lerp(successContainer, other.successContainer, t)!,
      onSuccess: Color.lerp(onSuccess, other.onSuccess, t)!,
      error: Color.lerp(error, other.error, t)!,
      errorContainer: Color.lerp(errorContainer, other.errorContainer, t)!,
      onError: Color.lerp(onError, other.onError, t)!,
      warning: Color.lerp(warning, other.warning, t)!,
      warningContainer: Color.lerp(warningContainer, other.warningContainer, t)!,
      onWarning: Color.lerp(onWarning, other.onWarning, t)!,
      info: Color.lerp(info, other.info, t)!,
      infoContainer: Color.lerp(infoContainer, other.infoContainer, t)!,
      onInfo: Color.lerp(onInfo, other.onInfo, t)!,
    );
  }
}

/// Extension method on Theme to easily access custom colors
extension ThemeExtensionHelper on ThemeData {
  /// Get custom colors from the theme
  AppColorsExtension get customColors {
    return extension<AppColorsExtension>() ?? const AppColorsExtension();
  }
}

/// Extension method on BuildContext to easily access custom colors
extension BuildContextExtension on BuildContext {
  /// Get custom colors from the theme
  AppColorsExtension get customColors {
    return Theme.of(this).customColors;
  }
}