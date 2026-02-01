import 'package:dio/dio.dart';
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
      if (accessToken != null) {
        await _storage.write(key: AppConstants.tokenKey, value: accessToken);
        return accessToken;
      } else {
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
      if (token == null) throw Exception('No token found');

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
      if (authToken == null) return;

      await _dio.put(
        AppConstants.profileEndpoint,
        data: {'fcm_token': token},
        options: Options(headers: {'Authorization': 'Bearer $authToken'}),
      );
    } catch (e) {
      // Log error but don't propagate to avoid crashing the flow
      // kDebugMode check would be good here, but printing is fine for now
      print('Error updating FCM token: $e');
    }
  }
}
