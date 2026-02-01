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
          final token = await _tokenService.getToken();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
            debugPrint('[DioClient] Token attached: ${token.substring(0, 10)}...');
          } else {
            debugPrint('[DioClient] NO TOKEN FOUND in storage');
          }
          return handler.next(options);
        },
        onError: (DioException e, handler) async {
          debugPrint('[DioClient] Error: ${e.response?.statusCode} ${e.message}');
          if (e.response?.statusCode == 401) {
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
