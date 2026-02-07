import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Navigation service that provides global navigation capability
/// Used by NotificationService to navigate when notifications are tapped
class NavigationService {
  static final NavigationService _instance = NavigationService._internal();
  factory NavigationService() => _instance;
  NavigationService._internal();

  GoRouter? _router;
  BuildContext? _context;

  /// Set the router instance (called from main.dart after AppRouter is created)
  void setRouter(GoRouter router) {
    _router = router;
  }

  /// Set the current context (useful for showing dialogs/snackbars)
  void setContext(BuildContext context) {
    _context = context;
  }

  /// Get the current context
  BuildContext? get context => _context;

  /// Navigate to a path
  void go(String path) {
    if (_router != null) {
      _router!.go(path);
    } else {
      debugPrint('NavigationService: Router not initialized');
    }
  }

  /// Push a new route
  void push(String path) {
    if (_router != null) {
      _router!.push(path);
    } else {
      debugPrint('NavigationService: Router not initialized');
    }
  }

  /// Navigate to order details
  void goToOrderDetails(String orderId) {
    go('/order/$orderId');
  }

  /// Navigate to orders list
  void goToOrdersList() {
    go('/orders');
  }

  /// Navigate to home
  void goToHome() {
    go('/home');
  }

  /// Navigate to notifications center
  void goToNotifications() {
    go('/notifications');
  }

  /// Show a snackbar message
  void showSnackBar(String message, {bool isError = false}) {
    if (_context != null) {
      ScaffoldMessenger.of(_context!).showSnackBar(
        SnackBar(
          content: Text(message),
          backgroundColor: isError ? Colors.red : null,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }
}
