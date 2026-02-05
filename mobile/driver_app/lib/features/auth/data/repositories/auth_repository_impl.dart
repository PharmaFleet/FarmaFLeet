import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../../../core/constants/app_constants.dart';
import '../../domain/entities/user_entity.dart';
import '../../domain/repositories/auth_repository.dart';
import '../models/user_model.dart';

class AuthRepositoryImpl implements AuthRepository {
  final Dio _dio;
  final FlutterSecureStorage _storage;

  AuthRepositoryImpl({Dio? dio, FlutterSecureStorage? storage})
      : _dio = dio ?? Dio(BaseOptions(baseUrl: AppConstants.baseUrl)),
        _storage = storage ?? const FlutterSecureStorage();

  @override
  Future<String> login(String email, String password) async {
    try {
      // API expects x-www-form-urlencoded
      final formData = FormData.fromMap({
        'username': email,
        'password': password,
      });

      final response = await _dio.post(
        AppConstants.loginEndpoint,
        data: formData,
        options: Options(contentType: Headers.formUrlEncodedContentType),
      );

      final accessToken = response.data['access_token'];
      final refreshToken = response.data['refresh_token'];
      if (accessToken != null) {
        debugPrint('[AuthRepo] Saving access token (${accessToken.toString().length} chars)');
        await _storage.write(key: AppConstants.tokenKey, value: accessToken);

        // Verify token was saved
        final savedToken = await _storage.read(key: AppConstants.tokenKey);
        debugPrint('[AuthRepo] Access token saved successfully: ${savedToken != null}');

        // Store refresh token if provided
        if (refreshToken != null) {
          debugPrint('[AuthRepo] Saving refresh token (${refreshToken.toString().length} chars)');
          await _storage.write(key: AppConstants.refreshTokenKey, value: refreshToken);
        }

        return accessToken;
      } else {
        debugPrint('[AuthRepo] ERROR: No access_token in response');
        throw Exception('Token not found in response');
      }
    } on DioException catch (e) {
      if (e.response?.statusCode == 400 || e.response?.statusCode == 401) {
        throw Exception('Invalid email or password');
      }
      throw Exception('Network error: ${e.message}');
    } catch (e) {
      throw Exception('Login failed: $e');
    }
  }

  @override
  Future<UserEntity> getProfile() async {
    try {
      final token = await _storage.read(key: AppConstants.tokenKey);
      if (token == null) {
        throw Exception('No token found');
      }

      final response = await _dio.get(
        AppConstants.profileEndpoint,
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      return UserModel.fromJson(response.data);
    } catch (e) {
      throw Exception('Failed to fetch profile: $e');
    }
  }

  @override
  Future<void> logout() async {
    await _storage.delete(key: AppConstants.tokenKey);
    await _storage.delete(key: AppConstants.refreshTokenKey);
  }

  @override
  Future<bool> checkAuthStatus() async {
    final token = await _storage.read(key: AppConstants.tokenKey);
    return token != null;
  }

  @override
  Future<void> updateFcmToken(String token) async {
    try {
      final authToken = await _storage.read(key: AppConstants.tokenKey);
      if (authToken == null) {
        return;
      }

      await _dio.put(
        AppConstants.profileEndpoint,
        data: {'fcm_token': token},
        options: Options(headers: {'Authorization': 'Bearer $authToken'}),
      );
    } catch (e) {
      // Log error but don't propagate to avoid crashing the flow
      // In production, this should use a proper logging framework
      debugPrint('Error updating FCM token: $e');
    }
  }

  @override
  Future<bool> refreshToken() async {
    try {
      final storedRefreshToken = await _storage.read(key: AppConstants.refreshTokenKey);
      if (storedRefreshToken == null) {
        debugPrint('[AuthRepo] No refresh token stored, cannot refresh');
        return false;
      }

      debugPrint('[AuthRepo] Attempting token refresh...');
      final response = await _dio.post(
        AppConstants.refreshEndpoint,
        data: {'refresh_token': storedRefreshToken},
      );

      final newAccessToken = response.data['access_token'];
      final newRefreshToken = response.data['refresh_token'];

      if (newAccessToken != null) {
        await _storage.write(key: AppConstants.tokenKey, value: newAccessToken);
        debugPrint('[AuthRepo] Token refreshed successfully (${newAccessToken.toString().length} chars)');

        // Update refresh token if a new one was returned
        if (newRefreshToken != null) {
          await _storage.write(key: AppConstants.refreshTokenKey, value: newRefreshToken);
        }

        return true;
      }

      debugPrint('[AuthRepo] Refresh response missing access_token');
      return false;
    } on DioException catch (e) {
      debugPrint('[AuthRepo] Token refresh failed: ${e.response?.statusCode} ${e.message}');
      return false;
    } catch (e) {
      debugPrint('[AuthRepo] Token refresh error: $e');
      return false;
    }
  }
}
