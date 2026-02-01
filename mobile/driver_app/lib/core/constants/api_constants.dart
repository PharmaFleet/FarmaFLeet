class ApiConstants {
  // Use 10.0.2.2 for Android Emulator, localhost for iOS Simulator or Web
  static const String baseUrl = 'http://10.0.2.2:8000/api/v1';

  // Auth
  static const String login = '/auth/login';
  static const String profile = '/auth/me';

  // Orders
  static const String myOrders = '/drivers/me/orders';
  static const String updateStatus = '/drivers/status';
  static const String assignOrder = '/orders/assign';
}
