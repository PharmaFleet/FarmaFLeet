/// Environment configuration for the driver app.
///
/// Uses compile-time constants via --dart-define for build-time configuration.
///
/// Usage:
/// ```bash
/// # Development (local backend - uses Android emulator localhost)
/// flutter run --dart-define=ENV=dev
///
/// # Development with custom API URL
/// flutter run --dart-define=ENV=dev --dart-define=API_URL=http://192.168.1.100:8000/api/v1
///
/// # Staging
/// flutter run --dart-define=ENV=staging
///
/// # Production (default)
/// flutter run
/// flutter build apk --release
/// ```
enum Environment { dev, staging, prod }

class AppConfig {
  const AppConfig._();

  static const String _envString =
      String.fromEnvironment('ENV', defaultValue: 'prod');

  static Environment get environment {
    switch (_envString) {
      case 'dev':
        return Environment.dev;
      case 'staging':
        return Environment.staging;
      default:
        return Environment.prod;
    }
  }

  static String get apiBaseUrl {
    // Allow full override via API_URL
    const customUrl = String.fromEnvironment('API_URL');
    if (customUrl.isNotEmpty) {
      return customUrl;
    }

    // Otherwise use environment defaults
    switch (environment) {
      case Environment.dev:
        // 10.0.2.2 is Android emulator's localhost alias
        return 'http://10.0.2.2:8000/api/v1';
      case Environment.staging:
        return 'https://staging.pharmafleet.com/api/v1';
      case Environment.prod:
        return 'https://pharmafleet-olive.vercel.app/api/v1';
    }
  }

  static bool get isProduction => environment == Environment.prod;
  static bool get isDevelopment => environment == Environment.dev;
  static bool get isStaging => environment == Environment.staging;

  /// Returns a debug-friendly name for the current environment
  static String get environmentName => _envString.toUpperCase();

  /// Sentry DSN for error monitoring (empty string disables Sentry)
  static const String sentryDsn = String.fromEnvironment('SENTRY_DSN', defaultValue: '');

  /// Sentry environment name
  static String get sentryEnvironment {
    switch (environment) {
      case Environment.dev:
        return 'development';
      case Environment.staging:
        return 'staging';
      case Environment.prod:
        return 'production';
    }
  }
}
