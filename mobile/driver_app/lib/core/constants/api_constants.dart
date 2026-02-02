class ApiConstants {
  // Production URL
  static const String baseUrl = 'https://pharmafleet-olive.vercel.app/api/v1';

  // Auth
  static const String login = '/auth/login';
  static const String profile = '/auth/me';

  // Orders
  static const String myOrders = '/drivers/me/orders';
  static const String updateStatus = '/drivers/status';
  static const String assignOrder = '/orders/assign';
}
