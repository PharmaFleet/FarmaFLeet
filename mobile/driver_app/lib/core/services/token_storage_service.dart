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
}
