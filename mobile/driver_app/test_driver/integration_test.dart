import 'package:integration_test/integration_test.dart';

import '../integration_test/app_test.dart' as app_test;

/// Test driver for running integration tests from command line
/// Run with: flutter drive --driver=test_driver/integration_test.dart --target=integration_test/app_test.dart
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  app_test.main();
}
