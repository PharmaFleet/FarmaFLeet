import 'package:driver_app/core/constants/app_constants.dart';
import 'package:driver_app/core/services/token_storage_service.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class MockFlutterSecureStorage extends Mock implements FlutterSecureStorage {}

void main() {
  late MockFlutterSecureStorage mockStorage;
  late TokenStorageService tokenStorageService;

  setUp(() {
    mockStorage = MockFlutterSecureStorage();
    tokenStorageService = TokenStorageService(storage: mockStorage);
  });

  group('TokenStorageService', () {
    // ---------------------------------------------------------------
    // Access token tests
    // ---------------------------------------------------------------
    group('saveToken', () {
      test('writes access token to secure storage and verifies it', () async {
        const token = 'test-access-token-abc123';

        when(() => mockStorage.write(
              key: AppConstants.tokenKey,
              value: token,
            )).thenAnswer((_) async {});
        when(() => mockStorage.read(key: AppConstants.tokenKey))
            .thenAnswer((_) async => token);

        await tokenStorageService.saveToken(token);

        verify(() => mockStorage.write(
              key: AppConstants.tokenKey,
              value: token,
            )).called(1);
        // saveToken also reads back to verify
        verify(() => mockStorage.read(key: AppConstants.tokenKey)).called(1);
      });
    });

    group('getToken', () {
      test('returns token when one is stored', () async {
        const token = 'stored-access-token';
        when(() => mockStorage.read(key: AppConstants.tokenKey))
            .thenAnswer((_) async => token);

        final result = await tokenStorageService.getToken();

        expect(result, equals(token));
        verify(() => mockStorage.read(key: AppConstants.tokenKey)).called(1);
      });

      test('returns null when no token is stored', () async {
        when(() => mockStorage.read(key: AppConstants.tokenKey))
            .thenAnswer((_) async => null);

        final result = await tokenStorageService.getToken();

        expect(result, isNull);
      });
    });

    group('deleteToken', () {
      test('deletes access token from secure storage', () async {
        when(() => mockStorage.delete(key: AppConstants.tokenKey))
            .thenAnswer((_) async {});

        await tokenStorageService.deleteToken();

        verify(() => mockStorage.delete(key: AppConstants.tokenKey)).called(1);
      });
    });

    // ---------------------------------------------------------------
    // Refresh token tests (CR-38)
    // ---------------------------------------------------------------
    group('saveRefreshToken', () {
      test('writes refresh token to secure storage', () async {
        const refreshToken = 'test-refresh-token-xyz789';

        when(() => mockStorage.write(
              key: AppConstants.refreshTokenKey,
              value: refreshToken,
            )).thenAnswer((_) async {});

        await tokenStorageService.saveRefreshToken(refreshToken);

        verify(() => mockStorage.write(
              key: AppConstants.refreshTokenKey,
              value: refreshToken,
            )).called(1);
      });
    });

    group('getRefreshToken', () {
      test('returns refresh token when one is stored', () async {
        const refreshToken = 'stored-refresh-token';
        when(() => mockStorage.read(key: AppConstants.refreshTokenKey))
            .thenAnswer((_) async => refreshToken);

        final result = await tokenStorageService.getRefreshToken();

        expect(result, equals(refreshToken));
        verify(() => mockStorage.read(key: AppConstants.refreshTokenKey))
            .called(1);
      });

      test('returns null when no refresh token is stored', () async {
        when(() => mockStorage.read(key: AppConstants.refreshTokenKey))
            .thenAnswer((_) async => null);

        final result = await tokenStorageService.getRefreshToken();

        expect(result, isNull);
      });
    });

    group('deleteRefreshToken', () {
      test('deletes refresh token from secure storage', () async {
        when(() => mockStorage.delete(key: AppConstants.refreshTokenKey))
            .thenAnswer((_) async {});

        await tokenStorageService.deleteRefreshToken();

        verify(() => mockStorage.delete(key: AppConstants.refreshTokenKey))
            .called(1);
      });
    });

    // ---------------------------------------------------------------
    // deleteAllTokens (CR-38)
    // ---------------------------------------------------------------
    group('deleteAllTokens', () {
      test('deletes both access and refresh tokens', () async {
        when(() => mockStorage.delete(key: AppConstants.tokenKey))
            .thenAnswer((_) async {});
        when(() => mockStorage.delete(key: AppConstants.refreshTokenKey))
            .thenAnswer((_) async {});

        await tokenStorageService.deleteAllTokens();

        verify(() => mockStorage.delete(key: AppConstants.tokenKey)).called(1);
        verify(() => mockStorage.delete(key: AppConstants.refreshTokenKey))
            .called(1);
      });
    });

    // ---------------------------------------------------------------
    // hasToken
    // ---------------------------------------------------------------
    group('hasToken', () {
      test('returns true when a non-empty token is stored', () async {
        when(() => mockStorage.read(key: AppConstants.tokenKey))
            .thenAnswer((_) async => 'valid-token');

        final result = await tokenStorageService.hasToken();

        expect(result, isTrue);
      });

      test('returns false when token is null', () async {
        when(() => mockStorage.read(key: AppConstants.tokenKey))
            .thenAnswer((_) async => null);

        final result = await tokenStorageService.hasToken();

        expect(result, isFalse);
      });

      test('returns false when token is empty string', () async {
        when(() => mockStorage.read(key: AppConstants.tokenKey))
            .thenAnswer((_) async => '');

        final result = await tokenStorageService.hasToken();

        expect(result, isFalse);
      });
    });

    // ---------------------------------------------------------------
    // Edge cases
    // ---------------------------------------------------------------
    group('edge cases', () {
      test('handles very long token strings', () async {
        final longToken = 'a' * 10000;

        when(() => mockStorage.write(
              key: AppConstants.refreshTokenKey,
              value: longToken,
            )).thenAnswer((_) async {});

        await tokenStorageService.saveRefreshToken(longToken);

        verify(() => mockStorage.write(
              key: AppConstants.refreshTokenKey,
              value: longToken,
            )).called(1);
      });

      test('handles special characters in token', () async {
        const specialToken = 'eyJ0eXAiOi+/=.abc123!@#\$%^&*()';

        when(() => mockStorage.write(
              key: AppConstants.refreshTokenKey,
              value: specialToken,
            )).thenAnswer((_) async {});

        await tokenStorageService.saveRefreshToken(specialToken);

        verify(() => mockStorage.write(
              key: AppConstants.refreshTokenKey,
              value: specialToken,
            )).called(1);
      });

      test('uses correct constant keys', () {
        // Verify the constants used match what we expect
        expect(AppConstants.tokenKey, equals('auth_token'));
        expect(AppConstants.refreshTokenKey, equals('refresh_token'));
      });
    });
  });
}
