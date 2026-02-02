class AppConstants {
  const AppConstants._();

  // Network & API
  // Production URL
  static const String baseUrl = 'https://pharmafleet-olive.vercel.app/api/v1'; 
  
  // Storage Keys
  static const String tokenKey = 'auth_token';
  static const String refreshTokenKey = 'refresh_token';
  static const String userKey = 'user_data';

  // API Endpoints
  static const String loginEndpoint = '/login/access-token';
  static const String profileEndpoint = '/users/me';
  static const String logoutEndpoint = "/auth/logout";
  static const String updateStatusEndpoint = "/drivers/me/status";
  static const String updateLocationEndpoint = "/drivers/location";
}
