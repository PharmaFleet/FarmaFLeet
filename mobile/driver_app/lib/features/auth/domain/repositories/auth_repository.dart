import '../entities/user_entity.dart';

abstract class AuthRepository {
  /// Authenticates user with [email] and [password].
  /// Returns [String] access token on success.
  Future<String> login(String email, String password);

  /// Fetches the authenticated user's profile.
  Future<UserEntity> getProfile();

  /// Logs out the user and clears local sessions.
  Future<void> logout();

  /// Checks if a valid session exists.
  Future<bool> checkAuthStatus();

  /// Updates the user's FCM token.
  Future<void> updateFcmToken(String token);

  /// Attempts to refresh the access token using the stored refresh token.
  /// Returns true if refresh succeeded, false otherwise.
  Future<bool> refreshToken();
}
