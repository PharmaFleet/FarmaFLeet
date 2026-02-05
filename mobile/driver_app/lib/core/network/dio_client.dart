import 'package:dio/dio.dart';
import 'package:driver_app/core/constants/api_constants.dart';
import 'package:driver_app/core/services/token_storage_service.dart';
import 'package:flutter/foundation.dart';

class DioClient {
  final Dio _dio;
  final TokenStorageService _tokenService;
  bool _isRefreshing = false;

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
            debugPrint('[DioClient] Token attached (${token.length} chars)');
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
            // Don't try to refresh if this IS the refresh request (prevent infinite loop)
            if (e.requestOptions.path.contains('/auth/refresh')) {
              debugPrint('[DioClient] 401 on refresh endpoint - clearing all tokens');
              await _tokenService.deleteAllTokens();
              onUnauthorized?.call();
              return handler.next(e);
            }

            // Don't attempt concurrent refreshes
            if (_isRefreshing) {
              debugPrint('[DioClient] Already refreshing - skipping duplicate refresh');
              return handler.next(e);
            }

            // Attempt to refresh the token
            debugPrint('[DioClient] 401 Unauthorized - attempting token refresh');
            _isRefreshing = true;

            try {
              final refreshToken = await _tokenService.getRefreshToken();
              if (refreshToken != null) {
                // Use a separate Dio instance to avoid interceptor loops
                final refreshDio = Dio(BaseOptions(
                  baseUrl: ApiConstants.baseUrl,
                  connectTimeout: const Duration(seconds: 10),
                  receiveTimeout: const Duration(seconds: 10),
                  headers: {'Content-Type': 'application/json'},
                ));

                final response = await refreshDio.post(
                  '/auth/refresh',
                  data: {'refresh_token': refreshToken},
                );

                final newToken = response.data['access_token'] as String?;
                final newRefreshToken = response.data['refresh_token'] as String?;

                if (newToken != null) {
                  await _tokenService.saveToken(newToken);
                  debugPrint('[DioClient] Token refreshed successfully (${newToken.length} chars)');

                  // Update refresh token if a new one was returned
                  if (newRefreshToken != null) {
                    await _tokenService.saveRefreshToken(newRefreshToken);
                  }

                  _isRefreshing = false;

                  // Retry original request with new token
                  e.requestOptions.headers['Authorization'] = 'Bearer $newToken';
                  try {
                    final retryResponse = await _dio.fetch(e.requestOptions);
                    return handler.resolve(retryResponse);
                  } catch (retryError) {
                    debugPrint('[DioClient] Retry after refresh failed: $retryError');
                    return handler.next(e);
                  }
                }
              } else {
                debugPrint('[DioClient] No refresh token available');
              }
            } catch (refreshError) {
              debugPrint('[DioClient] Token refresh failed: $refreshError');
            }

            _isRefreshing = false;

            // Refresh failed - clear tokens and logout
            debugPrint('[DioClient] Token refresh unsuccessful - clearing all tokens and calling onUnauthorized');
            await _tokenService.deleteAllTokens();
            onUnauthorized?.call();
          }
          return handler.next(e);
        },
      ),
    );
  }

  Dio get dio => _dio;
}
