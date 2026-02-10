import 'package:driver_app/core/services/token_storage_service.dart';
import 'package:driver_app/features/auth/data/auth_service.dart';

class AuthRepository {
  final AuthService _authService;
  final TokenStorageService _tokenService;

  AuthRepository(this._authService, this._tokenService);

  Future<void> login(String username, String password) async {
    final response = await _authService.login(username, password);
    await _tokenService.saveToken(response.accessToken);
  }

  Future<void> logout() async {
    await _tokenService.deleteToken();
  }

  Future<String?> getToken() async {
    return await _tokenService.getToken();
  }
}
