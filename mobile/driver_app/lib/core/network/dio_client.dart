import 'package:dio/dio.dart';
import 'package:driver_app/core/constants/api_constants.dart';
import 'package:driver_app/core/services/token_storage_service.dart';
import 'package:flutter/foundation.dart';

class DioClient {
  final Dio _dio;
  final TokenStorageService _tokenService;

  VoidCallback? onUnauthorized;

  DioClient(this._tokenService)
    : _dio = Dio(
        BaseOptions(
          baseUrl: ApiConstants.baseUrl,
          connectTimeout: const Duration(seconds: 15),
          receiveTimeout: const Duration(seconds: 15),
          headers: {'Content-Type': 'application/json'},
        ),
      ) {
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          debugPrint('[DioClient] Request: ${options.method} ${options.path}');
          final token = await _tokenService.getToken();
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
            debugPrint('[DioClient] Token attached: ${token.length > 20 ? token.substring(0, 20) : token}...');
          } else {
            debugPrint('[DioClient] WARNING: No token in storage for ${options.path}');
          }
          return handler.next(options);
        },
        onResponse: (response, handler) {
          debugPrint('[DioClient] Response: ${response.statusCode} for ${response.requestOptions.path}');
          return handler.next(response);
        },
        onError: (DioException e, handler) async {
          debugPrint('[DioClient] Error ${e.response?.statusCode} for ${e.requestOptions.path}');
          debugPrint('[DioClient] Error message: ${e.message}');
          debugPrint('[DioClient] Response data: ${e.response?.data}');

          if (e.response?.statusCode == 401) {
            debugPrint('[DioClient] 401 Unauthorized - clearing token and calling onUnauthorized');
            await _tokenService.deleteToken();
            onUnauthorized?.call();
          }
          return handler.next(e);
        },
      ),
    );
  }

  Dio get dio => _dio;
}
