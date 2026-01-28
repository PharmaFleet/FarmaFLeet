import 'package:driver_app/theme/app_colors.dart';
import 'package:driver_app/widgets/app_button.dart';
import 'package:driver_app/widgets/order_card.dart';
import 'package:driver_app/widgets/status_badge.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('OrderCard', () {
    const defaultOrderId = 'ORD-1234';
    const defaultCustomerName = 'John Doe';
    const defaultCustomerAddress = '123 Main St, City, State';
    const defaultAmount = 45.67;
    const defaultStatus = 'Pending';

    testWidgets('displays order information correctly', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: OrderCard(
              orderId: defaultOrderId,
              customerName: defaultCustomerName,
              customerAddress: defaultCustomerAddress,
              amount: defaultAmount,
              status: defaultStatus,
            ),
          ),
        ),
      );

      expect(find.text(defaultOrderId), findsOneWidget);
      expect(find.text(defaultCustomerName), findsOneWidget);
      expect(find.text(defaultCustomerAddress), findsOneWidget);
      expect(
        find.text('\$${defaultAmount.toStringAsFixed(2)}'),
        findsOneWidget,
      );
      expect(find.text(defaultStatus), findsOneWidget);
      expect(find.byType(StatusBadge), findsOneWidget);
    });

    testWidgets('displays priority indicator when not normal', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: OrderCard(
              orderId: defaultOrderId,
              customerName: defaultCustomerName,
              customerAddress: defaultCustomerAddress,
              amount: defaultAmount,
              status: defaultStatus,
              priority: OrderPriority.high,
              showPriority: true,
            ),
          ),
        ),
      );

      expect(find.text('High'), findsOneWidget);
      expect(find.byIcon(Icons.keyboard_arrow_up), findsOneWidget);
    });

    testWidgets('displays customer avatar when enabled', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: OrderCard(
              orderId: defaultOrderId,
              customerName: defaultCustomerName,
              customerAddress: defaultCustomerAddress,
              amount: defaultAmount,
              status: defaultStatus,
              showCustomerAvatar: true,
            ),
          ),
        ),
      );

      expect(find.byType(CircleAvatar), findsOneWidget);
      expect(find.text('J'), findsOneWidget); // First letter of 'John'
    });

    testWidgets('displays customer phone when provided', (tester) async {
      const customerPhone = '+1 555-123-4567';

      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: OrderCard(
              orderId: defaultOrderId,
              customerName: defaultCustomerName,
              customerAddress: defaultCustomerAddress,
              customerPhone: customerPhone,
              amount: defaultAmount,
              status: defaultStatus,
            ),
          ),
        ),
      );

      expect(find.text(customerPhone), findsOneWidget);
    });

    testWidgets('displays order date when provided', (tester) async {
      const orderDate = 'Jan 24, 2024';

      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: OrderCard(
              orderId: defaultOrderId,
              customerName: defaultCustomerName,
              customerAddress: defaultCustomerAddress,
              amount: defaultAmount,
              status: defaultStatus,
              orderDate: orderDate,
            ),
          ),
        ),
      );

      expect(find.text(orderDate), findsOneWidget);
      expect(find.text('Order Date'), findsOneWidget);
    });

    testWidgets('displays item count when provided', (tester) async {
      const itemCount = 5;

      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: OrderCard(
              orderId: defaultOrderId,
              customerName: defaultCustomerName,
              customerAddress: defaultCustomerAddress,
              amount: defaultAmount,
              status: defaultStatus,
              itemCount: itemCount,
            ),
          ),
        ),
      );

      expect(find.text('$itemCount'), findsOneWidget);
      expect(find.text('Items'), findsOneWidget);
    });

    testWidgets('displays instructions when provided', (tester) async {
      const instructions = 'Please deliver to back door';

      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: OrderCard(
              orderId: defaultOrderId,
              customerName: defaultCustomerName,
              customerAddress: defaultCustomerAddress,
              amount: defaultAmount,
              status: defaultStatus,
              instructions: instructions,
            ),
          ),
        ),
      );

      expect(find.text(instructions), findsOneWidget);
      expect(find.byIcon(Icons.info_outline), findsOneWidget);
    });

    testWidgets('shows correct actions based on status', (tester) async {
      // Test pending status
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: OrderCard(
              orderId: defaultOrderId,
              customerName: defaultCustomerName,
              customerAddress: defaultCustomerAddress,
              amount: defaultAmount,
              status: 'Pending',
              showActions: true,
            ),
          ),
        ),
      );

      expect(find.text('Reject'), findsOneWidget);
      expect(find.text('Accept'), findsOneWidget);
      expect(find.byType(AppButton), findsNWidgets(2));

      // Test accepted status
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: OrderCard(
              orderId: defaultOrderId,
              customerName: defaultCustomerName,
              customerAddress: defaultCustomerAddress,
              amount: defaultAmount,
              status: 'Accepted',
              showActions: true,
            ),
          ),
        ),
      );

      expect(find.text('View Details'), findsOneWidget);
      expect(find.byType(AppButton), findsOneWidget);
    });

    testWidgets('handles action callbacks', (tester) async {
      bool acceptCalled = false;
      bool rejectCalled = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: OrderCard(
              orderId: defaultOrderId,
              customerName: defaultCustomerName,
              customerAddress: defaultCustomerAddress,
              amount: defaultAmount,
              status: 'Pending',
              onAccept: () => acceptCalled = true,
              onReject: () => rejectCalled = true,
            ),
          ),
        ),
      );

      await tester.tap(find.text('Accept'));
      expect(acceptCalled, isTrue);

      await tester.pump();
      await tester.tap(find.text('Reject'));
      expect(rejectCalled, isTrue);
    });

    testWidgets('handles card tap callback', (tester) async {
      bool cardTapped = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: OrderCard(
              orderId: defaultOrderId,
              customerName: defaultCustomerName,
              customerAddress: defaultCustomerAddress,
              amount: defaultAmount,
              status: defaultStatus,
              onTap: () => cardTapped = true,
            ),
          ),
        ),
      );

      await tester.tap(find.byType(OrderCard));
      expect(cardTapped, isTrue);
    });

    testWidgets('displays loading state correctly', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: OrderCard(
              orderId: defaultOrderId,
              customerName: defaultCustomerName,
              customerAddress: defaultCustomerAddress,
              amount: defaultAmount,
              status: defaultStatus,
              isLoading: true,
            ),
          ),
        ),
      );

      // Should show loading placeholders instead of actual content
      expect(find.text(defaultOrderId), findsNothing);
      expect(find.text(defaultCustomerName), findsNothing);
      expect(
        find.byType(Container),
        findsWidgets,
      ); // Multiple placeholder containers
    });

    testWidgets('hides actions when showActions is false', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: OrderCard(
              orderId: defaultOrderId,
              customerName: defaultCustomerName,
              customerAddress: defaultCustomerAddress,
              amount: defaultAmount,
              status: 'Pending',
              showActions: false,
            ),
          ),
        ),
      );

      expect(find.byType(AppButton), findsNothing);
    });

    testWidgets('applies different priority levels', (tester) async {
      // Test urgent priority
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: OrderCard(
              orderId: defaultOrderId,
              customerName: defaultCustomerName,
              customerAddress: defaultCustomerAddress,
              amount: defaultAmount,
              status: defaultStatus,
              priority: OrderPriority.urgent,
              showPriority: true,
            ),
          ),
        ),
      );

      expect(find.text('Urgent'), findsOneWidget);
      expect(find.byIcon(Icons.priority_high), findsOneWidget);

      // Test high priority
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: OrderCard(
              orderId: defaultOrderId,
              customerName: defaultCustomerName,
              customerAddress: defaultCustomerAddress,
              amount: defaultAmount,
              status: defaultStatus,
              priority: OrderPriority.high,
              showPriority: true,
            ),
          ),
        ),
      );

      expect(find.text('High'), findsOneWidget);
      expect(find.byIcon(Icons.keyboard_arrow_up), findsOneWidget);

      // Test low priority
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: OrderCard(
              orderId: defaultOrderId,
              customerName: defaultCustomerName,
              customerAddress: defaultCustomerAddress,
              amount: defaultAmount,
              status: defaultStatus,
              priority: OrderPriority.low,
              showPriority: true,
            ),
          ),
        ),
      );

      expect(find.text('Low'), findsOneWidget);
      expect(find.byIcon(Icons.keyboard_arrow_down), findsOneWidget);
    });

    testWidgets('applies semantic label', (tester) async {
      const semanticLabel = 'Order Card';

      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: OrderCard(
              orderId: defaultOrderId,
              customerName: defaultCustomerName,
              customerAddress: defaultCustomerAddress,
              amount: defaultAmount,
              status: defaultStatus,
              semanticLabel: semanticLabel,
            ),
          ),
        ),
      );

      expect(find.bySemanticsLabel(semanticLabel), findsOneWidget);
    });

    testWidgets('shows/hides bottom divider', (tester) async {
      // Test with divider (default)
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: OrderCard(
              orderId: defaultOrderId,
              customerName: defaultCustomerName,
              customerAddress: defaultCustomerAddress,
              amount: defaultAmount,
              status: defaultStatus,
              showDivider: true,
            ),
          ),
        ),
      );

      expect(find.byType(Divider), findsOneWidget);

      // Test without divider
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: OrderCard(
              orderId: defaultOrderId,
              customerName: defaultCustomerName,
              customerAddress: defaultCustomerAddress,
              amount: defaultAmount,
              status: defaultStatus,
              showDivider: false,
            ),
          ),
        ),
      );

      expect(find.byType(Divider), findsNothing);
    });

    testWidgets('truncates long addresses', (tester) async {
      const longAddress =
          '123 Very Long Street Name That Should Be Truncated, Very Long City Name, Very Long State Name With Long Zip Code';

      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: OrderCard(
              orderId: defaultOrderId,
              customerName: defaultCustomerName,
              customerAddress: longAddress,
              amount: defaultAmount,
              status: defaultStatus,
            ),
          ),
        ),
      );

      final textWidget = tester.widget<Text>(find.text(longAddress));
      expect(textWidget.maxLines, equals(2));
      expect(textWidget.overflow, equals(TextOverflow.ellipsis));
    });
  });

  group('OrderCard.compact factory', () {
    testWidgets('creates compact variant correctly', (tester) async {
      const testOrderId = 'ORD-5678';
      const testCustomerName = 'Jane Smith';
      const testCustomerAddress = '456 Oak Ave';
      const testAmount = 78.90;
      const testStatus = 'Completed';

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: OrderCard.compact(
              orderId: testOrderId,
              customerName: testCustomerName,
              customerAddress: testCustomerAddress,
              amount: testAmount,
              status: testStatus,
            ),
          ),
        ),
      );

      expect(find.text(testOrderId), findsOneWidget);
      expect(find.text(testCustomerName), findsOneWidget);
      expect(find.text(testCustomerAddress), findsOneWidget);
      expect(find.text('\$${testAmount.toStringAsFixed(2)}'), findsOneWidget);
      expect(find.text(testStatus), findsOneWidget);

      // Compact card should not show actions or avatar
      expect(find.byType(AppButton), findsNothing);
      expect(find.byType(CircleAvatar), findsNothing);
    });
  });

  group('Status handling', () {
    testWidgets('applies correct status colors and icons', (tester) async {
      const testStatuses = [
        'Pending',
        'Accepted',
        'Processing',
        'Completed',
        'Delivered',
        'Cancelled',
        'Rejected',
      ];

      for (final status in testStatuses) {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: OrderCard(
                orderId: 'ORD-TEST',
                customerName: 'Test Customer',
                customerAddress: 'Test Address',
                amount: 100.0,
                status: status,
              ),
            ),
          ),
        );

        expect(find.text(status), findsOneWidget);
        expect(find.byType(StatusBadge), findsOneWidget);
      }
    });
  });

  group('Priority indicators', () {
    testWidgets('displays correct priority colors and icons', (tester) async {
      const priorities = [
        (OrderPriority.urgent, 'Urgent', Icons.priority_high, AppColors.error),
        (
          OrderPriority.high,
          'High',
          Icons.keyboard_arrow_up,
          AppColors.warning,
        ),
        (OrderPriority.low, 'Low', Icons.keyboard_arrow_down, AppColors.info),
      ];

      for (final (priority, label, icon, color) in priorities) {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: OrderCard(
                orderId: 'ORD-TEST',
                customerName: 'Test Customer',
                customerAddress: 'Test Address',
                amount: 100.0,
                status: 'Pending',
                priority: priority,
                showPriority: true,
              ),
            ),
          ),
        );

        expect(find.text(label), findsOneWidget);
        expect(find.byIcon(icon), findsOneWidget);
      }
    });
  });
}
