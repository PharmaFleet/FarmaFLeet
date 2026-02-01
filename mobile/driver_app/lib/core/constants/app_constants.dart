class AppConstants {
  const AppConstants._();

  // Network & API
  // 10.0.2.2 is valid for Android Emulator. Use localhost or IP for iOS/Web.
  static const String baseUrl = 'http://10.0.2.2:8000/api/v1'; 
  
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
