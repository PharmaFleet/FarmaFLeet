import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../constants/app_constants.dart';

class TokenStorageService {
  final FlutterSecureStorage _storage;
  static const _tokenKey = AppConstants.tokenKey;

  TokenStorageService({FlutterSecureStorage? storage})
    : _storage = storage ?? const FlutterSecureStorage();

  Future<void> saveToken(String token) async {
    debugPrint('[TokenStorage] Saving token: ${token.length > 20 ? token.substring(0, 20) : token}...');
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

  /// Check if token exists without retrieving it
  Future<bool> hasToken() async {
    final token = await _storage.read(key: _tokenKey);
    return token != null && token.isNotEmpty;
  }
}
