import 'dart:convert';

import 'package:driver_app/core/di/injection_container.dart' as di;
import 'package:driver_app/core/services/navigation_service.dart';
import 'package:driver_app/features/auth/domain/repositories/auth_repository.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

/// Background message handler - must be top-level function
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  debugPrint('Background message: ${message.messageId}');
}

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();

  String? _fcmToken;
  String? get fcmToken => _fcmToken;

  /// Initialize notification service
  Future<void> initialize() async {
    // Request permission
    final settings = await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      provisional: false,
    );

    debugPrint('Notification permission: ${settings.authorizationStatus}');

    if (settings.authorizationStatus == AuthorizationStatus.authorized ||
        settings.authorizationStatus == AuthorizationStatus.provisional) {
      await _initializeLocalNotifications();
      await _configureMessageHandlers();
      await getFCMToken();
    }
  }

  /// Initialize local notifications for foreground display
  Future<void> _initializeLocalNotifications() async {
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );

    const initSettings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _localNotifications.initialize(
      initSettings,
      onDidReceiveNotificationResponse: _onNotificationTapped,
    );

    // Create notification channel for Android
    const androidChannel = AndroidNotificationChannel(
      'pharmafleet_driver',
      'PharmaFleet Driver Notifications',
      description: 'Notifications for driver app',
      importance: Importance.high,
    );

    await _localNotifications
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(androidChannel);
  }

  /// Configure message handlers
  Future<void> _configureMessageHandlers() async {
    // Background handler
    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

    // Foreground message handler
    FirebaseMessaging.onMessage.listen(_handleForegroundMessage);

    // App opened from notification
    FirebaseMessaging.onMessageOpenedApp.listen(_handleNotificationTap);

    // Check for initial message (app opened from terminated state)
    final initialMessage = await _messaging.getInitialMessage();
    if (initialMessage != null) {
      _handleNotificationTap(initialMessage);
    }
  }

  /// Get FCM token
  Future<String?> getFCMToken() async {
    try {
      _fcmToken = await _messaging.getToken();
      debugPrint('FCM Token obtained (${_fcmToken?.length ?? 0} chars)');

      // Listen for token refresh
      _messaging.onTokenRefresh.listen((newToken) async {
        _fcmToken = newToken;
        debugPrint('FCM Token refreshed (${newToken.length} chars)');
        try {
          final authRepo = di.sl<AuthRepository>();
          await authRepo.updateFcmToken(newToken);
        } catch (e) {
          debugPrint('Failed to sync refreshed FCM token: $e');
        }
      });

      return _fcmToken;
    } catch (e) {
      debugPrint('Error getting FCM token: $e');
      return null;
    }
  }

  /// Handle foreground messages - show local notification
  void _handleForegroundMessage(RemoteMessage message) {
    debugPrint('Foreground message: ${message.notification?.title}');

    final notification = message.notification;
    if (notification != null) {
      _showLocalNotification(
        title: notification.title ?? 'PharmaFleet',
        body: notification.body ?? '',
        payload: jsonEncode(message.data),
      );
    }
  }

  /// Handle notification tap when app is in background
  void _handleNotificationTap(RemoteMessage message) {
    debugPrint('Notification tapped: ${message.data}');
    _processNotificationData(message.data);
  }

  /// Handle local notification tap
  void _onNotificationTapped(NotificationResponse response) {
    if (response.payload != null) {
      try {
        final data = jsonDecode(response.payload!) as Map<String, dynamic>;
        _processNotificationData(data);
      } catch (e) {
        debugPrint('Error parsing notification payload: $e');
      }
    }
  }

  /// Process notification data and navigate accordingly
  void _processNotificationData(Map<String, dynamic> data) {
    final type = data['type'] as String?;
    final navigationService = di.sl<NavigationService>();
    debugPrint('Processing notification type: $type');

    switch (type) {
      case 'new_order_assigned':
        // Navigate to order details if order_id is provided, otherwise orders list
        final orderId = data['order_id']?.toString();
        if (orderId != null && orderId.isNotEmpty) {
          debugPrint('Navigating to order details: $orderId');
          navigationService.goToOrderDetails(orderId);
        } else {
          debugPrint('Navigating to orders list');
          navigationService.goToOrdersList();
        }
        break;
      case 'new_orders':
        // Navigate to orders list
        debugPrint('Navigating to orders list');
        navigationService.goToOrdersList();
        break;
      case 'order_delivered':
        // Show delivery confirmation - navigate to order details
        final orderId = data['order_id']?.toString();
        if (orderId != null && orderId.isNotEmpty) {
          debugPrint('Order delivered, navigating to: $orderId');
          navigationService.goToOrderDetails(orderId);
        } else {
          navigationService.goToOrdersList();
        }
        break;
      case 'payment_collection':
        // Show payment collection screen - navigate to order details
        final orderId = data['order_id']?.toString();
        final amount = data['amount'];
        debugPrint('Collect payment: $amount for order $orderId');
        if (orderId != null && orderId.isNotEmpty) {
          navigationService.goToOrderDetails(orderId);
        } else {
          navigationService.goToOrdersList();
        }
        break;
      case 'shift_limit':
        // Show shift limit warning - navigate to home/dashboard
        debugPrint('Shift limit reached, navigating to home');
        navigationService.goToHome();
        break;
      case 'order_cancelled':
        // Order was cancelled by manager - navigate to orders list to refresh
        final orderId = data['order_id'];
        final orderNumber = data['order_number'];
        debugPrint('Order cancelled: $orderNumber (ID: $orderId)');
        navigationService.goToOrdersList();
        break;
      case 'order_reassigned':
        // Order was reassigned to another driver - navigate to orders list to refresh
        final orderId = data['order_id'];
        final orderNumber = data['order_number'];
        debugPrint('Order reassigned: $orderNumber (ID: $orderId)');
        navigationService.goToOrdersList();
        break;
      case 'broadcast':
        // Broadcast/announcement - navigate to notifications center
        debugPrint('Broadcast notification, navigating to notifications');
        navigationService.goToNotifications();
        break;
      default:
        // Unknown notification type - navigate to home as safe default
        debugPrint('Unknown notification type: $type, navigating to home');
        if (type != null) {
          navigationService.goToHome();
        }
    }
  }

  /// Show local notification
  Future<void> _showLocalNotification({
    required String title,
    required String body,
    String? payload,
  }) async {
    const androidDetails = AndroidNotificationDetails(
      'pharmafleet_driver',
      'PharmaFleet Driver Notifications',
      channelDescription: 'Notifications for driver app',
      importance: Importance.high,
      priority: Priority.high,
      showWhen: true,
    );

    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    const details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _localNotifications.show(
      DateTime.now().millisecondsSinceEpoch.remainder(100000),
      title,
      body,
      details,
      payload: payload,
    );
  }

  /// Delete FCM token (on logout)
  Future<void> deleteToken() async {
    await _messaging.deleteToken();
    _fcmToken = null;
  }
}
