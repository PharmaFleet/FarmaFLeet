import '../config/app_config.dart';

class AppConstants {
  const AppConstants._();

  // Network & API - uses environment configuration
  static String get baseUrl => AppConfig.apiBaseUrl;

  // Storage Keys
  static const String tokenKey = 'auth_token';
  static const String refreshTokenKey = 'refresh_token';
  static const String userKey = 'user_data';

  // API Endpoints
  static const String loginEndpoint = '/login/access-token';
  static const String profileEndpoint = '/users/me';
  static const String logoutEndpoint = '/auth/logout';
  static const String refreshEndpoint = '/auth/refresh';
  static const String updateStatusEndpoint = '/drivers/me/status';
  static const String updateLocationEndpoint = '/drivers/location';

  // Order Endpoints
  static const String myOrdersEndpoint = '/drivers/me/orders';
  static const String orderStatusEndpoint = '/orders'; // base, append /{id}/status
  static const String batchPickupEndpoint = '/orders/batch-pickup';
  static const String batchDeliveryEndpoint = '/orders/batch-delivery';

  // Upload & POD
  static const String uploadEndpoint = '/upload';
  static const String proofOfDeliveryEndpoint = '/orders'; // base, append /{id}/proof-of-delivery-url
}
