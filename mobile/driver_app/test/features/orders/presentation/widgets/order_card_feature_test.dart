import 'package:driver_app/features/orders/presentation/widgets/order_card.dart';
import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:flutter_test/flutter_test.dart';

/// Tests for the feature OrderCard widget at
/// lib/features/orders/presentation/widgets/order_card.dart
///
/// Covers:
/// - SO# display when salesOrderNumber is provided
/// - Fallback to "#orderId" when salesOrderNumber is null/empty
/// - Customer, status, amount, address rendering
/// - Status color logic
/// - Tap callback

Widget buildTestWidget(Widget child) {
  return ScreenUtilInit(
    designSize: const Size(375, 812),
    minTextAdapt: true,
    builder: (context, _) => MaterialApp(
      home: Scaffold(body: child),
    ),
  );
}

void main() {
  group('Feature OrderCard - SO# Display', () {
    testWidgets('displays salesOrderNumber when provided', (tester) async {
      await tester.pumpWidget(buildTestWidget(
        OrderCard(
          orderId: 42,
          salesOrderNumber: 'SO-12345',
          customerName: 'Ahmad Ali',
          status: 'pending',
          amount: 15.500,
          address: '123 Kuwait City',
          onTap: () {},
        ),
      ));
      await tester.pumpAndSettle();

      expect(find.text('SO-12345'), findsOneWidget);
      // Should NOT show the fallback #42
      expect(find.text('#42'), findsNothing);
    });

    testWidgets('falls back to #orderId when salesOrderNumber is null',
        (tester) async {
      await tester.pumpWidget(buildTestWidget(
        OrderCard(
          orderId: 99,
          salesOrderNumber: null,
          customerName: 'Test Customer',
          status: 'assigned',
          amount: 20.000,
          address: '456 Salmiya',
          onTap: () {},
        ),
      ));
      await tester.pumpAndSettle();

      expect(find.text('#99'), findsOneWidget);
    });

    testWidgets('falls back to #orderId when salesOrderNumber is empty',
        (tester) async {
      await tester.pumpWidget(buildTestWidget(
        OrderCard(
          orderId: 77,
          salesOrderNumber: '',
          customerName: 'Test Customer',
          status: 'delivered',
          amount: 5.250,
          address: '789 Hawalli',
          onTap: () {},
        ),
      ));
      await tester.pumpAndSettle();

      expect(find.text('#77'), findsOneWidget);
    });
  });

  group('Feature OrderCard - Content Rendering', () {
    testWidgets('displays customer name', (tester) async {
      await tester.pumpWidget(buildTestWidget(
        OrderCard(
          orderId: 1,
          salesOrderNumber: 'SO-001',
          customerName: 'Fatima Hassan',
          status: 'pending',
          amount: 10.000,
          address: 'Block 5, Street 10',
          onTap: () {},
        ),
      ));
      await tester.pumpAndSettle();

      expect(find.text('Fatima Hassan'), findsOneWidget);
    });

    testWidgets('displays address', (tester) async {
      await tester.pumpWidget(buildTestWidget(
        OrderCard(
          orderId: 1,
          salesOrderNumber: 'SO-001',
          customerName: 'Customer',
          status: 'pending',
          amount: 10.000,
          address: 'Block 3, Jabriya',
          onTap: () {},
        ),
      ));
      await tester.pumpAndSettle();

      expect(find.text('Block 3, Jabriya'), findsOneWidget);
    });

    testWidgets('displays amount in KWD format', (tester) async {
      await tester.pumpWidget(buildTestWidget(
        OrderCard(
          orderId: 1,
          salesOrderNumber: 'SO-001',
          customerName: 'Customer',
          status: 'pending',
          amount: 25.750,
          address: 'Test Address',
          onTap: () {},
        ),
      ));
      await tester.pumpAndSettle();

      expect(find.text('KWD 25.750'), findsOneWidget);
    });

    testWidgets('displays status in uppercase', (tester) async {
      await tester.pumpWidget(buildTestWidget(
        OrderCard(
          orderId: 1,
          salesOrderNumber: 'SO-001',
          customerName: 'Customer',
          status: 'delivered',
          amount: 10.000,
          address: 'Test Address',
          onTap: () {},
        ),
      ));
      await tester.pumpAndSettle();

      expect(find.text('DELIVERED'), findsOneWidget);
    });

    testWidgets('displays "Tap to view details" hint', (tester) async {
      await tester.pumpWidget(buildTestWidget(
        OrderCard(
          orderId: 1,
          salesOrderNumber: 'SO-001',
          customerName: 'Customer',
          status: 'pending',
          amount: 10.000,
          address: 'Test Address',
          onTap: () {},
        ),
      ));
      await tester.pumpAndSettle();

      expect(find.text('Tap to view details >'), findsOneWidget);
    });
  });

  group('Feature OrderCard - Tap Callback', () {
    testWidgets('calls onTap when card is tapped', (tester) async {
      bool tapped = false;

      await tester.pumpWidget(buildTestWidget(
        OrderCard(
          orderId: 1,
          salesOrderNumber: 'SO-001',
          customerName: 'Customer',
          status: 'pending',
          amount: 10.000,
          address: 'Test Address',
          onTap: () => tapped = true,
        ),
      ));
      await tester.pumpAndSettle();

      await tester.tap(find.byType(OrderCard));
      expect(tapped, isTrue);
    });
  });

  group('Feature OrderCard - Status Colors', () {
    testWidgets('pending status uses warning color tint', (tester) async {
      await tester.pumpWidget(buildTestWidget(
        OrderCard(
          orderId: 1,
          customerName: 'Customer',
          status: 'pending',
          amount: 10.000,
          address: 'Test',
          onTap: () {},
        ),
      ));
      await tester.pumpAndSettle();

      expect(find.text('PENDING'), findsOneWidget);
    });

    testWidgets('delivered status uses success color tint', (tester) async {
      await tester.pumpWidget(buildTestWidget(
        OrderCard(
          orderId: 1,
          customerName: 'Customer',
          status: 'delivered',
          amount: 10.000,
          address: 'Test',
          onTap: () {},
        ),
      ));
      await tester.pumpAndSettle();

      expect(find.text('DELIVERED'), findsOneWidget);
    });

    testWidgets('cancelled status uses error color tint', (tester) async {
      await tester.pumpWidget(buildTestWidget(
        OrderCard(
          orderId: 1,
          customerName: 'Customer',
          status: 'cancelled',
          amount: 10.000,
          address: 'Test',
          onTap: () {},
        ),
      ));
      await tester.pumpAndSettle();

      expect(find.text('CANCELLED'), findsOneWidget);
    });

    testWidgets('returned status uses info color tint (default)',
        (tester) async {
      await tester.pumpWidget(buildTestWidget(
        OrderCard(
          orderId: 1,
          customerName: 'Customer',
          status: 'returned',
          amount: 10.000,
          address: 'Test',
          onTap: () {},
        ),
      ));
      await tester.pumpAndSettle();

      expect(find.text('RETURNED'), findsOneWidget);
    });
  });
}
