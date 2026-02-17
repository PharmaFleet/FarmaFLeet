import 'package:driver_app/features/orders/presentation/widgets/order_card.dart';
import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:flutter_test/flutter_test.dart';

/// Tests for the OrderCard pickup location display (Task 1).
///
/// Covers:
/// - Pickup row is shown when warehouseName/warehouseCode provided
/// - Pickup row displays "CODE - Name" format
/// - Pickup row hidden when both are null
/// - Fallback when only one field is provided

Widget buildTestWidget(Widget child) {
  return ScreenUtilInit(
    designSize: const Size(375, 812),
    minTextAdapt: true,
    builder: (context, _) => MaterialApp(
      home: Scaffold(body: SingleChildScrollView(child: child)),
    ),
  );
}

void main() {
  group('OrderCard - Pickup Location (Task 1)', () {
    testWidgets('displays pickup row with code and name', (tester) async {
      await tester.pumpWidget(buildTestWidget(
        OrderCard(
          orderId: 1,
          salesOrderNumber: 'SO-001',
          customerName: 'Test Customer',
          status: 'assigned',
          amount: 10.0,
          address: '123 Street',
          warehouseName: 'Main Warehouse',
          warehouseCode: 'DW001',
          onTap: () {},
        ),
      ));
      await tester.pumpAndSettle();

      expect(find.text('DW001 - Main Warehouse'), findsOneWidget);
      expect(find.text('Pickup'), findsOneWidget);
    });

    testWidgets('displays only warehouse name when code is null', (tester) async {
      await tester.pumpWidget(buildTestWidget(
        OrderCard(
          orderId: 2,
          customerName: 'Customer',
          status: 'pending',
          amount: 5.0,
          address: '456 Road',
          warehouseName: 'Branch Office',
          warehouseCode: null,
          onTap: () {},
        ),
      ));
      await tester.pumpAndSettle();

      expect(find.text('Branch Office'), findsOneWidget);
      expect(find.text('Pickup'), findsOneWidget);
    });

    testWidgets('displays only warehouse code when name is null', (tester) async {
      await tester.pumpWidget(buildTestWidget(
        OrderCard(
          orderId: 3,
          customerName: 'Customer',
          status: 'pending',
          amount: 5.0,
          address: '789 Ave',
          warehouseName: null,
          warehouseCode: 'BV001',
          onTap: () {},
        ),
      ));
      await tester.pumpAndSettle();

      expect(find.text('BV001'), findsOneWidget);
      expect(find.text('Pickup'), findsOneWidget);
    });

    testWidgets('hides pickup row when both are null', (tester) async {
      await tester.pumpWidget(buildTestWidget(
        OrderCard(
          orderId: 4,
          customerName: 'Customer',
          status: 'pending',
          amount: 5.0,
          address: '999 Blvd',
          warehouseName: null,
          warehouseCode: null,
          onTap: () {},
        ),
      ));
      await tester.pumpAndSettle();

      // Should NOT find a Pickup row
      expect(find.text('Pickup'), findsNothing);
    });

    testWidgets('still shows customer and address info alongside pickup',
        (tester) async {
      await tester.pumpWidget(buildTestWidget(
        OrderCard(
          orderId: 5,
          customerName: 'John Doe',
          status: 'assigned',
          amount: 25.5,
          address: 'Kuwait City',
          warehouseName: 'Main WH',
          warehouseCode: 'DW001',
          onTap: () {},
        ),
      ));
      await tester.pumpAndSettle();

      expect(find.text('John Doe'), findsOneWidget);
      expect(find.text('Kuwait City'), findsOneWidget);
      expect(find.text('DW001 - Main WH'), findsOneWidget);
    });
  });
}
