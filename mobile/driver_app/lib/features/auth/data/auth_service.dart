import 'package:dio/dio.dart';

class LoginResponse {
  final String accessToken;
  final String tokenType;

  LoginResponse({required this.accessToken, required this.tokenType});

  factory LoginResponse.fromJson(Map<String, dynamic> json) {
    return LoginResponse(
      accessToken: json['access_token'],
      tokenType: json['token_type'],
    );
  }
}

class AuthService {
  final Dio _dio;

  AuthService(this._dio);

  Future<LoginResponse> login(String username, String password) async {
    // The backend expects application/x-www-form-urlencoded
    final data = {'username': username, 'password': password};

    final response = await _dio.post(
      '/login/access-token', // Relative to AppConstants.baseUrl
      data: data,
      options: Options(contentType: Headers.formUrlEncodedContentType),
    );

    return LoginResponse.fromJson(response.data);
  }

  /// Update FCM token on the backend
  Future<void> updateFcmToken(String token) async {
    await _dio.post(
      '/api/v1/drivers/me/fcm-token',
      data: {'fcm_token': token},
    );
  }
}
