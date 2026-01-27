import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:driver_app/main.dart' as app;

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('Full App E2E Test', (tester) async {
    print('Starting E2E Test...');
    // Start the app
    await app.main();
    await tester.pumpAndSettle();

    // Helper to wait while loading
    Future<void> waitForLoader() async {
      int retries = 0;
      while (find.byType(CircularProgressIndicator).evaluate().isNotEmpty &&
          retries < 100) {
        await tester.pump(const Duration(milliseconds: 100));
        retries++;
      }
      if (retries >= 100) print('Warning: Loader did not disappear');
      await tester.pumpAndSettle();
    }

    // 1. Handle potential existing session (Logout if needed)
    print('Checking for existing session...');
    if (find.byIcon(Icons.home_outlined).evaluate().isNotEmpty) {
      print('App started in Authenticated state. Logging out...');
      final settingsTab = find.byIcon(Icons.settings_outlined);
      await tester.tap(settingsTab);
      await tester.pumpAndSettle();

      final logoutButton = find.text('Logout');
      if (logoutButton.evaluate().isNotEmpty) {
        await tester.tap(logoutButton);
        await waitForLoader(); // Logout triggers loading
      }
    }

    // 2. Verify Login Screen
    print('Verifying Login Screen...');
    // If we are still loading, wait
    await waitForLoader();

    if (find.text('PharmaFleet Driver').evaluate().isEmpty) {
      print('Dump: ${find.byType(Widget).toString()}');
      fail('Login screen not found');
    }

    expect(find.text('PharmaFleet Driver'), findsOneWidget);
    expect(find.byType(TextFormField), findsNWidgets(2));

    // 3. Perform Login
    print('Performing Login...');
    final emailField = find.byType(TextFormField).first;
    final passwordField = find.byType(TextFormField).last;

    await tester.enterText(emailField, 'driver@pharmafleet.com');
    await tester.enterText(passwordField, 'driver123');
    await tester.pumpAndSettle();

    final loginButton = find.byType(ElevatedButton);
    await tester.tap(loginButton);

    // Validating login process which might show loader
    print('Waiting for login to complete...');
    await waitForLoader();

    // 4. Verify Home Screen (Navigation to Home)
    print('Verifying Home Screen...');
    expect(find.byType(NavigationBar), findsOneWidget);
    expect(find.text('Welcome back!'), findsOneWidget);

    // 5. Navigate to Orders
    print('Navigating to Orders...');
    final ordersTab = find.byIcon(Icons.list_alt_outlined);
    await tester.tap(ordersTab);
    await tester.pumpAndSettle();

    // 6. Navigate to Settings
    print('Navigating to Settings...');
    final settingsTab = find.byIcon(Icons.settings_outlined);
    await tester.tap(settingsTab);
    await tester.pumpAndSettle();

    // 7. Logout to clean up
    print('Logging out...');
    final logoutButton = find.text('Logout');
    if (logoutButton.evaluate().isNotEmpty) {
      await tester.tap(logoutButton);
      await waitForLoader();
    }

    // Verify back on login
    expect(find.text('PharmaFleet Driver'), findsOneWidget);

    print('E2E Test Completed Successfully');
  });
}
