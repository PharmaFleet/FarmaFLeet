import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:logger/logger.dart';

import '../models/location_model.dart';

/// API client for communicating with the backend.
/// Configured with interceptors for authentication and error handling.
class ApiClient {
  ApiClient({
    required String baseUrl,
    FlutterSecureStorage? secureStorage,
    Logger? logger,
  })  : _secureStorage = secureStorage ?? const FlutterSecureStorage(),
        _logger = logger ?? Logger() {
    _dio = Dio(
      BaseOptions(
        baseUrl: baseUrl,
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 10),
        sendTimeout: const Duration(seconds: 10),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    _setupInterceptors();
  }

  late final Dio _dio;
  final FlutterSecureStorage _secureStorage;
  final Logger _logger;

  /// Maximum number of retries for failed requests
  static const int _maxRetries = 3;

  /// Setup interceptors for authentication and error handling
  void _setupInterceptors() {
    _dio.interceptors.addAll([
      AuthInterceptor(
        secureStorage: _secureStorage,
        logger: _logger,
      ),
      ErrorInterceptor(
        logger: _logger,
      ),
      RetryInterceptor(
        maxRetries: _maxRetries,
        logger: _logger,
      ),
      LogInterceptor(
        request: kDebugMode,
        requestBody: kDebugMode,
        responseBody: kDebugMode,
        error: kDebugMode,
      ),
    ]);
  }

  /// Update driver location on the backend
  /// Returns true if successful, false otherwise
  Future<bool> updateLocation(LocationUpdateModel location) async {
    try {
      final response = await _dio.post(
        '/api/v1/drivers/location',
        data: location.toJson(),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        _logger.i('Location updated successfully: ${location.driverId}');
        return true;
      }

      _logger.w('Unexpected status code: ${response.statusCode}');
      return false;
    } on DioException catch (e) {
      _logger.e('Failed to update location: ${e.message}', error: e);
      rethrow;
    }
  }

  /// Update driver availability status on the backend
  /// Returns true if successful, false otherwise
  Future<bool> updateDriverStatus(bool isAvailable) async {
    try {
      final response = await _dio.patch(
        '/api/v1/drivers/me/status',
        data: {'is_available': isAvailable},
      );

      if (response.statusCode == 200) {
        _logger.i('Driver status updated to: $isAvailable');
        return true;
      }

      _logger.w('Unexpected status code: ${response.statusCode}');
      return false;
    } on DioException catch (e) {
      _logger.e('Failed to update driver status: ${e.message}', error: e);
      return false;
    }
  }

  /// Get the Dio instance for direct access if needed
  Dio get dio => _dio;

  /// Dispose of resources
  void dispose() {
    _dio.close();
  }
}

/// Interceptor to add JWT token to requests
class AuthInterceptor extends Interceptor {
  AuthInterceptor({
    required FlutterSecureStorage secureStorage,
    required Logger logger,
  })  : _secureStorage = secureStorage,
        _logger = logger;

  final FlutterSecureStorage _secureStorage;
  final Logger _logger;

  static const String _tokenKey = 'jwt_token';

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    try {
      final token = await _secureStorage.read(key: _tokenKey);

      if (token != null && token.isNotEmpty) {
        options.headers['Authorization'] = 'Bearer $token';
        _logger.d('Added auth token to request: ${options.path}');
      } else {
        _logger.w('No auth token found for request: ${options.path}');
      }
    } catch (e) {
      _logger.e('Error reading auth token: $e');
    }

    handler.next(options);
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    // Handle 401 Unauthorized - token expired or invalid
    if (err.response?.statusCode == 401) {
      _logger.w('Received 401, token may be expired');
      // Could trigger token refresh or logout here
    }

    handler.next(err);
  }
}

/// Interceptor for handling API errors
class ErrorInterceptor extends Interceptor {
  ErrorInterceptor({
    required Logger logger,
  }) : _logger = logger;

  final Logger _logger;

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    final statusCode = err.response?.statusCode;
    final path = err.requestOptions.path;

    switch (statusCode) {
      case 400:
        _logger.e('Bad request to $path: ${err.response?.data}');
        break;
      case 401:
        _logger.e('Unauthorized request to $path');
        break;
      case 403:
        _logger.e('Forbidden request to $path');
        break;
      case 404:
        _logger.e('Resource not found: $path');
        break;
      case 429:
        _logger.w('Rate limited on $path - will retry');
        // Let retry interceptor handle this
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        _logger.e('Server error ($statusCode) on $path');
        break;
      default:
        if (err.type == DioExceptionType.connectionTimeout) {
          _logger.e('Connection timeout for $path');
        } else if (err.type == DioExceptionType.receiveTimeout) {
          _logger.e('Receive timeout for $path');
        } else if (err.type == DioExceptionType.sendTimeout) {
          _logger.e('Send timeout for $path');
        } else if (err.error is SocketException) {
          _logger.e('Network error for $path: ${err.error}');
        } else {
          _logger.e('Request error for $path: ${err.message}');
        }
    }

    handler.next(err);
  }
}

/// Interceptor for retrying failed requests
class RetryInterceptor extends Interceptor {
  RetryInterceptor({
    required int maxRetries,
    required Logger logger,
  })  : _maxRetries = maxRetries,
        _logger = logger;

  final int _maxRetries;
  final Logger _logger;

  /// Retry delays in milliseconds (exponential backoff)
  static const List<int> _retryDelays = [
    1000, // 1 second
    2000, // 2 seconds
    4000, // 4 seconds
  ];

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    final retryCount = err.requestOptions.extra['retry_count'] as int? ?? 0;

    // Only retry for specific errors
    final shouldRetry = _shouldRetry(err);

    if (shouldRetry && retryCount < _maxRetries) {
      final delay = _retryDelays[retryCount.clamp(0, _retryDelays.length - 1)];
      _logger.w(
        'Retrying request ${err.requestOptions.path} '
        '(attempt ${retryCount + 1}/$_maxRetries) after ${delay}ms',
      );

      await Future<void>.delayed(Duration(milliseconds: delay));

      // Clone the request with updated retry count
      final options = err.requestOptions;
      options.extra['retry_count'] = retryCount + 1;

      try {
        final dio = Dio();
        final response = await dio.fetch<void>(options);
        handler.resolve(response);
        return;
      } catch (e) {
        // If retry fails, continue with error
      }
    }

    handler.next(err);
  }

  /// Determine if the error should trigger a retry
  bool _shouldRetry(DioException error) {
    final statusCode = error.response?.statusCode;

    // Retry on rate limiting
    if (statusCode == 429) {
      return true;
    }

    // Retry on server errors
    if (statusCode != null && statusCode >= 500) {
      return true;
    }

    // Retry on network errors
    if (error.type == DioExceptionType.connectionTimeout) {
      return true;
    }
    if (error.type == DioExceptionType.receiveTimeout) {
      return true;
    }
    if (error.type == DioExceptionType.sendTimeout) {
      return true;
    }
    if (error.error is SocketException) {
      return true;
    }
    if (error.type == DioExceptionType.unknown) {
      return true;
    }

    return false;
  }
}
