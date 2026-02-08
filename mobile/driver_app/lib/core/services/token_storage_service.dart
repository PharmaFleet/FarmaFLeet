import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../constants/app_constants.dart';

class TokenStorageService {
  final FlutterSecureStorage _storage;
  static const _tokenKey = AppConstants.tokenKey;
  static const _refreshTokenKey = AppConstants.refreshTokenKey;

  TokenStorageService({FlutterSecureStorage? storage})
    : _storage = storage ?? const FlutterSecureStorage();

  Future<void> saveToken(String token) async {
    debugPrint('[TokenStorage] Saving token (${token.length} chars)');
    await _storage.write(key: _tokenKey, value: token);
    // Verify write
    final saved = await _storage.read(key: _tokenKey);
    debugPrint('[TokenStorage] Token saved and verified: ${saved != null}');
  }

  Future<String?> getToken() async {
    final token = await _storage.read(key: _tokenKey);
    debugPrint('[TokenStorage] getToken called, found: ${token != null ? "yes (${token.length} chars)" : "NO"}');
    return token;
  }

  Future<void> deleteToken() async {
    debugPrint('[TokenStorage] Deleting token');
    await _storage.delete(key: _tokenKey);
  }

  /// Save refresh token to secure storage
  Future<void> saveRefreshToken(String token) async {
    debugPrint('[TokenStorage] Saving refresh token (${token.length} chars)');
    await _storage.write(key: _refreshTokenKey, value: token);
  }

  /// Retrieve refresh token from secure storage
  Future<String?> getRefreshToken() async {
    final token = await _storage.read(key: _refreshTokenKey);
    debugPrint('[TokenStorage] getRefreshToken called, found: ${token != null ? "yes (${token.length} chars)" : "NO"}');
    return token;
  }

  /// Delete refresh token from secure storage
  Future<void> deleteRefreshToken() async {
    debugPrint('[TokenStorage] Deleting refresh token');
    await _storage.delete(key: _refreshTokenKey);
  }

  /// Delete both access and refresh tokens
  Future<void> deleteAllTokens() async {
    debugPrint('[TokenStorage] Deleting all tokens');
    await _storage.delete(key: _tokenKey);
    await _storage.delete(key: _refreshTokenKey);
  }

  /// Check if token exists without retrieving it
  Future<bool> hasToken() async {
    final token = await _storage.read(key: _tokenKey);
    return token != null && token.isNotEmpty;
  }

  // Online status persistence for background service restoration
  static const _onlineStatusKey = 'driver_online_status';
  static const _driverIdKey = 'driver_id';

  /// Save driver online status for restoration after app restart
  Future<void> saveOnlineStatus(bool isOnline) async {
    debugPrint('[TokenStorage] Saving online status: $isOnline');
    await _storage.write(key: _onlineStatusKey, value: isOnline.toString());
  }

  /// Get saved online status
  Future<bool> getOnlineStatus() async {
    final status = await _storage.read(key: _onlineStatusKey);
    final isOnline = status == 'true';
    debugPrint('[TokenStorage] Retrieved online status: $isOnline');
    return isOnline;
  }

  /// Clear online status
  Future<void> clearOnlineStatus() async {
    debugPrint('[TokenStorage] Clearing online status');
    await _storage.delete(key: _onlineStatusKey);
  }

  /// Save driver ID for background service
  Future<void> saveDriverId(String driverId) async {
    debugPrint('[TokenStorage] Saving driver ID');
    await _storage.write(key: _driverIdKey, value: driverId);
  }

  /// Get saved driver ID
  Future<String?> getDriverId() async {
    return await _storage.read(key: _driverIdKey);
  }

  /// Clear driver ID
  Future<void> clearDriverId() async {
    await _storage.delete(key: _driverIdKey);
  }
}
