import 'package:dio/dio.dart';
import 'package:driver_app/core/constants/app_constants.dart';
import 'package:driver_app/features/auth/data/repositories/auth_repository_impl.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class MockDio extends Mock implements Dio {}

class MockFlutterSecureStorage extends Mock implements FlutterSecureStorage {}

// Needed for Mocktail to handle Options parameter matching
class FakeOptions extends Fake implements Options {}

class FakeFormData extends Fake implements FormData {}

void main() {
  late MockDio mockDio;
  late MockFlutterSecureStorage mockStorage;
  late AuthRepositoryImpl authRepository;

  setUpAll(() {
    registerFallbackValue(FakeOptions());
    registerFallbackValue(FakeFormData());
  });

  setUp(() {
    mockDio = MockDio();
    mockStorage = MockFlutterSecureStorage();

    // Mock BaseOptions for Dio
    when(() => mockDio.options).thenReturn(
      BaseOptions(baseUrl: 'https://test.com/api/v1'),
    );

    authRepository = AuthRepositoryImpl(
      dio: mockDio,
      storage: mockStorage,
    );
  });

  group('AuthRepositoryImpl', () {
    // ---------------------------------------------------------------
    // login
    // ---------------------------------------------------------------
    group('login', () {
      test('saves both access and refresh tokens on successful login',
          () async {
        const accessToken = 'new-access-token';
        const refreshToken = 'new-refresh-token';

        when(() => mockDio.post(
              AppConstants.loginEndpoint,
              data: any(named: 'data'),
              options: any(named: 'options'),
            )).thenAnswer((_) async => Response(
              data: {
                'access_token': accessToken,
                'refresh_token': refreshToken,
              },
              statusCode: 200,
              requestOptions: RequestOptions(path: AppConstants.loginEndpoint),
            ));

        when(() => mockStorage.write(
              key: any(named: 'key'),
              value: any(named: 'value'),
            )).thenAnswer((_) async {});

        // For the verify-read after saving access token
        when(() => mockStorage.read(key: AppConstants.tokenKey))
            .thenAnswer((_) async => accessToken);

        final result = await authRepository.login('test@test.com', 'password');

        expect(result, equals(accessToken));

        // Verify access token was saved
        verify(() => mockStorage.write(
              key: AppConstants.tokenKey,
              value: accessToken,
            )).called(1);

        // Verify refresh token was saved
        verify(() => mockStorage.write(
              key: AppConstants.refreshTokenKey,
              value: refreshToken,
            )).called(1);
      });

      test('saves only access token when refresh token is null', () async {
        const accessToken = 'new-access-token';

        when(() => mockDio.post(
              AppConstants.loginEndpoint,
              data: any(named: 'data'),
              options: any(named: 'options'),
            )).thenAnswer((_) async => Response(
              data: {
                'access_token': accessToken,
                'refresh_token': null,
              },
              statusCode: 200,
              requestOptions: RequestOptions(path: AppConstants.loginEndpoint),
            ));

        when(() => mockStorage.write(
              key: any(named: 'key'),
              value: any(named: 'value'),
            )).thenAnswer((_) async {});

        when(() => mockStorage.read(key: AppConstants.tokenKey))
            .thenAnswer((_) async => accessToken);

        final result = await authRepository.login('test@test.com', 'password');

        expect(result, equals(accessToken));

        // Access token was saved
        verify(() => mockStorage.write(
              key: AppConstants.tokenKey,
              value: accessToken,
            )).called(1);

        // Refresh token was NOT saved
        verifyNever(() => mockStorage.write(
              key: AppConstants.refreshTokenKey,
              value: any(named: 'value'),
            ));
      });

      test('throws exception when no access_token in response', () async {
        when(() => mockDio.post(
              AppConstants.loginEndpoint,
              data: any(named: 'data'),
              options: any(named: 'options'),
            )).thenAnswer((_) async => Response(
              data: {'some_other_field': 'value'},
              statusCode: 200,
              requestOptions: RequestOptions(path: AppConstants.loginEndpoint),
            ));

        expect(
          () => authRepository.login('test@test.com', 'password'),
          throwsA(isA<Exception>().having(
            (e) => e.toString(),
            'message',
            contains('Token not found in response'),
          )),
        );
      });

      test('throws invalid credentials on 401 response', () async {
        when(() => mockDio.post(
              AppConstants.loginEndpoint,
              data: any(named: 'data'),
              options: any(named: 'options'),
            )).thenThrow(DioException(
              response: Response(
                statusCode: 401,
                requestOptions:
                    RequestOptions(path: AppConstants.loginEndpoint),
              ),
              requestOptions: RequestOptions(path: AppConstants.loginEndpoint),
            ));

        expect(
          () => authRepository.login('test@test.com', 'wrong-password'),
          throwsA(isA<Exception>().having(
            (e) => e.toString(),
            'message',
            contains('Invalid email or password'),
          )),
        );
      });

      test('throws invalid credentials on 400 response', () async {
        when(() => mockDio.post(
              AppConstants.loginEndpoint,
              data: any(named: 'data'),
              options: any(named: 'options'),
            )).thenThrow(DioException(
              response: Response(
                statusCode: 400,
                requestOptions:
                    RequestOptions(path: AppConstants.loginEndpoint),
              ),
              requestOptions: RequestOptions(path: AppConstants.loginEndpoint),
            ));

        expect(
          () => authRepository.login('test@test.com', 'wrong'),
          throwsA(isA<Exception>().having(
            (e) => e.toString(),
            'message',
            contains('Invalid email or password'),
          )),
        );
      });

      test('throws network error for other DioExceptions', () async {
        when(() => mockDio.post(
              AppConstants.loginEndpoint,
              data: any(named: 'data'),
              options: any(named: 'options'),
            )).thenThrow(DioException(
              response: Response(
                statusCode: 500,
                requestOptions:
                    RequestOptions(path: AppConstants.loginEndpoint),
              ),
              message: 'Server Error',
              requestOptions: RequestOptions(path: AppConstants.loginEndpoint),
            ));

        expect(
          () => authRepository.login('test@test.com', 'password'),
          throwsA(isA<Exception>().having(
            (e) => e.toString(),
            'message',
            contains('Network error'),
          )),
        );
      });
    });

    // ---------------------------------------------------------------
    // logout (CR-38)
    // ---------------------------------------------------------------
    group('logout', () {
      test('deletes both access and refresh tokens', () async {
        when(() => mockStorage.delete(key: AppConstants.tokenKey))
            .thenAnswer((_) async {});
        when(() => mockStorage.delete(key: AppConstants.refreshTokenKey))
            .thenAnswer((_) async {});

        await authRepository.logout();

        verify(() => mockStorage.delete(key: AppConstants.tokenKey)).called(1);
        verify(() => mockStorage.delete(key: AppConstants.refreshTokenKey))
            .called(1);
      });
    });

    // ---------------------------------------------------------------
    // refreshToken (CR-38)
    // ---------------------------------------------------------------
    group('refreshToken', () {
      test('returns false when no refresh token is stored', () async {
        when(() => mockStorage.read(key: AppConstants.refreshTokenKey))
            .thenAnswer((_) async => null);

        final result = await authRepository.refreshToken();

        expect(result, isFalse);
        // Should not attempt network call
        verifyNever(() => mockDio.post(
              AppConstants.refreshEndpoint,
              data: any(named: 'data'),
            ));
      });

      test('calls refresh endpoint with stored refresh token', () async {
        const storedRefreshToken = 'stored-refresh-token';
        const newAccessToken = 'new-access-token';
        const newRefreshToken = 'new-refresh-token';

        when(() => mockStorage.read(key: AppConstants.refreshTokenKey))
            .thenAnswer((_) async => storedRefreshToken);

        when(() => mockDio.post(
              AppConstants.refreshEndpoint,
              data: {'refresh_token': storedRefreshToken},
            )).thenAnswer((_) async => Response(
              data: {
                'access_token': newAccessToken,
                'refresh_token': newRefreshToken,
              },
              statusCode: 200,
              requestOptions:
                  RequestOptions(path: AppConstants.refreshEndpoint),
            ));

        when(() => mockStorage.write(
              key: any(named: 'key'),
              value: any(named: 'value'),
            )).thenAnswer((_) async {});

        final result = await authRepository.refreshToken();

        expect(result, isTrue);

        // Verify new access token saved
        verify(() => mockStorage.write(
              key: AppConstants.tokenKey,
              value: newAccessToken,
            )).called(1);

        // Verify new refresh token saved
        verify(() => mockStorage.write(
              key: AppConstants.refreshTokenKey,
              value: newRefreshToken,
            )).called(1);
      });

      test(
          'saves new access token but keeps old refresh token when none returned',
          () async {
        const storedRefreshToken = 'stored-refresh-token';
        const newAccessToken = 'new-access-token';

        when(() => mockStorage.read(key: AppConstants.refreshTokenKey))
            .thenAnswer((_) async => storedRefreshToken);

        when(() => mockDio.post(
              AppConstants.refreshEndpoint,
              data: {'refresh_token': storedRefreshToken},
            )).thenAnswer((_) async => Response(
              data: {
                'access_token': newAccessToken,
                // No refresh_token in response
              },
              statusCode: 200,
              requestOptions:
                  RequestOptions(path: AppConstants.refreshEndpoint),
            ));

        when(() => mockStorage.write(
              key: any(named: 'key'),
              value: any(named: 'value'),
            )).thenAnswer((_) async {});

        final result = await authRepository.refreshToken();

        expect(result, isTrue);

        // Access token saved
        verify(() => mockStorage.write(
              key: AppConstants.tokenKey,
              value: newAccessToken,
            )).called(1);

        // Refresh token NOT updated
        verifyNever(() => mockStorage.write(
              key: AppConstants.refreshTokenKey,
              value: any(named: 'value'),
            ));
      });

      test('returns false when response has no access_token', () async {
        const storedRefreshToken = 'stored-refresh-token';

        when(() => mockStorage.read(key: AppConstants.refreshTokenKey))
            .thenAnswer((_) async => storedRefreshToken);

        when(() => mockDio.post(
              AppConstants.refreshEndpoint,
              data: {'refresh_token': storedRefreshToken},
            )).thenAnswer((_) async => Response(
              data: {'some_other_field': 'value'},
              statusCode: 200,
              requestOptions:
                  RequestOptions(path: AppConstants.refreshEndpoint),
            ));

        final result = await authRepository.refreshToken();

        expect(result, isFalse);
      });

      test('returns false on DioException (e.g. 401 expired refresh token)',
          () async {
        const storedRefreshToken = 'expired-refresh-token';

        when(() => mockStorage.read(key: AppConstants.refreshTokenKey))
            .thenAnswer((_) async => storedRefreshToken);

        when(() => mockDio.post(
              AppConstants.refreshEndpoint,
              data: {'refresh_token': storedRefreshToken},
            )).thenThrow(DioException(
              response: Response(
                statusCode: 401,
                requestOptions:
                    RequestOptions(path: AppConstants.refreshEndpoint),
              ),
              requestOptions:
                  RequestOptions(path: AppConstants.refreshEndpoint),
            ));

        final result = await authRepository.refreshToken();

        expect(result, isFalse);
      });

      test('returns false on unexpected exception', () async {
        const storedRefreshToken = 'stored-refresh-token';

        when(() => mockStorage.read(key: AppConstants.refreshTokenKey))
            .thenAnswer((_) async => storedRefreshToken);

        when(() => mockDio.post(
              AppConstants.refreshEndpoint,
              data: {'refresh_token': storedRefreshToken},
            )).thenThrow(Exception('Unexpected error'));

        final result = await authRepository.refreshToken();

        expect(result, isFalse);
      });
    });

    // ---------------------------------------------------------------
    // checkAuthStatus
    // ---------------------------------------------------------------
    group('checkAuthStatus', () {
      test('returns true when token exists', () async {
        when(() => mockStorage.read(key: AppConstants.tokenKey))
            .thenAnswer((_) async => 'some-token');

        final result = await authRepository.checkAuthStatus();

        expect(result, isTrue);
      });

      test('returns false when no token exists', () async {
        when(() => mockStorage.read(key: AppConstants.tokenKey))
            .thenAnswer((_) async => null);

        final result = await authRepository.checkAuthStatus();

        expect(result, isFalse);
      });
    });

    // ---------------------------------------------------------------
    // getProfile
    // ---------------------------------------------------------------
    group('getProfile', () {
      test('throws exception when no token stored', () async {
        when(() => mockStorage.read(key: AppConstants.tokenKey))
            .thenAnswer((_) async => null);

        expect(
          () => authRepository.getProfile(),
          throwsA(isA<Exception>().having(
            (e) => e.toString(),
            'message',
            contains('No token found'),
          )),
        );
      });

      test('fetches profile with valid token', () async {
        const token = 'valid-token';
        when(() => mockStorage.read(key: AppConstants.tokenKey))
            .thenAnswer((_) async => token);

        when(() => mockDio.get(
              AppConstants.profileEndpoint,
              options: any(named: 'options'),
            )).thenAnswer((_) async => Response(
              data: {
                'id': 1,
                'email': 'driver@test.com',
                'full_name': 'Test Driver',
                'phone': '+965-1234',
                'is_active': true,
                'is_superuser': false,
              },
              statusCode: 200,
              requestOptions:
                  RequestOptions(path: AppConstants.profileEndpoint),
            ));

        final user = await authRepository.getProfile();

        expect(user.id, equals(1));
        expect(user.email, equals('driver@test.com'));
        expect(user.fullName, equals('Test Driver'));
      });
    });
  });
}
